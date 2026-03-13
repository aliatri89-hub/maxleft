#!/usr/bin/env node

/**
 * seed-box-office.js
 *
 * Fetches budget + revenue from TMDB for all Blank Check community_items
 * and merges into each item's extra_data JSONB field.
 *
 * NO DEPENDENCIES — uses native fetch only.
 *
 * Usage:
 *   node seed-box-office.js --dry-run    (preview, no DB writes)
 *   node seed-box-office.js              (fetch + write to DB)
 *   node seed-box-office.js --force      (re-fetch even if box_office exists)
 */

// ═══════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════

const TMDB_API_KEY = "ec6edb453a82a8a1081d13e597ea95ce";
const SUPABASE_URL = "https://gfjobhkofftvmluocxyw.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmam9iaGtvZmZ0dm1sdW9jeHl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM0Nzc5MCwiZXhwIjoyMDg2OTIzNzkwfQ.SYw4NJr7uXnX0xww4Uw5jfKtdnxbAaW_Kyzu9UIHoBI";

const BLANK_CHECK_COMMUNITY_ID = "cb2f3b1a-eca8-4e0f-b296-1e1dcabdcca7";

const BATCH_SIZE = 35;
const BATCH_DELAY_MS = 10_000;
const PER_REQUEST_DELAY_MS = 100;

// ═══════════════════════════════════════════════════
// SUPABASE REST HELPERS (no SDK needed)
// ═══════════════════════════════════════════════════

const SB_HEADERS = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function sbGet(table, queryString) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${queryString}`;
  const res = await fetch(url, {
    headers: { ...SB_HEADERS, Prefer: "return=representation" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase GET ${table}: ${res.status} — ${text}`);
  }
  return res.json();
}

async function sbPatch(table, matchCol, matchVal, body) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${matchCol}=eq.${matchVal}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { ...SB_HEADERS, Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase PATCH: ${res.status} — ${text}`);
  }
}

// ═══════════════════════════════════════════════════
// TMDB
// ═══════════════════════════════════════════════════

async function fetchTMDBMovie(tmdbId) {
  const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TMDB ${res.status} for tmdb_id ${tmdbId}: ${text}`);
  }
  return res.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function formatUSD(num) {
  if (!num || num === 0) return "$0";
  return "$" + num.toLocaleString("en-US");
}

// ═══════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FORCE = args.includes("--force");

async function main() {
  console.log("\n🎬 Blank Check Box Office Seeder");
  console.log("═".repeat(50));
  if (DRY_RUN) console.log("🔍 DRY RUN — no database updates will be made\n");
  if (FORCE) console.log("⚡ FORCE MODE — re-fetching all items\n");

  // 1. Get all miniseries IDs belonging to Blank Check
  console.log("Fetching Blank Check miniseries...");
  const miniseries = await sbGet(
    "community_miniseries",
    `community_id=eq.${BLANK_CHECK_COMMUNITY_ID}&select=id,title`
  );
  console.log(`Found ${miniseries.length} miniseries\n`);

  if (miniseries.length === 0) {
    console.log("❌ No miniseries found — check community_id");
    process.exit(1);
  }

  const miniseriesIds = miniseries.map((m) => m.id);

  // 2. Get all items across those miniseries that have a tmdb_id
  console.log("Fetching community_items...");
  let allItems = [];
  const CHUNK = 50;

  for (let i = 0; i < miniseriesIds.length; i += CHUNK) {
    const chunk = miniseriesIds.slice(i, i + CHUNK);
    const inList = chunk.map((id) => `"${id}"`).join(",");
    const items = await sbGet(
      "community_items",
      `miniseries_id=in.(${inList})&tmdb_id=not.is.null&select=id,title,tmdb_id,extra_data&order=title`
    );
    allItems = allItems.concat(items);
  }

  console.log(`Found ${allItems.length} items with tmdb_id\n`);

  // 3. Filter out items that already have box_office (unless --force)
  const toFetch = FORCE
    ? allItems
    : allItems.filter((item) => {
        const existing = item.extra_data?.box_office;
        return !existing || existing.budget === undefined;
      });

  const skipped = allItems.length - toFetch.length;
  if (skipped > 0) {
    console.log(`⏭  Skipping ${skipped} items that already have box_office data`);
    console.log(`   (use --force to re-fetch)\n`);
  }

  if (toFetch.length === 0) {
    console.log("✅ Nothing to fetch — all items already have box office data!");
    return;
  }

  console.log(`Fetching TMDB data for ${toFetch.length} items...\n`);

  // 4. Fetch in batches
  const results = [];
  let fetchedCount = 0;
  let errorCount = 0;

  for (let batchStart = 0; batchStart < toFetch.length; batchStart += BATCH_SIZE) {
    const batch = toFetch.slice(batchStart, batchStart + BATCH_SIZE);

    if (batchStart > 0) {
      console.log(`\n⏳ Rate limit pause (${BATCH_DELAY_MS / 1000}s)...\n`);
      await sleep(BATCH_DELAY_MS);
    }

    for (const item of batch) {
      try {
        const tmdb = await fetchTMDBMovie(item.tmdb_id);
        const budget = tmdb.budget || 0;
        const revenue = tmdb.revenue || 0;

        const mergedExtraData = {
          ...(item.extra_data || {}),
          box_office: { budget, revenue },
        };

        results.push({
          id: item.id,
          title: item.title,
          tmdb_id: item.tmdb_id,
          budget,
          revenue,
          mergedExtraData,
        });

        const budgetStr = formatUSD(budget);
        const revenueStr = formatUSD(revenue);
        const profitStr =
          budget > 0
            ? `${((revenue / budget) * 100 - 100).toFixed(0)}% ROI`
            : "no budget data";
        const flag = !(budget > 0 && revenue > 0) ? " ⚠️" : "";

        fetchedCount++;
        console.log(
          `  ✓ ${item.title} — Budget: ${budgetStr} | Revenue: ${revenueStr} | ${profitStr}${flag}`
        );
      } catch (err) {
        errorCount++;
        console.log(`  ✗ ${item.title} (tmdb_id: ${item.tmdb_id}) — ${err.message}`);
      }

      await sleep(PER_REQUEST_DELAY_MS);
    }
  }

  // 5. Summary
  console.log("\n" + "═".repeat(50));
  console.log("📊 FETCH SUMMARY");
  console.log(`   Fetched:    ${fetchedCount}`);
  console.log(`   Errors:     ${errorCount}`);

  const withBudget = results.filter((r) => r.budget > 0).length;
  const withRevenue = results.filter((r) => r.revenue > 0).length;
  const withBoth = results.filter((r) => r.budget > 0 && r.revenue > 0).length;
  const noDataCount = results.filter((r) => r.budget === 0 && r.revenue === 0).length;

  console.log(`   Has budget:  ${withBudget}`);
  console.log(`   Has revenue: ${withRevenue}`);
  console.log(`   Has both:    ${withBoth}`);
  console.log(`   No data:     ${noDataCount}`);

  const topGross = [...results]
    .filter((r) => r.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  if (topGross.length > 0) {
    console.log("\n🏆 Top 5 Highest Grossing:");
    topGross.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.title} — ${formatUSD(r.revenue)}`);
    });
  }

  const bombs = [...results]
    .filter((r) => r.budget > 0 && r.revenue > 0 && r.revenue < r.budget)
    .sort((a, b) => a.revenue / a.budget - b.revenue / b.budget)
    .slice(0, 5);

  if (bombs.length > 0) {
    console.log("\n💣 Top 5 Biggest Bombs (revenue < budget):");
    bombs.forEach((r, i) => {
      const loss = r.budget - r.revenue;
      console.log(
        `   ${i + 1}. ${r.title} — Lost ${formatUSD(loss)} (${formatUSD(r.budget)} budget → ${formatUSD(r.revenue)} gross)`
      );
    });
  }

  // 6. Update Supabase
  if (DRY_RUN) {
    console.log("\n🔍 DRY RUN complete — no database changes made.");
    console.log("   Remove --dry-run to write data.\n");
    return;
  }

  if (results.length === 0) {
    console.log("\nNo results to update.");
    return;
  }

  console.log(`\nWriting ${results.length} updates to Supabase...`);

  let updateCount = 0;
  let updateErrors = 0;

  for (const r of results) {
    try {
      await sbPatch("community_items", "id", r.id, {
        extra_data: r.mergedExtraData,
      });
      updateCount++;
    } catch (err) {
      updateErrors++;
      console.log(`  ✗ Failed to update "${r.title}": ${err.message}`);
    }
    await sleep(50);
  }

  console.log(`\n✅ Done! Updated ${updateCount} items. Errors: ${updateErrors}\n`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
