export type Currency = 'KES' | 'USD';
export interface User {
  id: string;
  name: string;
  email: string;
}
export interface Session {
  token: string;
  user: User;
  demoMode: boolean;
}
export interface Portfolio {
  id: string;
  name: string;
  clientName: string;
  baseCurrency: Currency;
  createdAt: string;
  totalValue: number;
  totalInvested: number;
  unrealizedGain: number;
  holdingsCount: number;
  transactionCount: number;
}
export type PortfolioInput = Pick<Portfolio, 'name' | 'clientName' | 'baseCurrency'>;
export interface Transaction {
  id: string;
  instrument: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  unitPrice: number;
  tradeDate: string;
  createdAt: string;
}
export type TransactionInput = Omit<Transaction, 'id' | 'createdAt'>;
export interface Holding {
  instrument: string;
  netQuantity: number;
  averageCost: number;
  totalInvested: number;
  unitPrice: number;
  totalValue: number;
  unrealizedGain: number;
}
export interface Summary {
  holdings: Holding[];
  totalInvested: number;
  totalValue: number;
  unrealizedGain: number;
  realizedGain: number;
  valuationMethod: 'latest-transaction-price';
}
export interface Envelope<T> {
  data: T;
}
