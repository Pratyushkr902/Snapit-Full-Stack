import Redis from 'ioredis';
import NodeCache from 'node-cache';

// Fallback in-memory cache instance (zero network dependency)
const memoryCache = new NodeCache({ stdTTL: 120, checkperiod: 60 });

let redisClient = null;
let isRedisReady = false;

function resolveRedisConfig() {
    // 1. Check if individual connection variables are provided (Railway REDISHOST / REDISPORT)
    const host = (process.env.REDISHOST || '').trim().replace(/^['"]|['"]$/g, '');
    const port = parseInt(process.env.REDISPORT, 10);
    const password = (process.env.REDISPASSWORD || process.env.REDIS_PASSWORD || '').trim().replace(/^['"]|['"]$/g, '') || undefined;
    const username = (process.env.REDISUSER || '').trim().replace(/^['"]|['"]$/g, '') || undefined;

    if (host && !host.startsWith('${') && !isNaN(port) && port > 0) {
        return {
            type: 'options',
            config: {
                host,
                port,
                password,
                username: username || undefined,
            }
        };
    }

    // 2. Check candidate URL environment variables in priority order
    const rawUrl = (
        process.env.REDIS_URL ||
        process.env.REDIS_PRIVATE_URL ||
        process.env.REDIS_PUBLIC_URL ||
        ''
    ).trim().replace(/^['"]|['"]$/g, '');

    if (!rawUrl) {
        return null;
    }

    // Detect unresolved Railway variable templates (e.g. ${{Redis.REDIS_URL}})
    if (rawUrl.startsWith('${') || rawUrl === 'undefined' || rawUrl === 'null' || rawUrl.toUpperCase() === 'REDIS_URL') {
        console.warn(`⚠️ [Cache] Redis variable "${rawUrl}" is an unresolved template or placeholder.`);
        console.warn('   👉 Tip: Railway variable references (${{...}}) only work if Redis is in the SAME project as Snapit-Full-Stack.');
        console.warn('   👉 If Redis is in another project, either add Redis to this project or copy the raw connection URL (redis://...).');
        return null;
    }

    let normalizedUrl = rawUrl;
    if (!normalizedUrl.startsWith('redis://') && !normalizedUrl.startsWith('rediss://')) {
        normalizedUrl = `redis://${normalizedUrl}`;
    }

    try {
        new URL(normalizedUrl);
        return {
            type: 'url',
            config: normalizedUrl
        };
    } catch (urlErr) {
        console.warn(`⚠️ [Cache] Invalid Redis URL format: "${rawUrl}" (${urlErr.message}).`);
        return null;
    }
}

const resolved = resolveRedisConfig();

if (resolved) {
    try {
        const commonOptions = {
            maxRetriesPerRequest: 2,
            enableReadyCheck: true,
            connectTimeout: 8000,
            lazyConnect: true,
            retryStrategy(times) {
                if (times > 5) {
                    console.warn('[Cache] Redis max reconnect attempts (5) reached. Relying on in-memory fallback.');
                    return null;
                }
                return Math.min(times * 500, 3000);
            }
        };

        if (resolved.type === 'url') {
            redisClient = new Redis(resolved.config, commonOptions);
        } else {
            redisClient = new Redis({ ...resolved.config, ...commonOptions });
        }

        redisClient.on('connect', () => {
            console.log('⚡ [Cache] Redis connecting...');
        });

        redisClient.on('ready', () => {
            isRedisReady = true;
            console.log('✅ [Cache] Connected to Redis successfully. Global caching active.');
        });

        redisClient.on('error', (err) => {
            isRedisReady = false;
            console.warn('[Cache] Redis error (in-memory fallback active):', err.message);
        });

        redisClient.on('close', () => {
            isRedisReady = false;
        });

        redisClient.on('end', () => {
            isRedisReady = false;
        });

        // Initiate connection gracefully without unhandled promise rejection
        redisClient.connect().catch((err) => {
            isRedisReady = false;
            console.warn('[Cache] Initial Redis connection attempt failed (in-memory fallback active):', err.message);
        });

    } catch (err) {
        console.warn('[Cache] Failed to initialize Redis client. Using in-memory fallback:', err.message);
        isRedisReady = false;
    }
} else {
    console.log('ℹ️ [Cache] No active Redis configuration detected. High-performance in-memory cache (NodeCache) active.');
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

