package services

import (
	"context"
	"encoding/json"
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

func (rs *RedisService) GetJSONCache(key string, dest interface{}) error {
	value, err := rs.GetCache(key)
	if err != nil {
		return err
	}

	stringValue, ok := value.(string)
	if !ok {
		return errors.New("cached value is not a string")
	}

	return json.Unmarshal([]byte(stringValue), dest)
}

func (rs *RedisService) SetJSONCache(key string, value interface{}, expires time.Duration) error {
	encoded, err := json.Marshal(value)
	if err != nil {
		return err
	}

	return rs.SetCache(key, encoded, expires)
}

func (rs *RedisService) DeleteCache(keys ...string) error {
	filtered := make([]string, 0, len(keys))
	for _, key := range keys {
		trimmedKey := strings.TrimSpace(key)
		if trimmedKey != "" {
			filtered = append(filtered, trimmedKey)
		}
	}

	if len(filtered) == 0 {
		return nil
	}

	return rs.client.Del(ctx, filtered...).Err()
}

func (rs *RedisService) DeleteByPrefix(prefix string) error {
	prefix = strings.TrimSpace(prefix)
	if prefix == "" {
		return errors.New("prefix is required")
	}

	var cursor uint64
	for {
		keys, nextCursor, err := rs.client.Scan(ctx, cursor, prefix+"*", 100).Result()
		if err != nil {
			return err
		}

		if len(keys) > 0 {
			if err := rs.client.Del(ctx, keys...).Err(); err != nil {
				return err
			}
		}

		cursor = nextCursor
		if cursor == 0 {
			break
		}
	}

	return nil
}
