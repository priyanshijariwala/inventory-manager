import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProductService } from '../../../shared/services/product.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-product-import-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './product-import-dialog.html',
  styleUrl: './product-import-dialog.scss'
})
export class ProductImportDialogComponent {
  private productService = inject(ProductService);
  private toast = inject(ToastService);
  private dialogRef = inject(MatDialogRef<ProductImportDialogComponent>);

  fileName = '';
  file?: File;
  uploading = false;
  downloadingSample = false;

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (!/\.xlsx$/i.test(file.name)) {
      this.toast.error('Only Excel (.xlsx) files are accepted', 'Invalid file');
      input.value = '';
      this.file = undefined;
      this.fileName = '';
      return;
    }

    this.file = file;
    this.fileName = file.name;
  }

  downloadSample() {
    this.downloadingSample = true;
    this.productService.downloadImportSample().subscribe({
      next: (blob) => {
        this.saveBlob(blob, 'product-import-sample.xlsx');
        this.downloadingSample = false;
      },
      error: (error) => {
        this.downloadingSample = false;
        this.toast.error(error, 'Download failed');
      }
    });
  }

  import() {
    if (!this.file) {
      this.toast.warning('Select an Excel file before importing', 'No file selected');
      return;
    }

    this.uploading = true;
    this.productService.importProducts(this.file).subscribe({
      next: (response) => {
        this.uploading = false;
        this.toast.success(`Imported ${response.imported ?? 0} products`);
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.uploading = false;
        this.toast.error(error, 'Import failed');
      }
    });
  }

  cancel() {
    this.dialogRef.close(false);
  }

  private saveBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }
}
