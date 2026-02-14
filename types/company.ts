export interface Company {
  id: string;
  name: string;
  logo_url?: string | null;
  website?: string | null;
  country?: string | null;
  description?: string | null;
  created_at?: string;
}
