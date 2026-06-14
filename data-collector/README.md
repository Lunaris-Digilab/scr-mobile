# Glowist Admin Dashboard

Editörlerin Glowist ürün kataloğunu **manuel olarak yönetebildiği** (ekleme/düzenleme/silme) admin
paneli. Aynı uygulama, ikincil bir özellik olarak web scraper'ı da barındırır.

> Tasarım dokümanı: [`docs/superpowers/specs/2026-06-14-admin-dashboard-design.md`](docs/superpowers/specs/2026-06-14-admin-dashboard-design.md)

## Kurulum

```bash
npm install
npx playwright install chromium   # yalnızca scraper için gerekli
cp .env.example .env              # Supabase bilgilerini doldur
```

`.env` içinde **üç** değer gereklidir:

```
SUPABASE_URL=https://<proje>.supabase.co
SUPABASE_SERVICE_KEY=<service-role-key>   # sunucuda kalır, tarayıcıya çıkmaz
SUPABASE_ANON_KEY=<anon-public-key>       # login + token doğrulama için
```

### Veritabanı

Şu migration'lar Supabase'de uygulanmış olmalı (`mobil/supabase/migrations`):
`008_enhanced_products`, `009_product_photos_storage`, `010_profiles_roles`.

### Editör (admin) hesabı

1. Supabase Auth'ta editör için bir kullanıcı oluştur (e-posta/şifre).
2. Kullanıcıyı admin yap:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'editor@example.com');
```

Panelde self-signup yoktur; admin rolü yalnızca SQL ile verilir.

## Çalıştırma

```bash
npm run server        # http://localhost:3456
```

Tarayıcıda aç, editör e-posta/şifresiyle giriş yap. **Ürünler** sekmesinden ürün ekle/düzenle/sil.
Sol menüde ayrıca **Markalar** ve **İçerikler** (göz atma) ile **Scraper** (ikincil) bulunur.

> Not: `--port` bayrağında Commander/parseInt kaynaklı bir sorun var; varsayılan 3456 portunu kullan.

## Mimari

```
Tarayıcı (login)  ──POST /api/auth/login──►  Express (anon key + admin rolü) ──► access_token
Tarayıcı (Bearer token)  ──/api/*──►  requireAdmin ──► products-service (SERVICE_KEY) ──► Supabase
```

- SERVICE_KEY yalnızca sunucuda; tarayıcı yalnızca login için token alır.
- `auth/login` hariç tüm `/api/*` uçları `requireAdmin` arkasında; `profiles.role='admin'` şarttır.
- Ürün yazımı paylaşılan products RLS'ine dokunmaz; mobil app etkilenmez.

```
src/
  server/
    index.ts            Express app (route wiring, auth gating)
    supabase.ts         service + anon Supabase client'ları
    middleware/
      require-admin.ts  Bearer/SSE token + admin rol doğrulama
    products-service.ts Ürün CRUD + ilişki yazımı (ingredients/skin types/concerns)
    routes/
      auth.ts           POST /api/auth/login, GET /api/auth/me
      products.ts       /api/products CRUD
      taxonomy.ts       /api/companies|categories|ingredients|skin-types|skin-concerns
      upload.ts         POST /api/upload (görsel → product-photos bucket)
      sites.ts scrape.ts test.ts   Scraper (auth arkasında)
  gui/
    index.html  auth.js  products.js  app.js  style.css
  scraper/ normalizer/ config/ schema/ output/    (scraper motoru — aşağıya bakın)
```

---

# Scraper (ikincil)

Ürün kataloğunu sitelerden toplamak için web scraping aracı. Panelde **Scraper** sekmesinden veya
CLI'dan kullanılır.

## CLI Kullanımı

```bash
# Kayıtlı site config'lerini listele
npx tsx src/index.ts sites

# Ürün topla (varsayılan JSON çıktısı)
npx tsx src/index.ts scrape --site the-ordinary --max-products 10

# Tek ürün URL'i
npx tsx src/index.ts scrape-url "https://theordinary.com/en-tr/product.html" --site the-ordinary

# Dry run (topla + normalize et, kaydetme)
npx tsx src/index.ts scrape --site the-ordinary --max-products 5 --dry-run

# Doğrudan Supabase'e yaz
npx tsx src/index.ts scrape --site the-ordinary --output supabase

# JSON çıktı dosyasını doğrula
npx tsx src/index.ts validate output/the-ordinary_2025-03-28T12-00-00.json
```

## Yeni Site Ekleme

1. `src/config/sites/_template.ts`'i `src/config/sites/your-site.ts`'e kopyala
2. Hedef sitenin HTML'ini inceleyip CSS seçicilerini doldur
3. Strateji seç: SPA'lar için `playwright`, statik HTML için `cheerio`
4. `src/config/index.ts`'e kaydet
5. Önce `--dry-run` ile test et

## Scraper Mimarisi

```
src/
  index.ts           CLI girişi (Commander.js)
  config/sites/      Site bazlı scraper config'leri
  scraper/           Scraping motoru
    strategies/      Playwright + Cheerio implementasyonları
    listing.ts       Sayfalamalı liste tarayıcı
    product.ts       Tekil ürün sayfası scraper'ı
    engine.ts        Orkestratör (discover → scrape → normalize → output)
  normalizer/        Veri normalizasyon pipeline'ı
    category.ts      Ham metin → ProductCategory enum
    texture.ts       Ham metin → ProductTexture enum
    ingredients.ts   INCI metni → tekil içerik adları
    size.ts          "50ml" → { value: 50, unit: 'ml' }
    boolean-flags.ts Claims → is_cruelty_free, is_vegan, vb.
    usage.ts         usage_time, target_area, frequency çıkarımı
  output/
    json-writer.ts   JSON dosyalarına yazar
    supabase-writer.ts Supabase'e ekler (service role key)
  schema/product.ts  Glowist DB şemasıyla eşleşen Zod doğrulaması
```

JSON çıktıları `output/` dizinine `{siteId}_{timestamp}.json` formatında yazılır.
