import type { Request, Response, NextFunction, RequestHandler } from 'express';
/** Express 5 already forwards rejected promises; this makes the controller boundary explicit. */
export const asyncHandler =
  (
    handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
  ): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
