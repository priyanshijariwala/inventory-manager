import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'search',
  standalone: true,
})
export class SearchPipe implements PipeTransform {
  transform<T>(
    items: T[] | null | undefined,
    searchText: string | null | undefined,
    keys: string[] = []
  ): T[] {
    if (!items?.length) {
      return [];
    }

    const query = searchText?.trim().toLowerCase();
    if (!query) {
      return items;
    }

    return items.filter((item) => {
      const values = keys.length
        ? keys.map((key) => this.getValue(item, key))
        : Object.values((item ?? {}) as Record<string, unknown>);

      return values.some((value) => String(value ?? '').toLowerCase().includes(query));
    });
  }

  private getValue(item: unknown, key: string): unknown {
    return key.split('.').reduce<unknown>((value, part) => {
      if (value && typeof value === 'object' && part in value) {
        return (value as Record<string, unknown>)[part];
      }

      return undefined;
    }, item);
  }
}
