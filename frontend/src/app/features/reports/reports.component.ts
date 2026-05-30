import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatListModule } from '@angular/material/list';
import { FormsModule } from '@angular/forms';
import { StockMovementService } from '../../shared/services/stock-movement.service';
import { StockReport } from '../../shared/models/stock-movement.model';
import { MovementType } from '../../shared/models/stock-movement.model';
import { CentsCurrencyPipe } from '../../shared/pipes/cents-currency.pipe';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatGridListModule,
    MatListModule,
    FormsModule,
    CentsCurrencyPipe
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent implements OnInit {
  private stockMovementService = inject(StockMovementService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  report!: StockReport | null;
  loading = false;
  startDate = '';
  endDate = '';

  movementTypeLabels: Record<string, string> = {
    [MovementType.RESTOCK]: 'Restock',
    [MovementType.SALE]: 'Sale',
    [MovementType.ADJUSTMENT]: 'Adjustment',
    [MovementType.RETURN]: 'Return',
    [MovementType.DAMAGE]: 'Damage'
  };

  movementTypeColors: Record<string, string> = {
    [MovementType.RESTOCK]: '#4caf50',
    [MovementType.SALE]: '#f44336',
    [MovementType.ADJUSTMENT]: '#ff9800',
    [MovementType.RETURN]: '#2196f3',
    [MovementType.DAMAGE]: '#9c27b0'
  };

  ngOnInit() {
    this.loadReport();
  }

  loadReport() {
    this.loading = true;
    this.stockMovementService.getStockReport(
      this.startDate || undefined,
      this.endDate || undefined
    ).subscribe({
      next: (report) => {
        this.report = report;
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load report', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  applyFilters() {
    this.loadReport();
  }

  clearFilters() {
    this.startDate = '';
    this.endDate = '';
    this.loadReport();
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
  }

  getMovementStats() {
    if (!this.report?.movements) return [];
    return Object.entries(this.report.movements).map(([type, stats]) => ({
      type,
      label: this.movementTypeLabels[type] || type,
      color: this.movementTypeColors[type] || '#666',
      count: stats.count,
      totalQuantity: stats.totalQuantity
    }));
  }

  getTotalMovements(): number {
    if (!this.report?.movements) return 0;
    return Object.values(this.report.movements).reduce((sum, m) => sum + m.count, 0);
  }

  getReportStartDate(): string {
    const period = (this.report as any)?.period;
    return period?.startDate
      ? new Date(period.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : 'All';
  }

  getReportEndDate(): string {
    const period = (this.report as any)?.period;
    return period?.endDate
      ? new Date(period.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'No end date';
  }
}
