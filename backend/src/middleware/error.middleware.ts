import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../config/logger.js';
export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, _next) => {
  const requestId = req.requestId;
  if (err instanceof ZodError) {
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Check the highlighted fields.',
        details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
        requestId,
      },
    });
    return;
  }
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, requestId } });
    return;
  }
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.', requestId },
    });
    return;
  }
  if (typeof err === 'object' && err !== null && 'type' in err && err.type === 'entity.too.large') {
    res.status(413).json({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds 32 KB.', requestId },
    });
    return;
  }
  logger.error({ requestId, err }, 'Unhandled API error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again.',
      requestId,
    },
  });
};
