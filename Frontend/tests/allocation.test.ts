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
await import('@angular/compiler');
const { TestBed } = await import('@angular/core/testing');
const { BrowserTestingModule, platformBrowserTesting } =
  await import('@angular/platform-browser/testing');
// Use Angular-compiled output so signal inputs carry the real compiler metadata.
const { Allocation } = await import(
  pathToFileURL(resolve('out-tsc/app/app/shared/allocation.js')).href
);
TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
test('allocation component renders accessible values from its API-supplied inputs and empty state', async () => {
  TestBed.configureTestingModule({ imports: [Allocation] });
  const fixture = TestBed.createComponent(Allocation);
  fixture.componentRef.setInput('currency', 'KES');
  fixture.componentRef.setInput('holdings', [
    {
      instrument: 'SCOM',
      netQuantity: 10,
      averageCost: 20,
      totalInvested: 200,
      unitPrice: 25,
      totalValue: 250,
      unrealizedGain: 50,
    },
  ]);
  fixture.detectChanges();
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  assert.match(el.textContent || '', /SCOM/);
  assert.match(el.textContent || '', /KES 250.00/);
  assert.match(el.querySelector('[role="img"]')?.getAttribute('aria-label') || '', /100.0 percent/);
  fixture.componentRef.setInput('holdings', []);
  fixture.detectChanges();
  await fixture.whenStable();
  assert.match(el.textContent || '', /Your allocation starts here/);
  assert.equal(el.querySelector('[role="img"]'), null);
  fixture.destroy();
  TestBed.resetTestingModule();
  window.happyDOM.abort();
});
