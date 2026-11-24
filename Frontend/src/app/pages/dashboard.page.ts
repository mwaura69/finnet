import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api, Auth, message } from '../core/api';
import type { Currency, Portfolio, Summary, Transaction } from '../core/models';
import { money, number, percentage, signedMoney } from '../core/format';
import { Icon } from '../shared/icon';
import { Allocation } from '../shared/allocation';
import { PortfolioDialog } from '../shared/portfolio-dialog';
import { Dialog } from '../shared/dialog';
@Component({
  selector: 'ft-dashboard',
  imports: [FormsModule, RouterLink, DatePipe, Icon, Allocation, PortfolioDialog, Dialog],
  templateUrl: './dashboard.page.html',
})
export class DashboardPage implements OnInit {
  api = inject(Api);
  auth = inject(Auth);
  router = inject(Router);
  portfolioView = this.router.url.startsWith('/portfolios');
  money = money;
  number = number;
  percentage = percentage;
  signedMoney = signedMoney;
  today = new Date();
  currency = signal<Currency>('KES');
  query = signal('');
  portfolios = signal<Portfolio[]>([]);
  loading = signal(true);
  error = signal('');
  notice = signal('');
  featuredLoading = signal(false);
  featuredError = signal('');
  summary = signal<Summary | null>(null);
  transactions = signal<Transaction[]>([]);
  spotlightId = signal('');
  editor = signal<Portfolio | null | undefined>(undefined);
  deleting = signal<Portfolio | null>(null);
  deleteBusy = signal(false);
  deleteError = signal('');
  private featureRequest = 0;
  inCurrency = computed(() => this.portfolios().filter((p) => p.baseCurrency === this.currency()));
  filtered = computed(() =>
    this.inCurrency().filter((p) =>
      (p.name + ' ' + p.clientName).toLowerCase().includes(this.query().toLowerCase()),
    ),
  );
  total = computed(() => this.inCurrency().reduce((s, p) => s + p.totalValue, 0));
  invested = computed(() => this.inCurrency().reduce((s, p) => s + p.totalInvested, 0));
  gain = computed(() => this.total() - this.invested());
  featured = computed(
    () => this.inCurrency().find((p) => p.id === this.spotlightId()) || this.inCurrency()[0],
  );
  ngOnInit() {
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      this.portfolios.set(await this.api.list());
      await this.loadFeatured();
    } catch (e) {
      this.error.set(message(e));
    } finally {
      this.loading.set(false);
    }
  }
  setCurrency(currency: Currency) {
    this.currency.set(currency);
    this.query.set('');
    void this.loadFeatured();
  }
  async loadFeatured() {
    const p = this.featured();
    const request = ++this.featureRequest;
    this.summary.set(null);
    this.transactions.set([]);
    this.featuredError.set('');
    this.featuredLoading.set(!!p);
    if (!p) return;
    try {
      const [s, t] = await Promise.all([this.api.summary(p.id), this.api.transactions(p.id)]);
      if (request !== this.featureRequest) return;
      this.summary.set(s);
      this.transactions.set(t);
    } catch (e) {
      if (request === this.featureRequest) this.featuredError.set(message(e));
    } finally {
      if (request === this.featureRequest) this.featuredLoading.set(false);
    }
  }
  changeSpotlight(id: string) {
    this.spotlightId.set(id);
    void this.loadFeatured();
  }
  async saved(p: Portfolio) {
    const edit = !!this.editor();
    this.editor.set(undefined);
    this.currency.set(p.baseCurrency);
    if (!edit) {
      await this.router.navigate(['/portfolios', p.id], { state: { notice: 'Portfolio created. Add your first transaction to get started.' } });
      return;
    }
    this.notice.set('Portfolio updated.');
    await this.load();
  }
  async remove() {
    const p = this.deleting();
    if (!p || this.deleteBusy()) return;
    this.deleteBusy.set(true);
    this.deleteError.set('');
    try {
      await this.api.deletePortfolio(p.id);
      this.deleting.set(null);
      this.notice.set('Portfolio and its transactions deleted.');
      await this.load();
    } catch (e) {
      this.deleteError.set(message(e));
    } finally {
      this.deleteBusy.set(false);
    }
  }
  confirmDelete(p: Portfolio) {
    this.deleteError.set('');
    this.deleting.set(p);
  }
}
