-- RLS policies for routines table.
-- Authenticated users can SELECT, INSERT, and UPDATE their own routines (user_id = auth.uid()).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'routines') THEN
    ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS routines_select_own ON public.routines;
    CREATE POLICY routines_select_own ON public.routines
      FOR SELECT USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS routines_insert_own ON public.routines;
    CREATE POLICY routines_insert_own ON public.routines
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS routines_update_own ON public.routines;
    CREATE POLICY routines_update_own ON public.routines
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- RLS policies for routine_logs table.
-- Authenticated users can SELECT, INSERT, and UPDATE their own log entries (user_id = auth.uid()).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'routine_logs') THEN
    ALTER TABLE public.routine_logs ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS routine_logs_select_own ON public.routine_logs;
    CREATE POLICY routine_logs_select_own ON public.routine_logs
      FOR SELECT USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS routine_logs_insert_own ON public.routine_logs;
    CREATE POLICY routine_logs_insert_own ON public.routine_logs
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS routine_logs_update_own ON public.routine_logs;
    CREATE POLICY routine_logs_update_own ON public.routine_logs
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
