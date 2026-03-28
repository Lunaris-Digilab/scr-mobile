-- reminder_settings: kullanıcıların sabah/akşam rutin hatırlatma saatlerini saklar.
CREATE TABLE IF NOT EXISTS public.reminder_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_type text NOT NULL CHECK (routine_type IN ('AM', 'PM')),
  enabled boolean NOT NULL DEFAULT false,
  hour integer NOT NULL DEFAULT 8 CHECK (hour >= 0 AND hour <= 23),
  minute integer NOT NULL DEFAULT 0 CHECK (minute >= 0 AND minute <= 59),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, routine_type)
);

-- RLS
ALTER TABLE public.reminder_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reminder_settings_select_own ON public.reminder_settings;
CREATE POLICY reminder_settings_select_own ON public.reminder_settings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS reminder_settings_insert_own ON public.reminder_settings;
CREATE POLICY reminder_settings_insert_own ON public.reminder_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS reminder_settings_update_own ON public.reminder_settings;
CREATE POLICY reminder_settings_update_own ON public.reminder_settings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS reminder_settings_delete_own ON public.reminder_settings;
CREATE POLICY reminder_settings_delete_own ON public.reminder_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Realtime: tablonun Realtime yayınına dahil olması için
ALTER PUBLICATION supabase_realtime ADD TABLE public.reminder_settings;
