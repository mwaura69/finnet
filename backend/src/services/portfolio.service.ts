import { ApiError } from '../errors.js';
import type { PortfolioInput, TransactionInput } from '../types.js';
/** IMPLEMENT HERE. These protected routes intentionally return 501 outside demo mode.
 * Keep this interface and the OpenAPI response contract so the Angular UI needs no changes.
 * backend/src/demo/demo.service.ts is an optional, SQLite-backed reference adapter.
 */
function pending(): never { throw new ApiError(501, 'NOT_IMPLEMENTED', 'Implement backend/src/services/portfolio.service.ts, or use npm run dev:demo to preview the interface.'); }
export class PortfolioService {
  list(_userId: string): unknown { return pending(); }
  get(_userId: string, _id: string): unknown { return pending(); }
  create(_userId: string, _input: PortfolioInput): unknown { return pending(); }
  update(_userId: string, _id: string, _input: PortfolioInput): unknown { return pending(); }
  remove(_userId: string, _id: string): void { pending(); }
  transactions(_userId: string, _id: string): unknown { return pending(); }
  addTransaction(_userId: string, _id: string, _input: TransactionInput): unknown { return pending(); }
  removeTransaction(_userId: string, _id: string): void { pending(); }
  summary(_userId: string, _id: string): unknown { return pending(); }
}
