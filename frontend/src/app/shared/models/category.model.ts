export interface Category {
  id?: string;
  name: string;
  description: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CategoryFilter {
  page?: number;
  limit?: number;
  search?: string;
}
