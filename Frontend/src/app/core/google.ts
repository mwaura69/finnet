import { Injectable } from '@angular/core';
interface GoogleIdentityApi {
  initialize(config: {
    client_id: string;
    callback: (response: { credential: string }) => void;
    auto_select: boolean;
    ux_mode: 'popup';
  }): void;
  renderButton(
    element: HTMLElement,
    options: { theme: string; size: string; width: number; text: string; shape: string },
  ): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentityApi } };
  }
}
@Injectable({ providedIn: 'root' })
export class GoogleIdentity {
  private loading: Promise<void> | null = null;
  private load() {
    if (window.google?.accounts.id) return Promise.resolve();
    if (!this.loading)
      this.loading = new Promise<void>((resolve, reject) => {
        let script = document.querySelector<HTMLScriptElement>('script[data-fintrack-google]');
        if (!script) {
          script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          script.dataset['fintrackGoogle'] = 'true';
          document.head.appendChild(script);
        }
        script.addEventListener('load', () => resolve(), { once: true });
        script.addEventListener(
          'error',
          () => {
            this.loading = null;
            script?.remove();
            reject(
              new Error('Google sign-in could not load. Check your connection and try again.'),
            );
          },
          { once: true },
        );
      });
    return this.loading;
  }
  async render(element: HTMLElement, clientId: string, callback: (credential: string) => void) {
    await this.load();
    if (!window.google?.accounts.id) throw new Error('Google sign-in is unavailable.');
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => callback(response.credential),
      auto_select: false,
      ux_mode: 'popup',
    });
    let lastWidth = 0;
    const renderButton = () => {
      const width = Math.min(400, Math.floor(element.clientWidth));
      if (width <= 0 || width === lastWidth) return;
      lastWidth = width;
      element.replaceChildren();
      window.google!.accounts.id.renderButton(element, {
        theme: 'outline',
        size: 'large',
        width,
        text: 'continue_with',
        shape: 'rectangular',
      });
    };
    renderButton();
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(renderButton);
    observer?.observe(element);
    return () => observer?.disconnect();
  }
}
