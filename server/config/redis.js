const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

let pubClient = null;
let subClient = null;

/**
 * Initializes two Redis clients (pub + sub) required by the Socket.io
 * Redis adapter and connects them. Returns the adapter for io.adapter().
 *
 * If Redis is unavailable (e.g. not running locally in dev), gracefully
 * catches the error, disconnects listeners to prevent ECONNREFUSED log spam,
 * and returns null so the server runs smoothly in single-instance mode.
 */
const initRedis = async () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  const client = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        // Stop retrying if Redis is not running to avoid endless log spam
        if (retries > 2) {
          return new Error('Redis connection failed');
        }
        return Math.min(retries * 100, 1000);
      },
    },
  });

  const duplicateClient = client.duplicate();

  // Temporary error listeners during initial connection attempt
  const onError = (err) => {
    // Silent catch during startup check
  };

  client.on('error', onError);
  duplicateClient.on('error', onError);

  try {
    // Attempt connection with 3-second timeout
    const connectPromise = Promise.all([client.connect(), duplicateClient.connect()]);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Redis connection timeout')), 3000)
    );

    await Promise.race([connectPromise, timeoutPromise]);

    pubClient = client;
    subClient = duplicateClient;

    // Replace startup error listeners with loggers
    pubClient.removeAllListeners('error');
    subClient.removeAllListeners('error');
    pubClient.on('error', (err) => console.error('Redis pubClient error:', err.message));
    subClient.on('error', (err) => console.error('Redis subClient error:', err.message));

    console.log('Redis connected successfully');
    return createAdapter(pubClient, subClient);
  } catch (err) {
    // Clean up failed clients to prevent background ECONNREFUSED spam
    try {
      client.removeAllListeners();
      duplicateClient.removeAllListeners();
      await client.disconnect().catch(() => {});
      await duplicateClient.disconnect().catch(() => {});
    } catch (e) {}

    console.warn(
      `Redis not available at ${redisUrl} (${err.message}) — running without Redis adapter (single-instance mode).`
    );
    return null;
  }
};

/**
 * Returns the shared pub client for cache reads/writes (Slice 4).
 * Returns null if Redis is not connected.
 */
const getRedisClient = () => {
  return pubClient;
};

module.exports = { initRedis, getRedisClient };
