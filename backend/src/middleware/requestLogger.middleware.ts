import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { logger } from '../config/logger.js';

export const requestLogger: RequestHandler = (req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  const start = performance.now();
  res.on('finish', () => {
    logger.info(
      {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Math.round(performance.now() - start),
      },
      'request completed',
    );
  });
  next();
};
