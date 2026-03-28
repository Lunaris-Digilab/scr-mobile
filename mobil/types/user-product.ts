import type { Product } from './product';

export type UserProductStatus = 'opened' | 'wishlist' | 'empty';

export interface UserProduct {
  id: string;
  user_id: string;
  product_id: string;
  status: UserProductStatus;
  date_opened: string | null;
  expiration_date: string | null;
  price: number | null;
  rating: number | null;
  review: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProductWithProduct extends UserProduct {
  products: Product | null;
}
