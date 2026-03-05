package utils

import (
	"math/rand"
)

func GenerateRandomString(length int) string {
	charset := "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ" + "0123456789" + "!@#$%^&*()_+{}[]:;<>,.?/~`"

	accessKey := make([]byte, length)
	for i := 0; i < length; i++ {
		accessKey[i] = charset[rand.Intn(len(charset))]
	}
	return string(accessKey)
}
