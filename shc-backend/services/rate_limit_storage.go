package services

import (
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	fiberRedis "github.com/gofiber/storage/redis/v3"
)

const rateLimitRedisPrefix = "rate_limit:"

type rateLimitStorage interface {
	fiber.Storage
	Keys() ([][]byte, error)
}

type prefixedRateLimitStorage struct {
	prefix  string
	storage rateLimitStorage
}

func NewRateLimitStorage() fiber.Storage {
	return &prefixedRateLimitStorage{
		prefix: rateLimitRedisPrefix,
		storage: fiberRedis.New(fiberRedis.Config{
			URL: os.Getenv("REDIS_URL"),
		}),
	}
}

func (s *prefixedRateLimitStorage) Get(key string) ([]byte, error) {
	return s.storage.Get(s.prefixedKey(key))
}

func (s *prefixedRateLimitStorage) Set(key string, val []byte, exp time.Duration) error {
	return s.storage.Set(s.prefixedKey(key), val, exp)
}

func (s *prefixedRateLimitStorage) Delete(key string) error {
	return s.storage.Delete(s.prefixedKey(key))
}

func (s *prefixedRateLimitStorage) Reset() error {
	keys, err := s.storage.Keys()
	if err != nil {
		return err
	}

	for _, key := range keys {
		stringKey := string(key)
		if !strings.HasPrefix(stringKey, s.prefix) {
			continue
		}

		if err := s.storage.Delete(stringKey); err != nil {
			return err
		}
	}

	return nil
}

func (s *prefixedRateLimitStorage) Close() error {
	return s.storage.Close()
}

func (s *prefixedRateLimitStorage) prefixedKey(key string) string {
	trimmedKey := strings.TrimSpace(key)
	if trimmedKey == "" {
		return ""
	}

	return s.prefix + trimmedKey
}
