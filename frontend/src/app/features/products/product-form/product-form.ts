import { Component, Inject, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ProductService } from '../../../shared/services/product.service';
import { CategoryService } from '../../../shared/services/category.service';
import { ToastService } from '../../../shared/services/toast.service';
import { Product } from '../../../shared/models/product.model';
import { Category } from '../../../shared/models/category.model';
import { AutoFocusDirective } from '../../../shared/directives/auto-focus.directive';
import { SearchPipe } from '../../../shared/pipes/search-pipe';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatDialogModule,
    AutoFocusDirective,
    SearchPipe
  ],
  templateUrl: './product-form.html',
  styleUrl: './product-form.scss',
})
export class ProductFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private toast = inject(ToastService);
  private dialogRef = inject(MatDialogRef<ProductFormComponent>);

  public data = inject(MAT_DIALOG_DATA) as { product?: Product; categories: Category[] };

  form!: FormGroup;
  loading = false;
  isEditMode = false;

  // local cache for categories (template reads data.categories, we keep it fresh)
  categories: Category[] = [];
  categorySearchText = '';

  ngOnInit() {
    this.isEditMode = !!this.data.product;

    const initial = this.data.product ?? ({} as Product);
    const initialPrice = initial.priceInCents !== undefined
      ? initial.priceInCents / 100
      : (initial.price !== undefined ? initial.price : '');
    const initialQuantity = initial.stock ?? initial.quantity ?? '';
    const initialCategoryId = initial.categoryId ?? initial.category?.id ?? '';

    this.form = this.fb.group({
      name: [initial.name || '', [Validators.required, Validators.minLength(3)]],
      sku: [initial.sku || '', [Validators.required, Validators.pattern(/^[A-Z0-9-]+$/)]],
      description: [initial.description || '', Validators.required],
      price: [initialPrice, [Validators.required, Validators.min(0)]],
      quantity: [initialQuantity, [Validators.required, Validators.min(0)]],
      categoryId: [initialCategoryId, Validators.required]
    });

    // always refresh categories when dialog opens so dropdown is up-to-date
    this.categoryService.getCategories().subscribe({
      next: (response: any) => {
        const list = response?.data || response || [];
        this.categories = list;
        // also update incoming dialog data so template keeps using data.categories
        this.data.categories = list;
      },
      error: (error) => {
        this.toast.error(error, 'Failed to load categories');
      }
    });
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.loading = true;
    const formValue = this.form.value;
    
    // Transform form data to match backend DTO
    const payload = {
      name: formValue.name,
      sku: formValue.sku,
      description: formValue.description,
      priceInCents: Math.round(formValue.price * 100), // Convert to cents
      stock: formValue.quantity,
      categoryId: formValue.categoryId
    };

    const operation = this.isEditMode
      ? this.productService.updateProduct(this.data.product!.id!, payload as any)
      : this.productService.createProduct(payload as any);

    operation.subscribe({
      next: () => {
        this.loading = false;
        this.toast.success(`Product ${this.isEditMode ? 'updated' : 'created'} successfully`);
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.loading = false;
        this.toast.error(error, 'Failed to save product');
      }
    });
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
