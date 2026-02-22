import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { errorLogger } from "./errorLogger";
import { startContinuousLearning } from "./learningEngine";
import { startAnalyticsAgent } from "./analyticsAgentEngine";
import {
  securityHeadersMiddleware,
  ipBlockMiddleware,
  inputSanitizationMiddleware,
  apiRateLimitMiddleware,
  sessionFingerprintMiddleware,
  csrfTokenMiddleware,
  csrfValidationMiddleware,
} from "./securityMiddleware";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

declare module "express-session" {
  interface SessionData {
    isAuthenticated?: boolean;
    username?: string;
    userId?: string;
    isAdmin?: boolean;
    role?: 'user' | 'admin';
  }
}

app.use(securityHeadersMiddleware);
app.use(ipBlockMiddleware);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(session({
  secret: process.env.SESSION_SECRET || "parlaypro-dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: "lax",
  },
}));

app.use("/api", csrfTokenMiddleware);
app.use("/api", csrfValidationMiddleware);
app.use("/api", apiRateLimitMiddleware);
app.use("/api", inputSanitizationMiddleware);
app.use("/api", sessionFingerprintMiddleware);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    const errorId = errorLogger.logRequestError(
      err instanceof Error ? err : new Error(message),
      {
        path: req.path,
        method: req.method,
        ip: req.ip,
        headers: req.headers as Record<string, string | string[] | undefined>
      },
      req.session?.userId
    );

    res.status(status).json({ 
      message,
      errorId: status >= 500 ? errorId : undefined
    });
    
    console.error(`[${errorId}] ${req.method} ${req.path}:`, err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      
      startContinuousLearning();
      log("AI learning engine activated - improving predictions every second");
      
      startAnalyticsAgent();
      log("Analytics agent engine started — monitoring all systems behind the scenes");
    },
  );
})();
