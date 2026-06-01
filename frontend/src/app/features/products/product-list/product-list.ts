import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridModule } from 'ag-grid-angular';
import { AllCommunityModule, ColDef, GridOptions, ModuleRegistry } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-material.css';

ModuleRegistry.registerModules([AllCommunityModule]);
import { ProductService } from '../../../shared/services/product.service';
import { CategoryService } from '../../../shared/services/category.service';
import { Product } from '../../../shared/models/product.model';
import { Category } from '../../../shared/models/category.model';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { ProductFormComponent } from '../product-form/product-form';
import { CinformationComponent } from '../../../shared/components/cinformation/cinformation.component';
import { StockAdjustmentDialogComponent } from '../../stock-movements/stock-adjustment-dialog/stock-adjustment-dialog';
import { ToastService } from '../../../shared/services/toast.service';
import { AutoFocusDirective } from '../../../shared/directives/auto-focus.directive';
import { CentsCurrencyPipe } from '../../../shared/pipes/cents-currency.pipe';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    AgGridModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    FormsModule,
    MatCardModule,
    MatInputModule,
    AutoFocusDirective
  ],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductList implements OnInit {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);
  private centsCurrencyPipe = new CentsCurrencyPipe();
  private relativeTimePipe = new RelativeTimePipe();
  private authService = inject(AuthService);

  categories: Category[] = [];
  canModify = true;
  loading = false;
  selectedCategory = '';
  selectedStatus: boolean | '' = '';
  searchText = '';
  gridApi: any;
  rowDataSource: any;

  columnDefs: ColDef[] = [
    { field: 'name', headerName: 'Product Name', flex: 2, minWidth: 150 },
    { field: 'sku', headerName: 'SKU', flex: 1, minWidth: 120 },
    { field: 'description', headerName: 'Description', flex: 2, minWidth: 150 },
    { field: 'category.name', headerName: 'Category', flex: 1, minWidth: 120 },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      minWidth: 120,
      cellRenderer: (params: any) => {
        const row = params.data || {};
        const isActive = row.active === true ;
        const label = isActive ? 'Active' : 'Inactive';
        const className = isActive ? 'status-badge status-active' : 'status-badge status-inactive';
        return `<span class="${className}">${label}</span>`;
      }
    },
    { field: 'priceInCents', headerName: 'Price', flex: 1, minWidth: 100, cellDataType: 'number', valueFormatter: params => this.centsCurrencyPipe.transform(params.value) },
    { field: 'stock', headerName: 'Stock', flex: 1, minWidth: 100, cellDataType: 'number' },
    { field: 'createdAt', headerName: 'Created', flex: 1, minWidth: 150, valueFormatter: params => this.relativeTimePipe.transform(params.value) },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1,
      minWidth: 132,
      maxWidth: 150,
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: (params: any) => {
        if (!params.data?.id) return '';
        const adjustBtn = `
          <button class="grid-action-btn adjust" data-action="adjust" data-id="${params.data.id}" title="Adjust Stock">
            <span>inventory_2</span>
          </button>
        `;
        let editDelete = '';
        if (this.canModify) {
          editDelete = `
            <button class="grid-action-btn edit" data-action="edit" data-id="${params.data.id}" title="Edit">
              <span>edit</span>
            </button>
            <button class="grid-action-btn delete" data-action="delete" data-id="${params.data.id}" title="Delete">
              <span>delete</span>
            </button>
          `;
        }
        return `
          <div class="grid-actions">
            ${adjustBtn}
            ${editDelete}
          </div>
        `;
      }
    }
  ];

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
  };

  gridOptions: GridOptions = {
    theme: 'legacy',
    rowModelType: 'infinite',
    pagination: true,
    paginationPageSize: 10,
    cacheBlockSize: 10,
    maxBlocksInCache: 2,
    animateRows: true,
  };

  ngOnInit() {
    this.canModify = !this.authService.hasRole('staff');
    this.loadCategories();
    this.rowDataSource = this.createProductDatasource();
  }

  applyFilters() {
    if (this.gridApi) {
      this.gridApi.purgeInfiniteCache();
      this.gridApi.setGridOption('datasource', this.rowDataSource);
    }
  }

  onSearchChange() {
    this.applyFilters();
  }

  clearSearch() {
    this.searchText = '';
    this.applyFilters();
  }

  clearFilters() {
    this.selectedCategory = '';
    this.selectedStatus = '';
    this.searchText = '';
    this.applyFilters();
  }

  openAddProduct() {
    const dialogRef = this.dialog.open(ProductFormComponent, {
      width: '620px',
      maxWidth: '95vw',
      data: { categories: this.categories }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.refreshProducts();
      }
    });
  }

  createProductDatasource() {
    return {
      getRows: (params: any) => {
        const pageSize = this.gridOptions.cacheBlockSize ?? 10;
        const page = Math.floor(params.startRow / pageSize) + 1;
        const filter: any = {
          page,
          limit: pageSize,
          categoryId: this.selectedCategory || undefined,
          search: this.searchText || undefined,
          active: this.selectedStatus !== '' ? this.selectedStatus : undefined,
        };

        this.productService.getProductsPage(filter).subscribe({
          next: (response) => {
            params.successCallback(response.items, response.total);
          },
          error: (error) => {
            params.failCallback();
            this.toast.error(error, 'Failed to load products');
          }
        });
      }
    };
  }

  onGridReady(params: any) {
    this.gridApi = params.api;
    this.gridApi.setGridOption('datasource', this.rowDataSource);

    document.addEventListener('click', (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const button = target.closest('button[data-action][data-id]') as HTMLButtonElement | null;
      if (!button) {
        return;
      }

      const action = button.getAttribute('data-action');
      const productId = button.getAttribute('data-id');
      if (!action || !productId) {
        return;
      }

      // Only react to actions inside this grid container
      const gridWrapper = document.querySelector('.products-container');
      if (!gridWrapper || !gridWrapper.contains(button)) {
        return;
      }

      event.stopPropagation();
      event.preventDefault();

      let rowData: Product | null = null;
      this.gridApi.forEachNode((node: any) => {
        if (node.data?.id === productId) {
          rowData = node.data;
        }
      });

      if (!rowData) {
        return;
      }

      if (action === 'adjust') {
        this.adjustStock(rowData);
      } else if (action === 'edit') {
        this.editProduct(rowData);
      } else if (action === 'delete') {
        this.deleteProduct(rowData);
      }
    });
  }

  loadCategories() {
    this.categoryService.getCategories().subscribe({
      next: (response) => {
        this.categories = response.data || response;
      },
      error: (error) => {
        this.toast.error(error, 'Failed to load categories');
      }
    });
  }

  refreshProducts() {
    if (this.gridApi) {
      this.gridApi.purgeInfiniteCache();
    }
  }

  trackByCategoryId(index: number, category: Category) {
    return category.id ?? index;
  }

  editProduct(product: Product) {
    const dialogRef = this.dialog.open(ProductFormComponent, {
      width: '600px',
      data: { product, categories: this.categories }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.refreshProducts();
      }
    });
  }

  adjustStock(product: Product) {
    const dialogRef = this.dialog.open(StockAdjustmentDialogComponent, {
      width: '500px',
      maxWidth: '95vw',
      data: { product }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.refreshProducts();
      }
    });
  }

  deleteProduct(product: Product) {
    const dialogRef = this.dialog.open(CinformationComponent, {
      width: '420px',
      maxWidth: '95vw',
      data: {
        title: 'Confirm Delete',
        message: `Are you sure you want to delete the product "${product.name}"?`
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) {
        return;
      }

      this.productService.deleteProduct(product.id!).subscribe({
        next: () => {
          this.toast.success('Product deleted successfully');
          this.refreshProducts();
        },
        error: (error) => {
          this.toast.error(error, 'Failed to delete product');
        }
      });
    });
  }

}
