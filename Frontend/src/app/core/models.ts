export type Currency = 'KES' | 'USD';
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: 'admin' | 'analyst' | 'viewer';
  emailVerified: boolean;
  emailMfaEnabled: boolean;
  transactionEmails: boolean;
  productEmails: boolean;
  onboardingCompleted: boolean;
}
export interface SessionInfo {
  accessExpiresAt: string;
  sessionExpiresAt: string;
  idleTimeoutSeconds: number;
}
export interface Session {
  user: User;
  demoMode: boolean;
  session: SessionInfo;
}
export interface MfaChallenge {
  requiresMfa: true;
  challengeId: string;
  emailHint: string;
  expiresAt: string;
  purpose?: 'login' | 'enable';
}
export interface AuthCapabilities {
  googleClientId: string | null;
  emailDelivery: 'smtp' | 'outbox';
  passwordPolicy: { minLength: number };
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
  permissions?: {
    canEdit: boolean;
    canDelete: boolean;
    canRecordTransactions: boolean;
    canManageMembers: boolean;
  };
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

export interface Receipt {
  receiptNumber: string;
  issuedAt: string;
  portfolio: { id: string; name: string; clientName: string; baseCurrency: Currency };
  transaction: Transaction & { totalValue: number };
  disclaimer: string;
  analyst: { id: string; name: string; email: string };
}
