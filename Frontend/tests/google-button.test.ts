import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
const window = new Window();
Object.assign(globalThis, { window, document: window.document });
await import('@angular/compiler');
const { GoogleIdentity } = await import('../src/app/core/google');
test('Google button follows the measured form width, resizes, and disconnects its observer', async () => {
  let width = 380;
  let notify: () => void = () => {};
  let disconnected = false;
  const rendered: number[] = [];
  window.google = {
    accounts: {
      id: {
        initialize: () => {},
        renderButton: (element, options) => {
          rendered.push(options.width);
          element.appendChild(window.document.createElement('button'));
        },
      },
    },
  };
  Object.assign(globalThis, {
    ResizeObserver: class {
      constructor(callback: () => void) {
        notify = callback;
      }
      observe() {}
      disconnect() {
        disconnected = true;
      }
    },
  });
  const host = window.document.createElement('div');
  Object.defineProperty(host, 'clientWidth', { get: () => width });
  const dispose = await new GoogleIdentity().render(
    host as unknown as HTMLElement,
    'test-client',
    () => {},
  );
  assert.deepEqual(rendered, [380], 'Do not fall back to a 260px button');
  width = 327;
  notify();
  assert.deepEqual(rendered, [380, 327]);
  notify();
  assert.equal(rendered.length, 2, 'Height-only/unchanged resize must not loop');
  width = 540;
  notify();
  assert.equal(rendered.at(-1), 400, 'Respect Google maximum');
  assert.equal(host.children.length, 1, 'Resize replaces the old button');
  dispose();
  assert.equal(disconnected, true);
  window.happyDOM.abort();
});
