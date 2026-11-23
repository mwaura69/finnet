export interface PortfolioModel {
  id: string;
  user_id: string;
  name: string;
  client_name: string;
  base_currency: 'KES' | 'USD';
  created_at: string;
}
