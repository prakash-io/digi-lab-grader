import { Queue } from "bullmq";
import Redis from "ioredis";

// Create Redis connection with error handling
let redisConnection;
let queueInstance;

try {
  if (!process.env.REDIS_URL) {
    console.warn("⚠️ REDIS_URL is not provided. Worker queue may fail to connect.");
  }

  redisConnection = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    retryStrategy: (times) => {
      if (times > 10) {
        console.warn("Redis connection failed after 10 attempts. Job queue will not work without Redis.");
        return null; // Stop retrying
      }
      return Math.min(times * 200, 3000);
    },
    reconnectOnError: (err) => {
      const targetError = "READONLY";
      if (err.message.includes(targetError)) {
        return true; // Reconnect on READONLY error
      }
      return false;
    },
    lazyConnect: true,
  });

  redisConnection.on("error", (err) => {
    console.warn("Redis connection error:", err.message);
    if (err.message.includes("Connection is closed") || err.message.includes("ECONNREFUSED")) {
      console.warn("Note: Auto-grading requires Redis. Install Redis for full functionality.");
    }
  });

  redisConnection.on("connect", () => {
    console.log("✅ Redis connecting...");
  });

  redisConnection.on("ready", () => {
    console.log("✅ Redis connected and ready");
  });

  redisConnection.on("close", () => {
    console.warn("⚠️  Redis connection closed");
  });

  redisConnection.on("reconnecting", () => {
    console.log("🔄 Redis reconnecting...");
  });

  // Create submission queue with connection retry
  queueInstance = new Queue("submissions", {
    connection: redisConnection,
    defaultJobOptions: {
      removeOnComplete: {
        age: 3600, // Keep completed jobs for 1 hour
        count: 100, // Keep max 100 completed jobs
      },
      removeOnFail: {
        age: 24 * 3600, // Keep failed jobs for 24 hours
      },
    },
  });

  // Try to connect
  redisConnection.connect().catch((err) => {
    // Connection will fail if Redis is not running, that's ok
    console.warn("Redis initial connection failed (this is ok if Redis is not installed):", err.message);
  });
} catch (error) {
  console.warn("Failed to initialize Redis connection:", error.message);
  console.warn("Note: Auto-grading requires Redis. Install Redis for full functionality.");
}

// Export queue with fallback - return null if Redis is not available
export const submissionQueue = queueInstance || null;

// Job status storage (in production, use Redis or database)
const jobStatuses = new Map();

export function setJobStatus(jobId, status) {
  jobStatuses.set(jobId, status);
}

export function getJobStatus(jobId) {
  return jobStatuses.get(jobId) || { status: "unknown" };
}

// Export Redis connection for worker
export { redisConnection };

// Check if Redis is available
export function isRedisAvailable() {
  try {
    if (!redisConnection || !queueInstance) {
      return false;
    }
    // Check connection status - "ready" means connected, "end" means closed
    const status = redisConnection.status;
    return status === "ready" || status === "connecting" || status === "connect";
  } catch (error) {
    return false;
  }
}

// Check if queue is ready to accept jobs
export function isQueueReady() {
  try {
    if (!queueInstance || !redisConnection) {
      return false;
    }
    const status = redisConnection.status;
    return status === "ready";
  } catch (error) {
    return false;
  }
}

