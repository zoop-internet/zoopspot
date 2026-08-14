package store

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/zoop-internet/zoop/packages/core/types"
)

// RedisHub manages real-time presence and distributed signaling pub/sub over Redis.
type RedisHub struct {
	client *redis.Client
}

// NewRedisHub connects to Redis cluster or standalone instance.
func NewRedisHub(redisURL string) (*RedisHub, error) {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("invalid redis url: %w", err)
	}

	client := redis.NewClient(opt)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to ping redis: %w", err)
	}

	return &RedisHub{client: client}, nil
}

// Close closes the Redis connection.
func (r *RedisHub) Close() error {
	return r.client.Close()
}

// ─── Ephemeral Presence ────────────────────────────────────────

// SetPresence marks a device as online with a TTL (e.g., 30s heartbeat).
func (r *RedisHub) SetPresence(ctx context.Context, deviceID types.ID, ttl time.Duration) error {
	key := fmt.Sprintf("zoop:presence:%s", deviceID.String())
	return r.client.Set(ctx, key, "online", ttl).Err()
}

// IsOnline checks if a device has an active presence heartbeat in Redis.
func (r *RedisHub) IsOnline(ctx context.Context, deviceID types.ID) (bool, error) {
	key := fmt.Sprintf("zoop:presence:%s", deviceID.String())
	exists, err := r.client.Exists(ctx, key).Result()
	if err != nil {
		return false, err
	}
	return exists > 0, nil
}

// ClearPresence marks a device offline immediately upon disconnection.
func (r *RedisHub) ClearPresence(ctx context.Context, deviceID types.ID) error {
	key := fmt.Sprintf("zoop:presence:%s", deviceID.String())
	return r.client.Del(ctx, key).Err()
}

// ─── Distributed Signaling Pub/Sub ────────────────────────────

// PublishSignaling sends a signaling message to a target device channel in Redis.
func (r *RedisHub) PublishSignaling(ctx context.Context, targetID types.ID, msg types.SignalingMessage) error {
	channel := fmt.Sprintf("zoop:signaling:%s", targetID.String())
	data, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to serialize signaling message: %w", err)
	}
	return r.client.Publish(ctx, channel, data).Err()
}

// SubscribeSignaling subscribes to incoming signaling messages for a specific device.
func (r *RedisHub) SubscribeSignaling(ctx context.Context, deviceID types.ID) *redis.PubSub {
	channel := fmt.Sprintf("zoop:signaling:%s", deviceID.String())
	return r.client.Subscribe(ctx, channel)
}
