/**
 * thumbnailUrl — Supabase Storage image transformation helper.
 *
 * Converts a Supabase public storage URL to use the /render/image/ endpoint
 * which resizes on the fly. Pro plan required.
 *
 * Before: .../storage/v1/object/public/series-art/bc/image.png  (7.6 MB)
 * After:  .../storage/v1/render/image/public/series-art/bc/image.png?width=500&quality=75  (~40 KB)
 *
 * Non-Supabase URLs pass through unchanged.
 */

const SUPABASE_STORAGE_MARKER = "/storage/v1/object/public/";
const RENDER_PATH = "/storage/v1/render/image/public/";

export function thumbnailUrl(url, width = 500, quality = 75) {
  if (!url || !url.includes(SUPABASE_STORAGE_MARKER)) return url;
  return url.replace(SUPABASE_STORAGE_MARKER, RENDER_PATH) +
    `?width=${width}&quality=${quality}&resize=contain`;
}

// Preset sizes
export const gridThumb   = (url) => thumbnailUrl(url, 500, 75);  // ~185px tiles @ 3x
export const headerThumb = (url) => thumbnailUrl(url, 900, 80);  // full-width header crop
