import { AccountActionPage } from './pages/account-action.page';
import { MfaPage } from './pages/mfa.page';
import { ProfilePage } from './pages/profile.page';
import { TermsPage } from './pages/terms.page';
import { ReceiptPage } from './pages/receipt.page';
import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { Auth } from './core/api';
import { AuthPage } from './pages/auth.page';
import { Shell } from './shared/shell';
import { DashboardPage } from './pages/dashboard.page';
import { DetailPage } from './pages/detail.page';
const signedIn: CanActivateFn = async () => {
  const auth = inject(Auth),
    router = inject(Router);
  return (await auth.restore()) || router.createUrlTree(['/login']);
};
export const routes: Routes = [
  ...[
    'forgot-password',
    'reset-password',
    'set-password',
    'verify-email',
    'resend-verification',
  ].map((path) => ({ path, component: AccountActionPage, title: 'Account security · FinTrack' })),
  { path: 'mfa', component: MfaPage, title: 'Email verification · FinTrack' },
  { path: 'terms', component: TermsPage, title: 'Terms · FinTrack' },
  { path: 'login', component: AuthPage, title: 'Sign in · FinTrack' },
  { path: 'register', component: AuthPage, title: 'Create account · FinTrack' },
  {
    path: '',
    component: Shell,
    canActivate: [signedIn],
    canActivateChild: [signedIn],
    children: [
      { path: 'profile', component: ProfilePage, title: 'Profile · FinTrack' },
      { path: 'settings', component: ProfilePage, title: 'Settings · FinTrack' },
      { path: 'transactions/:id/receipt', component: ReceiptPage, title: 'Receipt · FinTrack' },
      { path: '', pathMatch: 'full', component: DashboardPage, title: 'Overview · FinTrack' },
      { path: 'portfolios', component: DashboardPage, title: 'Portfolios · FinTrack' },
      { path: 'portfolios/:id', component: DetailPage, title: 'Portfolio · FinTrack' },
    ],
  },
  { path: '**', redirectTo: '' },
];
