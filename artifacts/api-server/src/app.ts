import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import router from "./routes";
import { logger } from "./lib/logger";
import path from 'path';
import { fileURLToPath } from 'url';

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// parse cookies so we can use req.cookies for session cookie handling
app.use(cookieParser());

// API routes
app.use("/api", router);

// Serve built frontend (if present)
// The frontend build outDir is set to artifacts/mimihub/dist/public in vite.config.ts
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticPath = path.resolve(__dirname, '..', '..', 'mimihub', 'dist', 'public');

app.use(express.static(staticPath));
// SPA fallback to index.html for any non-API GET requests
app.get('*', (req, res) => {
  // If the request path starts with /api, let the API router handle it (shouldn't reach here),
  // otherwise serve index.html so the client-side router can handle the route.
  if (req.path.startsWith('/api')) return res.status(404).send('Not Found');
  res.sendFile(path.join(staticPath, 'index.html'));
});

export default app;
