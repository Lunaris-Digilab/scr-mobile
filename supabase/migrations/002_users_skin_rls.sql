-- RLS for public.users (opsiyonel - artık Supabase Auth user_metadata kullanılıyor)
-- public.users tablosu varsa RLS ekler; yoksa atlar.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS users_select_own ON public.users;
    CREATE POLICY users_select_own ON public.users
      FOR SELECT USING (auth.uid() = id);
    DROP POLICY IF EXISTS users_insert_own ON public.users;
    CREATE POLICY users_insert_own ON public.users
      FOR INSERT WITH CHECK (auth.uid() = id);
    DROP POLICY IF EXISTS users_update_own ON public.users;
    CREATE POLICY users_update_own ON public.users
      FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;
END $$;
