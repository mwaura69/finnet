import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { apiRouter } from './api/index.js';
import { requestLogger } from './middleware/requestLogger.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { notFound } from './middleware/notFound.middleware.js';
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestLogger);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: config.origin,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  app.use(express.json({ limit: '32kb' }));
  app.get('/health', (_req, res) =>
    res.json({ status: 'ok', mode: config.demo ? 'demo' : 'scaffold' }),
  );
  app.use('/api', apiRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
