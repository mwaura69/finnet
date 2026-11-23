import { Component, computed, input } from '@angular/core';
import type { Currency, Holding } from '../core/models';
import { money } from '../core/format';
@Component({
  selector: 'ft-allocation',
  template: `@if (total() > 0) {
      <div class="allocation-layout">
        <div
          class="donut"
          [style.background]="gradient()"
          role="img"
          [attr.aria-label]="description()"
        >
          <div class="donut-center">
            <span>{{ holdings().length }}</span
            ><small>instruments</small>
          </div>
        </div>
        <ul class="allocation-legend">
          @for (h of holdings(); track h.instrument; let i = $index) {
            <li>
              <span class="legend-name"
                ><i [style.background]="colors[i % colors.length]"></i>{{ h.instrument }}</span
              ><span class="legend-value"
                >{{ ((h.totalValue / total()) * 100).toFixed(1) }}%<small>{{
                  money(h.totalValue, currency())
                }}</small></span
              >
            </li>
          }
        </ul>
      </div>
    } @else {
      <div class="empty compact">
        <span class="empty-symbol">◌</span>
        <h3>Your allocation starts here</h3>
        <p>Record a buy transaction to see how this portfolio is invested.</p>
      </div>
    }`,
})
export class Allocation {
  holdings = input.required<Holding[]>();
  currency = input.required<Currency>();
  money = money;
  colors = ['#087f7d', '#193c5b', '#71869b', '#b7c8d6', '#466879', '#364554'];
  total = computed(() => this.holdings().reduce((s, h) => s + h.totalValue, 0));
  gradient = computed(() => {
    let start = 0;
    return (
      'conic-gradient(' +
      this.holdings()
        .map((h, i) => {
          const end = start + (h.totalValue / this.total()) * 100;
          const part = `${this.colors[i % this.colors.length]} ${start}% ${end}%`;
          start = end;
          return part;
        })
        .join(',') +
      ')'
    );
  });
  description = computed(() =>
    this.holdings()
      .map(
        (h) =>
          `${h.instrument}: ${((h.totalValue / this.total()) * 100).toFixed(1)} percent, ${money(h.totalValue, this.currency())}`,
      )
      .join('; '),
  );
}
