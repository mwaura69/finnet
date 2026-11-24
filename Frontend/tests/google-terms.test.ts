import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Window } from 'happy-dom';
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
const { Router, ActivatedRoute } = await import('@angular/router');
const compiled = (name: string) =>
  import(pathToFileURL(resolve('out-tsc/app/app/' + name + '.js')).href);
const { AuthPage } = await compiled('pages/auth.page');
const { Auth } = await compiled('core/api');
const { GoogleIdentity } = await compiled('core/google');
TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
test('Google entry from sign-in and registration includes terms without the email checkbox and preserves MFA routing', async () => {
  for (const path of ['login', 'register']) {
    let sent: unknown;
    let destination = '';
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Auth,
          useValue: {
            google: async (input: unknown) => {
              sent = input;
              return { requiresMfa: true };
            },
          },
        },
        {
          provide: Router,
          useValue: {
            navigateByUrl: async (url: string) => {
              destination = url;
            },
          },
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { routeConfig: { path }, queryParamMap: { get: () => null } } },
        },
        { provide: GoogleIdentity, useValue: {} },
      ],
    });
    const page = TestBed.runInInjectionContext(() => new AuthPage());
    assert.equal(page.acceptTerms, false);
    page.stayLoggedIn = true;
    await page.googleLogin('test-google-credential');
    assert.deepEqual(sent, {
      credential: 'test-google-credential',
      stayLoggedIn: true,
      acceptTerms: true,
    });
    assert.equal(destination, '/mfa');
    assert.equal(page.busy(), false);
    assert.equal(
      page.acceptTerms,
      false,
      'Google consent does not check the separate email-registration checkbox',
    );
    TestBed.resetTestingModule();
  }
  window.happyDOM.abort();
});
