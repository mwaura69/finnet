import express from 'express';
import { requireCsrf } from './security/cookies.js';
import cors from 'cors';
import helmet from 'helmet';
import { db } from './db/index.js';
import { config } from './config/index.js';
import { apiRouter } from './api/index.js';
import { requestLogger } from './middleware/requestLogger.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { notFound } from './middleware/notFound.middleware.js';
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  // Trust only the configured nearest proxy hops, never arbitrary forwarded addresses.
  app.set('trust proxy', config.trustProxyHops || false);
  app.use(requestLogger);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: config.origin,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    }),
  );
  app.use(express.json({ limit: '2mb' }));
  app.get('/health', async (_req, res) => {
    try {
      await db.prepare('SELECT 1 AS ready').get();
      res.json({ status: 'ok', mode: config.demo ? 'demo' : 'api', database: db.kind });
    } catch {
      res.status(503).json({ status: 'error', database: db.kind });
    }
  });
  app.use(
    '/api',
    (_req, res, next) => {
      res.setHeader('Cache-Control', 'no-store');
      next();
    },
    requireCsrf,
    apiRouter,
  );
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
