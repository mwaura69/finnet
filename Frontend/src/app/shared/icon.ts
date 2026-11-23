import { Component, input } from '@angular/core';
@Component({
  selector: 'ft-icon',
  host: { 'aria-hidden': 'true' },
  template: `<svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path [attr.d]="paths[name()] || paths['chart']" />
  </svg>`,
  styles: [
    `
      :host {
        display: inline-flex;
        width: 1.25rem;
        height: 1.25rem;
        flex-shrink: 0;
      }
      svg {
        width: 100%;
        height: 100%;
      }
    `,
  ],
})
export class Icon {
  name = input('chart');
  paths: Record<string, string> = {
    grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    wallet: 'M3 6h17v14H3z M3 6V4h15v2 M16 11h5v5h-5z',
    chart: 'M4 20h17 M5 16l5-5 4 3 6-9 M15 5h5v5',
    plus: 'M12 5v14 M5 12h14',
    search: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    chevron: 'm9 5 7 7-7 7',
    down: 'm6 9 6 6 6-6',
    logout: 'M9 4H4v16h5 M9 12h12 m-4-4 4 4-4 4',
    close: 'm6 6 12 12 M6 18 18 6',
    menu: 'M4 6h16 M4 12h16 M4 18h16',
    edit: 'm15 4 5 5 M4 20l4-1L20 7a2 2 0 0 0-3-3L5 16z',
    trash: 'M3 6h18 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7',
    download: 'M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5',
    shield: 'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7z m-4 6 3 3 5-5',
    book: 'M12 5v16 M12 5C8 2 3 3 3 3v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2',
    refresh: 'M20 11a8 8 0 1 0-2 7 M20 4v7h-7',
    check: 'm5 12 4 4L20 5',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    info: 'M12 11v6 M12 7v.1 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    swap: 'M4 8h16 m-4-4 4 4-4 4 M20 16H4 m4-4-4 4 4 4',
    clock: 'M12 6v6l4 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    briefcase: 'M3 7h18v14H3z M8 7V3h8v4 M3 12h18 M10 12v3h4v-3',
  };
}
