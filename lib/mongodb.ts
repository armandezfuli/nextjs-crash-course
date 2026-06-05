import mongoose, { Mongoose } from 'mongoose';
import { logger } from '@/lib/logger';

// Define the type for the cached connection
interface CachedConnection {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

// Initialize the cache in the global scope to prevent multiple connections during development
declare global {
  var mongooseCache: CachedConnection;
}

// Set default cache if not already defined
if (!global.mongooseCache) {
  global.mongooseCache = {
    conn: null,
    promise: null,
  };
}

const cached = global.mongooseCache;

/**
 * Connects to MongoDB using Mongoose with connection caching.
 * This prevents multiple connections during development hot-reloads.
 *
 * @returns Promise<Mongoose> - The Mongoose instance
 * @throws Error if MONGODB_URI environment variable is not set
 */
export async function connectToDatabase(): Promise<Mongoose> {
  // Return cached connection if already established
  if (cached.conn) {
    if (mongoose.connection.readyState === 1) {
      return cached.conn;
    }

    cached.conn = null;
    cached.promise = null;
  }

  // Return pending connection promise if one is in progress
  if (cached.promise) {
    return cached.promise;
  }

  // Validate that MongoDB URI is configured
  const mongodbUri = process.env.MONGODB_URL;
  if (!mongodbUri) {
    throw new Error(
      'MONGODB_URI environment variable is not defined. Please check your .env.local file.'
    );
  }

  // Create a new connection promise
  const connectionPromise = mongoose
    .connect(mongodbUri, {
      // Mongoose connection options
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 5,
    })
    .then((mongooseInstance) => {
      logger.info({ message: 'Connected to MongoDB' });
      return mongooseInstance;
    })
    .catch((error) => {
      logger.error({ message: 'Failed to connect to MongoDB', error });
      throw error;
    });

  // Cache the promise to prevent multiple simultaneous connections
  cached.promise = connectionPromise;

  try {
    // Await the connection and cache the result
    cached.conn = await connectionPromise;
    return cached.conn;
  } catch (error) {
    // Clear the promise cache on error to allow retry attempts
    cached.promise = null;
    throw error;
  }
}

/**
 * Disconnects from MongoDB.
 * Useful for cleanup in testing or when shutting down the application.
 */
export async function disconnectFromDatabase(): Promise<void> {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
    console.log('✅ Disconnected from MongoDB');
  }
}

export default connectToDatabase;
