# Glowist Admin Dashboard — Tasarım Dokümanı

**Tarih:** 2026-06-14
**Durum:** Onaylandı (uygulama aşamasında)

## Amaç

`data-collector` uygulamasını, editörlerin **manuel ürün ekleyip düzenleyebileceği** bir admin
dashboard'a dönüştürmek. Mevcut scraper özelliği korunur ama ikincil hale gelir; dashboard'ın
merkezinde ürün CRUD vardır.

## Kararlar (brainstorm sonucu)

1. **Erişim modeli:** Çok editörlü, barındırılan web app. Supabase Auth (e-posta/şifre) + `profiles.role = 'admin'`.
2. **Teknoloji:** Mevcut vanilla GUI (Express + HTML/CSS/JS) genişletilir. Yeni framework yok.
3. **Kapsam:** Şimdilik manuel ürün CRUD'a odak. Scraper kod olarak kalır, auth arkasına alınır.
4. **Veri akışı:** **Sunucu aracılı (A)**. SERVICE_KEY yalnızca sunucuda; tarayıcı sadece login için
   token alır ve her isteğe `Authorization: Bearer <token>` ekler.

## Mimari

```
Tarayıcı (login formu)
  └─ POST /api/auth/login {email,password}  ──►  Express: anon client ile signInWithPassword
                                                  + profiles.role === 'admin' kontrolü
  ◄─ { access_token, email }
Tarayıcı (her API çağrısı: Bearer token)
  └─ /api/products...  ──►  requireAdmin middleware (token + admin doğrula)
                            └─ products-service (SERVICE_KEY) ──► Supabase
```

### Kimlik doğrulama
- `requireAdmin`: Bearer token'ı (header veya SSE için `?token=`) `auth.getUser(token)` ile doğrular,
  `profiles.role` 'admin' değilse 403.
- Editör hesapları v1'de manuel açılır: Supabase'de kullanıcı + SQL ile `role='admin'` (migration 010).
  Panelde self-signup yok.

### Sunucu modülleri (yeni)
- `src/server/supabase.ts` — `getServiceClient()` (SERVICE_KEY) + `getAnonClient()` (ANON_KEY).
- `src/server/middleware/require-admin.ts` — token + admin doğrulama, `req.user` ekler.
- `src/server/products-service.ts` — ürün CRUD + ilişki yazımı (companies/ingredients get-or-create,
  category eşleme, `product_ingredients` sıralı, `product_skin_types`, `product_concerns`).
- `src/server/routes/auth.ts` — `POST /api/auth/login`, `GET /api/auth/me`.
- `src/server/routes/products.ts` — `GET/POST /api/products`, `GET/PUT/DELETE /api/products/:id`.
- `src/server/routes/taxonomy.ts` — `GET /api/companies?search=`, `/api/categories`,
  `/api/ingredients?search=`, `/api/skin-types`, `/api/skin-concerns`.
- `src/server/routes/upload.ts` — `POST /api/upload` (base64 JSON → `product-photos` bucket → public URL).

### Mevcut route'lar
- `sites`, `scrape`, `test` router'ları `requireAdmin` arkasına alınır (SSE `?token=` ile). Frontend
  scraper çağrıları paylaşılan `authedFetch` kullanır.
- `express.json` limiti görsel yükleme için `15mb`'a çıkarılır.

### Frontend (src/gui)
- `index.html` yeniden yapılandırılır: **Login ekranı** (token yokken) + token varken **sol menü**
  (Ürünler / Markalar / İçerikler / Scraper) ve bölüm bazlı görünümler.
- `auth.js` — login, token saklama (localStorage), `authedFetch`, oturum kontrolü, çıkış.
- `products.js` — ürün listesi (ara + kategori filtresi + sayfalama) ve ürün formu (ekle/düzenle/sil).
- `app.js` — mevcut scraper UI; fetch'leri `authedFetch`'e, SSE'yi `?token=`'a taşır.
- `style.css` — liste tablosu, form grupları, etiket/tag girişi, login ekranı için ekler.

## Ürün formu alanları
- **Temel:** name*, marka (brand text + company get-or-create, datalist autocomplete), kategori
  (categories tablosundan, category_id; `category` enum eşlemeyle türetilir), barkod, açıklama,
  görsel (yükle veya URL).
- **Boyut & kullanım:** size_value+size_unit, texture, usage_frequency, usage_time, target_area,
  spf, ph_level, shelf_life_months, country_of_origin, usage_instructions.
- **Bayraklar:** is_cruelty_free, is_vegan, is_fragrance_free, is_paraben_free, is_alcohol_free.
- **İçerikler:** ingredients_text (ham INCI) + sıralı içerik etiketleri (autocomplete, get-or-create).
- **İlişkiler:** skin_types (çoklu), skin_concerns (çoklu).
- **Diğer:** is_private bayrağı (admin katalog ürünleri için varsayılan false).

## Veri tabanı
- Yeni migration **gerekmez**: roller (010), zengin products alanları (008), junction tablolar ve
  `product-photos` bucket zaten var. Sunucu service key ile yazdığı için RLS'e dokunulmaz; mobil app
  etkilenmez.

## Env
- `.env`: mevcut `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` + **yeni** `SUPABASE_ANON_KEY` (login/token
  doğrulama için). `.env.example` güncellenir.

## Kapsam dışı (sonraki sürümler)
- Scraper'ın dashboard'a tam entegrasyonu (scraper → ürün taslağı → form).
- Panel içinden editör davet/rol yönetimi (v1'de SQL ile).
- Katalog yazımını admin-only'a daraltan opsiyonel RLS sıkılaştırması.
- Toplu içe/dışa aktarma, denetim günlüğü (audit log).

## Doğrulama
- `tsc --noEmit` ile tip kontrolü.
- Sunucu açılır; login → ürün listesi → ekle/düzenle/sil akışı manuel smoke test.
