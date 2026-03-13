#!/usr/bin/env node
/**
 * scrape-bn-audio.js — Scrapes Books & Nachos Podbean pages
 * to extract mp3 URLs for all episodes.
 *
 * Run: node scrape-bn-audio.js
 * Outputs: bn_episode_urls_full.sql
 */

import { writeFileSync } from "fs";

const NPP_ID = "dc0ff496-dce9-4dbf-b56e-5967be6b3b9c";
const BASE = "https://booksandnachos.podbean.com";
const DELAY_MS = 600;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function main() {
  console.log("Scraping Books & Nachos episode pages...\n");

  // Step 1: Collect all episode page URLs from paginated listings
  const episodePages = new Set();
  for (let page = 1; page <= 20; page++) {
    const url = page === 1 ? BASE + "/" : `${BASE}/page/${page}/`;
    console.log(`  Fetching listing page ${page}...`);

    try {
      const html = await fetchText(url);

      // Debug: show a snippet if page 1 finds nothing
      if (page === 1 && !html.includes("/e/")) {
        console.log(`  ⚠ Page HTML doesn't contain /e/ links. First 500 chars:`);
        console.log(html.slice(0, 500));
        break;
      }

      // Extract episode links — Podbean uses various href formats
      const patterns = [
        /href="(https?:\/\/booksandnachos\.podbean\.com\/e\/[^"#]+)"/gi,
        /href="(\/e\/[^"#]+)"/gi,
      ];

      let foundThisPage = 0;
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
          let epUrl = match[1];
          if (epUrl.startsWith("/e/")) {
            epUrl = BASE + epUrl;
          }
          if (!epUrl.includes("#")) {
            episodePages.add(epUrl);
            foundThisPage++;
          }
        }
      }

      console.log(`  → Found ${foundThisPage} links (${episodePages.size} unique total)`);

      // Check for next page link
      if (!html.includes(`/page/${page + 1}/`) && page > 1) {
        console.log(`  → No more pages.`);
        break;
      }

      await sleep(DELAY_MS);
    } catch (e) {
      console.log(`  → Page ${page} failed: ${e.message}, stopping.`);
      break;
    }
  }

  const epUrls = [...episodePages];
  console.log(`\nTotal unique episode pages: ${epUrls.length}`);

  if (epUrls.length === 0) {
    console.log("\n⚠ No episodes found. Podbean may be blocking or the HTML structure changed.");
    console.log("Try opening https://booksandnachos.podbean.com/ in your browser to verify.");
    return;
  }

  console.log("Fetching individual episode pages for audio URLs...\n");

  // Step 2: Fetch each episode page and extract audio URL
  const episodes = [];
  for (let i = 0; i < epUrls.length; i++) {
    const epUrl = epUrls[i];
    const slug = epUrl.split("/e/")[1]?.replace(/\/$/, "") || "unknown";
    process.stdout.write(`  [${i + 1}/${epUrls.length}] ${slug.slice(0, 50)}...`);

    try {
      const html = await fetchText(epUrl);
      let audioUrl = null;

      // Method 1: Direct mp3 URL in page source
      const mp3Patterns = [
        /https:\/\/mcdn\.podbean\.com\/mf\/web\/[a-z0-9]+\/[^"'\s<>]+\.mp3/gi,
        /"url"\s*:\s*"(https:\/\/mcdn\.podbean\.com[^"]+\.mp3)"/i,
        /data-url="(https:\/\/mcdn\.podbean\.com[^"]+\.mp3)"/i,
        /src="(https:\/\/mcdn\.podbean\.com[^"]+\.mp3)"/i,
      ];

      for (const pattern of mp3Patterns) {
        const m = html.match(pattern);
        if (m) {
          audioUrl = m[1] || m[0];
          break;
        }
      }

      // Extract title from page
      const titleMatch = html.match(/<h2[^>]*>\s*<a[^>]*>([^<]+)<\/a>/);
      const titleAlt = html.match(/<title>([^<|]+)/);
      const fullTitle = (titleMatch?.[1] || titleAlt?.[1] || slug.replace(/-/g, " ")).trim()
        .replace(/\s*\|\s*Books\s*&\s*Nachos.*$/i, "")
        .trim();

      if (audioUrl) {
        console.log(` ✓`);
        episodes.push({ title: fullTitle, audioUrl, pageUrl: epUrl });
      } else {
        console.log(` ✗ no audio`);
        episodes.push({ title: fullTitle, audioUrl: null, pageUrl: epUrl });
      }
    } catch (e) {
      console.log(` ✗ ${e.message}`);
      episodes.push({ title: slug, audioUrl: null, pageUrl: epUrl });
    }

    await sleep(DELAY_MS);
  }

  const withAudio = episodes.filter((e) => e.audioUrl);
  const noAudio = episodes.filter((e) => !e.audioUrl);

  console.log(`\n════════════════════════════════════`);
  console.log(`Extracted audio: ${withAudio.length}/${episodes.length} episodes`);
  if (noAudio.length > 0) console.log(`Missing audio: ${noAudio.length} episodes`);
  console.log(`════════════════════════════════════\n`);

  // Step 3: Generate SQL
  const lines = [
    "-- ============================================================",
    "-- NPP BOOKS: Episode audio URLs (full B&N catalog)",
    "-- Auto-generated by scrape-bn-audio.js",
    `-- Matched: ${withAudio.length} episodes`,
    "-- ============================================================",
    "",
  ];

  for (const ep of withAudio) {
    const titleEsc = ep.title.replace(/'/g, "''");
    const url = ep.audioUrl;
    lines.push(`-- ${ep.title}`);
    lines.push(`UPDATE community_items
SET episode_url = '${url}',
    extra_data = COALESCE(extra_data, '{}'::jsonb) || '{"episode_url": "${url}"}'::jsonb
WHERE title = '${titleEsc}' AND media_type = 'book'
  AND miniseries_id IN (SELECT id FROM community_miniseries WHERE community_id = '${NPP_ID}' AND tab_key = 'books');`);
    lines.push("");
  }

  if (noAudio.length > 0) {
    lines.push("-- ═══ EPISODES WITHOUT AUDIO URL (manual review) ═══");
    for (const ep of noAudio) {
      lines.push(`-- ${ep.title}`);
      lines.push(`--   ${ep.pageUrl}`);
    }
  }

  const outFile = "bn_episode_urls_full.sql";
  writeFileSync(outFile, lines.join("\n"));
  console.log(`SQL written to ${outFile}`);
  console.log("Review the output, then run in Supabase SQL Editor.");
}

main().catch(console.error);
