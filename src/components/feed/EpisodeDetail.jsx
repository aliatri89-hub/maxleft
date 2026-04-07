import { useState, useEffect } from 'react';
import { useAudioPlayer } from '../community/shared/AudioPlayerProvider';
import decodeEntities from '../../utils/decodeEntities';
import { fmtDuration } from '../../utils/helpers';
import { getBackdrop, getDayLabel, PODCAST_LOCATIONS } from '../../config/podcasts';
import { supabase } from '../../supabase';

// ── Colors ───────────────────────────────────────────────────────────────────
const NAVY  = '#0B1F4A';
const PAPER = '#FAF9F6';
const INK   = '#111111';
const DIM   = '#777777';
const RULE  = '#D8D4CC';
const RED   = '#C8291A';

const SLUG_COLORS = {
  'majority-report':      '#1A3A8F',
  'drop-site':            '#8B1A1A',
  'breaking-points':      '#1A4A1A',
  'trueanon':             '#4A1A7A',
  'trillbilly':           '#5C3A10',
  'qaa':                  '#0A3A5A',
  'it-could-happen-here': '#1A4A3A',
  'secular-talk':         '#3A3A1A',
  'left-reckoning':       '#6B2D00',
  'ive-had-it':           '#8B3A00',
  'organized-money':      '#1A2A4A',
  'humanist-report':      '#2A1A5A',
};

// ── Description parser ───────────────────────────────────────────────────────

const JUNK_PATTERNS = [
  /the congress switchboard/i,
  /to connect and organize/i,
  /check out russ/i,
  /check out matt/i,
  /subscribe to brandon/i,
  /check out ava/i,
  /get all your mr merch/i,
  /cozy earth/i,
  /select quote/i,
  /sunset lake/i,
  /justcoffee/i,
  /zbiotics/i,
  /welcome back to the majority report/i,
];

function isJunk(text) {
  return JUNK_PATTERNS.some(p => p.test(text));
}

/** Strip HTML tags, preserving inner text. Decodes entities. */
function htmlToText(html) {
  if (!html) return '';
  return html
    .replace(/<strong>([\s\S]*?)<\/strong>/gi, '$1')
    .replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '$1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\u00a0/g, ' ')
    .trim();
}

/** True when this is the Fun Half separator div */
function isFunHalfDiv(text) {
  return /in the fun half/i.test(text);
}

function parseMRDescription(raw) {
  if (!raw) return { program: [], funHalf: [], youtubeUrl: null };

  // Extract YouTube URL before any processing
  const ytMatch = raw.match(/FUN HALF:\s*(https?:\/\/[^\s"<\]]+)/i);
  const youtubeUrl = ytMatch?.[1] || null;

  // ── HTML path (Substack / newer MR format) ──
  // Descriptions come as <div aria-hidden="true" data-edge="true">…</div> blocks
  if (/<div[^>]*data-edge/i.test(raw)) {
    const divContents = [];
    const divRe = /<div[^>]*data-edge[^>]*>([\s\S]*?)<\/div>/gi;
    let m;
    while ((m = divRe.exec(raw)) !== null) {
      const text = htmlToText(m[1]);
      if (text.length > 0) divContents.push(text);
    }

    let funHalfIdx = divContents.findIndex(isFunHalfDiv);
    const program  = (funHalfIdx > -1 ? divContents.slice(0, funHalfIdx) : divContents)
      .map(t => t.replace(/^on today[''\u2019]s program:?\s*/i, '').trim())
      .filter(t => t.length > 15 && !isJunk(t));
    const funHalf  = funHalfIdx > -1
      ? divContents.slice(funHalfIdx + 1).filter(t => t.length > 15 && !isJunk(t))
      : [];

    return { program, funHalf, youtubeUrl };
  }

  // ── Plain-text path (older Libsyn format) ──
  let text = decodeEntities(raw).replace(/FUN HALF:\s*https?:\/\/[^\s]+\s*/gi, '');
  const funHalfIdx = text.toLowerCase().indexOf('in the fun half');
  let programText  = funHalfIdx > -1 ? text.slice(0, funHalfIdx) : text;
  let funHalfText  = funHalfIdx > -1 ? text.slice(funHalfIdx + 15) : '';

  programText = programText.replace(/on today[''\u2019]s program:?\s*/i, '');

  const toItems = (t) =>
    t.split(/\n+/).map(s => s.trim()).filter(s => s.length > 20 && !isJunk(s));

  return { program: toItems(programText), funHalf: toItems(funHalfText), youtubeUrl };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatFullDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });
}

function formatShortDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EpisodeDetail({ item, onClose }) {
  const { play: playEpisode, currentEp, isPlaying } = useAudioPlayer();
  const [moreEps, setMoreEps] = useState([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger slide-up animation
    requestAnimationFrame(() => setVisible(true));

    // Fetch more episodes from same podcast
    if (item?.podcast_slug) {
      supabase
        .from('podcast_episodes')
        .select('id, title, air_date, duration_seconds')
        .eq('podcast_slug_ref', item.podcast_slug)
        .neq('id', item.episode_id)
        .order('air_date', { ascending: false })
        .limit(4)
        .then(({ data }) => setMoreEps(data || []));
    }
  }, [item]);

  if (!item) return null;

  const {
    episode_id, episode_title, episode_air_date, episode_description,
    audio_url, duration_seconds, podcast_name, podcast_slug, podcast_artwork,
  } = item;

  const backdrop   = getBackdrop(item, episode_air_date);
  const dayLabel   = getDayLabel(podcast_slug, episode_air_date);
  const location   = PODCAST_LOCATIONS[podcast_slug] || '';
  const slugColor  = SLUG_COLORS[podcast_slug] || NAVY;
  const initials   = (podcast_name || '').split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase();
  const isActive   = currentEp?.guid === episode_id;
  const isMR       = podcast_slug === 'majority-report';
  const parsed     = isMR ? parseMRDescription(episode_description) : null;

  const handlePlay = () => {
    playEpisode({
      guid: episode_id, title: decodeEntities(episode_title || ''),
      enclosureUrl: audio_url, community: podcast_name, artwork: podcast_artwork,
    });
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 380);
  };

  return (
    <>
      {/* Scrim */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(0,0,0,0.35)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0,
          top: '8%',
          zIndex: 50,
          background: PAPER,
          borderRadius: '24px 24px 0 0',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.38s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, background: RULE, borderRadius: 2 }} />
        </div>

        {/* Photo header */}
        <div style={{ position: 'relative', height: 230, flexShrink: 0, overflow: 'hidden' }}>
          {backdrop
            ? <img src={backdrop} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover',
                filter: 'grayscale(100%) contrast(0.88) brightness(0.72)' }} />
            : <div style={{ width: '100%', height: '100%', background: slugColor }} />
          }
          {/* Gradient fades photo into paper */}
          <div style={{ position: 'absolute', inset: 0, background:
            'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.2) 45%, rgba(250,249,246,0.97) 100%)' }} />

          {/* Day name floats on photo (MR only) */}
          {dayLabel && (
            <div style={{ position: 'absolute', top: 16, left: 18,
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 18, fontWeight: 900, fontStyle: 'italic', color: 'white',
              textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>
              {dayLabel}
            </div>
          )}

          {/* Show identity at photo bottom */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '0 18px 16px', display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            {podcast_artwork
              ? <img src={podcast_artwork} alt={podcast_name}
                  style={{ width: 68, height: 68, borderRadius: 6, objectFit: 'cover',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)', border: '1.5px solid rgba(255,255,255,0.15)' }} />
              : <div style={{ width: 68, height: 68, borderRadius: 6, background: slugColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic',
                  fontWeight: 900, fontSize: 22, color: 'white',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.4)', border: '1.5px solid rgba(255,255,255,0.15)' }}>
                  {initials}
                </div>
            }
            <div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9,
                letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.45)', marginBottom: 2 }}>
                {podcast_name}
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9,
                color: 'rgba(0,0,0,0.3)', letterSpacing: '0.08em' }}>
                {location}
              </div>
            </div>
          </div>
        </div>

        {/* Article body */}
        <div style={{ flex: 1, overflowY: 'auto', background: PAPER, padding: '0 18px' }}>

          {/* Dateline bar */}
          <div style={{ padding: '12px 0 10px',
            borderBottom: `2px solid ${INK}`, marginBottom: 14,
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9,
              letterSpacing: '0.2em', textTransform: 'uppercase', color: RED }}>
              {location}
            </span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: DIM }}>
              {formatShortDate(episode_air_date)}
            </span>
          </div>

          {/* Headline */}
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 24, fontWeight: 900, lineHeight: 1.15,
            color: INK, letterSpacing: '-0.5px', marginBottom: 10 }}>
            {decodeEntities(episode_title || '')}
          </div>

          {/* Byline */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingBottom: 12, borderBottom: `1px solid ${RULE}`, marginBottom: 14 }}>
            <div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8,
                color: DIM, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2 }}>
                Hosted by
              </div>
              <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif",
                fontSize: 13, fontWeight: 700, color: INK }}>
                {podcast_name}
              </div>
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10,
              color: DIM, textAlign: 'right' }}>
              {duration_seconds ? fmtDuration(duration_seconds) : ''}<br />
              {formatShortDate(episode_air_date)}
            </div>
          </div>

          {/* Play CTA */}
          <div
            onClick={handlePlay}
            style={{ background: NAVY, borderRadius: 3, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 14,
              marginBottom: 20, cursor: 'pointer' }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%',
              background: RED, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isActive && isPlaying
                ? <svg width="10" height="12" viewBox="0 0 10 12"><rect x="0" y="0" width="3.5" height="12" fill="white"/><rect x="6.5" y="0" width="3.5" height="12" fill="white"/></svg>
                : <svg width="10" height="12" viewBox="0 0 10 12"><polygon points="1.5,0 11,6 1.5,12" fill="white"/></svg>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>
                {isActive && isPlaying ? 'Now Playing' : 'Listen Now'}
                {duration_seconds ? ` · ${fmtDuration(duration_seconds)}` : ''}
              </div>
              <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif",
                fontSize: 13, fontWeight: 700, color: PAPER,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {decodeEntities(episode_title || '')}
              </div>
            </div>
          </div>

          {/* MR parsed description */}
          {isMR && parsed && (
            <>
              {parsed.program.length > 0 && (
                <DescSection label="On Today's Program" items={parsed.program} />
              )}
              {parsed.funHalf.length > 0 && (
                <DescSection label="In the Fun Half" items={parsed.funHalf} badge="Members" />
              )}
            </>
          )}

          {/* Generic description for other shows */}
          {!isMR && episode_description && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9,
                letterSpacing: '0.2em', textTransform: 'uppercase', color: DIM,
                paddingBottom: 8, borderBottom: `2px solid ${INK}`, marginBottom: 12 }}>
                About This Episode
              </div>
              <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif",
                fontSize: 15, lineHeight: 1.65, color: '#2A2A2A' }}>
                {decodeEntities(episode_description).slice(0, 600)}
                {episode_description.length > 600 ? '…' : ''}
              </div>
            </div>
          )}

          {/* More episodes */}
          {moreEps.length > 0 && (
            <>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9,
                letterSpacing: '0.2em', textTransform: 'uppercase', color: DIM,
                paddingBottom: 10, borderBottom: `2px solid ${INK}`, marginTop: 4 }}>
                More from {podcast_name}
              </div>
              {moreEps.map((ep, i) => (
                <MoreEpRow key={ep.id} ep={ep} num={i + 2}
                  slug={podcast_slug} onPlay={() => playEpisode({
                    guid: ep.id, title: decodeEntities(ep.title || ''),
                    enclosureUrl: ep.audio_url, community: podcast_name, artwork: podcast_artwork,
                  })} />
              ))}
            </>
          )}

          <div style={{ height: 80 }} />
        </div>
      </div>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DescSection({ label, items, badge }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, fontFamily: "'DM Mono', monospace", fontSize: 9,
          letterSpacing: '0.2em', textTransform: 'uppercase', color: DIM,
          paddingBottom: 8, borderBottom: `2px solid ${INK}` }}>
          {label}
        </div>
        {badge && (
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8,
            color: RED, letterSpacing: '0.1em', border: `1px solid ${RED}`,
            padding: '2px 7px', borderRadius: 2, marginBottom: 8, whiteSpace: 'nowrap' }}>
            {badge}
          </div>
        )}
      </div>
      {items.map((text, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, padding: '9px 0',
          borderBottom: i < items.length - 1 ? `1px solid ${RULE}` : 'none', alignItems: 'flex-start' }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: NAVY,
            flexShrink: 0, marginTop: 7 }} />
          <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: 14, lineHeight: 1.55, color: '#2A2A2A' }}>
            {text}
          </div>
        </div>
      ))}
    </div>
  );
}

function MoreEpRow({ ep, num, slug, onPlay }) {
  const dayLabel = getDayLabel(slug, ep.air_date);
  const airStr   = ep.air_date
    ? new Date(ep.air_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';

  return (
    <div style={{ display: 'flex', gap: 12, padding: '12px 0',
      borderBottom: `1px solid ${RULE}`, alignItems: 'flex-start', cursor: 'pointer' }}>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10,
        color: RULE, paddingTop: 2, width: 18, flexShrink: 0 }}>
        {String(num).padStart(2, '0')}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {dayLabel && (
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8,
            letterSpacing: '0.1em', color: RED, marginBottom: 4, textTransform: 'uppercase' }}>
            {dayLabel}
          </div>
        )}
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 14, fontWeight: 700, color: INK, lineHeight: 1.3, marginBottom: 4 }}>
          {decodeEntities(ep.title || '')}
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: DIM }}>
          {airStr}{ep.duration_seconds ? ` · ${fmtDuration(ep.duration_seconds)}` : ''}
        </div>
      </div>
      <button onClick={onPlay}
        style={{ width: 26, height: 26, borderRadius: '50%', border: `1.5px solid ${RULE}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, alignSelf: 'center', background: 'transparent', cursor: 'pointer' }}>
        <svg width="8" height="10" viewBox="0 0 8 10"><polygon points="0,0 8,5 0,10" fill={NAVY}/></svg>
      </button>
    </div>
  );
}
