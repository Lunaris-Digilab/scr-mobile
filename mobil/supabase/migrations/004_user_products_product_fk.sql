-- Add foreign key from user_products.product_id to products.id so PostgREST
-- can resolve the embedded relationship: select('*, products(*, companies(name))')

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_products')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_products' AND column_name = 'product_id') THEN

    -- Add FK if it doesn't already exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'user_products_product_id_fkey'
        AND table_schema = 'public'
        AND table_name = 'user_products'
    ) THEN
      ALTER TABLE public.user_products
        ADD CONSTRAINT user_products_product_id_fkey
        FOREIGN KEY (product_id) REFERENCES public.products(id);
    END IF;
  END IF;
END $$;
