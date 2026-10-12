export function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(
    new Date(value),
  );
}

export function formatDateTime(value: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatCurrency(amount: number, currency = 'MVR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}
