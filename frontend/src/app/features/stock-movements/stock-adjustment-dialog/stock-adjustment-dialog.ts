import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StockMovementService } from '../../../shared/services/stock-movement.service';
import { ToastService } from '../../../shared/services/toast.service';
import { MovementType, StockAdjustmentDto } from '../../../shared/models/stock-movement.model';
import { Product } from '../../../shared/models/product.model';

@Component({
  selector: 'app-stock-adjustment-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './stock-adjustment-dialog.html',
  styleUrl: './stock-adjustment-dialog.scss'
})
export class StockAdjustmentDialogComponent {
  private fb = inject(FormBuilder);
  private stockMovementService = inject(StockMovementService);
  private toast = inject(ToastService);
  private dialogRef = inject(MatDialogRef<StockAdjustmentDialogComponent>);
  public data = inject(MAT_DIALOG_DATA) as { product?: Product };

  form!: FormGroup;
  loading = false;

  movementTypes = [
    { value: MovementType.RESTOCK, label: 'Restock (Add Stock)', icon: 'add_circle', color: '#4caf50' },
    { value: MovementType.SALE, label: 'Sale (Reduce Stock)', icon: 'shopping_cart', color: '#f44336' },
    { value: MovementType.RETURN, label: 'Return (Add Stock)', icon: 'reply', color: '#2196f3' },
    { value: MovementType.DAMAGE, label: 'Damage/Loss (Reduce Stock)', icon: 'error', color: '#9c27b0' },
    { value: MovementType.ADJUSTMENT, label: 'Manual Adjustment', icon: 'edit', color: '#ff9800' }
  ];

  ngOnInit() {
    this.form = this.fb.group({
      type: [MovementType.RESTOCK, Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      reason: ['', Validators.required],
      reference: ['']
    });
  }

  onSubmit() {
    if (this.form.invalid || !this.data.product) return;

    this.loading = true;
    const formValue = this.form.value;

    const payload: StockAdjustmentDto = {
      productId: this.data.product.id!,
      type: formValue.type,
      quantity: formValue.quantity,
      reason: formValue.reason,
      reference: formValue.reference || ''
    };

    this.stockMovementService.adjustStock(payload).subscribe({
      next: () => {
        this.loading = false;
        this.toast.success('Stock adjusted successfully');
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.loading = false;
        this.toast.error(error, 'Failed to adjust stock');
      }
    });
  }

  cancel() {
    this.dialogRef.close(false);
  }

  getSelectedTypeColor(): string {
    const selectedType = this.form?.get('type')?.value;
    const type = this.movementTypes.find(t => t.value === selectedType);
    return type?.color || '#666';
  }

  getPreviewChange(): string {
    const type = this.form?.get('type')?.value;
    const quantity = this.form?.get('quantity')?.value || 0;
    const isReduction = [MovementType.SALE, MovementType.DAMAGE].includes(type);
    const change = isReduction ? -quantity : quantity;
    return `${change > 0 ? '+' : ''}${change}`;
  }

  getPreviewChangeColor(): string {
    const change = this.getPreviewChange();
    const numChange = parseInt(change);
    return numChange > 0 ? '#4caf50' : numChange < 0 ? '#f44336' : '#666';
  }

  getPreviewNewStock(): string {
    const currentStock = this.data.product?.stock || 0;
    const change = parseInt(this.getPreviewChange()) || 0;
    return `${currentStock + change}`;
  }

  getPreviewNewStockColor(): string {
    const newStock = parseInt(this.getPreviewNewStock()) || 0;
    const lowStockThreshold = this.data.product?.lowStockThreshold || 5;
    if (newStock < 0) return '#f44336';
    if (newStock <= lowStockThreshold) return '#ff9800';
    return '#4caf50';
  }
}
