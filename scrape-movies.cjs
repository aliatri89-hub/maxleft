/**
 * Triple Feature — Movie Pool Scraper
 * 
 * Run: node scrape-movies.js
 * 
 * Prerequisites:
 *   npm install node-fetch (or use Node 18+ with native fetch)
 * 
 * Set your API keys below or as env vars:
 *   TMDB_API_KEY=xxx OMDB_API_KEY=xxx node scrape-movies.js
 */

const TMDB_KEY = process.env.TMDB_API_KEY || "ec6edb453a82a8a1081d13e597ea95ce";
const OMDB_KEY = process.env.OMDB_API_KEY || "8dc97e20";

const fs = require("fs");

// Rate limiting helper
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- TMDB: Discover popular, well-known movies ---
async function fetchTMDBMovies() {
  const allMovies = [];
  const seenIds = new Set();

  // Strategy: Pull from multiple TMDB endpoints to get a diverse, recognizable pool
  const sources = [
    // Top rated (critical darlings, many are curveballs)
    ...Array.from({ length: 10 }, (_, i) => ({
      url: `https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_KEY}&language=en-US&page=${i + 1}&region=US`,
      label: "top_rated",
    })),
    // Popular (mainstream hits)
    ...Array.from({ length: 10 }, (_, i) => ({
      url: `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_KEY}&language=en-US&page=${i + 1}&region=US`,
      label: "popular",
    })),
    // Discover by year (2000-2025) sorted by revenue — catches big earners
    ...Array.from({ length: 26 }, (_, i) => ({
      url: `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&language=en-US&sort_by=revenue.desc&primary_release_year=${2000 + i}&page=1&vote_count.gte=100`,
      label: `year_${2000 + i}`,
    })),
    // Discover by year sorted by vote_count — catches culturally significant films
    ...Array.from({ length: 26 }, (_, i) => ({
      url: `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&language=en-US&sort_by=vote_count.desc&primary_release_year=${2000 + i}&page=1`,
      label: `votes_${2000 + i}`,
    })),
    // Some classic decades
    ...["1990", "1991", "1992", "1993", "1994", "1995", "1996", "1997", "1998", "1999"].map(
      (yr) => ({
        url: `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&language=en-US&sort_by=revenue.desc&primary_release_year=${yr}&page=1&vote_count.gte=100`,
        label: `year_${yr}`,
      })
    ),
  ];

  console.log(`Fetching from ${sources.length} TMDB endpoints...`);

  for (const source of sources) {
    try {
      const res = await fetch(source.url);
      const data = await res.json();

      if (data.results) {
        for (const movie of data.results) {
          if (seenIds.has(movie.id)) continue;
          if (!movie.poster_path) continue;
          if (!movie.title) continue;
          // Skip non-English-title movies that US audiences won't recognize
          if (movie.original_language !== "en" && movie.popularity < 30) continue;

          seenIds.add(movie.id);
          allMovies.push({
            tmdb_id: movie.id,
            title: movie.title,
            year: movie.release_date ? parseInt(movie.release_date.substring(0, 4)) : null,
            poster: `https://image.tmdb.org/t/p/w342${movie.poster_path}`,
            popularity: movie.popularity,
            vote_count: movie.vote_count,
            vote_average: movie.vote_average,
            // TMDB revenue is worldwide — we'll replace with domestic from OMDB
            tmdb_worldwide_revenue: movie.revenue || 0,
          });
        }
      }
      await sleep(250); // Stay under TMDB rate limits
    } catch (err) {
      console.error(`Error fetching ${source.label}:`, err.message);
    }
  }

  console.log(`Found ${allMovies.length} unique movies from TMDB`);
  return allMovies;
}

// --- OMDB: Get domestic box office ---
async function fetchDomesticGross(title, year) {
  try {
    const params = new URLSearchParams({
      apikey: OMDB_KEY,
      t: title,
      y: year?.toString() || "",
      type: "movie",
    });

    const res = await fetch(`https://www.omdbapi.com/?${params}`);
    const data = await res.json();

    if (data.Response === "True" && data.BoxOffice && data.BoxOffice !== "N/A") {
      // BoxOffice comes as "$123,456,789" — parse to number in millions
      const raw = parseInt(data.BoxOffice.replace(/[$,]/g, ""));
      if (raw > 0) {
        return Math.round(raw / 1_000_000); // Convert to $M
      }
    }
    return null;
  } catch (err) {
    return null;
  }
}

// --- Tier assignment ---
function assignTier(grossM) {
  if (grossM >= 400) return "A"; // Blockbusters — everyone knows these
  if (grossM >= 100) return "B"; // Solid hits — known but tricky numbers
  return "C"; // Curveballs — under $100M domestic
}

// --- Main ---
async function main() {
  if (OMDB_KEY === "YOUR_OMDB_KEY_HERE") {
    console.error("\n❌ Set your OMDB API key first!");
    console.error("   Get a free key at: https://www.omdbapi.com/apikey.aspx");
    console.error("   Then: OMDB_API_KEY=xxx node scrape-movies.js\n");
    process.exit(1);
  }

  console.log("\n🎬 Triple Feature — Movie Pool Scraper\n");

  // Step 1: Get candidates from TMDB
  const candidates = await fetchTMDBMovies();

  // Step 2: Sort by a blend of popularity + votes (most recognizable first)
  candidates.sort((a, b) => {
    const scoreA = a.popularity * 0.3 + a.vote_count * 0.01;
    const scoreB = b.popularity * 0.3 + b.vote_count * 0.01;
    return scoreB - scoreA;
  });

  // Step 3: Take top ~800 candidates (we'll lose some without OMDB data)
  const topCandidates = candidates.slice(0, 800);
  console.log(`\nLooking up domestic gross for top ${topCandidates.length} movies via OMDB...`);
  console.log("(This takes ~15 min at OMDB free tier rate limits)\n");

  const results = [];
  let found = 0;
  let notFound = 0;

  for (let i = 0; i < topCandidates.length; i++) {
    const movie = topCandidates[i];
    const gross = await fetchDomesticGross(movie.title, movie.year);

    if (gross !== null && gross > 0) {
      results.push({
        title: movie.title,
        year: movie.year,
        poster: movie.poster,
        gross, // domestic gross in $M
        tier: assignTier(gross),
        tmdb_id: movie.tmdb_id,
      });
      found++;
    } else {
      notFound++;
    }

    // Progress logging
    if ((i + 1) % 25 === 0) {
      console.log(
        `  [${i + 1}/${topCandidates.length}] Found: ${found} | No data: ${notFound} | Latest: ${movie.title} (${movie.year})`
      );
    }

    // OMDB free tier: 1,000/day — be conservative
    await sleep(150);

    // Stop if we have enough
    if (found >= 600) {
      console.log(`\nHit 600 movies with domestic data — stopping early.`);
      break;
    }
  }

  // Step 4: Validate pool composition
  const tierA = results.filter((m) => m.tier === "A");
  const tierB = results.filter((m) => m.tier === "B");
  const tierC = results.filter((m) => m.tier === "C");

  console.log(`\n✅ Final pool: ${results.length} movies`);
  console.log(`   Tier A (≥$400M): ${tierA.length} movies`);
  console.log(`   Tier B ($100-399M): ${tierB.length} movies`);
  console.log(`   Tier C (<$100M): ${tierC.length} movies`);

  // Step 5: Save results
  // Full data file
  fs.writeFileSync(
    "triple-feature-movies.json",
    JSON.stringify(results, null, 2)
  );
  console.log(`\n📁 Saved: triple-feature-movies.json`);

  // Also save as a JS constant ready to paste into the component
  const jsExport = `// Auto-generated by scrape-movies.js — ${results.length} movies
// ${new Date().toISOString()}

export const TIER_A = ${JSON.stringify(tierA.map(({ title, year, poster, gross }) => ({ title, year, poster, gross })), null, 2)};

export const TIER_B = ${JSON.stringify(tierB.map(({ title, year, poster, gross }) => ({ title, year, poster, gross })), null, 2)};

export const TIER_C = ${JSON.stringify(tierC.map(({ title, year, poster, gross }) => ({ title, year, poster, gross })), null, 2)};
`;

  fs.writeFileSync("triple-feature-movies.js", jsExport);
  console.log(`📁 Saved: triple-feature-movies.js (ready to import)\n`);

  // Print some fun stats
  const highest = results.sort((a, b) => b.gross - a.gross).slice(0, 5);
  const lowest = results.sort((a, b) => a.gross - b.gross).slice(0, 5);
  
  console.log("💰 Highest domestic gross in pool:");
  highest.forEach((m) => console.log(`   ${m.title} (${m.year}): $${m.gross}M`));
  
  console.log("\n🎭 Lowest domestic gross in pool (the curveballs):");
  lowest.forEach((m) => console.log(`   ${m.title} (${m.year}): $${m.gross}M`));
}

main().catch(console.error);
