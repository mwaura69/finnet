import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const window = new Window();
Object.assign(globalThis, {
  window,
  document: window.document,
  HTMLElement: window.HTMLElement,
  Node: window.Node,
});
window.HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
await import('@angular/compiler');
const { TestBed } = await import('@angular/core/testing');
const { BrowserTestingModule, platformBrowserTesting } =
  await import('@angular/platform-browser/testing');
const { HttpErrorResponse } = await import('@angular/common/http');
const compiled = (name: string) =>
  import(pathToFileURL(resolve('out-tsc/app/app/' + name + '.js')).href);
const { TransactionDialog } = await compiled('shared/transaction-dialog');
const { Api } = await compiled('core/api');
TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
test('transaction form preserves input and links server errors; missing portfolio closes via its event', async () => {
  let status = 422;
  const api = {
    addTransaction: async () => {
      throw new HttpErrorResponse({
        status,
        error: {
          error: {
            message: 'Not enough holdings',
            details: [{ field: 'quantity', message: 'You hold 50 SCOM; cannot sell 100' }],
          },
        },
      });
    },
  };
  TestBed.configureTestingModule({
    imports: [TransactionDialog],
    providers: [{ provide: Api, useValue: api }],
  });
  const fixture = TestBed.createComponent(TransactionDialog);
  fixture.componentRef.setInput('portfolioId', 'new-portfolio');
  fixture.componentRef.setInput('currency', 'KES');
  const dialog = fixture.componentInstance;
  fixture.detectChanges();
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  assert.equal((el.querySelector('#quantity') as HTMLInputElement).value, '');
  assert.equal((el.querySelector('#unit-price') as HTMLInputElement).value, '');
  assert.equal(el.querySelector('.trade-total'), null);
  for (const id of ['quantity', 'unit-price']) {
    assert.equal(el.querySelector('#' + id)?.getAttribute('inputmode'), 'decimal');
    assert.ok(el.querySelector('#' + id)?.getAttribute('placeholder'));
  }
  assert.equal(el.querySelector('#trade-date')?.getAttribute('max'), dialog.today);
  assert.equal(
    el.querySelectorAll('[role="radiogroup"] input[type="radio"][name="type"]').length,
    2,
  );
  assert.equal(el.querySelector('.trade-selected-check')?.textContent?.trim(), '✓');
  dialog.model.quantity = 100;
  fixture.detectChanges();
  assert.equal(el.querySelector('.trade-total'), null, 'Price must also be filled in');
  dialog.model = {
    instrument: 'SCOM',
    type: 'SELL',
    quantity: 100,
    unitPrice: 25,
    tradeDate: '2026-01-01',
  };
  fixture.detectChanges();
  await fixture.whenStable();
  await dialog.save({ invalid: false });
  fixture.detectChanges();
  assert.equal(dialog.model.quantity, 100);
  assert.equal(dialog.busy(), false);
  assert.match(el.querySelector('#quantity-error')?.textContent || '', /You hold 50 SCOM/);
  assert.equal(el.querySelector('#quantity')?.getAttribute('aria-describedby'), 'quantity-error');
  assert.equal(el.querySelector('#quantity')?.getAttribute('aria-invalid'), 'true');
  assert.match(el.textContent || '', /KES 2,500.00/);
  let missing = false;
  dialog.missing.subscribe(() => (missing = true));
  status = 404;
  await dialog.save({ invalid: false });
  assert.equal(missing, true);
  fixture.destroy();
  TestBed.resetTestingModule();
  window.happyDOM.abort();
});
