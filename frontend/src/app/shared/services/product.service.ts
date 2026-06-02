import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/services/api';
import { Product, ProductFilter } from '../models/product.model';
import { BehaviorSubject, Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private api = inject(ApiService);
  private productsSubject = new BehaviorSubject<Product[]>([]);
  public products$ = this.productsSubject.asObservable();

  getProducts(filter?: ProductFilter): Observable<Product[]> {
    let url = 'products';
    if (filter) {
      const params = new URLSearchParams();
      if (filter.page) params.append('page', filter.page.toString());
      if (filter.limit) params.append('limit', filter.limit.toString());
      if (filter.search) params.append('q', filter.search);
      if (filter.categoryId) params.append('categoryId', filter.categoryId);
      if (filter.active !== undefined) params.append('active', String(filter.active));
      url += '?' + params.toString();
    }

    return this.api.get<any>(url).pipe(
      map(response => {
        if (Array.isArray(response)) {
          return response as Product[];
        }
        if (Array.isArray(response?.items)) {
          return response.items as Product[];
        }
        return [];
      }),
    );
  }

  getProductsPage(filter?: ProductFilter): Observable<{ items: Product[]; total: number; page: number; limit: number }> {
    let url = 'products';
    if (filter) {
      const params = new URLSearchParams();
      if (filter.page) params.append('page', filter.page.toString());
      if (filter.limit) params.append('limit', filter.limit.toString());
      if (filter.search) params.append('q', filter.search);
      if (filter.categoryId) params.append('categoryId', filter.categoryId);
      if (filter.active !== undefined) params.append('active', String(filter.active));
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
          items: items as Product[],
          total: typeof response?.total === 'number' ? response.total : items.length,
          page: response?.page ?? filter?.page ?? 1,
          limit: response?.limit ?? filter?.limit ?? 10,
        };
      }),
    );
  }

  getProductById(id: string): Observable<Product> {
    return this.api.get<Product>(`products/${id}`);
  }

  createProduct(product: Product): Observable<Product> {
    return this.api.post<Product>('products', product);
  }

  updateProduct(id: string, product: Partial<Product>): Observable<Product> {
    return this.api.put<Product>(`products/${id}`, product);
  }

  deleteProduct(id: string): Observable<void> {
    return this.api.delete<void>(`products/${id}`);
  }

  downloadImportSample(): Observable<Blob> {
    return this.api.getBlob('products/import/sample');
  }

  importProducts(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.postFormData<any>('products/import', formData);
  }

  setProducts(products: Product[]) {
    this.productsSubject.next(products);
  }
}
