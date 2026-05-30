export interface Product {
  id?: string;
  name: string;
  sku: string;
  description: string;
  priceInCents: number;
  stock: number;
  lowStockThreshold?: number;
  price?: number;
  quantity?: number;
  categoryId?: string;
  category?: { id: string; name: string };
  categoryName?: string;
  status?: 'active' | 'inactive' | string;
  isActive?: boolean;
  active?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProductFilter {
  page?: number;
  limit?: number;
  search?: string;
  active?: boolean;
  categoryId?: string;
}
