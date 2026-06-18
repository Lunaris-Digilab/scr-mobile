import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

const BUCKET = 'product-photos';
const MAX_EDGE = 1200;

export interface PreparedImage {
  /** Local file URI of the resized/compressed image (use for preview). */
  uri: string;
  /** JPEG base64 without the `data:` prefix — reusable for AI vision. */
  base64: string;
  mediaType: 'image/jpeg';
}

/**
 * Resize (longest edge ~1200px) and compress a local image to JPEG.
 * Returns the local URI plus base64 so the same bytes can be reused for both
 * upload and AI extraction without re-reading the file.
 */
export async function prepareImage(localUri: string): Promise<PreparedImage> {
  const result = await manipulateAsync(
    localUri,
    [{ resize: { width: MAX_EDGE } }],
    { compress: 0.7, format: SaveFormat.JPEG, base64: true }
  );
  return { uri: result.uri, base64: result.base64 ?? '', mediaType: 'image/jpeg' };
}

/**
 * Uploads a prepared image to the public `product-photos` bucket and returns its
 * public URL. Path is namespaced by user id so Storage RLS can scope writes.
 */
export async function uploadProductPhoto(
  userId: string,
  image: PreparedImage
): Promise<string> {
  const rand = Math.random().toString(36).slice(2, 10);
  const path = `${userId}/${Date.now()}-${rand}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, decode(image.base64), {
      contentType: 'image/jpeg',
      upsert: false,
    });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
