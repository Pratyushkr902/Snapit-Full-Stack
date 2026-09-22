import Redis from 'ioredis';
import NodeCache from 'node-cache';

// Fallback in-memory cache instance (zero network dependency)
const memoryCache = new NodeCache({ stdTTL: 120, checkperiod: 60 });

let redisClient = null;
let isRedisReady = false;

const redisUrl = process.env.REDIS_URL;

if (redisUrl) {
    try {
        redisClient = new Redis(redisUrl, {
            maxRetriesPerRequest: 2,
            enableReadyCheck: true,
            connectTimeout: 8000,
            retryStrategy(times) {
                if (times > 5) {
                    console.warn('[Cache] Redis max reconnect attempts exceeded. Relying on in-memory fallback.');
                    return null; // Stop reconnecting after 5 attempts
                }
                return Math.min(times * 500, 3000);
            }
        });

        redisClient.on('connect', () => {
            console.log('⚡ [Cache] Connecting to Redis...');
        });

        redisClient.on('ready', () => {
            isRedisReady = true;
            console.log('✅ [Cache] Connected to Redis successfully.');
        });

        redisClient.on('error', (err) => {
            isRedisReady = false;
            console.warn('[Cache] Redis error (falling back to memory cache):', err.message);
        });

        redisClient.on('close', () => {
            isRedisReady = false;
        });
    } catch (err) {
        console.warn('[Cache] Failed to initialize Redis client. Using in-memory fallback:', err.message);
        isRedisReady = false;
    }
} else {
    console.log('ℹ️ [Cache] No REDIS_URL found in environment. Using in-memory NodeCache.');
}

/**
 * Get item from cache (Redis primary, memory secondary)
 */
export const getCache = async (key) => {
    if (isRedisReady && redisClient) {
        try {
            const raw = await redisClient.get(key);
            if (raw) {
                return JSON.parse(raw);
            }
            return null;
        } catch (err) {
            console.warn(`[Cache] Redis get("${key}") failed:`, err.message);
        }
    }
    return memoryCache.get(key) || null;
};

/**
 * Set item in cache with TTL in seconds
 */
export const setCache = async (key, value, ttlSeconds = 60) => {
    // Always update local memory cache for immediate sync
    memoryCache.set(key, value, ttlSeconds);

    if (isRedisReady && redisClient) {
        try {
            const serialized = JSON.stringify(value);
            if (ttlSeconds > 0) {
                await redisClient.set(key, serialized, 'EX', ttlSeconds);
            } else {
                await redisClient.set(key, serialized);
            }
            return true;
        } catch (err) {
            console.warn(`[Cache] Redis set("${key}") failed:`, err.message);
        }
    }
    return true;
};

/**
 * Delete a specific key from cache
 */
export const delCache = async (key) => {
    memoryCache.del(key);
    if (isRedisReady && redisClient) {
        try {
            await redisClient.del(key);
        } catch (err) {
            console.warn(`[Cache] Redis del("${key}") failed:`, err.message);
        }
    }
};

/**
 * Invalidate all keys matching a prefix/pattern (e.g. 'category:*', 'product:*')
 */
export const delCachePattern = async (pattern) => {
    // Invalidate matching keys in memory cache
    const memoryKeys = memoryCache.keys();
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    memoryKeys.forEach((k) => {
        if (regex.test(k)) {
            memoryCache.del(k);
        }
    });

    if (isRedisReady && redisClient) {
        try {
            let cursor = '0';
            do {
                const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
                cursor = nextCursor;
                if (keys && keys.length > 0) {
                    await redisClient.del(...keys);
                }
            } while (cursor !== '0');
        } catch (err) {
            console.warn(`[Cache] Redis delCachePattern("${pattern}") failed:`, err.message);
        }
    }
};

/**
 * Flush all cached entries
 */
export const flushAllCache = async () => {
    memoryCache.flushAll();
    if (isRedisReady && redisClient) {
        try {
            await redisClient.flushdb();
        } catch (err) {
            console.warn('[Cache] Redis flushdb failed:', err.message);
        }
    }
};

export default {
    get: getCache,
    set: setCache,
    del: delCache,
    delPattern: delCachePattern,
    flushAll: flushAllCache,
};
