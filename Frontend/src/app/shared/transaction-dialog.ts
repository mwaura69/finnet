import { Component, input, output, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Api, message } from '../core/api';
import type { Currency, Holding, TransactionInput } from '../core/models';
import { Dialog } from './dialog';
import { number, money } from '../core/format';
@Component({
  selector: 'ft-transaction-dialog',
  imports: [FormsModule, Dialog],
  template: `<ft-dialog (closed)="close()"
    ><h2 dialog-title>Record a transaction</h2>
    <p class="dialog-intro">Add a trade to your portfolio. Holdings will update automatically.</p>
    <form #form="ngForm" (ngSubmit)="save(form)">
      <fieldset [disabled]="busy()">
        <label for="instrument">Instrument</label
        ><input
          id="instrument"
          name="instrument"
          [(ngModel)]="model.instrument"
          required
          pattern="[a-zA-Z0-9][a-zA-Z0-9.\\-]{0,19}"
          maxlength="20"
          placeholder="e.g. SCOM, KCB, T-BILL-91"
          list="instruments"
          autofocus
        /><datalist id="instruments">
          @for (h of holdings(); track h.instrument) {
            <option [value]="h.instrument"></option>
          }
        </datalist>
        <label for="trade-type">Transaction type</label
        ><select id="trade-type" name="type" [(ngModel)]="model.type">
          <option value="BUY">Buy</option>
          <option value="SELL">Sell</option>
        </select>
        @if (model.type === 'SELL') {
          <p class="field-help">
            {{ number(available()) }} units currently held. Backdated trades are checked against the
            historical ledger.
          </p>
        }
        <div class="form-row">
          <div>
            <label for="quantity">Quantity</label
            ><input
              id="quantity"
              name="quantity"
              type="number"
              [(ngModel)]="model.quantity"
              required
              min="0.0001"
              max="1000000000"
              step="0.0001"
              placeholder="0"
            />
          </div>
          <div>
            <label for="unit-price">Unit price ({{ currency() }})</label
            ><input
              id="unit-price"
              name="unitPrice"
              type="number"
              [(ngModel)]="model.unitPrice"
              required
              min="0.01"
              max="1000000000"
              step="0.01"
              placeholder="0.00"
            />
          </div>
        </div>
        <label for="trade-date">Trade date</label
        ><input
          id="trade-date"
          name="tradeDate"
          type="date"
          [(ngModel)]="model.tradeDate"
          required
          [max]="today"
        />
        <p class="trade-total">
          <span>Transaction value</span
          ><strong>{{ money((model.quantity || 0) * (model.unitPrice || 0), currency()) }}</strong>
        </p>
        @if (form.submitted && form.invalid) {
          <p class="form-error" role="alert">
            Enter a valid instrument, positive quantity and price, and a trade date up to today.
          </p>
        }
        @if (error()) {
          <p class="form-error" role="alert">{{ error() }}</p>
        }
        <div class="dialog-actions">
          <button type="button" class="button secondary" (click)="close()">Cancel</button
          ><button type="submit" class="button primary">
            {{ busy() ? 'Recording…' : 'Record transaction' }}
          </button>
        </div>
      </fieldset>
    </form></ft-dialog
  >`,
})
export class TransactionDialog {
  portfolioId = input.required<string>();
  currency = input.required<Currency>();
  holdings = input<Holding[]>([]);
  saved = output();
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
  model: TransactionInput = {
    instrument: '',
    type: 'BUY',
    quantity: 0,
    unitPrice: 0,
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
    if (form.invalid || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.addTransaction(this.portfolioId(), {
        ...this.model,
        instrument: this.model.instrument.toUpperCase(),
      });
      this.saved.emit();
    } catch (e) {
      this.error.set(message(e));
    } finally {
      this.busy.set(false);
    }
  }
}
