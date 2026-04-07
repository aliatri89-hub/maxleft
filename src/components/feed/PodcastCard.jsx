import { useAudioPlayer } from '../community/shared/AudioPlayerProvider';
import decodeEntities from '../../utils/decodeEntities';
import { fmtDuration } from '../../utils/helpers';
import { getBackdrop, getDayLabel, PODCAST_LOCATIONS } from '../../config/podcasts';

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

export default function PodcastCard({ item, isLead = false, onSelect }) {
  const { play: playEpisode, currentEp, isPlaying } = useAudioPlayer();
  const { episode_id, episode_title, episode_air_date, audio_url, duration_seconds,
          podcast_name, podcast_slug, podcast_artwork } = item;

  const isActive  = currentEp?.guid === episode_id;
  const backdrop  = getBackdrop(item, episode_air_date);
  const dayLabel  = getDayLabel(podcast_slug, episode_air_date);
  const location  = PODCAST_LOCATIONS[podcast_slug] || '';
  const initials  = (podcast_name || '').split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase();
  const slugColor = SLUG_COLORS[podcast_slug] || '#1A3A8F';
  const cardH     = isLead ? 224 : 152;

  const airDateStr = episode_air_date
    ? new Date(episode_air_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';

  const handlePlay = (e) => {
    e.stopPropagation();
    playEpisode({ guid: episode_id, title: decodeEntities(episode_title || ''),
      enclosureUrl: audio_url, community: podcast_name, artwork: podcast_artwork });
  };

  return (
    <div
      style={{ position: 'relative', height: cardH, overflow: 'hidden',
        cursor: 'pointer', flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}
      onClick={() => onSelect?.(item)}
    >
      {/* Backdrop */}
      {backdrop
        ? <img src={backdrop} alt="" draggable={false}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', filter: 'grayscale(100%) contrast(0.88) brightness(0.72)' }} />
        : <div style={{ position: 'absolute', inset: 0, background: slugColor }} />
      }
      {/* Overlays */}
      <div style={{ position: 'absolute', inset: 0,
        background: 'linear-gradient(165deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.28) 40%, rgba(0,0,0,0.88) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,10,4,0.22)' }} />

      {/* Dateline */}
      <div style={{ position: 'absolute', top: 12, left: 14, right: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9,
          letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
          {location}
        </span>
        {isActive && isPlaying && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4,
            background: '#C8291A', padding: '2px 7px', borderRadius: 2 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'white',
              animation: 'mlPip 1.4s ease-in-out infinite' }} />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: 'white', letterSpacing: '0.14em' }}>Live</span>
          </div>
        )}
      </div>

      {/* MR day name */}
      {dayLabel && (
        <div style={{ position: 'absolute', top: dayLabel ? 28 : 12, left: 14,
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 16, fontWeight: 900, fontStyle: 'italic', color: 'white',
          textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>
          {dayLabel}
        </div>
      )}

      {/* Bottom row */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '12px 14px 14px', display: 'flex', gap: 12, alignItems: 'flex-end' }}>

        {/* Show art */}
        {podcast_artwork
          ? <img src={podcast_artwork} alt={podcast_name}
              style={{ width: isLead ? 64 : 52, height: isLead ? 64 : 52,
                borderRadius: 5, flexShrink: 0, objectFit: 'cover',
                boxShadow: '0 2px 12px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.12)' }} />
          : <div style={{ width: isLead ? 64 : 52, height: isLead ? 64 : 52,
              borderRadius: 5, flexShrink: 0, background: slugColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic',
              fontWeight: 900, fontSize: isLead ? 20 : 15, color: 'white',
              boxShadow: '0 2px 12px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.12)' }}>
              {initials}
            </div>
        }

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8,
            letterSpacing: '0.16em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>
            {podcast_name}
          </div>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif",
            fontWeight: isLead ? 900 : 700, fontStyle: 'italic',
            fontSize: isLead ? 20 : 14, color: 'white', lineHeight: 1.25, marginBottom: 5 }}>
            {decodeEntities(episode_title || '')}
          </div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9,
            color: 'rgba(255,255,255,0.35)', letterSpacing: '0.04em' }}>
            {airDateStr}{duration_seconds ? ` · ${fmtDuration(duration_seconds)}` : ''}
          </div>
        </div>

        {/* Play button */}
        <button onClick={handlePlay} aria-label="Play episode"
          style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            alignSelf: 'flex-end', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: isActive ? 'none' : '1.5px solid rgba(255,255,255,0.3)',
            background: isActive ? '#C8291A' : 'transparent',
            cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
          {isActive && isPlaying
            ? <svg width="10" height="12" viewBox="0 0 10 12"><rect x="0" y="0" width="3.5" height="12" fill="white"/><rect x="6.5" y="0" width="3.5" height="12" fill="white"/></svg>
            : <svg width="10" height="12" viewBox="0 0 10 12"><polygon points="1,0 10,6 1,12" fill="white"/></svg>
          }
        </button>
      </div>
    </div>
  );
}
