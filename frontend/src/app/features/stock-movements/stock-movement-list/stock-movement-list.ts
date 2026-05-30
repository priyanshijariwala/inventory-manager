import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridModule } from 'ag-grid-angular';
import { AllCommunityModule, ColDef, GridOptions, ModuleRegistry } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-material.css';

ModuleRegistry.registerModules([AllCommunityModule]);
import { StockMovementService } from '../../../shared/services/stock-movement.service';
import { ProductService } from '../../../shared/services/product.service';
import { MovementType, StockMovementFilter } from '../../../shared/models/stock-movement.model';
import { Product } from '../../../shared/models/product.model';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { SearchPipe } from '../../../shared/pipes/search-pipe';

@Component({
  selector: 'app-stock-movement-list',
  standalone: true,
  imports: [
    CommonModule,
    AgGridModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    FormsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatCardModule,
    RouterLink,
    SearchPipe
  ],
  templateUrl: './stock-movement-list.html',
  styleUrl: './stock-movement-list.scss'
})
export class StockMovementList implements OnInit {
  private stockMovementService = inject(StockMovementService);
  private productService = inject(ProductService);
  private snackBar = inject(MatSnackBar);
  private relativeTimePipe = new RelativeTimePipe();

  loading = false;
  products: Product[] = [];
  gridApi: any;
  rowDataSource: any;

  // Filters
  selectedProduct = '';
  selectedType: MovementType | '' = '';
  startDate: Date | null = null;
  endDate: Date | null = null;
  productSearchText = '';

  columnDefs: ColDef[] = [
    { field: 'product.name', headerName: 'Product', flex: 2, minWidth: 150 },
    { field: 'product.sku', headerName: 'SKU', flex: 1, minWidth: 100 },
    {
      field: 'type',
      headerName: 'Type',
      flex: 1,
      minWidth: 120,
      cellRenderer: (params: any) => {
        const type = params.value;
        const colors: Record<string, string> = {
          restock: '#4caf50',
          sale: '#f44336',
          adjustment: '#ff9800',
          return: '#2196f3',
          damage: '#9c27b0'
        };
        const color = colors[type] || '#666';
        return `<span style="color: ${color}; font-weight: 500; text-transform: capitalize;">${type}</span>`;
      }
    },
    {
      field: 'quantity',
      headerName: 'Quantity',
      flex: 1,
      minWidth: 100,
      cellRenderer: (params: any) => {
        const qty = params.value;
        const color = qty > 0 ? '#4caf50' : qty < 0 ? '#f44336' : '#666';
        return `<span style="color: ${color}; font-weight: 600;">${qty > 0 ? '+' : ''}${qty}</span>`;
      }
    },
    { field: 'stockBefore', headerName: 'Stock Before', flex: 1, minWidth: 100, cellDataType: 'number' },
    { field: 'stockAfter', headerName: 'Stock After', flex: 1, minWidth: 100, cellDataType: 'number' },
    { field: 'reason', headerName: 'Reason', flex: 1.5, minWidth: 150 },
    { field: 'reference', headerName: 'Reference', flex: 1, minWidth: 120 },
    {
      field: 'performedBy',
      headerName: 'Performed By',
      flex: 1.5,
      minWidth: 150,
      valueGetter: (params: any) => params.data?.performedBy 
        ? `${params.data.performedBy.email}` 
        : ''
    },
    {
      field: 'createdAt',
      headerName: 'Date',
      flex: 1,
      minWidth: 150,
      valueFormatter: (params: any) => this.relativeTimePipe.transform(params.value)
    }
  ];

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true
  };

  gridOptions: GridOptions = {
    theme: 'legacy',
    rowModelType: 'infinite',
    pagination: true,
    paginationPageSize: 20,
    cacheBlockSize: 20,
    maxBlocksInCache: 3,
    animateRows: true
  };

  ngOnInit() {
    this.setDefaultDateRange();
    this.loadProducts();
    this.rowDataSource = this.createStockMovementDatasource();
  }

  private setDefaultDateRange() {
    const today = new Date();
    this.startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    this.endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  }

  loadProducts() {
    this.productService.getProducts().subscribe({
      next: (response: any) => {
        const items = response?.items || response?.data || response || [];
        this.products = items;
      },
      error: () => {
        this.snackBar.open('Failed to load products', 'Close', { duration: 3000 });
      }
    });
  }

  createStockMovementDatasource() {
    return {
      getRows: (params: any) => {
        const pageSize = this.gridOptions.cacheBlockSize ?? 20;
        const page = Math.floor(params.startRow / pageSize) + 1;
        const filter: StockMovementFilter = {
          page,
          limit: pageSize
        };

        if (this.selectedProduct) filter.productId = this.selectedProduct;
        if (this.selectedType) filter.type = this.selectedType;
        if (this.isValidDate(this.startDate)) filter.startDate = this.toIsoDateBoundary(this.startDate, 'start');
        if (this.isValidDate(this.endDate)) filter.endDate = this.toIsoDateBoundary(this.endDate, 'end');

        this.stockMovementService.getStockMovements(filter).subscribe({
          next: (response) => {
            params.successCallback(response.items, response.total);
          },
          error: () => {
            params.failCallback();
            this.snackBar.open('Failed to load stock movements', 'Close', { duration: 3000 });
          }
        });
      }
    };
  }

  onGridReady(params: any) {
    this.gridApi = params.api;
    this.gridApi.setGridOption('datasource', this.rowDataSource);
  }

  onFilterChange() {
    this.refreshGrid();
  }

  private refreshGrid() {
    if (this.gridApi) {
      this.gridApi.purgeInfiniteCache();
      this.gridApi.setGridOption('datasource', this.rowDataSource);
    }
  }

  clearFilters() {
    this.selectedProduct = '';
    this.selectedType = '';
    this.setDefaultDateRange();
    this.productSearchText = '';
    this.refreshGrid();
  }

  private toIsoDateBoundary(date: Date, boundary: 'start' | 'end'): string {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    if (boundary === 'start') {
      return new Date(Date.UTC(year, month, day, 0, 0, 0, 0)).toISOString();
    }

    return new Date(Date.UTC(year, month, day, 23, 59, 59, 999)).toISOString();
  }

  private isValidDate(value: Date | null): value is Date {
    return value instanceof Date && !Number.isNaN(value.getTime());
  }

  getMovementTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      restock: 'Restock',
      sale: 'Sale',
      adjustment: 'Adjustment',
      return: 'Return',
      damage: 'Damage'
    };
    return labels[type] || type;
  }

  trackByProductId(index: number, product: Product) {
    return product.id ?? index;
  }
}
