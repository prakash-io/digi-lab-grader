import express from "express";
import cors from "cors";
import { createServer } from "http";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Server } from "socket.io";
import dotenv from "dotenv";

// Load environment variables IMMEDIATELY
dotenv.config();

import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import assignmentRoutes from "./routes/assignments.js";
import submissionRoutes from "./routes/submissions.js";
import announcementRoutes from "./routes/announcements.js";
import notificationRoutes from "./routes/notifications.js";
import gradeRoutes from "./routes/grades.js";
import runPublicRoutes from "./routes/runPublic.js";
import leaderboardRoutes from "./routes/leaderboard.js";

import authRoutes from "./routes/auth.js";

// Connect to MongoDB
connectDB();

// Validate critical environment variables
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === "your-secret-key-change-in-production" || JWT_SECRET.includes("your-secret-key")) {
  console.error("❌ ERROR: JWT_SECRET is not set or is using default value!");
  console.error("   Please set JWT_SECRET in Railway environment variables.");
  console.error("   Generate one with: openssl rand -base64 32");
  console.error("   Server will start but authentication will fail!");
}

// Try to start worker (requires Redis) - use dynamic import
import("./workers/submissionWorker.js").catch((err) => {
  console.warn("⚠️  Worker not started (Redis may not be available):", err.message);
  console.warn("   To enable auto-grading, install and start Redis:");
  console.warn("   macOS: brew install redis && redis-server");
  console.warn("   Linux: sudo apt-get install redis-server && redis-server");
});

const app = express();
app.set("trust proxy", 1);
const httpServer = createServer(app); // Changed 'server' to 'httpServer'

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map(origin => origin.trim())
  : ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"];

const io = new Server(httpServer, { // Changed 'server' to 'httpServer'
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  },
});

const PORT = process.env.PORT || 3001;

// Redis Adapter for WebSocket Scalability
const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  io.adapter(createAdapter(pubClient, subClient));
  console.log("✅ Redis Adapter for WebSockets connected");
}).catch(err => {
  console.error("❌ Redis Adapter failed. Running in single-instance mode.", err.message);
});

// Middleware - CORS with proper preflight handling
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (corsOrigins.indexOf(origin) !== -1 || corsOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Content-Type", "Authorization"],
}));

// Handle preflight requests
app.options('*', cors());

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

// Security Headers
app.use(helmet());

// Rate Limiting (General API)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: { success: false, message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all API routes
app.use("/api/", apiLimiter);

// Specific stricter rate limit for Auth and Code Execution
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // Limit each IP to 30 requests per windowMs for these routes
  message: { success: false, message: "Too many requests, please try again later." },
});
app.use("/api/auth/", strictLimiter);
app.use("/api/run-public", strictLimiter);

app.use(express.json());
app.use(cookieParser());

// Health check - place early for easy access
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "VirTA Backend API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  });
});

// Root route
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "VirTA Backend API is running",
    endpoints: {
      health: "/api/health",
      auth: "/api/auth",
      assignments: "/api/assignments",
      submissions: "/api/submissions",
      announcements: "/api/announcements",
      notifications: "/api/notifications",
      grades: "/api/grades",
      runPublic: "/api/run-public",
      leaderboard: "/api/leaderboard"
    }
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/grades", gradeRoutes);
app.use("/api/run-public", runPublicRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

// WebSocket connection handling
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Join room for student updates
  socket.on("join-student-room", (studentId) => {
    socket.join(`student-${studentId}`);
    console.log(`Student ${studentId} joined room`);
  });

  // Join room for teacher updates
  socket.on("join-teacher-room", (teacherId) => {
    socket.join(`teacher-${teacherId}`);
    console.log(`Teacher ${teacherId} joined room`);
  });

  // Join room for all students (for announcements)
  socket.on("join-all-students", () => {
    socket.join("all-students");
    console.log("Client joined all-students room");
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Export io for use in routes
app.locals.io = io;

// Start server - bind to 0.0.0.0 for Railway deployment
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on http://0.0.0.0:${PORT}`);
  console.log(`📡 WebSocket server is ready`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 JWT_SECRET: ${process.env.JWT_SECRET ? 'Set' : 'NOT SET - Authentication will fail!'}`);
  console.log(`🌐 CORS Origins: ${corsOrigins.join(', ')}`);
}).on('error', (err) => {
  console.error('❌ Server failed to start:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`   Port ${PORT} is already in use`);
  }
  process.exit(1);
});

