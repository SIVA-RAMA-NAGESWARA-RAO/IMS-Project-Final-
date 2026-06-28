/**
 * Serverless-safe Mongoose connection manager.
 *
 * Vercel spins up a new Node.js process for every cold-start but reuses the
 * same process ("warm instance") for subsequent requests. Without caching,
 * every invocation would call mongoose.connect(), rapidly exhausting the
 * MongoDB Atlas connection pool (default 100).
 *
 * Strategy:
 *  1. Cache the connection promise on the Node.js `global` object so it
 *     survives across warm invocations within the same Vercel container.
 *  2. Always return the cached promise — concurrent cold-start requests
 *     share a single connection attempt instead of racing each other.
 *  3. On failure, clear the cache so the next request retries cleanly.
 */
const mongoose = require('mongoose');

// Attach to `global` so the cache survives across warm-start invocations.
// In local dev (nodemon) this also prevents duplicate connections on restart.
let cached = global.__mongooseCache;
if (!cached) {
  cached = global.__mongooseCache = { conn: null, promise: null };
}

const connectDB = async () => {
  // Already connected — reuse immediately.
  if (cached.conn && cached.conn.readyState === 1) {
    return cached.conn;
  }

  // A connection attempt is already in flight — await it.
  if (cached.promise) {
    try {
      cached.conn = await cached.promise;
      return cached.conn;
    } catch (err) {
      // Previous attempt failed — clear and fall through to retry.
      cached.promise = null;
      cached.conn = null;
    }
  }

  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    throw new Error('[mongo] MONGO_URI env var is not set');
  }

  // Serverless-tuned pool: small pool, aggressive timeouts.
  const opts = {
    maxPoolSize: 10,               // Vercel containers are ephemeral — no need for large pools
    minPoolSize: 1,                // Keep at least 1 socket ready for warm invocations
    serverSelectionTimeoutMS: 5000, // Fail fast if Atlas is unreachable
    socketTimeoutMS: 45000,         // Keep under Vercel's 60 s function timeout
    bufferCommands: false,          // Fail immediately if disconnected (no silent queueing)
  };

  console.log('[mongo] initiating connection…');
  cached.promise = mongoose.connect(MONGO_URI, opts);

  try {
    cached.conn = await cached.promise;
    console.log(`[mongo] connected → ${cached.conn.connection.host}/${cached.conn.connection.name}`);
    return cached.conn;
  } catch (err) {
    cached.promise = null;
    cached.conn = null;
    console.error(`[mongo] connection failed: ${err.message}`);
    throw err;
  }
};

module.exports = connectDB;
