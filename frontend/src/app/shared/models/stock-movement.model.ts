export interface StockMovement {
  id?: string;
  type: MovementType;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  reason?: string;
  reference?: string;
  productId: string;
  product?: Product;
  performedById: string;
  performedBy?: User;
  createdAt?: Date;
  updatedAt?: Date;
}

export enum MovementType {
  RESTOCK = 'restock',
  SALE = 'sale',
  ADJUSTMENT = 'adjustment',
  RETURN = 'return',
  DAMAGE = 'damage'
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  stock: number;
  lowStockThreshold?: number;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface StockMovementFilter {
  page?: number;
  limit?: number;
  productId?: string;
  type?: MovementType;
  startDate?: string;
  endDate?: string;
}

export interface StockAdjustmentDto {
  productId: string;
  type: MovementType;
  quantity: number;
  reason?: string;
  reference?: string;
}

export interface StockReport {
  period: {
    startDate: string | null;
    endDate: string | null;
  };
  totalProducts: number;
  totalInventoryValue: number;
  movements: Record<string, {
    count: number;
    totalQuantity: number;
  }>;
}