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
  { path: 'login', component: AuthPage, title: 'Sign in · FinTrack' },
  { path: 'register', component: AuthPage, title: 'Create account · FinTrack' },
  {
    path: '',
    component: Shell,
    canActivate: [signedIn],
    children: [
      { path: '', pathMatch: 'full', component: DashboardPage, title: 'Overview · FinTrack' },
      { path: 'portfolios', component: DashboardPage, title: 'Portfolios · FinTrack' },
      { path: 'portfolios/:id', component: DetailPage, title: 'Portfolio · FinTrack' },
    ],
  },
  { path: '**', redirectTo: '' },
];
