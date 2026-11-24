import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Api, message } from '../core/api';
import type { Portfolio, Summary, Transaction } from '../core/models';
import { csvCell, money, number, percentage, signedMoney } from '../core/format';
import { Icon } from '../shared/icon';
import { Allocation } from '../shared/allocation';
import { Dialog } from '../shared/dialog';
import { PortfolioDialog } from '../shared/portfolio-dialog';
import { TransactionDialog } from '../shared/transaction-dialog';
type SortKey = 'tradeDate' | 'instrument' | 'quantity' | 'unitPrice' | 'amount';
@Component({
  selector: 'ft-detail',
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    Icon,
    Allocation,
    Dialog,
    PortfolioDialog,
    TransactionDialog,
  ],
  templateUrl: './detail.page.html',
})
export class DetailPage {
  api = inject(Api);
  route = inject(ActivatedRoute);
  router = inject(Router);
  title = inject(Title);
  money = money;
  number = number;
  percentage = percentage;
  signedMoney = signedMoney;
  id = '';
  portfolio = signal<Portfolio | null>(null);
  summary = signal<Summary | null>(null);
  transactions = signal<Transaction[]>([]);
  loading = signal(true);
  error = signal('');
  notice = signal('');
  exportBusy = signal(false);
  exportError = signal('');
  tab = signal<'transactions' | 'holdings'>('transactions');
  search = signal('');
  type = signal('');
  from = signal('');
  to = signal('');
  sort = signal<SortKey>('tradeDate');
  direction = signal<1 | -1>(-1);
  page = signal(1);
  pageSize = 10;
  edit = signal(false);
  adding = signal(false);
  deletePortfolio = signal(false);
  deleting = signal<Transaction | null>(null);
  deleteBusy = signal(false);
  deleteError = signal('');
  filtered = computed(() =>
    this.transactions()
      .filter(
        (t) =>
          (!this.search() || t.instrument.toLowerCase().includes(this.search().toLowerCase())) &&
          (!this.type() || t.type === this.type()) &&
          (!this.from() || t.tradeDate >= this.from()) &&
          (!this.to() || t.tradeDate <= this.to()),
      )
      .sort((a, b) => {
        const key = this.sort();
        const av = key === 'amount' ? a.quantity * a.unitPrice : a[key],
          bv = key === 'amount' ? b.quantity * b.unitPrice : b[key];
        return (
          (typeof av === 'number' && typeof bv === 'number'
            ? av - bv
            : String(av).localeCompare(String(bv))) * this.direction()
        );
      }),
  );
  pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  rows = computed(() =>
    this.filtered().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize),
  );
  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.id = params.get('id') || '';
      void this.load();
    });
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const [p, s, t] = await Promise.all([
        this.api.portfolio(this.id),
        this.api.summary(this.id),
        this.api.transactions(this.id),
      ]);
      this.portfolio.set(p);
      this.summary.set(s);
      this.transactions.set(t);
      this.title.setTitle(`${p.name} · FinTrack`);
      this.page.set(1);
    } catch (e) {
      this.error.set(message(e));
    } finally {
      this.loading.set(false);
    }
  }
  order(key: SortKey) {
    if (this.sort() === key) this.direction.set(this.direction() === 1 ? -1 : 1);
    else {
      this.sort.set(key);
      this.direction.set(key === 'tradeDate' ? -1 : 1);
    }
    this.page.set(1);
  }
  sortLabel(key: SortKey) {
    return this.sort() === key ? (this.direction() === 1 ? 'ascending' : 'descending') : 'none';
  }
  reset() {
    this.search.set('');
    this.type.set('');
    this.from.set('');
    this.to.set('');
    this.page.set(1);
  }
  async savedPortfolio() {
    this.edit.set(false);
    this.notice.set('Portfolio updated.');
    await this.load();
  }
  async savedTransaction() {
    this.adding.set(false);
    this.notice.set('Transaction recorded. Holdings are up to date.');
    await this.load();
  }
  confirmTransaction(t: Transaction) {
    this.deleteError.set('');
    this.deleting.set(t);
  }
  async remove() {
    if (this.deleteBusy()) return;
    this.deleteBusy.set(true);
    this.deleteError.set('');
    try {
      if (this.deletePortfolio()) {
        await this.api.deletePortfolio(this.id);
        await this.router.navigateByUrl('/portfolios');
      } else if (this.deleting()) {
        await this.api.deleteTransaction(this.deleting()!.id);
        this.deleting.set(null);
        this.notice.set('Transaction deleted. Holdings have been recalculated.');
        await this.load();
      }
    } catch (e) {
      this.deleteError.set(message(e));
    } finally {
      this.deleteBusy.set(false);
    }
  }
  async exportExcel() {
    if (this.exportBusy()) return;
    this.exportBusy.set(true);
    this.exportError.set('');
    try {
      const blob = await this.api.exportTransactions(this.id, {
        instrument: this.search(),
        type: this.type(),
        from: this.from(),
        to: this.to(),
        sort: this.sort(),
        direction: this.direction() === 1 ? 'asc' : 'desc',
      });
      const url = URL.createObjectURL(blob),
        anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `fintrack-${this.id}-transactions.xlsx`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.notice.set('Filtered transactions downloaded as an Excel workbook.');
    } catch (error) {
      this.exportError.set(message(error));
    } finally {
      this.exportBusy.set(false);
    }
  }
  exportCsv() {
    const p = this.portfolio();
    if (!p) return;
    const lines = [
      [
        'Instrument',
        'Type',
        'Quantity',
        `Unit price (${p.baseCurrency})`,
        `Total (${p.baseCurrency})`,
        'Trade date',
      ],
      ...this.filtered().map((t) => [
        t.instrument,
        t.type,
        t.quantity,
        t.unitPrice,
        t.quantity * t.unitPrice,
        t.tradeDate,
      ]),
    ];
    const blob = new Blob(['\ufeff' + lines.map((r) => r.map(csvCell).join(',')).join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fintrack-${p.id}-transactions.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.notice.set('Filtered transactions exported as CSV.');
  }
}
