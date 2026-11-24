import { HttpErrorResponse } from '@angular/common/http';
import { validateTrade, type TradeDraft } from './transaction-validation';
import { Component, input, output, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Api, message } from '../core/api';
import type { Currency, Holding } from '../core/models';
import { Dialog } from './dialog';
import { number, money } from '../core/format';
@Component({
  selector: 'ft-transaction-dialog',
  imports: [FormsModule, Dialog],
  templateUrl: './transaction-dialog.html',
})
export class TransactionDialog {
  portfolioId = input.required<string>();
  currency = input.required<Currency>();
  holdings = input<Holding[]>([]);
  saved = output();
  missing = output();
  touched: Record<string, boolean> = {};
  submitted = false;
  serverFields: Record<string, string> = {};
  instruments() {
    return [
      ...new Set(['SCOM', 'KCB', 'EQTY', 'T-BILL-91', ...this.holdings().map((h) => h.instrument)]),
    ];
  }
  fieldError(field: string) {
    return (
      this.serverFields[field] ||
      (this.submitted || this.touched[field] ? validateTrade(this.model, this.today)[field] : '')
    );
  }
  changed(field: string) {
    delete this.serverFields[field];
  }
  closed = output();
  api = inject(Api);
  busy = signal(false);
  error = signal('');
  number = number;
  money = money;
  today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  model: TradeDraft = {
    instrument: '',
    type: 'BUY',
    quantity: null,
    unitPrice: null,
    tradeDate: this.today,
  };
  available() {
    return (
      this.holdings().find((h) => h.instrument === this.model.instrument.toUpperCase())
        ?.netQuantity || 0
    );
  }
  close() {
    if (!this.busy()) this.closed.emit();
  }
  async save(form: NgForm) {
    this.submitted = true;
    if (
      this.busy() ||
      Object.keys(validateTrade(this.model, this.today)).length ||
      form.invalid ||
      this.model.quantity === null ||
      this.model.unitPrice === null
    )
      return;
    this.busy.set(true);
    this.error.set('');
    this.serverFields = {};
    try {
      await this.api.addTransaction(this.portfolioId(), {
        ...this.model,
        quantity: this.model.quantity,
        unitPrice: this.model.unitPrice,
        instrument: this.model.instrument.trim().toUpperCase(),
      });
      this.saved.emit();
    } catch (e) {
      if (e instanceof HttpErrorResponse && e.status === 404) {
        this.missing.emit();
        return;
      }
      if (e instanceof HttpErrorResponse) {
        for (const detail of e.error?.error?.details || []) {
          if (typeof detail.field === 'string' && typeof detail.message === 'string')
            this.serverFields[detail.field] = detail.message;
        }
        if (e.error?.error?.code === 'INSUFFICIENT_HOLDINGS')
          this.serverFields['quantity'] = message(e);
      }
      this.error.set(message(e));
    } finally {
      this.busy.set(false);
    }
  }
}
