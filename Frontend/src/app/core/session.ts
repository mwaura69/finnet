/** Password and concurrency helpers shared by account flows and focused security tests. */
export function validPassword(value: string): boolean {
  return (
    value.length >= 8 &&
    new TextEncoder().encode(value).length <= 72 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9\s]/.test(value)
  );
}
export class SingleFlight<T> {
  private pending: Promise<T> | null = null;
  run(operation: () => Promise<T>): Promise<T> {
    if (!this.pending)
      this.pending = operation().finally(() => {
        this.pending = null;
      });
    return this.pending;
  }
}
export function isPublicAuthRequest(path: string): boolean {
  return /^\/auth\/(?:csrf|config|login|register|google|refresh|logout|verify-email|resend-verification|forgot-password|reset-password|set-password|mfa\/verify|mfa\/resend)$/.test(
    path,
  );
}
