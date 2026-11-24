export type { PortfolioInput, Holding } from '../../../types/index.js';
export interface PortfolioDto {
  id: string;
  name: string;
  clientName: string;
  baseCurrency: 'KES' | 'USD';
  createdAt: string;
  totalValue: number;
  totalInvested: number;
  unrealizedGain: number;
  holdingsCount: number;
  transactionCount: number;
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canRecordTransactions: boolean;
    canManageMembers: boolean;
  };
}
