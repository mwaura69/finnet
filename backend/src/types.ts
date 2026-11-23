export interface PortfolioInput { name: string; clientName: string; baseCurrency: 'KES' | 'USD'; }
export interface TransactionInput { instrument: string; type: 'BUY' | 'SELL'; quantity: number; unitPrice: number; tradeDate: string; }
export interface LedgerTransaction extends TransactionInput { id: string; createdAt: string; }
export interface Holding { instrument: string; netQuantity: number; averageCost: number; totalInvested: number; unitPrice: number; totalValue: number; unrealizedGain: number; }
