export type ProductStatus = 'ACTIVE' | 'INACTIVE';

/** Response of GET /api/products and GET /api/products/{id}. */
export interface Product {
  id: number;
  reference: string;
  name: string;
  description: string | null;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  minimumStock: number;
  /** quantity <= minimumStock, computed by the API. */
  lowStock: boolean;
  categoryId: number;
  categoryName: string;
  status: ProductStatus;
  /** Optimistic lock: sent back unchanged on update. */
  version: number;
  createdAt: string;
  updatedAt: string;
}
