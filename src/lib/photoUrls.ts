import type { getSupabaseClient } from '@/lib/supabase';

type SupabaseClientType = ReturnType<typeof getSupabaseClient>;

/**
 * The `photos` bucket is private (migration 019), so the `url` column stored at
 * upload time is no longer publicly fetchable. Given photo rows, resolve a
 * short-lived signed URL for each from its storage `filename` and return the
 * rows with `url` replaced by the signed URL.
 *
 * Batched via `createSignedUrls` (one request for the whole page of photos).
 * On any error, rows are returned unchanged rather than throwing, so a signing
 * hiccup degrades to broken thumbnails instead of a failed query.
 */
export async function withSignedPhotoUrls<
  T extends { filename?: string | null; url?: string | null },
>(
  supabase: SupabaseClientType,
  rows: T[] | null | undefined,
  ttlSeconds = 3600,
): Promise<T[]> {
  const list = rows ?? [];
  const paths = list
    .map((r) => r.filename)
    .filter((p): p is string => typeof p === 'string' && p.length > 0);
  if (paths.length === 0) return list;

  const { data, error } = await supabase.storage
    .from('photos')
    .createSignedUrls(paths, ttlSeconds);
  if (error || !data) return list;

  const byPath = new Map<string, string>();
  for (const item of data) {
    if (item.path && item.signedUrl) byPath.set(item.path, item.signedUrl);
  }

  return list.map((r) =>
    r.filename && byPath.has(r.filename)
      ? { ...r, url: byPath.get(r.filename)! }
      : r,
  );
}
