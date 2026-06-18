// Supabase Edge Function: extract structured product data from a label photo
// using Claude vision + structured outputs. The Anthropic key lives only here
// (set with: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...).
//
// Deploy: supabase functions deploy extract-product
//
// To switch to the cheapest model, change MODEL to "claude-haiku-4-5".

import Anthropic from 'npm:@anthropic-ai/sdk@^0.69.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const MODEL = 'claude-sonnet-4-6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Best-effort in-memory per-user rate limit (resets on cold start). For hard
// guarantees back this with a table; this just blunts accidental rapid-fire.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 8;
const hits = new Map<string, number[]>();
function rateLimited(userId: string): boolean {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(userId, recent);
  return recent.length > RATE_MAX;
}

const PRODUCT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    brand: { type: 'string' },
    category: {
      type: 'string',
      enum: ['cleanser', 'toner', 'serum', 'moisturizer', 'sunscreen', 'mask', 'eye_cream', 'treatment', 'other'],
    },
    ingredients_text: { type: 'string' },
    description: { type: 'string' },
    size_value: { type: 'number' },
    size_unit: { type: 'string', enum: ['ml', 'g', 'oz', 'fl_oz', 'pcs'] },
    spf: { type: 'number' },
    texture: {
      type: 'string',
      enum: ['cream', 'gel', 'liquid', 'foam', 'oil', 'balm', 'serum', 'mist', 'paste', 'powder', 'lotion', 'spray', 'stick', 'patch', 'other'],
    },
    usage_time: { type: 'string', enum: ['AM', 'PM', 'both'] },
    target_area: { type: 'string', enum: ['face', 'eye', 'lip', 'body', 'hand', 'hair', 'nail', 'scalp', 'full_body'] },
    is_vegan: { type: 'boolean' },
    is_cruelty_free: { type: 'boolean' },
    is_fragrance_free: { type: 'boolean' },
    is_paraben_free: { type: 'boolean' },
    is_alcohol_free: { type: 'boolean' },
    detected_language: { type: 'string' },
  },
} as const;

const INSTRUCTIONS = `You are reading a skincare/cosmetic product from a photo of its packaging.
Extract only what is clearly visible or directly stated on the label. Do not guess
or invent values — omit any field you cannot read with confidence. Copy the full
ingredient (INCI) list verbatim into ingredients_text when present. Map the product
to the closest category. Set boolean claims (vegan, cruelty-free, fragrance-free,
paraben-free, alcohol-free) to true only when the label explicitly states them.`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  // Verify the caller is an authenticated Glowist user.
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);

  // Admin-only feature: verify role server-side (client gating is not enough).
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.role !== 'admin') return json({ error: 'forbidden' }, 403);

  if (rateLimited(user.id)) return json({ error: 'rate_limited' }, 429);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'server_misconfigured' }, 500);

  let body: { image_base64?: string; media_type?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  const imageBase64 = body.image_base64;
  const mediaType = body.media_type ?? 'image/jpeg';
  if (!imageBase64) return json({ error: 'missing_image' }, 400);

  try {
    const client = new Anthropic({ apiKey });
    // Cast params: output_config (structured outputs) may be newer than the
    // bundled SDK types. The runtime accepts it.
    const params = {
      model: MODEL,
      max_tokens: 2048,
      output_config: { format: { type: 'json_schema', schema: PRODUCT_SCHEMA }, effort: 'low' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: INSTRUCTIONS },
          ],
        },
      ],
    };
    // deno-lint-ignore no-explicit-any
    const message = await client.messages.create(params as any);

    // deno-lint-ignore no-explicit-any
    const textBlock = (message.content as any[]).find((b) => b.type === 'text');
    if (!textBlock?.text) return json({ error: 'no_extraction' }, 502);

    let fields: Record<string, unknown>;
    try {
      fields = JSON.parse(textBlock.text);
    } catch {
      return json({ error: 'parse_failed' }, 502);
    }
    return json({ fields }, 200);
  } catch (e) {
    console.error('extract-product error', e);
    return json({ error: 'extraction_failed' }, 502);
  }
});

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
