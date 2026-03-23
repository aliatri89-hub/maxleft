/**
 * Now Playing Podcast — MANTL Scraper
 *
 * Usage (from inside mantl/npp-scraper/):
 *   node scrape.js
 *
 * Output:
 *   npp-data.json   — full structured data for inspection
 *   npp-seed.sql    — INSERT statements ready for Supabase
 */

import * as cheerio from "cheerio";
import { parseStringPromise } from "xml2js";
import { writeFileSync } from "fs";

const RSS_URL     = "https://www.nowplayingpodcast.com/NPP.xml";
const TMDB_KEY    = "ec6edb453a82a8a1081d13e597ea95ce";
const DELAY_MS    = 400;
const TMDB_DELAY  = 250;
const MAX_EPISODES = 9999;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc   = (str) => (str || "").replace(/'/g, "''");

function log(msg) { process.stdout.write(msg + "\n"); }

// ─── Step 1: Fetch RSS ───────────────────────────────────────────────────────
async function fetchRSS() {
  log("📡 Fetching RSS feed...");
  const res = await fetch(RSS_URL);
  const xml = await res.text();
  const parsed = await parseStringPromise(xml, { explicitArray: false });
  const items = parsed.rss.channel.item;
  const arr = Array.isArray(items) ? items : [items];
  log(`✓ Found ${arr.length} episodes in feed`);
  return arr;
}

// ─── Step 2: Parse RSS item ──────────────────────────────────────────────────
function parseRSSItem(item) {
  return {
    title:       item.title || "",
    link:        item.link  || "",
    pubDate:     item.pubDate || "",
    description: item["content:encoded"] || item.description || "",
    audioUrl:    item.enclosure?.["$"]?.url || null,
  };
}

// ─── Step 3: Scrape movie page ───────────────────────────────────────────────
async function scrapePage(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MANTL-Scraper/1.0)" }
    });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);

    // Verdicts
    let upCount = 0, downCount = 0;
    $("img").each((_, el) => {
      const src = $(el).attr("src") || "";
      if (/GreenArrow/i.test(src)) upCount++;
      if (/RedArrow/i.test(src))   downCount++;
    });

// Series
    const seriesLinks = [];
    $("dd.seriesvalue").each((_, dd) => {
      $(dd).find("a").each((_, a) => {
        const text = $(a).text().trim();
        if (text && !/individual.movie/i.test(text)) seriesLinks.push(text);
      });
    });

    // Director
    let director = null;
    $("dt").each((_, dt) => {
      if (/director/i.test($(dt).text())) {
        director = $(dt).next("dd").text().trim() || null;
      }
    });

    // Release year
    let movieYear = null;
    $("dt").each((_, dt) => {
      if (/release.date/i.test($(dt).text())) {
        const txt = $(dt).next("dd").text().trim();
        const m = txt.match(/\b(19|20)\d{2}\b/);
        if (m) movieYear = parseInt(m[0]);
      }
    });

    // Genres
    const genres = [];
    $(".movie-genres a, .genres a").each((_, a) => genres.push($(a).text().trim()));

    // Hosts
    const bodyText = $(".entry-content, .episode-description").text();
    const hosts = extractHosts(bodyText);

    // Audio
    let audioUrl = null;
    $("audio source, a[href$='.mp3']").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("href") || "";
      if (src.includes(".mp3") && !audioUrl) audioUrl = src;
    });

    return { upCount, downCount, series: seriesLinks, director, movieYear, genres, hosts, audioUrl };
  } catch (e) {
    log(`  ⚠️  ${e.message}`);
    return null;
  }
}

// ─── Host extraction ─────────────────────────────────────────────────────────
const KNOWN_HOSTS = {
  "arnie": "arnie", "arnold": "arnie",
  "stuart": "stuart", "stu": "stuart",
  "brock": "brock", "jakob": "jakob", "jacob": "jakob",
};

function extractHosts(text) {
  const found = new Set();
  const lower = (text || "").toLowerCase();
  for (const [pattern, key] of Object.entries(KNOWN_HOSTS)) {
    if (lower.includes(pattern)) found.add(key);
  }
  return [...found];
}

// ─── TMDB lookup ─────────────────────────────────────────────────────────────
async function lookupTMDB(title, year) {
  try {
    let url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(title)}&language=en-US&page=1`;
    if (year) url += `&year=${year}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (!data.results?.length) return year ? lookupTMDB(title, null) : null;
    const exact    = data.results.find((r) => r.title?.toLowerCase() === title.toLowerCase());
    const sameYear = year ? data.results.find((r) => (r.release_date || "").startsWith(String(year))) : null;
    return exact || sameYear || data.results[0];
  } catch { return null; }
}

// ─── Verdict label ───────────────────────────────────────────────────────────
function verdictLabel(up, down) {
  const total = up + down;
  if (total === 0) return null;
  if (up === total)   return "all_up";
  if (down === total) return "all_down";
  return up > down ? "mostly_up" : "mostly_down";
}

// ─── Clean RSS title ─────────────────────────────────────────────────────────
function cleanTitle(raw) {
  return raw
    .replace(/\{[^}]*\}/g, "")
    .replace(/Now Playing:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleToSlug(title) {
  return title
    .toLowerCase()
    .replace(/['']/g, "")        // remove apostrophes
    .replace(/[^a-z0-9]+/g, "-") // non-alphanumeric to hyphens
    .replace(/^-+|-+$/g, "");    // trim leading/trailing hyphens
}

// ─── SQL generator ───────────────────────────────────────────────────────────
function generateSQL(episodes, seriesMap) {
  const lines = [];
  lines.push(`-- Now Playing Podcast — MANTL Seed`);
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push(`-- ${episodes.length} episodes, ${Object.keys(seriesMap).length} series\n`);
  lines.push(`DO $$`);
  lines.push(`DECLARE cid uuid; sid uuid;`);
  lines.push(`BEGIN`);
  lines.push(`  SELECT id INTO cid FROM community_pages WHERE slug = 'nowplaying';`);
  lines.push(`  IF cid IS NULL THEN RAISE EXCEPTION 'nowplaying community not found'; END IF;\n`);

  const sortedSeries = Object.entries(seriesMap).sort((a, b) => b[1].length - a[1].length);

  lines.push(`  -- ═══ SERIES (${sortedSeries.length} total) ═══`);
  sortedSeries.forEach(([name, eps], i) => {
    lines.push(`  INSERT INTO community_miniseries (id, community_id, title, sort_order, tab_key)`);
    lines.push(`  VALUES (gen_random_uuid(), cid, '${esc(name)}', ${(i + 1) * 10}, 'filmography')`);
    lines.push(`  ON CONFLICT DO NOTHING;\n`);
  });

  sortedSeries.forEach(([seriesName, eps]) => {
    lines.push(`\n  -- ${seriesName} (${eps.length} episodes)`);
    lines.push(`  SELECT id INTO sid FROM community_miniseries`);
    lines.push(`    WHERE community_id = cid AND title = '${esc(seriesName)}' AND tab_key = 'filmography';\n`);

    eps.sort((a, b) => (a.movieYear || 9999) - (b.movieYear || 9999)).forEach((ep, i) => {
      const verdictJson = ep.verdict
        ? `'{"up": ${ep.upCount}, "down": ${ep.downCount}, "label": "${ep.verdict}", "hosts": ${JSON.stringify(ep.hosts)}}'`
        : "NULL";
      lines.push(`  INSERT INTO community_items (miniseries_id, title, year, media_type, tmdb_id, poster_path, sort_order, extra_data)`);
      lines.push(`  VALUES (sid, '${esc(ep.title)}', ${ep.movieYear || "NULL"}, 'film', ${ep.tmdbId || "NULL"}, ${ep.posterPath ? `'${esc(ep.posterPath)}'` : "NULL"}, ${(i + 1) * 10}, ${verdictJson})`);
      lines.push(`  ON CONFLICT DO NOTHING;\n`);
    });
  });

  lines.push(`END $$;`);

  const noSeries = episodes.filter((e) => e.series.length === 0);
  if (noSeries.length > 0) {
    lines.push(`\n-- ═══ NO SERIES (${noSeries.length} individual reviews) ═══`);
    noSeries.forEach((ep) => {
      lines.push(`-- ${ep.title} (${ep.movieYear || "?"}) tmdb:${ep.tmdbId || "?"} verdict:${ep.verdict || "?"}`);
    });
  }

  return lines.join("\n");
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const items      = await fetchRSS();
  const episodes   = [];
  const seriesMap  = {};
  const toProcess  = items.slice(0, MAX_EPISODES);

  log(`\n🔍 Processing ${toProcess.length} episodes...\n`);

  for (let i = 0; i < toProcess.length; i++) {
    const base       = parseRSSItem(toProcess[i]);
    const movieTitle = cleanTitle(base.title);

    process.stdout.write(`[${i + 1}/${toProcess.length}] ${movieTitle}...`);

    await sleep(DELAY_MS);
const slug = titleToSlug(movieTitle);
const moviePageUrl = `https://nowplayingpodcast.com/movies/${slug}/`;
const pageData = await scrapePage(moviePageUrl);
    await sleep(TMDB_DELAY);
    const tmdb = await lookupTMDB(movieTitle, pageData?.movieYear || null);

    const ep = {
      title:      movieTitle,
      episodeUrl: base.link,
      audioUrl:   pageData?.audioUrl || base.audioUrl,
      pubDate:    base.pubDate,
      movieYear:  pageData?.movieYear || (tmdb?.release_date ? parseInt(tmdb.release_date.substring(0, 4)) : null),
      series:     pageData?.series || [],
      director:   pageData?.director || null,
      genres:     pageData?.genres || [],
      hosts:      pageData?.hosts || [],
      upCount:    pageData?.upCount || 0,
      downCount:  pageData?.downCount || 0,
      verdict:    verdictLabel(pageData?.upCount || 0, pageData?.downCount || 0),
      tmdbId:     tmdb?.id || null,
      posterPath: tmdb?.poster_path || null,
    };

    process.stdout.write(` ${ep.verdict || "?"} | ${ep.series.join(", ") || "no series"} | tmdb:${ep.tmdbId || "?"}\n`);
    episodes.push(ep);
    ep.series.forEach((s) => { if (!seriesMap[s]) seriesMap[s] = []; seriesMap[s].push(ep); });
  }

  writeFileSync("npp-data.json", JSON.stringify({ scraped: new Date().toISOString(), total: episodes.length, episodes, seriesMap }, null, 2));
  writeFileSync("npp-seed.sql", generateSQL(episodes, seriesMap));

  log(`\n✅ Done!`);
  log(`   Episodes:    ${episodes.length}`);
  log(`   With TMDB:   ${episodes.filter((e) => e.tmdbId).length}`);
  log(`   With verdict:${episodes.filter((e) => e.verdict).length}`);
  log(`   Series:      ${Object.keys(seriesMap).length}`);
  log(`\nTop series:`);
  Object.entries(seriesMap).sort((a, b) => b[1].length - a[1].length).slice(0, 10)
    .forEach(([name, eps]) => log(`   ${String(eps.length).padStart(3)} — ${name}`));
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });