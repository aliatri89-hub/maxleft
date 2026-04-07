import { useState } from 'react';
import PodcastPane from '../components/feed/PodcastPane';
import EpisodeDetail from '../components/feed/EpisodeDetail';

const NAVY  = '#0B1F4A';
const PAPER = '#FAF9F6';
const RED   = '#C8291A';
const DIM   = 'rgba(255,255,255,0.35)';

const TODAY = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

function NewsPane() {
  return <div style={{ padding: 24, color: '#888', fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>News feed coming soon.</div>;
}
function BlueSkyPane() {
  return <div style={{ padding: 24, color: '#888', fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>Bluesky feed coming soon.</div>;
}

export default function FeedScreen({ session, isActive }) {
  const [tab, setTab]             = useState('podcasts');
  const [selectedEp, setSelectedEp] = useState(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: NAVY }}>

      {/* ── Masthead ── */}
      <div style={{ background: NAVY, padding: '12px 20px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 }}>
          {/* Wordmark */}
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 34, fontWeight: 900, lineHeight: 1, letterSpacing: '-1.5px' }}>
            <span style={{ color: PAPER }}>Max</span>
            <em style={{ color: RED, fontStyle: 'italic' }}> Left</em>
          </div>
          {/* Vol / date */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8,
              color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', lineHeight: 2 }}>
              Vol. 1 · No. 1
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8,
              color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', lineHeight: 2 }}>
              {TODAY}
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', marginBottom: 10 }} />
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9,
          color: 'rgba(255,255,255,0.35)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          Independent Left Media Network
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ background: NAVY, display: 'flex', padding: '0 20px',
        borderBottom: '3px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        {['podcasts', 'news', 'bluesky'].map(id => (
          <button key={id} onClick={() => setTab(id)}
            style={{
              padding: '10px 16px 10px 0',
              fontFamily: "'DM Mono', monospace", fontSize: 10,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: tab === id ? PAPER : DIM,
              border: 'none', background: 'none', cursor: 'pointer',
              borderBottom: tab === id ? `3px solid ${RED}` : '3px solid transparent',
              marginBottom: -3,
            }}>
            {id.charAt(0).toUpperCase() + id.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Section header ── */}
      {tab === 'podcasts' && (
        <div style={{ background: PAPER, padding: '12px 18px 10px',
          borderBottom: `2px solid #111`, display: 'flex',
          alignItems: 'baseline', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9,
            letterSpacing: '0.2em', textTransform: 'uppercase', color: '#777' }}>
            Today's Dispatches
          </span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#D8D4CC' }}>
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
          </span>
        </div>
      )}

      {/* ── Content ── */}
      <div style={{ flex: 1, overflowY: 'auto', background: tab === 'podcasts' ? '#111' : PAPER }}>
        {tab === 'podcasts' && (
          <PodcastPane
            isVisible={isActive && tab === 'podcasts'}
            onSelectEpisode={setSelectedEp}
          />
        )}
        {tab === 'news'    && <NewsPane />}
        {tab === 'bluesky' && <BlueSkyPane />}
      </div>

      {/* ── Episode detail (slide-up) ── */}
      {selectedEp && (
        <EpisodeDetail
          item={selectedEp}
          onClose={() => setSelectedEp(null)}
        />
      )}
    </div>
  );
}
