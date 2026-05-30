import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridModule } from 'ag-grid-angular';
import { AllCommunityModule, ColDef, GridOptions, ModuleRegistry } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-material.css';

ModuleRegistry.registerModules([AllCommunityModule]);
import { UserService } from '../../../shared/services/user.service';
import { User } from '../../../shared/models/user.model';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { UserFormComponent } from '../user-form/user-form';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    AgGridModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
})
export class UserList implements OnInit {
  private userService = inject(UserService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private relativeTimePipe = new RelativeTimePipe();

  loading = false;
  selectedRole = '';
  gridApi: any;
  rowDataSource: any;

  columnDefs: ColDef[] = [
    { field: 'email', headerName: 'Email', flex: 2, minWidth: 180 },
    { field: 'role', headerName: 'Role', flex: 1, minWidth: 100 },
    { field: 'createdAt', headerName: 'Joined', flex: 1, minWidth: 150, valueFormatter: params => this.relativeTimePipe.transform(params.value) },
    // {
    //   field: 'actions',
    //   headerName: 'Actions',
    //   flex: 1,
    //   minWidth: 120,
    //   cellRenderer: (params: any) => {
    //     if (!params.data?.id) return '';
    //     return `
    //       <div style="display: flex; gap: 0.5rem; align-items: center; height: 100%;">
    //         <button class="action-btn" data-action="edit" data-id="${params.data.id}" title="Edit" style="background: none; border: none; cursor: pointer; padding: 0.5rem; color: #1976d2; font-weight: 500; font-size: 14px;">
    //           ✎ Edit
    //         </button>
    //         <button class="action-btn delete-btn" data-action="delete" data-id="${params.data.id}" title="Delete" style="background: none; border: none; cursor: pointer; padding: 0.5rem; color: #d32f2f; font-weight: 500; font-size: 14px;">
    //           🗑 Delete
    //         </button>
    //       </div>
    //     `;
    //   }
    // }
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
    this.rowDataSource = this.createUserDatasource();
  }

  openAddUser() {
    const dialogRef = this.dialog.open(UserFormComponent, {
      width: '520px',
      maxWidth: '95vw'
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.refreshUsers();
    });
  }

  createUserDatasource() {
    return {
      getRows: (params: any) => {
        const pageSize = this.gridOptions.cacheBlockSize ?? 10;
        const page = Math.floor(params.startRow / pageSize) + 1;
        const filter = {
          page,
          limit: pageSize,
          role: this.selectedRole || undefined,
        };

        this.userService.getUsersPage(filter).subscribe({
          next: (response) => {
            params.successCallback(response.items, response.total);
          },
          error: () => {
            params.failCallback();
            this.snackBar.open('Failed to load users', 'Close', { duration: 3000 });
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
      const userId = button.getAttribute('data-id');
      if (!action || !userId) {
        return;
      }

      const gridWrapper = document.querySelector('.users-container');
      if (!gridWrapper || !gridWrapper.contains(button)) {
        return;
      }

      event.stopPropagation();
      event.preventDefault();

      let rowData: any = null;
      this.gridApi.forEachNode((node: any) => {
        if (node.data?.id === userId) {
          rowData = node.data;
        }
      });

      if (!rowData) {
        return;
      }

      if (action === 'edit') {
        this.editUser(rowData);
      } else if (action === 'delete') {
        this.deleteUser(userId);
      }
    });
  }

  refreshUsers() {
    if (this.gridApi) {
      this.gridApi.purgeInfiniteCache();
    }
  }

  editUser(user: User) {
    const dialogRef = this.dialog.open(UserFormComponent, {
      width: '500px',
      data: { user }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.refreshUsers();
    });
  }

  deleteUser(id: string) {
    if (confirm('Are you sure you want to delete this user?')) {
      this.userService.deleteUser(id).subscribe({
        next: () => {
          this.snackBar.open('User deleted successfully', 'Close', { duration: 3000 });
          this.refreshUsers();
        },
        error: () => {
          this.snackBar.open('Failed to delete user', 'Close', { duration: 3000 });
        }
      });
    }
  }

  onFilterRoleChange(role: string) {
    this.selectedRole = role;
    this.refreshUsers();
  }
}
