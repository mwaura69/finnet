import { Component, input } from '@angular/core';
export function passwordChecks(value: string) {
  return [
    { label: 'At least 8 characters', met: value.length >= 8 },
    { label: 'Uppercase letter (A–Z)', met: /[A-Z]/.test(value) },
    { label: 'Lowercase letter (a–z)', met: /[a-z]/.test(value) },
    { label: 'Number (0–9)', met: /[0-9]/.test(value) },
    { label: 'Symbol (! @ # $ %)', met: /[^A-Za-z0-9\s]/.test(value) },
  ];
}
@Component({
  selector: 'ft-password-strength',
  template: `<section class="password-strength" aria-label="Password requirements">
    <div class="password-strength-heading">
      <strong>Password length</strong
      ><span [class.complete]="password().length >= 8">{{
        password().length >= 8
          ? password().length + ' characters · 8 minimum met'
          : password().length + ' / 8 minimum'
      }}</span>
    </div>
    <div
      class="password-length-track"
      role="progressbar"
      aria-label="Password minimum length"
      [attr.aria-valuenow]="progress()"
      aria-valuemin="0"
      aria-valuemax="8"
    >
      <i [style.width.%]="(progress() / 8) * 100"></i>
    </div>
    <ul>
      @for (rule of checks(); track rule.label) {
        <li [class.met]="rule.met">
          <span aria-hidden="true">{{ rule.met ? '✓' : '' }}</span
          >{{ rule.label }}<span class="sr-only">{{ rule.met ? ' met' : ' not met' }}</span>
        </li>
      }
    </ul>
  </section>`,
})
export class PasswordStrength {
  password = input('');
  checks() {
    return passwordChecks(this.password());
  }
  progress() {
    return Math.min(8, this.password().length);
  }
}
