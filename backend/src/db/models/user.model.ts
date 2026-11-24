export interface UserModel {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  google_id: string | null;
  email_verified: number;
  avatar_url: string | null;
  role: 'admin' | 'analyst' | 'viewer';
  email_mfa_enabled: number;
  transaction_emails: number;
  product_emails: number;
  onboarding_completed: number;
  terms_accepted_at: string | null;
  terms_version: string | null;
  created_at: string;
}
