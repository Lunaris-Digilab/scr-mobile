export type RoutineType = 'AM' | 'PM';

export interface RoutineStep {
  id: string;
  name: string;
  description?: string;
  order: number;
  product_id?: string; // products tablosundan eklenen adımlar için
}

export interface Routine {
  id: string;
  user_id: string;
  type: RoutineType;
  name: string;
  steps: RoutineStep[];
  days_active?: number[];
  is_active: boolean;
  created_at: string;
}

export interface RoutineRow {
  id: string;
  user_id: string;
  type: string;
  name: string;
  steps: RoutineStep[];
  days_active?: number[] | null;
  is_active: boolean;
  created_at: string;
}
