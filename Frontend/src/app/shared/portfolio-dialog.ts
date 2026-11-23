import { Component, OnInit, input, output, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Api, message } from '../core/api';
import type { Portfolio, PortfolioInput } from '../core/models';
import { Dialog } from './dialog';
@Component({
  selector: 'ft-portfolio-dialog',
  imports: [FormsModule, Dialog],
  template: `<ft-dialog (closed)="close()"
    ><h2 dialog-title>{{ portfolio() ? 'Edit portfolio' : 'Create a portfolio' }}</h2>
    <p class="dialog-intro">
      Give your client's investments a home. You can add transactions next.
    </p>
    <form #form="ngForm" (ngSubmit)="save(form)">
      <fieldset [disabled]="busy()">
        <label for="portfolio-name">Portfolio name</label
        ><input
          id="portfolio-name"
          name="name"
          [(ngModel)]="model.name"
          required
          minlength="2"
          maxlength="100"
          placeholder="e.g. East Africa Growth"
          autofocus
        />
        <label for="client-name">Client name</label
        ><input
          id="client-name"
          name="clientName"
          [(ngModel)]="model.clientName"
          required
          minlength="2"
          maxlength="100"
          placeholder="e.g. Amani Capital"
        />
        <label for="base-currency">Base currency</label
        ><select
          id="base-currency"
          name="baseCurrency"
          [(ngModel)]="model.baseCurrency"
          [disabled]="!!portfolio()?.transactionCount"
        >
          <option value="KES">KES — Kenyan shilling</option>
          <option value="USD">USD — US dollar</option>
        </select>
        <p class="field-help">
          All transactions use this currency. It is fixed after the first trade.
        </p>
        @if (form.submitted && form.invalid) {
          <p class="form-error" role="alert">
            Enter a portfolio and client name of at least two characters.
          </p>
        }
        @if (error()) {
          <p class="form-error" role="alert">{{ error() }}</p>
        }
        <div class="dialog-actions">
          <button type="button" class="button secondary" (click)="close()">Cancel</button
          ><button class="button primary" type="submit">
            {{ busy() ? 'Saving…' : portfolio() ? 'Save changes' : 'Create portfolio' }}
          </button>
        </div>
      </fieldset>
    </form></ft-dialog
  >`,
})
export class PortfolioDialog implements OnInit {
  portfolio = input<Portfolio | null>(null);
  saved = output<Portfolio>();
  closed = output();
  api = inject(Api);
  busy = signal(false);
  error = signal('');
  model: PortfolioInput = { name: '', clientName: '', baseCurrency: 'KES' };
  ngOnInit() {
    const p = this.portfolio();
    if (p) this.model = { name: p.name, clientName: p.clientName, baseCurrency: p.baseCurrency };
  }
  close() {
    if (!this.busy()) this.closed.emit();
  }
  async save(form: NgForm) {
    if (form.invalid || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      this.saved.emit(await this.api.savePortfolio(this.model, this.portfolio()?.id));
    } catch (e) {
      this.error.set(message(e));
    } finally {
      this.busy.set(false);
    }
  }
}
