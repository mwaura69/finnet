import type { UserModel } from '../../../db/models/user.model.js';
import type { UserDto } from './user.types.js';
export function toUserDto(row: UserModel): UserDto {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url,
    role: row.role,
    emailVerified: !!row.email_verified,
    emailMfaEnabled: !!row.email_mfa_enabled,
    transactionEmails: !!row.transaction_emails,
    productEmails: !!row.product_emails,
    onboardingCompleted: !!row.onboarding_completed,
    hasPassword: !!row.password_hash,
  };
}
