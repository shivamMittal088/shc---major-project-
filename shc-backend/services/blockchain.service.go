package services

import (
	"bytes"
	"context"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math/big"
	"net/http"
	"os"
	"strings"

	secp256k1 "github.com/decred/dcrd/dcrec/secp256k1/v4"
	decredecdsa "github.com/decred/dcrd/dcrec/secp256k1/v4/ecdsa"
	"golang.org/x/crypto/sha3"
)

// BlockchainService submits SHA-256 file hashes to Ethereum as on-chain
// notarizations. It sends a 0-ETH self-send transaction whose `data` field
// contains "shc:" + hex(sha256_bytes), permanently recording the hash so any
// third party can verify a file has not been tampered with.
//
// Pure-Go implementation — no CGo required.
type BlockchainService struct {
	rpcURL     string
	privateKey *secp256k1.PrivateKey
	address    string // "0x..." Ethereum address derived from private key
	chainID    *big.Int
	enabled    bool
}

func NewBlockchainService() *BlockchainService {
	rpcURL := strings.TrimSpace(os.Getenv("ETH_RPC_URL"))
	rawKey := strings.TrimSpace(os.Getenv("ETH_WALLET_PRIVATE_KEY"))

	if rpcURL == "" || rawKey == "" {
		log.Println("BlockchainService: ETH_RPC_URL or ETH_WALLET_PRIVATE_KEY not set — notarization disabled")
		return &BlockchainService{enabled: false}
	}

	keyBytes, err := hex.DecodeString(strings.TrimPrefix(rawKey, "0x"))
	if err != nil || len(keyBytes) != 32 {
		log.Printf("BlockchainService: invalid private key — notarization disabled")
		return &BlockchainService{enabled: false}
	}

	privKey := secp256k1.PrivKeyFromBytes(keyBytes)
	address := ethAddressFromPrivKey(privKey)

	// Default to Sepolia testnet (chain ID 11155111). Override with ETH_CHAIN_ID.
	chainID := big.NewInt(11155111)
	if raw := strings.TrimSpace(os.Getenv("ETH_CHAIN_ID")); raw != "" {
		id := new(big.Int)
		if _, ok := id.SetString(raw, 10); ok {
			chainID = id
		}
	}

	log.Printf("BlockchainService: enabled (address=%s chainID=%s)", address, chainID.String())

	return &BlockchainService{
		rpcURL:     rpcURL,
		privateKey: privKey,
		address:    address,
		chainID:    chainID,
		enabled:    true,
	}
}

// Enabled reports whether the service is configured and ready.
func (bs *BlockchainService) Enabled() bool {
	return bs != nil && bs.enabled
}

// NotarizeHash sends a 0-ETH self-send Ethereum transaction containing
// "shc:" + hex(sha256Hash) as calldata, and returns the resulting tx hash.
func (bs *BlockchainService) NotarizeHash(ctx context.Context, sha256Hash []byte) (string, error) {
	if !bs.Enabled() {
		return "", errors.New("blockchain notarization is not configured")
	}
	if len(sha256Hash) != 32 {
		return "", fmt.Errorf("expected 32-byte SHA-256 hash, got %d bytes", len(sha256Hash))
	}

	nonce, err := bs.pendingNonce(ctx)
	if err != nil {
		return "", fmt.Errorf("get nonce: %w", err)
	}

	gasPrice, err := bs.suggestGasPrice(ctx)
	if err != nil {
		return "", fmt.Errorf("get gas price: %w", err)
	}

	data := []byte("shc:" + hex.EncodeToString(sha256Hash))
	gasLimit := uint64(21000 + 68*uint64(len(data)))

	rawTx := bs.buildSignedTx(nonce, gasPrice, gasLimit, data)

	txHash, err := bs.sendRawTransaction(ctx, rawTx)
	if err != nil {
		return "", fmt.Errorf("send raw tx: %w", err)
	}

	return txHash, nil
}

// buildSignedTx creates and EIP-155 signs a legacy Ethereum transaction,
// returning the RLP-encoded signed bytes.
func (bs *BlockchainService) buildSignedTx(nonce uint64, gasPrice *big.Int, gasLimit uint64, data []byte) []byte {
	toBytes, _ := hex.DecodeString(strings.TrimPrefix(bs.address, "0x"))

	// EIP-155 signing pre-image: [nonce, gasPrice, gasLimit, to, value, data, chainID, 0, 0]
	preimage := rlpList(
		rlpUint(nonce),
		rlpBigInt(gasPrice),
		rlpUint(gasLimit),
		rlpBytes(toBytes),
		rlpBigInt(big.NewInt(0)), // value = 0
		rlpBytes(data),
		rlpBigInt(bs.chainID), // EIP-155: chainID in place of v
		rlpBytes(nil),         // r = 0
		rlpBytes(nil),         // s = 0
	)

	msgHash := ethKeccak256(preimage)

	// SignCompact with isCompressedKey=false: compact[0] = 27 + recoveryID
	compact := decredecdsa.SignCompact(bs.privateKey, msgHash, false)
	recoveryID := int64(compact[0]) - 27
	rInt := new(big.Int).SetBytes(compact[1:33])
	sInt := new(big.Int).SetBytes(compact[33:65])

	// EIP-155: v = recoveryID + 35 + 2*chainID
	v := new(big.Int).SetInt64(recoveryID + 35)
	v.Add(v, new(big.Int).Mul(bs.chainID, big.NewInt(2)))

	// Signed transaction: [nonce, gasPrice, gasLimit, to, value, data, v, r, s]
	return rlpList(
		rlpUint(nonce),
		rlpBigInt(gasPrice),
		rlpUint(gasLimit),
		rlpBytes(toBytes),
		rlpBigInt(big.NewInt(0)),
		rlpBytes(data),
		rlpBigInt(v),
		rlpBigInt(rInt),
		rlpBigInt(sInt),
	)
}

// ── JSON-RPC ─────────────────────────────────────────────────────────────────

type ethRPCReq struct {
	JSONRPC string        `json:"jsonrpc"`
	Method  string        `json:"method"`
	Params  []interface{} `json:"params"`
	ID      int           `json:"id"`
}

type ethRPCResp struct {
	Result json.RawMessage `json:"result"`
	Error  *struct {
		Message string `json:"message"`
	} `json:"error"`
}

func (bs *BlockchainService) rpcCall(ctx context.Context, method string, params ...interface{}) (json.RawMessage, error) {
	body, _ := json.Marshal(ethRPCReq{JSONRPC: "2.0", Method: method, Params: params, ID: 1})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, bs.rpcURL, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var rpcResp ethRPCResp
	if err := json.Unmarshal(raw, &rpcResp); err != nil {
		return nil, fmt.Errorf("decode rpc response: %w", err)
	}
	if rpcResp.Error != nil {
		return nil, errors.New(rpcResp.Error.Message)
	}
	return rpcResp.Result, nil
}

func (bs *BlockchainService) pendingNonce(ctx context.Context) (uint64, error) {
	result, err := bs.rpcCall(ctx, "eth_getTransactionCount", bs.address, "pending")
	if err != nil {
		return 0, err
	}
	var hexStr string
	if err := json.Unmarshal(result, &hexStr); err != nil {
		return 0, err
	}
	n := new(big.Int)
	n.SetString(strings.TrimPrefix(hexStr, "0x"), 16)
	return n.Uint64(), nil
}

func (bs *BlockchainService) suggestGasPrice(ctx context.Context) (*big.Int, error) {
	result, err := bs.rpcCall(ctx, "eth_gasPrice")
	if err != nil {
		return nil, err
	}
	var hexStr string
	if err := json.Unmarshal(result, &hexStr); err != nil {
		return nil, err
	}
	price := new(big.Int)
	price.SetString(strings.TrimPrefix(hexStr, "0x"), 16)
	return price, nil
}

func (bs *BlockchainService) sendRawTransaction(ctx context.Context, rawTx []byte) (string, error) {
	result, err := bs.rpcCall(ctx, "eth_sendRawTransaction", "0x"+hex.EncodeToString(rawTx))
	if err != nil {
		return "", err
	}
	var txHash string
	if err := json.Unmarshal(result, &txHash); err != nil {
		return "", err
	}
	return txHash, nil
}

// VerifyOnChain fetches the transaction by hash, decodes its input data, and
// confirms it contains "shc:" followed by the hex-encoded sha256Hash.
// Returns (true, nil) when the on-chain record matches, (false, nil) when it
// doesn't, and (false, err) when the chain cannot be reached or the tx is unknown.
func (bs *BlockchainService) VerifyOnChain(ctx context.Context, txHash string, sha256Hash []byte) (bool, error) {
	if !bs.Enabled() {
		return false, errors.New("blockchain notarization is not configured")
	}

	result, err := bs.rpcCall(ctx, "eth_getTransactionByHash", txHash)
	if err != nil {
		return false, fmt.Errorf("eth_getTransactionByHash: %w", err)
	}

	// null result means the tx is not found (not yet mined or wrong hash).
	if string(result) == "null" {
		return false, fmt.Errorf("transaction %s not found on chain", txHash)
	}

	var tx struct {
		Input string `json:"input"`
	}
	if err := json.Unmarshal(result, &tx); err != nil {
		return false, fmt.Errorf("decode transaction: %w", err)
	}

	// input is "0x" + hex(calldata)
	calldataHex := strings.TrimPrefix(tx.Input, "0x")
	calldataBytes, err := hex.DecodeString(calldataHex)
	if err != nil {
		return false, fmt.Errorf("decode input hex: %w", err)
	}

	expected := "shc:" + hex.EncodeToString(sha256Hash)
	return string(calldataBytes) == expected, nil
}

// ── Crypto ────────────────────────────────────────────────────────────────────

func ethKeccak256(data []byte) []byte {
	h := sha3.NewLegacyKeccak256()
	h.Write(data)
	return h.Sum(nil)
}

// ethAddressFromPrivKey derives the Ethereum address from a secp256k1 private key.
// Address = last 20 bytes of Keccak256(uncompressed_pubkey[1:]).
func ethAddressFromPrivKey(privKey *secp256k1.PrivateKey) string {
	pubBytes := privKey.PubKey().SerializeUncompressed() // 65 bytes: 04 || x || y
	hash := ethKeccak256(pubBytes[1:])
	return "0x" + hex.EncodeToString(hash[12:])
}

// ── RLP encoding ──────────────────────────────────────────────────────────────

func rlpBytes(b []byte) []byte {
	if len(b) == 0 {
		return []byte{0x80} // RLP empty string (represents integer 0)
	}
	if len(b) == 1 && b[0] < 0x80 {
		return b
	}
	return append(rlpLenPrefix(len(b), 0x80), b...)
}

func rlpBigInt(n *big.Int) []byte {
	if n == nil || n.Sign() == 0 {
		return []byte{0x80}
	}
	return rlpBytes(n.Bytes()) // Bytes() gives minimal big-endian (no leading zeros)
}

func rlpUint(n uint64) []byte {
	return rlpBigInt(new(big.Int).SetUint64(n))
}

func rlpList(items ...[]byte) []byte {
	var payload []byte
	for _, item := range items {
		payload = append(payload, item...)
	}
	return append(rlpLenPrefix(len(payload), 0xc0), payload...)
}

func rlpLenPrefix(length int, base byte) []byte {
	if length <= 55 {
		return []byte{base + byte(length)}
	}
	lenBytes := new(big.Int).SetInt64(int64(length)).Bytes()
	return append([]byte{base + 55 + byte(len(lenBytes))}, lenBytes...)
}
