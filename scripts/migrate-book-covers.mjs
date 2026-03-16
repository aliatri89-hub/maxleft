#!/usr/bin/env node
/**
 * migrate-book-covers.mjs
 *
 * One-time migration: downloads all NPP Books & Nachos covers from
 * external sources (Open Library, Goodreads, Wikipedia) and re-hosts
 * them on Supabase Storage (banners/book-covers/).
 *
 * Updates both extra_data.cover_image and poster_path in community_items
 * so covers load from the Supabase CDN (~50ms) instead of Open Library (~1s+).
 *
 * Run from the MANTL project root:
 *   node scripts/migrate-book-covers.mjs
 *
 * Requires: VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY in .env
 * (service role needed for storage uploads — anon key won't work)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// ─── Load env ─────────────────────────────────────────────────
// Try to load from .env and .env.local
for (const envFile of [".env", ".env.local"]) {
  try {
    const envPath = resolve(process.cwd(), envFile);
    const contents = readFileSync(envPath, "utf-8");
    contents.split("\n").forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim();
        // Don't overwrite — .env takes priority over .env.local
        if (!process.env[key]) process.env[key] = val;
      }
    });
  } catch {}
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY =
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env / .env.local"
  );
  console.error(
    "   You can find the service role key in Supabase Dashboard → Settings → API"
  );
  process.exit(1);
}

// Storage uploads need the real Supabase URL, not a custom domain
const REAL_SUPABASE_URL = SUPABASE_URL.includes("supabase.co")
  ? SUPABASE_URL
  : "https://gfjobhkofftvmluocxyw.supabase.co";

console.log(`🔗 Supabase URL: ${SUPABASE_URL}`);
console.log(`🔗 Storage URL:  ${REAL_SUPABASE_URL}\n`);

const supabase = createClient(REAL_SUPABASE_URL, SERVICE_KEY);

const NPP_COMMUNITY_ID = "dc0ff496-dce9-4dbf-b56e-5967be6b3b9c";
const BUCKET = "banners";
const FOLDER = "book-covers";
const CDN_BASE = `${REAL_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${FOLDER}`;

const BATCH_SIZE = 5; // concurrent downloads
const RETRY_ATTEMPTS = 2;

// ─── Helpers ──────────────────────────────────────────────────

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function downloadImage(url) {
  for (let attempt = 0; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(15000),
        headers: { "User-Agent": "MANTL-BookCoverMigration/1.0" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get("content-type") || "image/jpeg";
      return { buffer, contentType };
    } catch (err) {
      if (attempt === RETRY_ATTEMPTS) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

function getExtension(contentType, url) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  // Check URL for extension hints
  if (url.includes(".png")) return "png";
  if (url.includes(".webp")) return "webp";
  return "jpg";
}

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  console.log("📚 Fetching NPP book items...\n");

  // Get all book items for NPP
  const { data: books, error } = await supabase
    .from("community_items")
    .select("id, title, isbn, extra_data, poster_path, miniseries_id")
    .in(
      "miniseries_id",
      (
        await supabase
          .from("community_miniseries")
          .select("id")
          .eq("community_id", NPP_COMMUNITY_ID)
      ).data.map((s) => s.id)
    )
    .eq("media_type", "book");

  if (error) {
    console.error("❌ Failed to fetch books:", error.message);
    process.exit(1);
  }

  // Filter to only books with external cover URLs
  const toMigrate = books.filter((b) => {
    const url = b.extra_data?.cover_image;
    return url && !url.includes("supabase.co");
  });

  console.log(
    `Found ${books.length} total books, ${toMigrate.length} need migration\n`
  );

  let success = 0;
  let failed = 0;
  const failures = [];

  // Process in batches
  for (let i = 0; i < toMigrate.length; i += BATCH_SIZE) {
    const batch = toMigrate.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (book) => {
        const sourceUrl = book.extra_data.cover_image;
        const slug = slugify(book.title);
        const itemId = book.id;

        try {
          // 1. Download
          const { buffer, contentType } = await downloadImage(sourceUrl);
          const ext = getExtension(contentType, sourceUrl);
          const storagePath = `${FOLDER}/${slug}-${book.isbn || itemId.slice(0, 8)}.${ext}`;

          // Skip tiny images (Open Library placeholders are ~800 bytes)
          if (buffer.length < 2000) {
            console.log(`  ⚠️  ${book.title} — skipped (placeholder image)`);
            return null;
          }

          // 2. Upload to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(storagePath, buffer, {
              contentType,
              upsert: true,
              cacheControl: "31536000", // 1 year cache
            });

          if (uploadError) throw new Error(`Upload: ${uploadError.message}`);

          // 3. Build CDN URL
          const cdnUrl = `${REAL_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;

          // 4. Update DB — both extra_data.cover_image and poster_path
          const newExtraData = { ...book.extra_data, cover_image: cdnUrl };
          const { error: updateError } = await supabase
            .from("community_items")
            .update({
              extra_data: newExtraData,
              poster_path: cdnUrl,
            })
            .eq("id", itemId);

          if (updateError) throw new Error(`DB update: ${updateError.message}`);

          console.log(`  ✅ ${book.title}`);
          return cdnUrl;
        } catch (err) {
          console.log(`  ❌ ${book.title} — ${err.message}`);
          failures.push({ title: book.title, error: err.message });
          throw err;
        }
      })
    );

    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value !== null) success++;
      else if (r.status === "rejected") failed++;
    });

    // Progress
    const done = Math.min(i + BATCH_SIZE, toMigrate.length);
    console.log(
      `\n  Progress: ${done}/${toMigrate.length} processed (${success} ✅, ${failed} ❌)\n`
    );

    // Brief pause between batches to be nice to source servers
    if (i + BATCH_SIZE < toMigrate.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // ─── Summary ──────────────────────────────────────────────
  console.log("\n" + "═".repeat(50));
  console.log(`📚 Migration complete!`);
  console.log(`   ✅ ${success} covers migrated to Supabase Storage`);
  if (failed > 0) {
    console.log(`   ❌ ${failed} failed:`);
    failures.forEach((f) => console.log(`      - ${f.title}: ${f.error}`));
  }
  console.log("═".repeat(50));
  console.log(
    "\nBook covers will now load from your Supabase CDN instead of Open Library."
  );
  console.log("No code changes needed — extra_data.cover_image already drives the UI.\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
