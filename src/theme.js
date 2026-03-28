// ═══════════════════════════════════════════════════════════════
// MANTL Design Tokens — JS mirror of tokens.css
//
// ONE source of truth for every color, font, and radius in JSX.
// If you need a color in an inline style, import from here:
//
//   import { t } from '../../theme';  // adjust path
//   <div style={{ color: t.textPrimary }}>
//
// To change a color app-wide, edit it HERE + in tokens.css.
// ═══════════════════════════════════════════════════════════════

export const t = {
  // ── Surfaces ──
  bgPrimary:      '#0f0d0b',
  bgCard:         '#1a1714',
  bgCardEnd:      '#12100e',
  bgElevated:     'rgba(255,255,255,0.04)',
  bgInput:        'rgba(255,255,255,0.06)',
  bgHover:        'rgba(255,255,255,0.08)',
  bgActive:       'rgba(255,255,255,0.10)',

  // ── Borders ──
  borderSubtle:   'rgba(255,255,255,0.06)',
  borderMedium:   'rgba(255,255,255,0.10)',
  borderStrong:   'rgba(255,255,255,0.16)',

  // ── Text ──
  textPrimary:    '#ffffff',
  textSecondary:  'rgba(255,255,255,0.92)',
  textMuted:      'rgba(255,255,255,0.65)',
  textFaint:      'rgba(255,255,255,0.60)',

  // ── Accent Colors ──
  red:            '#e94560',
  redDim:         'rgba(233,69,96,0.12)',
  green:          '#4ade80',
  greenDim:       'rgba(74,222,128,0.12)',
  gold:           '#facc15',
  goldDim:        'rgba(250,204,21,0.12)',
  cyan:           '#22d3ee',
  cyanDim:        'rgba(34,211,238,0.12)',
  purple:         '#a78bfa',
  purpleDim:      'rgba(167,139,250,0.12)',
  orange:         '#fc4c02',
  terra:          '#C4734F',
  terraDim:       'rgba(196,115,79,0.12)',
  mint:           '#00ffc8',
  sand:           '#d4a574',

  // ── Typography ──
  fontDisplay:    "'Barlow Condensed', sans-serif",
  fontBody:       "'Barlow Condensed', sans-serif",
  fontHeadline:   "'Bebas Neue', sans-serif",
  fontSharpie:    "'Permanent Marker', cursive",
  fontSerif:      "'Playfair Display', serif",
  fontMono:       "'IBM Plex Mono', monospace",

  // ── Radii ──
  radiusSm:       8,
  radiusMd:       12,
  radiusLg:       16,
  radiusXl:       20,
  radiusFull:     9999,

  // ── Brand Colors (3rd-party services) ──
  steam:          '#66C0F4',
  steamDim:       'rgba(102,192,244,0.10)',
  imdb:           '#F5C518',
  imdbDim:        'rgba(245,197,24,0.12)',
  metacritic:     '#F96836',
  metacriticDim:  'rgba(249,104,54,0.08)',
  spotify:        '#1DB954',

  // ── Cream theme (VHS labels, browse cards) ──
  cream:          '#f0ebe1',
  creamDark:      '#2C2824',
  creamMuted:     '#8a7e6b',
};
