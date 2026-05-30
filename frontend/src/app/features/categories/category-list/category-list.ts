import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridModule } from 'ag-grid-angular';
import { AllCommunityModule, ColDef, GridOptions, ModuleRegistry } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-material.css';

ModuleRegistry.registerModules([AllCommunityModule]);
import { CategoryService } from '../../../shared/services/category.service';
import { Category } from '../../../shared/models/category.model';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CategoryFormComponent } from '../category-form/category-form';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { CinformationComponent } from '../../../shared/components/cinformation/cinformation.component';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [
    CommonModule,
    AgGridModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './category-list.html',
  styleUrl: './category-list.scss',
})  
export class CategoryList implements OnInit {
  private categoryService = inject(CategoryService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private relativeTimePipe = new RelativeTimePipe();

  loading = false;
  gridApi: any;
  rowDataSource: any;

  columnDefs: ColDef[] = [
    { field: 'name', headerName: 'Category Name', flex: 2, minWidth: 150 },
    { field: 'description', headerName: 'Description', flex: 2, minWidth: 150 },
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
        return `
          <div class="grid-actions">
            <button class="grid-action-btn edit" data-action="edit" data-id="${params.data.id}" title="Edit">
              <span>edit</span>
            </button>
            <button class="grid-action-btn delete" data-action="delete" data-id="${params.data.id}" title="Delete">
              <span>delete</span>
            </button>
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
    this.rowDataSource = this.createCategoryDatasource();
  }

  openAddCategory() {
    const dialogRef = this.dialog.open(CategoryFormComponent, {
      width: '520px',
      maxWidth: '95vw'
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.refreshCategories();
    });
  }

  createCategoryDatasource() {
    return {
      getRows: (params: any) => {
        const pageSize = this.gridOptions.cacheBlockSize ?? 10;
        const page = Math.floor(params.startRow / pageSize) + 1;

        this.categoryService.getCategoriesPage({ page, limit: pageSize }).subscribe({
          next: (response) => {
            params.successCallback(response.items, response.total);
          },
          error: () => {
            params.failCallback();
            this.snackBar.open('Failed to load categories', 'Close', { duration: 3000 });
          }
        });
      }
    };
  }

  onGridReady(params: any) {
    this.gridApi = params.api;

    document.addEventListener('click', (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const button = target.closest('button[data-action][data-id]') as HTMLButtonElement | null;
      if (!button) {
        return;
      }

      const action = button.getAttribute('data-action');
      const categoryId = button.getAttribute('data-id');
      if (!action || !categoryId) {
        return;
      }

      const gridWrapper = document.querySelector('.categories-container');
      if (!gridWrapper || !gridWrapper.contains(button)) {
        return;
      }

      event.stopPropagation();
      event.preventDefault();

      let rowData: any = null;
      this.gridApi.forEachNode((node: any) => {
        if (node.data?.id === categoryId) {
          rowData = node.data;
        }
      });

      if (!rowData) {
        return;
      }

      if (action === 'edit') {
        this.editCategory(rowData);
      } else if (action === 'delete') {
        this.deleteCategory(rowData);
      }
    });
  }

  refreshCategories() {
    if (this.gridApi) {
      this.gridApi.purgeInfiniteCache();
    }
  }

  editCategory(category: Category) {
    const dialogRef = this.dialog.open(CategoryFormComponent, {
      width: '500px',
      data: { category }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.refreshCategories();
    });
  }

  deleteCategory(category: Category) {
    const dialogRef = this.dialog.open(CinformationComponent, {
      width: '420px',
      maxWidth: '95vw',
      data: {
        title: 'Confirm Delete',
        message: `Are you sure you want to delete the category "${category.name}"?`
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed || !category.id) {
        return;
      }

      this.categoryService.deleteCategory(category.id).subscribe({
        next: () => {
          this.snackBar.open('Category deleted successfully', 'Close', { duration: 3000 });
          this.refreshCategories();
        },
        error: () => {
          this.snackBar.open('Failed to delete category', 'Close', { duration: 3000 });
        }
      });
    });
  }

}
