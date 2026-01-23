import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { logger } from "hono/logger";
import { errorHandler } from "./middleware/error";
import authRoutes from "./routes/auth";

const app = new Hono();

// Middleware stack
app.use("*", logger());
app.use("*", secureHeaders());
app.use(
  "*",
  cors({
    origin: (origin) => {
      // Allow localhost for development
      const allowedOrigins = [
        "http://localhost:8888",
        "http://127.0.0.1:8888",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://atlast.byarielm.fyi",
      ];

      // Allow browser extensions
      if (
        origin.startsWith("chrome-extension://") ||
        origin.startsWith("moz-extension://")
      ) {
        return origin;
      }

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return origin;
      }

      // Default to allowing for backward compatibility
      return origin;
    },
    credentials: true,
  }),
);

// Mount routes
app.route("/api/auth", authRoutes);

// Health check endpoint
app.get("/api/health", (c) => {
  return c.json({
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "atlast-api",
      version: "1.0.0",
    },
  });
});

// Error handling
app.onError(errorHandler);

// Start server
const port = parseInt(process.env.PORT || "3000");

console.log(`🚀 ATlast API server starting...`);
console.log(`📍 Port: ${port}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`✅ Server is running on http://localhost:${info.port}`);
  },
);

export default app;
