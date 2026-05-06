import { Redis } from "ioredis";

// Reuse a single Redis client across hot reloads / serverless invocations to
// avoid exhausting the connection pool (Vercel spawns many short-lived
// Node.js function instances; a fresh TCP connection per import is fatal).
const globalForRedis = globalThis as unknown as { __shcRedis?: Redis };

const redis =
  globalForRedis.__shcRedis ??
  new Redis(process.env.REDIS_URL!, {
    lazyConnect: false,
    maxRetriesPerRequest: 3,
    enableOfflineQueue: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.__shcRedis = redis;
}

export namespace KV {
  export async function get(key: string) {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  export async function set(key: string, value: any, expiry: number = 3600) {
    const serializedValue = JSON.stringify(value);
    return await redis.set(key, serializedValue, "EX", expiry);
  }

  export async function del(key: string) {
    return await redis.del(key);
  }
}
