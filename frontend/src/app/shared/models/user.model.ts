export interface User {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'manager' | 'staff';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserFilter {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}
