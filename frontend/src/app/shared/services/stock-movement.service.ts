import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/services/api';
import { StockMovement, StockMovementFilter, StockAdjustmentDto, StockReport } from '../models/stock-movement.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StockMovementService {
  private api = inject(ApiService);

  getStockMovements(filter?: StockMovementFilter): Observable<{ items: StockMovement[]; total: number; page: number; limit: number }> {
    let url = 'stock-movements';
    if (filter) {
      const params = new URLSearchParams();
      if (filter.page) params.append('page', filter.page.toString());
      if (filter.limit) params.append('limit', filter.limit.toString());
      if (filter.productId) params.append('productId', filter.productId);
      if (filter.type) params.append('type', filter.type);
      if (filter.startDate) params.append('startDate', filter.startDate);
      if (filter.endDate) params.append('endDate', filter.endDate);
      url += '?' + params.toString();
    }
    return this.api.get<any>(url);
  }

  getStockMovementsByProduct(productId: string): Observable<StockMovement[]> {
    return this.api.get<StockMovement[]>(`stock-movements/product/${productId}`);
  }

  adjustStock(dto: StockAdjustmentDto): Observable<StockMovement> {
    return this.api.post<StockMovement>('stock-movements', dto);
  }

  downloadStockMovementsExcel(filter?: StockMovementFilter): Observable<Blob> {
    let url = 'stock-movements/export/excel';
    if (filter) {
      const params = new URLSearchParams();
      if (filter.productId) params.append('productId', filter.productId);
      if (filter.type) params.append('type', filter.type);
      if (filter.startDate) params.append('startDate', filter.startDate);
      if (filter.endDate) params.append('endDate', filter.endDate);
      const query = params.toString();
      if (query) url += '?' + query;
    }
    return this.api.getBlob(url);
  }

  downloadStockMovementsPdf(filter?: StockMovementFilter): Observable<Blob> {
    let url = 'stock-movements/export/pdf';
    if (filter) {
      const params = new URLSearchParams();
      if (filter.productId) params.append('productId', filter.productId);
      if (filter.type) params.append('type', filter.type);
      if (filter.startDate) params.append('startDate', filter.startDate);
      if (filter.endDate) params.append('endDate', filter.endDate);
      const query = params.toString();
      if (query) url += '?' + query;
    }
    return this.api.getBlob(url);
  }

  getStockReport(startDate?: string, endDate?: string): Observable<StockReport> {
    let url = 'stock-movements/report';
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    url += '?' + params.toString();
    return this.api.get<StockReport>(url);
  }
}