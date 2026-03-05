package services

import (
	"context"
	"errors"
	"os"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

// TODO: study about this
var ctx = context.Background()

type RedisService struct {
	client *redis.Client
}

func NewRedisService() *RedisService {
	opts, err := redis.ParseURL(os.Getenv("REDIS_URL"))
	if err != nil {
		panic(err)
	}
	return &RedisService{client: redis.NewClient(opts)}
}

func (rs *RedisService) GetCache(key string) (any, error) {
	key = strings.TrimSpace(key)
	if key == "" {
		return nil, errors.New("key is required")
	}

	val, err := rs.client.Get(ctx, key).Result()
	if err != nil {
		return nil, err
	}
	return val, nil
}

func (rs *RedisService) SetCache(key string, value interface{}, expires time.Duration) error {
	key = strings.TrimSpace(key)
	if key == "" {
		return errors.New("key is required")
	}

	err := rs.client.Set(ctx, key, value, expires).Err()
	if err != nil {
		return err
	}
	return nil
}
