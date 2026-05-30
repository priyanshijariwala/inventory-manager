import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'relativeTime',
  standalone: true,
})
export class RelativeTimePipe implements PipeTransform {
  transform(value: string | number | Date | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = value instanceof Date ? value : new Date(value);
    const timestamp = date.getTime();

    if (Number.isNaN(timestamp)) {
      return '';
    }

    const diffMs = Date.now() - timestamp;
    const isFuture = diffMs < 0;
    const absMs = Math.abs(diffMs);
    const minutes = Math.floor(absMs / 60000);
    const hours = Math.floor(absMs / 3600000);
    const days = Math.floor(absMs / 86400000);

    if (minutes < 1) {
      return isFuture ? 'Soon' : 'Just now';
    }

    const suffix = isFuture ? 'from now' : 'ago';

    if (minutes < 60) {
      return `${minutes}m ${suffix}`;
    }

    if (hours < 24) {
      return `${hours}h ${suffix}`;
    }

    if (days < 7) {
      return `${days}d ${suffix}`;
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
