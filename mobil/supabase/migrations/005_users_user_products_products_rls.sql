-- Not: public.users kullanılmıyor; profile verisi Supabase Auth user_metadata'da tutuluyor.

-- RLS: user_products - users can CRUD their own rows
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_products') THEN
    ALTER TABLE public.user_products ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS user_products_select_own ON public.user_products;
    CREATE POLICY user_products_select_own ON public.user_products
      FOR SELECT USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS user_products_insert_own ON public.user_products;
    CREATE POLICY user_products_insert_own ON public.user_products
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS user_products_update_own ON public.user_products;
    CREATE POLICY user_products_update_own ON public.user_products
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS user_products_delete_own ON public.user_products;
    CREATE POLICY user_products_delete_own ON public.user_products
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- RLS: products - anyone can read; authenticated can insert (for user-created products)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
    ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS products_select_all ON public.products;
    CREATE POLICY products_select_all ON public.products
      FOR SELECT USING (true);

    DROP POLICY IF EXISTS products_insert_authenticated ON public.products;
    CREATE POLICY products_insert_authenticated ON public.products
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

    DROP POLICY IF EXISTS products_update_authenticated ON public.products;
    CREATE POLICY products_update_authenticated ON public.products
      FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;
