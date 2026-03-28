-- ═══════════════════════════════════════════════════════════════
-- 008: Gelişmiş ürün yapısı – Skincare'e özel alanlar ve lookup tabloları
-- ═══════════════════════════════════════════════════════════════

-- ────────────── 1. companies (brands) tablosuna ek alanlar ──────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='logo_url') THEN
    ALTER TABLE public.companies ADD COLUMN logo_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='website') THEN
    ALTER TABLE public.companies ADD COLUMN website text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='country') THEN
    ALTER TABLE public.companies ADD COLUMN country text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='description') THEN
    ALTER TABLE public.companies ADD COLUMN description text;
  END IF;
END $$;

-- ────────────── 2. products tablosuna skincare alanları ──────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='description') THEN
    ALTER TABLE public.products ADD COLUMN description text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='size_value') THEN
    ALTER TABLE public.products ADD COLUMN size_value numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='size_unit') THEN
    ALTER TABLE public.products ADD COLUMN size_unit text CHECK (size_unit IN ('ml','g','oz','fl_oz','pcs'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='usage_instructions') THEN
    ALTER TABLE public.products ADD COLUMN usage_instructions text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='usage_frequency') THEN
    ALTER TABLE public.products ADD COLUMN usage_frequency text CHECK (usage_frequency IN ('daily','twice_daily','weekly','as_needed'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='usage_time') THEN
    ALTER TABLE public.products ADD COLUMN usage_time text CHECK (usage_time IN ('AM','PM','both'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='texture') THEN
    ALTER TABLE public.products ADD COLUMN texture text CHECK (texture IN ('cream','gel','liquid','foam','oil','balm','serum','mist','paste','powder','lotion','spray','stick','patch','other'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='spf') THEN
    ALTER TABLE public.products ADD COLUMN spf integer CHECK (spf > 0 AND spf <= 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='ph_level') THEN
    ALTER TABLE public.products ADD COLUMN ph_level numeric CHECK (ph_level >= 0 AND ph_level <= 14);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='shelf_life_months') THEN
    ALTER TABLE public.products ADD COLUMN shelf_life_months integer CHECK (shelf_life_months > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='is_cruelty_free') THEN
    ALTER TABLE public.products ADD COLUMN is_cruelty_free boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='is_vegan') THEN
    ALTER TABLE public.products ADD COLUMN is_vegan boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='is_fragrance_free') THEN
    ALTER TABLE public.products ADD COLUMN is_fragrance_free boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='is_paraben_free') THEN
    ALTER TABLE public.products ADD COLUMN is_paraben_free boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='is_alcohol_free') THEN
    ALTER TABLE public.products ADD COLUMN is_alcohol_free boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='country_of_origin') THEN
    ALTER TABLE public.products ADD COLUMN country_of_origin text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='target_area') THEN
    ALTER TABLE public.products ADD COLUMN target_area text CHECK (target_area IN ('face','eye','lip','body','hand','hair','nail','scalp','full_body'));
  END IF;
END $$;

-- ────────────── 3. skin_types lookup tablosu ──────────────
CREATE TABLE IF NOT EXISTS public.skin_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

INSERT INTO public.skin_types (name) VALUES
  ('Normal'), ('Dry'), ('Oily'), ('Combination'), ('Sensitive')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.skin_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS skin_types_select_all ON public.skin_types;
CREATE POLICY skin_types_select_all ON public.skin_types FOR SELECT USING (true);

-- ────────────── 4. skin_concerns lookup tablosu ──────────────
CREATE TABLE IF NOT EXISTS public.skin_concerns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

INSERT INTO public.skin_concerns (name) VALUES
  ('Acne'), ('Aging / Fine lines'), ('Hyperpigmentation'),
  ('Redness / Rosacea'), ('Dryness / Dehydration'), ('Oiliness / Shine'),
  ('Sensitivity'), ('Large pores'), ('Dark circles'),
  ('Dullness'), ('Uneven texture'), ('Sun damage'),
  ('Eczema'), ('Dark spots'), ('Wrinkles')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.skin_concerns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS skin_concerns_select_all ON public.skin_concerns;
CREATE POLICY skin_concerns_select_all ON public.skin_concerns FOR SELECT USING (true);

-- ────────────── 5. product ↔ skin_types (çoka çok) ──────────────
CREATE TABLE IF NOT EXISTS public.product_skin_types (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  skin_type_id uuid NOT NULL REFERENCES public.skin_types(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, skin_type_id)
);

ALTER TABLE public.product_skin_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_skin_types_select_all ON public.product_skin_types;
CREATE POLICY product_skin_types_select_all ON public.product_skin_types FOR SELECT USING (true);
DROP POLICY IF EXISTS product_skin_types_insert_auth ON public.product_skin_types;
CREATE POLICY product_skin_types_insert_auth ON public.product_skin_types FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS product_skin_types_delete_auth ON public.product_skin_types;
CREATE POLICY product_skin_types_delete_auth ON public.product_skin_types FOR DELETE USING (auth.uid() IS NOT NULL);

-- ────────────── 6. product ↔ skin_concerns (çoka çok) ──────────────
CREATE TABLE IF NOT EXISTS public.product_concerns (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  concern_id uuid NOT NULL REFERENCES public.skin_concerns(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, concern_id)
);

ALTER TABLE public.product_concerns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_concerns_select_all ON public.product_concerns;
CREATE POLICY product_concerns_select_all ON public.product_concerns FOR SELECT USING (true);
DROP POLICY IF EXISTS product_concerns_insert_auth ON public.product_concerns;
CREATE POLICY product_concerns_insert_auth ON public.product_concerns FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS product_concerns_delete_auth ON public.product_concerns;
CREATE POLICY product_concerns_delete_auth ON public.product_concerns FOR DELETE USING (auth.uid() IS NOT NULL);

-- ────────────── 7. ingredients tablosu ──────────────
CREATE TABLE IF NOT EXISTS public.ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  inci_name text,
  description text,
  category text CHECK (category IN ('active','humectant','emollient','surfactant','preservative','antioxidant','exfoliant','fragrance','solvent','thickener','emulsifier','ph_adjuster','other')),
  comedogenic_rating integer CHECK (comedogenic_rating >= 0 AND comedogenic_rating <= 5),
  is_common_irritant boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (name)
);

ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ingredients_select_all ON public.ingredients;
CREATE POLICY ingredients_select_all ON public.ingredients FOR SELECT USING (true);
DROP POLICY IF EXISTS ingredients_insert_auth ON public.ingredients;
CREATE POLICY ingredients_insert_auth ON public.ingredients FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ────────────── 8. product ↔ ingredients (çoka çok, sıralı) ──────────────
CREATE TABLE IF NOT EXISTS public.product_ingredients (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, ingredient_id)
);

ALTER TABLE public.product_ingredients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_ingredients_select_all ON public.product_ingredients;
CREATE POLICY product_ingredients_select_all ON public.product_ingredients FOR SELECT USING (true);
DROP POLICY IF EXISTS product_ingredients_insert_auth ON public.product_ingredients;
CREATE POLICY product_ingredients_insert_auth ON public.product_ingredients FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS product_ingredients_delete_auth ON public.product_ingredients;
CREATE POLICY product_ingredients_delete_auth ON public.product_ingredients FOR DELETE USING (auth.uid() IS NOT NULL);
