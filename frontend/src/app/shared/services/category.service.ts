import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/services/api';
import { Category, CategoryFilter } from '../models/category.model';
import { BehaviorSubject, Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private api = inject(ApiService);
  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  public categories$ = this.categoriesSubject.asObservable();

  getCategories(filter?: CategoryFilter): Observable<any> {
    let url = 'categories';
    if (filter) {
      const params = new URLSearchParams();
      if (filter.page) params.append('page', filter.page.toString());
      if (filter.limit) params.append('limit', filter.limit.toString());
      if (filter.search) params.append('search', filter.search);
      url += '?' + params.toString();
    }
    return this.api.get<any>(url);
  }

  getCategoriesPage(filter?: CategoryFilter): Observable<{ items: Category[]; total: number; page: number; limit: number }> {
    let url = 'categories';
    if (filter) {
      const params = new URLSearchParams();
      if (filter.page) params.append('page', filter.page.toString());
      if (filter.limit) params.append('limit', filter.limit.toString());
      if (filter.search) params.append('search', filter.search);
      url += '?' + params.toString();
    }

    return this.api.get<any>(url).pipe(
      map(response => {
        const items = Array.isArray(response)
          ? response
          : Array.isArray(response?.items)
          ? response.items
          : [];

        return {
          items: items as Category[],
          total: typeof response?.total === 'number' ? response.total : items.length,
          page: response?.page ?? filter?.page ?? 1,
          limit: response?.limit ?? filter?.limit ?? 10,
        };
      }),
    );
  }

  getCategoryById(id: string): Observable<Category> {
    return this.api.get<Category>(`categories/${id}`);
  }

  createCategory(category: Category): Observable<Category> {
    return this.api.post<Category>('categories', category);
  }

  updateCategory(id: string, category: Partial<Category>): Observable<Category> {
    return this.api.put<Category>(`categories/${id}`, category);
  }

  deleteCategory(id: string): Observable<void> {
    return this.api.delete<void>(`categories/${id}`);
  }

  setCategories(categories: Category[]) {
    this.categoriesSubject.next(categories);
  }
}
