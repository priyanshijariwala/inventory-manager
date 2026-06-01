import { Component, OnInit, inject, OnDestroy } from '@angular/core';
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
import { MatGridListModule } from '@angular/material/grid-list';
import { MatListModule } from '@angular/material/list';

import { StockMovementService } from '../../shared/services/stock-movement.service';
import { StockReport } from '../../shared/models/stock-movement.model';
import { MovementType } from '../../shared/models/stock-movement.model';
import { CentsCurrencyPipe } from '../../shared/pipes/cents-currency.pipe';
import { ToastrService } from 'ngx-toastr';
import { debounceTime, distinctUntilChanged, map, takeUntil } from 'rxjs';
import { Subject } from 'rxjs';

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
    MatGridListModule,
    MatListModule,
    
    CentsCurrencyPipe
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent implements OnInit {
  private stockMovementService = inject(StockMovementService);
  private fb = inject(FormBuilder);
  private toastr = inject(ToastrService);
  private destroy$ = new Subject<void>();

  report!: StockReport | null;
  loading = false;
  startDate = '';
  endDate = '';
  filterForm!: FormGroup;

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
    // initialize default date range: last 1 month
    const end = new Date();
    const start = new Date(end);
    start.setMonth(start.getMonth() - 1);

    this.filterForm = this.fb.group({
      startDate: [start],
      endDate: [end]
    });

    this.filterForm.valueChanges.pipe(
      map(v => ({
        s: v.startDate ? new Date(v.startDate).toISOString().split('T')[0] : undefined,
        e: v.endDate ? new Date(v.endDate).toISOString().split('T')[0] : undefined
      })),
      debounceTime(300),
      distinctUntilChanged((a, b) => a.s === b.s && a.e === b.e),
      takeUntil(this.destroy$)
    ).subscribe(({ s, e }) => {
      this.startDate = s || '';
      this.endDate = e || '';
      this.loadReport();
    });

    // set initial values and load
    this.startDate = start.toISOString().split('T')[0];
    this.endDate = end.toISOString().split('T')[0];
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
      error: (err: any) => {
        const msg = err?.error?.message || 'Failed to load report';
        this.toastr.error(msg, 'Error');
        this.loading = false;
      }
    });
  }

  applyFilters() {
    this.loadReport();
  }

  clearFilters() {
    this.filterForm.setValue({ startDate: null, endDate: null });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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
