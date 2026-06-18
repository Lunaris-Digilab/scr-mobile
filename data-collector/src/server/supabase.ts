import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Server-side Supabase clients.
//   - service client: bypasses RLS, used for all product reads/writes (admin authority
//     is enforced by requireAdmin before any service-client call).
//   - anon client: used only to validate user tokens and to sign editors in.
// Both live on the server; the SERVICE_KEY never reaches the browser.

let serviceClient: SupabaseClient | null = null;
let anonClient: SupabaseClient | null = null;

const noPersist = {
  auth: { persistSession: false, autoRefreshToken: false },
} as const;

export function getServiceClient(): SupabaseClient {
  if (serviceClient) return serviceClient;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env');
  }

  serviceClient = createClient(url, key, noPersist);
  return serviceClient;
}

export function getAnonClient(): SupabaseClient {
  if (anonClient) return anonClient;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env');
  }

  anonClient = createClient(url, key, noPersist);
  return anonClient;
}
