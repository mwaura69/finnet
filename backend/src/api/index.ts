import { Router } from 'express';
import { v1Router } from './v1/index.js';
export const apiRouter = Router();
apiRouter.use('/v1', v1Router);
// Assessment compatibility: same protected endpoints are also reachable under /api.
apiRouter.use('/', v1Router);
