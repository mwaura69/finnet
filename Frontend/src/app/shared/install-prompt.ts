import { Component, inject, Injectable, signal } from '@angular/core';
import { Dialog } from './dialog';
import { Icon } from './icon';
interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
@Injectable({ providedIn: 'root' })
export class InstallApp {
  private deferred: InstallEvent | null = null;
  standalone = signal(window.matchMedia('(display-mode: standalone)').matches);
  available = signal(false);
  constructor() {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferred = event as InstallEvent;
      this.available.set(true);
    });
    window.addEventListener('appinstalled', () => {
      this.standalone.set(true);
      this.available.set(false);
      this.deferred = null;
    });
  }
  async install() {
    if (!this.deferred) return false;
    const event = this.deferred;
    this.deferred = null;
    this.available.set(false);
    await event.prompt();
    await event.userChoice;
    return true;
  }
}
@Component({
  selector: 'ft-install-prompt',
  imports: [Dialog, Icon],
  template: `@if (!app.standalone()) {
      <button class="text-button install-link" (click)="install()">
        <ft-icon name="download" />Install FinTrack
      </button>
    }
    @if (help()) {
      <ft-dialog (closed)="help.set(false)"
        ><h2 dialog-title>FinTrack, on your home screen</h2>
        <p class="dialog-intro">
          Keep your portfolio workspace one tap away, with the same secure sign-in.
        </p>
        <ol class="install-instructions">
          <li>
            On iPhone or iPad, open this site in Safari, choose Share, then Add to Home Screen.
          </li>
          <li>
            On Android or desktop Chrome/Edge, open the browser menu and choose Install app or Add
            to Home Screen when offered.
          </li>
        </ol>
        <p class="field-help">
          Installation requires HTTPS, or localhost during development. Reconnect to view financial
          records; sensitive data is never cached offline.
        </p>
        <div class="dialog-actions">
          <button class="button primary" (click)="help.set(false)">Got it</button>
        </div></ft-dialog
      >
    }`,
})
export class InstallPrompt {
  app = inject(InstallApp);
  help = signal(false);
  async install() {
    if (!(await this.app.install())) this.help.set(true);
  }
}
