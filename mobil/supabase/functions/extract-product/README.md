# extract-product — deployment (self-hosted Supabase on Coolify)

Reads a product label photo and returns structured product fields via Claude
vision. Admin-only (verifies `profiles.role = 'admin'` server-side).

## Required environment variable

Set on the Supabase **edge functions** service (image `supabase/edge-runtime`,
usually the `functions` container) — **not** in the mobile app `.env`, and never
as `EXPO_PUBLIC_*`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected by the Supabase stack and are
used by the function to verify the caller's JWT and role.

## Add the key in Coolify

1. Open the Supabase resource → the **edge functions** service (`functions` /
   `edge-runtime`) → **Environment Variables**.
2. Add `ANTHROPIC_API_KEY` with your Anthropic key as the value (mark it secret).
3. **Redeploy / restart** that service so the container picks up the new env.
4. Confirm the `functions` container actually received it (depends on how the
   template maps env into the container):
   ```sh
   docker exec <functions-container> printenv ANTHROPIC_API_KEY
   ```

## Get the function code onto the self-hosted instance

Self-hosted Supabase serves functions from the mounted functions volume (it does
not have the hosted "deploy" pipeline). Either:

- Copy `supabase/functions/extract-product/` into the server's functions volume
  (e.g. `volumes/functions/extract-product/`) and restart the `functions` service, or
- Use the Supabase CLI pointed at your self-hosted project, if configured.

## Model

Default `claude-sonnet-4-6` (see `index.ts`). Change `MODEL` to
`claude-haiku-4-5` for the cheapest option.

## Verify

```sh
# Without auth -> 401; authenticated non-admin -> 403; admin + image -> 200 { fields }
curl -i -X POST "$SUPABASE_URL/functions/v1/extract-product" \
  -H "Authorization: Bearer <user-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"image_base64":"<base64>","media_type":"image/jpeg","locale":"tr"}'
```
