-- user_products RLS 42501 hatası için: Politikaları yeniden uygula.
-- Supabase Dashboard > SQL Editor'da bu dosyanın içeriğini çalıştırın.

DROP POLICY IF EXISTS user_products_select_own ON public.user_products;
DROP POLICY IF EXISTS user_products_insert_own ON public.user_products;
DROP POLICY IF EXISTS user_products_update_own ON public.user_products;
DROP POLICY IF EXISTS user_products_delete_own ON public.user_products;

CREATE POLICY user_products_select_own ON public.user_products
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_products_insert_own ON public.user_products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_products_update_own ON public.user_products
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_products_delete_own ON public.user_products
  FOR DELETE USING (auth.uid() = user_id);
