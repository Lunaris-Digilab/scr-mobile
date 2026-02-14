# Supabase migrations

Bu klasördeki SQL dosyalarını Supabase Dashboard → SQL Editor üzerinden çalıştırın.

1. **001_categories_companies.sql** – `categories` ve `companies` tablolarını oluşturur, örnek kategorileri ekler ve `products` tablosuna `category_id`, `company_id`, `is_private`, `rating` sütunlarını ekler (varsa).

2. **002_users_skin_rls.sql** – `public.users` tablosu varsa RLS ekler (opsiyonel).

3. **003_routines_routine_logs_rls.sql** – `routines` ve `routine_logs` RLS politikaları.

4. **004_user_products_product_fk.sql** – `user_products` → `products` foreign key (PostgREST embed için).

5. **005_users_user_products_products_rls.sql** – `user_products` ve `products` RLS politikaları.

6. **006_user_products_rls_reapply.sql** – `user_products` RLS 42501 hatası için politikaları yeniden uygular.

7. **007_reminder_settings.sql** – `reminder_settings` tablosu + RLS + Supabase Realtime yayını. Hatırlatma bildirimleri için gereklidir.

## RLS 42501 hatası (user_products)

"new row violates row-level security policy" alıyorsanız:

1. **005** veya **006** migration'ını çalıştırdığınızdan emin olun.
2. `.env` içindeki `EXPO_PUBLIC_SUPABASE_URL` değerini kontrol edin – Supabase Dashboard → Settings → API'deki **Project URL** ile aynı olmalı (`https://<project-ref>.supabase.co` veya custom domain).
3. Custom domain kullanıyorsanız, Supabase üzerinde tanımlı olduğundan ve Authorization header'ının iletildiğinden emin olun.
