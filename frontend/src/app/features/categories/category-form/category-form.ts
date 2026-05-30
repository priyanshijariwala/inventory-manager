import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CategoryService } from '../../../shared/services/category.service';
import { ToastService } from '../../../shared/services/toast.service';
import { Category } from '../../../shared/models/category.model';
import { AutoFocusDirective } from '../../../shared/directives/auto-focus.directive';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    AutoFocusDirective
  ],
  templateUrl: './category-form.html',
  styleUrl: './category-form.scss',
})
export class CategoryFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private categoryService = inject(CategoryService);
  private toast = inject(ToastService);
  private dialogRef = inject(MatDialogRef<CategoryFormComponent>);
  public data = inject(MAT_DIALOG_DATA, { optional: true }) as { category?: Category } | null;

  form!: FormGroup;
  loading = false;
  isEditMode = false;

  ngOnInit() {
    const category = this.data?.category;
    this.isEditMode = !!category?.id;
    const initial = category ?? ({} as Category);

    this.form = this.fb.group({
      name: [initial.name || '', [Validators.required, Validators.minLength(3)]],
      description: [initial.description || '', Validators.required]
    });
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.loading = true;
    const operation = this.isEditMode
      ? this.categoryService.updateCategory(this.data!.category!.id!, this.form.value)
      : this.categoryService.createCategory(this.form.value);

    operation.subscribe({
      next: () => {
        this.loading = false;
        this.toast.success(`Category ${this.isEditMode ? 'updated' : 'created'} successfully`);
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.loading = false;
        this.toast.error(error, 'Failed to save category');
      }
    });
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
