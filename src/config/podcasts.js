// ─────────────────────────────────────────────────────────────────────────────
// Podcast config — locations, backdrops, MR day names
//
// Backdrops are Unsplash fallbacks used until backdrop_url columns are
// seeded in the DB. Once the DB columns are populated these are ignored.
// ─────────────────────────────────────────────────────────────────────────────

export const PODCAST_LOCATIONS = {
  'majority-report':    'Brooklyn, N.Y.',
  'drop-site':          'Washington, D.C.',
  'breaking-points':    'Washington, D.C.',
  'trueanon':           'San Francisco, CA',
  'trillbilly':         'Whitesburg, KY',
  'qaa':                'New York, N.Y.',
  'it-could-happen-here': 'Portland, OR',
  'secular-talk':       'Stamford, CT',
  'left-reckoning':     'Austin, TX',
  'ive-had-it':         'Oklahoma City, OK',
  'organized-money':    'Washington, D.C.',
  'humanist-report':    'Los Angeles, CA',
};

// Default backdrop per show — used when DB backdrop_url is null
export const DEFAULT_BACKDROPS = {
  'majority-report':    'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=900&q=85&auto=format&fit=crop',
  'drop-site':          'https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=900&q=85&auto=format&fit=crop',
  'breaking-points':    'https://images.unsplash.com/photo-1580202891934-f7b1f2da3e74?w=900&q=85&auto=format&fit=crop',
  'trueanon':           'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=900&q=85&auto=format&fit=crop',
  'trillbilly':         'https://images.unsplash.com/photo-1476041800959-2f6bb412c8ce?w=900&q=85&auto=format&fit=crop',
  'qaa':                'https://images.unsplash.com/photo-1522083165195-3424ed129620?w=900&q=85&auto=format&fit=crop',
  'it-could-happen-here': 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=900&q=85&auto=format&fit=crop',
  'secular-talk':       'https://images.unsplash.com/photo-1500916434205-0c77489c6cf7?w=900&q=85&auto=format&fit=crop',
  'left-reckoning':     'https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=900&q=85&auto=format&fit=crop',
  'ive-had-it':         'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=900&q=85&auto=format&fit=crop',
  'organized-money':    'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=900&q=85&auto=format&fit=crop',
  'humanist-report':    'https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=900&q=85&auto=format&fit=crop',
};

// MR day-specific backdrops (keyed by getDay() — 1=Mon … 5=Fri)
export const MR_DAY_BACKDROPS = {
  1: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=900&q=85&auto=format&fit=crop', // Funday Monday — Brooklyn Bridge
  2: 'https://images.unsplash.com/photo-1518235506717-e1ed3306a89b?w=900&q=85&auto=format&fit=crop', // Newsday Tuesday — Manhattan skyline
  3: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=900&q=85&auto=format&fit=crop', // Hump Day — Brooklyn streets
  4: 'https://images.unsplash.com/photo-1555109307-f7d9da25c244?w=900&q=85&auto=format&fit=crop', // Emmajority Report Thursday — moody rooftops
  5: 'https://images.unsplash.com/photo-1522083165195-3424ed129620?w=900&q=85&auto=format&fit=crop', // Casual Friday — loose NYC street
};

// MR day labels keyed by getDay()
export const MR_DAY_LABELS = {
  1: 'Funday Monday',
  2: 'Newsday Tuesday',
  3: 'Hump Day',
  4: 'Emmajority Report Thursday',
  5: 'Casual Friday',
};

/**
 * Get the backdrop URL for an episode.
 * Prefers DB values, falls back to config, falls back to null.
 */
export function getBackdrop(podcast, airDate) {
  const slug = podcast?.podcast_slug || podcast?.slug;

  // MR: try day-specific DB column, then day-specific config, then default
  if (slug === 'majority-report' && airDate) {
    const day = new Date(airDate).getDay();
    const dayKey = ['', 'backdrop_mon', 'backdrop_tue', 'backdrop_wed', 'backdrop_thu', 'backdrop_fri', ''][day];
    if (dayKey && podcast[dayKey]) return podcast[dayKey];
    if (MR_DAY_BACKDROPS[day]) return MR_DAY_BACKDROPS[day];
  }

  // Any show: try DB backdrop_url, then config fallback
  return podcast?.backdrop_url || DEFAULT_BACKDROPS[slug] || null;
}

/**
 * Get the day label for an MR episode. Returns null for all other shows.
 */
export function getDayLabel(slug, airDate) {
  if (slug !== 'majority-report' || !airDate) return null;
  const day = new Date(airDate).getDay();
  return MR_DAY_LABELS[day] || null;
}
