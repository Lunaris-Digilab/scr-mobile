-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Companies table (brands)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name)
);

-- Add category_id, company_id, is_private, rating to products (if products table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'category_id') THEN
      ALTER TABLE products ADD COLUMN category_id UUID REFERENCES categories(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'company_id') THEN
      ALTER TABLE products ADD COLUMN company_id UUID REFERENCES companies(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_private') THEN
      ALTER TABLE products ADD COLUMN is_private BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'rating') THEN
      ALTER TABLE products ADD COLUMN rating INTEGER CHECK (rating >= 0 AND rating <= 5);
    END IF;
  END IF;
END $$;

-- Seed categories (user-provided list)
INSERT INTO categories (name) VALUES
  ('Cleanser'),
  ('Exfoliant'),
  ('Serum'),
  ('Suncare'),
  ('Moisturizer'),
  ('Treatment'),
  ('Hydrator (semi-liquid)'),
  ('Toner'),
  ('Oil'),
  ('Eye care'),
  ('Lip care'),
  ('Mask'),
  ('Makeup'),
  ('Makeup remover'),
  ('Haircare'),
  ('Perfume'),
  ('Tools'),
  ('Nail care'),
  ('Body care'),
  ('Supplement'),
  ('Shaving'),
  ('Oral care'),
  ('Self-Tanner'),
  ('Medication')
ON CONFLICT (name) DO NOTHING;

-- RLS: allow read for all, insert companies for all (anon/auth can add new brands)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Categories are readable by everyone" ON categories;
CREATE POLICY "Categories are readable by everyone" ON categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Companies are readable by everyone" ON companies;
CREATE POLICY "Companies are readable by everyone" ON companies FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated can insert companies" ON companies;
CREATE POLICY "Anyone can insert companies" ON companies FOR INSERT WITH CHECK (true);
