export interface TransactionModel {
  id: string;
  portfolio_id: string;
  instrument: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  unit_price_minor: number;
  trade_date: string;
  created_at: string;
}
