# Glowist — "Magic Add": camera + auto-fill product entry

**Date:** 2026-06-13
**Branch:** `feat/magic-add-product`
**App:** Glowist — Expo Router + Supabase, React Native, 4-locale i18n (en/de/es/tr).

## Goal

Let users add a product by pointing the camera at it instead of typing a long
manual form. Scan the barcode (free product database) when possible; fall back to
an AI vision read of the label for ingredients and attributes. Extracted values
**pre-fill the existing add form** for review before saving. Also upgrade the
current image field (a pasted URL) to a real photo capture + upload.

## Current state (baseline)

- `app/products/add.tsx` is a fully manual form. The product image is a pasted
  **URL** string (`addProductImageUrl`, [add.tsx:526](app/products/add.tsx:526)) —
  no camera, no upload, no auto-fill.
- Rich product schema already exists (`types/product.ts`): name, brand, category,
  `ingredients_text`, barcode, size, spf, texture, vegan/cruelty-free/etc. flags,
  country, usage time, target area — an ideal auto-fill target.
- No camera/image-picker/AI deps installed. Supabase (`@supabase/supabase-js`) is
  available; only Supabase + Google keys exist in `.env`.

## Principles

- **No secrets in the client.** The Anthropic API key lives only as a Supabase
  Edge Function secret; the app calls the function, never Anthropic directly.
- **Review before save.** AI/barcode output only pre-fills the form. The user
  always sees and can edit every value before it is written. AI-populated fields
  are visually marked so the user knows to check them.
- **Graceful degradation.** Barcode miss → fall through to AI. AI error/timeout/no
  network → open the manual form with whatever we have. Never block adding.
- **Follow existing patterns.** Design system, `useLanguage().t()` for all strings,
  `BottomSheet`/`AnimatedCard`/haptics, `createProduct` in `lib/products.ts`.
- **No products-table schema change.** Everything maps to existing columns. New
  infra is a Storage bucket + an Edge Function only.
- **`npx tsc --noEmit` clean at the end.**

## Model choice

AI vision step uses **`claude-sonnet-4-6`** (strong multilingual label/INCI reading
+ structured outputs, ~$3/$15 per Mtok — materially cheaper than Opus). The model
id is a single constant in the Edge Function; switching to **`claude-haiku-4-5`**
(cheapest) is a one-line change documented in the function. Per-call output is a
small JSON object (~`max_tokens: 2048`), so cost per scan is low.

## Architecture

```
Camera screen (app/products/scan.tsx, new)
   │  1. Barcode detected ──▶ Open Beauty Facts API (free, no key) ──▶ map fields
   │  2. "Read label" photo ─▶ supabase.functions.invoke('extract-product')
   │                              └─▶ Anthropic SDK · claude-sonnet-4-6 · vision
   │                                  · output_config.format (json_schema) ──▶ product JSON
   ▼
products/add.tsx (pre-filled via route params / store) ──▶ user reviews/edits ──▶ createProduct
   │
   └─▶ chosen photo uploaded to Supabase Storage 'product-photos' ──▶ public URL ──▶ image_url
```

## Phases

### Phase A — Photo capture + Supabase Storage (foundation, no AI)

- Add deps: `expo-image-picker`, `expo-camera`, `expo-image-manipulator`. Register
  camera/photo permission strings in `app.config.js` (iOS `NSCameraUsageDescription`,
  `NSPhotoLibraryUsageDescription`; Android camera permission).
- Create a **public** Storage bucket `product-photos` (read public; insert
  restricted to authenticated users via Storage RLS). SQL/CLI provided in the plan.
- `lib/storage.ts`: `uploadProductPhoto(userId, localUri)` → resize/compress with
  image-manipulator (longest edge ~1200px, jpeg ~0.7) → upload → return public URL.
- In `add.tsx`, replace the image-URL text field with a **photo control**: tap →
  BottomSheet ("Take photo" / "Choose from library") → preview thumbnail. On save,
  upload and store the public URL in `image_url`.

**Acceptance:** can capture/pick a photo, it uploads and appears as the product
image after save; pasted-URL field is gone; `tsc` clean.

### Phase B — Barcode scan + Open Beauty Facts lookup

- `lib/barcode-lookup.ts`: `lookupByBarcode(code)` → GET
  `https://world.openbeautyfacts.org/api/v2/product/{code}.json` → map
  `product_name`/`brands`/`ingredients_text`/`quantity`/`image_url` to
  `CreateProductInput` fields (best-effort; unmapped left empty). Returns `null` on
  miss. Timeout + error-safe.
- `expo-camera` barcode scanning (EAN-13/UPC) in the scan screen (Phase D wires UI).

**Acceptance:** a known cosmetic barcode returns mapped fields; unknown returns
null without throwing.

### Phase C — AI vision Edge Function

- `supabase/functions/extract-product/index.ts` (Deno):
  - `import Anthropic from "npm:@anthropic-ai/sdk"`.
  - Verify the caller's Supabase JWT (reject anon); simple per-user rate limit
    (e.g. in-memory/short-TTL table or header check — keep minimal).
  - Input: `{ image_base64, media_type, locale }`.
  - Call `messages.create` with `model: "claude-sonnet-4-6"`, a vision message
    (base64 image block + extraction instruction), and
    `output_config: { format: { type: "json_schema", schema: PRODUCT_SCHEMA }, effort: "low" }`,
    `max_tokens: 2048` (no thinking needed). `PRODUCT_SCHEMA` covers: `name`,
    `brand`, `category` (enum from `ProductCategory`), `ingredients_text`,
    `size_value`, `size_unit` (enum), `spf`, `texture` (enum), `is_vegan`,
    `is_cruelty_free`, `is_fragrance_free`, `is_paraben_free`, `is_alcohol_free`,
    `country_of_origin`, `usage_time` (enum), `target_area` (enum), `description`,
    plus `detected_language`. `additionalProperties: false`; all fields optional so
    the model can omit what it can't read.
  - Parse the structured JSON text block; return it to the app. Map errors to a
    clean `{ error }` JSON with the right status.
- App: `lib/extract-product.ts` wraps `supabase.functions.invoke('extract-product', ...)`.

**Acceptance:** invoking with a label photo returns schema-valid JSON; bad/no
image returns a handled error; the Anthropic key is never shipped in the bundle.

### Phase D — Unified "Magic Add" flow

- New `app/products/scan.tsx`: live camera with two affordances — **auto barcode
  detection** (on detect → lookup → if hit, go to pre-filled form) and a **"Read
  label" shutter** (capture → manipulate to base64 → `extract-product` → pre-filled
  form). Loading + error + "enter manually" fallback states.
- Entry points: the products screen FAB and the empty-routine CTA offer
  "Scan a product" alongside "Add manually".
- Pre-fill transport: pass extracted fields into `add.tsx` (route params for
  scalars; for large `ingredients_text`, a tiny in-memory handoff store to avoid
  oversized params). `add.tsx` marks AI-populated fields with a subtle "auto-filled
  — check this" treatment.
- i18n: all new strings in en/de/es/tr.
- Register `products/scan` in the root Stack ([app/_layout.tsx](app/_layout.tsx)).

**Acceptance:** from the products screen a user can scan a barcode or a label,
land on a pre-filled review form, edit, and save; every new string is localized;
`tsc` clean.

## Error handling

| Case | Behavior |
|---|---|
| Barcode not found in OBF | Silently fall through to AI "read label" |
| AI error / timeout (>~20s) | Toast/sheet "couldn't auto-fill, enter manually"; open form anyway |
| No network | Skip lookup/AI; open manual form |
| Camera/photo permission denied | Explain + deep-link to settings; manual entry still works |
| Partial extraction | Fill what we got; leave the rest empty; all AI fields flagged for review |

## Prerequisites (deployment — user side)

1. **Anthropic API key** set as an Edge Function secret:
   `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` (never in the app bundle).
2. **Deploy** the function: `supabase functions deploy extract-product`.
3. **Create** the `product-photos` Storage bucket + RLS (SQL/CLI provided in the
   plan; can also be done in the Supabase dashboard).

The implementation provides exact commands/SQL; the user runs them (or grants
access). Phases A–B work without the Anthropic key; only Phase C/D's AI path needs it.

## Out of scope

- Editing existing products via photo (this is the add flow only).
- Contributing data back to Open Beauty Facts.
- On-device OCR; voice; multi-photo stitching.
- Any change to the products table schema or other screens' behavior.

## Risks

- **Edge Function deploy dependency.** If the user can't deploy, Phases A–B still
  ship value; Phase C/D's AI path stays dark until deployed (guard the UI so the
  "Read label" action degrades to manual when the function is unreachable).
- **OBF coverage** for niche/local brands is thin → that's exactly when AI fallback
  earns its keep.
- **Image token cost / size.** Always downscale before sending to the function
  (image-manipulator) to bound tokens and upload time.
- **Structured-output schema limits** (no min/maxLength, `additionalProperties:false`
  required) — the chosen schema stays within these.
