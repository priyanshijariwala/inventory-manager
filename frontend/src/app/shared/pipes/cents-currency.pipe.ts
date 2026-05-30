import { Pipe, PipeTransform } from '@angular/core';

export function formatCentsCurrency(
  value: number | string | null | undefined,
  currency = 'USD',
  locale = 'en-US'
): string {
  const numericValue = typeof value === 'string' ? Number(value) : value;
  const cents = Number.isFinite(numericValue) ? Number(numericValue) : 0;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

@Pipe({
  name: 'centsCurrency',
  standalone: true,
})
export class CentsCurrencyPipe implements PipeTransform {
  transform(
    value: number | string | null | undefined,
    currency = 'USD',
    locale = 'en-US'
  ): string {
    return formatCentsCurrency(value, currency, locale);
  }
}
