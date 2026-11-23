import { ApiError } from '../../../utils/ApiError.js';
import type { TransactionInput } from './transaction.types.js';
/** IMPLEMENT HERE: ownership, ledger validation, atomic writes and response mapping. */
function pending(): never {
  throw new ApiError(
    501,
    'NOT_IMPLEMENTED',
    'Implement backend/src/api/v1/transactions/transaction.service.ts, or use npm run dev:demo to preview the interface.',
  );
}
export class TransactionService {
  list(_userId: string, _portfolioId: string): unknown {
    return pending();
  }
  create(_userId: string, _portfolioId: string, _input: TransactionInput): unknown {
    return pending();
  }
  remove(_userId: string, _transactionId: string): void {
    pending();
  }
}
