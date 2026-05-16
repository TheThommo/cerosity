import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { debugLogger, runStartupDiagnostics, withErrorLogging } from "./debug";
import { requireProductionEnv } from "./env";
import { readDeployManifest } from "./deploy";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    debugLogger.success('server', '🚀 Starting Red2Blue server initialization...');
    requireProductionEnv(); // In production, exit fast if required env vars are missing (see docs/ENV-VARS.md)
    // Run comprehensive startup diagnostics
    const diagnostics = await runStartupDiagnostics();
    if (!diagnostics.success) {
      debugLogger.error('server', 'Startup diagnostics failed - server may not work correctly');
      console.error('DEPLOYMENT FAILURE DETECTED:', diagnostics.summary);
      // Continue anyway to allow debugging in deployed environment
    }
    
    debugLogger.success('server', 'Registering routes...');
    const server = await withErrorLogging('server', 'route registration', registerRoutes)(app);

    // Enhanced error handling with detailed logging
    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      debugLogger.error('server', `Request error: ${req.method} ${req.path}`, {
        status,
        message,
        stack: err.stack,
        body: req.body,
        headers: req.headers,
        user: (req as any).userId || 'anonymous'
      });

      res.status(status).json({ message });
    });

    // Environment-based setup with detailed logging
    // Force production mode when running from built file or when NODE_ENV is production
    const isBuiltVersion = process.argv[1]?.includes('dist/index.js') || import.meta.url.includes('dist/index.js');
    const isProduction = process.env.NODE_ENV === "production" || isBuiltVersion;
    
    debugLogger.log('server', 'success', `Environment detected: ${isProduction ? 'production' : 'development'}`);
    debugLogger.log('server', 'info', `Built version: ${isBuiltVersion}, NODE_ENV: ${process.env.NODE_ENV}, argv[1]: ${process.argv[1]}`);

    // Must register before SPA static fallback (serveStatic uses app.use("*", ...)).
    app.get('/api/health', async (_req, res) => {
      const manifest = readDeployManifest();
      const health = {
        status: 'healthy' as const,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'unknown',
        uptime: process.uptime(),
        commit: manifest?.commit ?? process.env.RAILWAY_GIT_COMMIT_SHA ?? null,
        builtAt: manifest?.builtAt ?? null,
        clientEntry: manifest?.clientEntry ?? null,
        hasDarkTheme: manifest?.hasDarkTheme ?? null,
        checks: {
          database: false,
          staticBundle: Boolean(manifest?.clientEntry),
        },
      };

      try {
        const { db } = await import('./db');
        await db.execute('SELECT 1');
        health.checks.database = true;
      } catch {
        debugLogger.warning('health', 'Database health check failed');
      }

      res.json(health);
    });
    
    if (!isProduction) {
      debugLogger.success('server', 'Setting up Vite development server...');
      await withErrorLogging('server', 'vite setup', setupVite)(app, server);
    } else {
      debugLogger.success('server', 'Setting up static file serving for production...');
      await withErrorLogging('server', 'static setup', serveStatic)(app);
    }

    // Diagnostic endpoint for deployment debugging (disabled in production to avoid leaking env/logs)
    app.get('/api/diagnostics', (req, res) => {
      if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ message: 'Not available' });
      }
      (async () => {
        try {
          const freshDiagnostics = await runStartupDiagnostics();
          res.json({
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'unknown',
            platform: process.platform,
            nodeVersion: process.version,
            diagnostics: freshDiagnostics,
            logs: debugLogger.getDiagnostics().slice(-50) // Last 50 logs
          });
        } catch (error: any) {
          debugLogger.error('diagnostics', 'Failed to generate diagnostics report', { error: error.message });
          res.status(500).json({ error: error.message });
        }
      })();
    });

    const port = parseInt(process.env.PORT || '5000', 10);
    debugLogger.success('server', `Starting server on port ${port}...`);

    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      debugLogger.success('server', `🎉 Cerosity server is now serving on port ${port}`);
      debugLogger.success('server', `Environment: ${isProduction ? 'production' : 'development'}`);
      debugLogger.success('server', `Health check: http://localhost:${port}/api/health`);
      debugLogger.success('server', `Diagnostics: http://localhost:${port}/api/diagnostics`);
      log(`serving on port ${port}`);
    });
    
  } catch (error: any) {
    debugLogger.error('server', '💥 Fatal server startup error', {
      error: error.message,
      stack: error.stack
    });
    console.error('FATAL SERVER ERROR:', error);
    process.exit(1);
  }
})();
