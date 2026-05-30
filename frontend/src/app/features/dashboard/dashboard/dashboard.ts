import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatListModule } from '@angular/material/list';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { ProductService } from '../../../shared/services/product.service';
import { CategoryService } from '../../../shared/services/category.service';
import { UserService } from '../../../shared/services/user.service';
import { StockMovementService } from '../../../shared/services/stock-movement.service';
import { Product } from '../../../shared/models/product.model';
import { Category } from '../../../shared/models/category.model';
import { User } from '../../../shared/models/user.model';
import { Router, RouterLink } from '@angular/router';
import { StockReport } from '../../../shared/models/stock-movement.model';
import { CentsCurrencyPipe } from '../../../shared/pipes/cents-currency.pipe';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatListModule,
    MatGridListModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    CentsCurrencyPipe,
    RelativeTimePipe,
    RouterLink
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private userService = inject(UserService);
  private stockMovementService = inject(StockMovementService);
  private router = inject(Router);

  totalProducts = 0;
  totalCategories = 0;
  totalUsers = 0;
  lowStockProducts: Product[] = [];
  recentProducts: Product[] = [];
  categories: Category[] = [];
  users: User[] = [];
  recentMovements: any[] = [];
  loading = true;
  report: StockReport | null = null;
  today = new Date();

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.loading = true;

    // Load products
    this.productService.getProducts({ limit: 50 }).subscribe({
      next: (response: any) => {
        const items = response?.items || response?.data || response || [];
        const products = items.map((item: any) => ({
          ...item,
          quantity: item.quantity ?? item.stock,
          price: item.price ?? (typeof item.priceInCents === 'number' ? item.priceInCents / 100 : undefined)
        }));

        this.totalProducts = products.length;
        this.recentProducts = products.slice(0, 5);
        this.lowStockProducts = products
          .filter((p: Product) => {
            const stock = p.stock || p.quantity || 0;
            const threshold = p.lowStockThreshold || 5;
            return stock <= threshold;
          })
          .slice(0, 5);
      },
      error: () => {
        console.error('Failed to load products');
      }
    });

    // Load categories
    this.categoryService.getCategories().subscribe({
      next: (response: any) => {
        const categories = response?.data || response || [];
        this.totalCategories = categories.length;
        this.categories = categories;
      },
      error: () => {
        console.error('Failed to load categories');
      }
    });

    // Load users
    this.userService.getUsers({ limit: 10 }).subscribe({
      next: (response: any) => {
        const users = response?.items || response?.data || response || [];
        this.totalUsers = users.length;
        this.users = users;
      },
      error: () => {
        console.error('Failed to load users');
      }
    });

    // Load recent stock movements
    this.stockMovementService.getStockMovements({ limit: 5 }).subscribe({
      next: (response: any) => {
        this.recentMovements = response?.items || response?.data || [];
      },
      error: () => {
        console.error('Failed to load stock movements');
      }
    });

    // Load report data
    this.stockMovementService.getStockReport().subscribe({
      next: (report) => {
        this.report = report;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  navigateTo(path: string) {
    this.router.navigate([`/${path}`]);
  }

  trackByProductId(index: number, product: Product) {
    return product.id ?? index;
  }

  trackByMovementId(index: number, movement: any) {
    return movement.id ?? index;
  }

  getMovementTypeColor(type: string): string {
    const colors: Record<string, string> = {
      restock: '#4caf50',
      sale: '#f44336',
      adjustment: '#ff9800',
      return: '#2196f3',
      damage: '#9c27b0'
    };
    return colors[type] || '#666';
  }

  getMovementIcon(type: string): string {
    const icons: Record<string, string> = {
      restock: 'add_circle',
      sale: 'shopping_cart',
      adjustment: 'edit',
      return: 'reply',
      damage: 'error'
    };
    return icons[type] || 'swap_horiz';
  }

  getStockPercentage(product: Product): number {
    const stock = product.stock || 0;
    const threshold = product.lowStockThreshold || 5;
    return Math.min((stock / threshold) * 100, 100);
  }

  isCriticalStock(product: Product): boolean {
    return (product.stock || 0) === 0;
  }

  isLowStock(product: Product): boolean {
    const stock = product.stock || 0;
    const threshold = product.lowStockThreshold || 5;
    return stock > 0 && stock <= threshold;
  }

  isOutOfStock(product: Product): boolean {
    return (product.stock || 0) === 0;
  }

  getStockIcon(product: Product): string {
    if ((product.stock || 0) === 0) return 'error';
    if (this.isLowStock(product)) return 'warning';
    return 'check_circle';
  }

  getStockLabel(product: Product): string {
    if ((product.stock || 0) === 0) return 'Out of Stock';
    if (this.isLowStock(product)) return 'Low Stock';
    return 'In Stock';
  }
}
