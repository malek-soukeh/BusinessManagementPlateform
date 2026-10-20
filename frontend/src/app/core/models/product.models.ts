export type ProductStatus = 'ACTIVE' | 'INACTIVE';

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  ACTIVE: 'Actif',
  INACTIVE: 'Inactif'
};

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

/** Body of POST /api/products: the initial quantity is only given at creation. */
export interface ProductCreatePayload {
  reference: string;
  name: string;
  description: string | null;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  minimumStock: number;
  categoryId: number;
}

/**
 * Body of PUT /api/products/{id}. The quantity is not part of it: the stock only changes through
 * stock movements. The version must be the one read, otherwise the API answers 409.
 */
export interface ProductUpdatePayload {
  reference: string;
  name: string;
  description: string | null;
  purchasePrice: number;
  sellingPrice: number;
  minimumStock: number;
  categoryId: number;
  status?: ProductStatus;
  version: number;
}

export interface ProductQuery {
  q: string;
  categoryId: number | null;
  /** Empty string means every status. */
  status: ProductStatus | '';
  lowStock: boolean;
  page: number;
  size: number;
}

export function productToUpdatePayload(product: Product): ProductUpdatePayload {
  return {
    reference: product.reference,
    name: product.name,
    description: product.description,
    purchasePrice: product.purchasePrice,
    sellingPrice: product.sellingPrice,
    minimumStock: product.minimumStock,
    categoryId: product.categoryId,
    version: product.version
  };
}

export type StockLevel = 'out' | 'low' | 'ok';

/** Stock level shown next to a quantity: out of stock, at or under the minimum, or enough. */
export function stockLevel(product: Pick<Product, 'quantity' | 'minimumStock'>): StockLevel {
  if (product.quantity === 0) {
    return 'out';
  }
  return product.quantity <= product.minimumStock ? 'low' : 'ok';
}
