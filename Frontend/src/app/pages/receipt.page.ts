import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Api, message } from '../core/api';
import type { Receipt } from '../core/models';
import { money, number } from '../core/format';
import { Icon } from '../shared/icon';
@Component({
  selector: 'ft-receipt-page',
  imports: [DatePipe, RouterLink, Icon],
  template: `<div class="receipt-actions">
      <a routerLink="/portfolios" class="text-link">Back to portfolios</a
      ><button class="button primary" [disabled]="!receipt()" (click)="print()">
        <ft-icon name="download" />Print / Save PDF
      </button>
    </div>
    @if (loading()) {
      <div class="loading-state" role="status">
        <span class="spinner"></span>Loading your receipt…
      </div>
    } @else if (error()) {
      <div class="error-state" role="alert">
        <h1>Receipt unavailable</h1>
        <p>{{ error() }}</p>
        <button class="button secondary" (click)="load()">Try again</button>
      </div>
    } @else if (receipt(); as r) {
      <article class="receipt-sheet">
        <header class="receipt-header">
          <img src="/brand/finnet-logo-dark.svg" alt="Finnet Nexus Group" width="205" height="66" />
          <div>
            <span class="eyebrow">FINTRACK BY FINNET TECHNOLOGIES</span>
            <h1>Portfolio transaction receipt</h1>
            <p>{{ r.receiptNumber }}</p>
          </div>
        </header>
        <div class="receipt-meta">
          <div>
            <span>Client</span><strong>{{ r.portfolio.clientName }}</strong
            ><small>{{ r.portfolio.name }}</small>
          </div>
          <div>
            <span>Trade date</span><strong>{{ r.transaction.tradeDate | date: 'd MMMM y' }}</strong
            ><small>Recorded {{ r.issuedAt | date: 'd MMM y, HH:mm' : '+0300' }} EAT</small>
          </div>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Instrument</th>
                <th>Type</th>
                <th class="numeric">Quantity</th>
                <th class="numeric">Unit price</th>
                <th class="numeric">Transaction value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>{{ r.transaction.instrument }}</strong>
                </td>
                <td>{{ r.transaction.type }}</td>
                <td class="numeric">{{ number(r.transaction.quantity) }}</td>
                <td class="numeric">
                  {{ money(r.transaction.unitPrice, r.portfolio.baseCurrency) }}
                </td>
                <td class="numeric">
                  <strong>{{ money(r.transaction.totalValue, r.portfolio.baseCurrency) }}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="receipt-total">
          <span>Total recorded value</span
          ><strong>{{ money(r.transaction.totalValue, r.portfolio.baseCurrency) }}</strong>
        </div>
        <div class="receipt-signoff">
          <div>
            <span>Recorded by</span><strong>{{ r.analyst.name }}</strong
            ><small>{{ r.analyst.email }}</small>
          </div>
          <p>{{ r.disclaimer }}</p>
        </div>
        <footer>
          FinTrack · Finnet Nexus Group · {{ r.portfolio.baseCurrency }} portfolio ledger
        </footer>
      </article>
    }`,
})
export class ReceiptPage {
  private api = inject(Api);
  private route = inject(ActivatedRoute);
  receipt = signal<Receipt | null>(null);
  loading = signal(true);
  error = signal('');
  money = money;
  number = number;
  constructor() {
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      this.receipt.set(await this.api.receipt(this.route.snapshot.paramMap.get('id') || ''));
    } catch (error) {
      this.error.set(message(error));
    } finally {
      this.loading.set(false);
    }
  }
  print() {
    window.print();
  }
}
