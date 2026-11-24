export interface UserDto {
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
  hasPassword: boolean;
}
