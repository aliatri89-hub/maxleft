import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "../supabase";

/* ════════════════════════════════════════════════════════════
   LANDING SCREEN  –  "From the podcast to your shelf."
   ════════════════════════════════════════════════════════════ */

// ── Poster marquee data (franchise films from MANTL communities) ──
const POSTER_COLUMNS = [
  // Column 1 — scrolls up slowly
  [
    '/vfrQk5IPloGg1v9Rzbh2Eg3VGyM.jpg', // Alien
    '/wijlZ3HaYMvlDTPqJoTCWKFkCPU.jpg', // Halloween (2018)
    '/gap_placeholder_1a.jpg', // intentional 404
    '/tjbLSFwi0I3phZwh8zoHWNfbsEp.jpg', // Jaws
    '/hA2ple9q4qnwxp3hKVNhroipsir.jpg', // Mad Max Fury Road
    '/lr9ZIrmuwVmZhpZuTCW8D9g0ZJe.jpg', // Scream
    '/dXNAPwY7VrqMAo51EKhhCJfaGb5.jpg', // The Matrix
  ],
  // Column 2 — scrolls down
  [
    '/yFihWxQcmqcaBR31QM6Y8gT6aYV.jpg', // Die Hard
    '/uK46P78BvWGDW4dbq9C13LAwpmw.jpg', // Psycho
    '/ceG9VzoRAVGwivFU403Wc3AHRys.jpg', // Indiana Jones Raiders
    '/gap_placeholder_2a.jpg', // intentional 404
    '/sNWdOLae80AdQkD1NpvcDN5f3PB.jpg', // The Shining
    '/gRPePRMct1ttp70sYx7RZG7igee.jpg', // The Fly
    '/hEjK9A9BkNXejFW4tfacVAEHtkn.jpg', // Rocky
  ],
  // Column 3 — scrolls up faster
  [
    '/tzGY49kseSE9QAKk47uuDGwnSCu.jpg', // The Thing
    '/63N9uy8nd9j7Eog2axPQ8lbr3Wj.jpg', // Blade Runner
    '/gap_placeholder_3a.jpg', // intentional 404
    '/jFTVD4XoWQTcg7wdyJKa8PEds5q.jpg', // Terminator 2
    '/vN5B5WgYscRGcQpVhHl6p9DDTP0.jpg', // Back to the Future
    '/uS9m8OBk1A8eM9I042bx8XXpqAq.jpg', // The Silence of the Lambs
    '/dLlH4aNHdnmf62umnInL8xPlPzw.jpg', // The Handmaiden
  ],
  // Column 4 — scrolls down slowly
  [
    '/maFjKnJ62hDQ9E66dKqDZgbUy0H.jpg', // Jurassic Park
    '/5m0zjctrxy9HeSAtnGWNLlsnr8z.jpg', // Lord of the Rings Fellowship
    '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', // Spirited Away
    '/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg', // Avatar
    '/gap_placeholder_4a.jpg', // intentional 404
    '/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg', // The Shawshank Redemption
    '/78lPtwv72eTNqFW9COBYI0dWDJa.jpg', // Iron Man
  ],
  // Column 5 — scrolls up
  [
    '/7E8nLijS9AwwUEPu2oFYOVKhdFA.jpg', // Ghostbusters
    '/gap_placeholder_5a.jpg', // intentional 404
    '/wdniP8NDaJIydi1hMxhpbJMUfr6.jpg', // Predator
    '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', // Pulp Fiction
    '/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg', // Joker
    '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', // Parasite
    '/rY4odQzflLCWQLL17tzbt8TQkeV.jpg', // Alone in the Dark
  ],
];

// ── Hero enhancement styles ──────────────────────────────────
const heroEnhancementStyles = `
  /* ── POSTER MARQUEE BACKGROUND ─────────────────────────── */
  .poster-marquee {
    position: absolute;
    inset: 0;
    overflow: hidden;
    z-index: 0;
    opacity: 0;
    animation: marquee-fadein 2.5s ease-out 0.5s forwards;
  }
  @keyframes marquee-fadein {
    to { opacity: 1; }
  }
  .poster-marquee-inner {
    display: flex;
    gap: 10px;
    justify-content: center;
    height: 100%;
    padding: 0 8px;
    filter: blur(0.5px) saturate(0.5);
    opacity: 0.55;
  }
  .poster-col {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 80px;
    flex-shrink: 0;
  }
  .poster-col-track {
    display: flex;
    flex-direction: column;
    gap: 10px;
    animation-timing-function: linear;
    animation-iteration-count: infinite;
  }
  .poster-col:nth-child(1) .poster-col-track {
    animation: scroll-up 45s linear infinite;
  }
  .poster-col:nth-child(2) .poster-col-track {
    animation: scroll-down 55s linear infinite;
  }
  .poster-col:nth-child(3) .poster-col-track {
    animation: scroll-up 38s linear infinite;
  }
  .poster-col:nth-child(4) .poster-col-track {
    animation: scroll-down 50s linear infinite;
  }
  .poster-col:nth-child(5) .poster-col-track {
    animation: scroll-up 42s linear infinite;
  }
  @keyframes scroll-up {
    0% { transform: translateY(0); }
    100% { transform: translateY(-50%); }
  }
  @keyframes scroll-down {
    0% { transform: translateY(-50%); }
    100% { transform: translateY(0); }
  }
  .poster-thumb {
    width: 80px;
    height: 120px;
    border-radius: 6px;
    background-size: cover;
    background-position: center;
    background-color: rgba(199,91,63,0.06);
    flex-shrink: 0;
  }

  /* ── DARK OVERLAY (heavier on edges) ──────────────────── */
  .poster-overlay {
    position: absolute;
    inset: 0;
    z-index: 1;
    background:
      radial-gradient(ellipse 70% 55% at 50% 40%, rgba(15,13,11,0.35) 0%, rgba(15,13,11,0.75) 100%),
      linear-gradient(180deg, rgba(15,13,11,0.15) 0%, rgba(15,13,11,0) 25%, rgba(15,13,11,0) 55%, rgba(15,13,11,0.5) 75%, rgba(15,13,11,1) 100%);
    pointer-events: none;
  }

  /* ── FILM GRAIN OVERLAY ───────────────────────────────── */
  .film-grain {
    position: absolute;
    inset: 0;
    z-index: 2;
    opacity: 0.035;
    pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
    background-repeat: repeat;
    background-size: 128px 128px;
    mix-blend-mode: overlay;
  }

  /* ── Make existing hero layers sit above marquee ──────── */
  .landing-hero {
    position: relative;
    overflow: hidden;
  }
  .landing-hero .landing-glow {
    z-index: 3;
    position: relative;
  }
  .landing-hero .landing-top {
    z-index: 4;
    position: relative;
  }
  .landing-hero .landing-bottom {
    z-index: 4;
    position: relative;
  }
`;

// ── Inline styles for the interactive features section ─────
const featureStyles = `
  /* ── FEATURES SECTION OVERHAUL ───────────────────────────── */
  .mantl-features {
    background: linear-gradient(180deg, #1a1714 0%, #0f0d0b 100%);
    padding: 60px 12px 80px;
    overflow: hidden;
    position: relative;
  }
  .mantl-features::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 200px;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--terracotta, #C75B3F) 50%, transparent);
  }
  .mantl-features-header {
    text-align: center;
    margin-bottom: 56px;
  }
  .mantl-features-header h2 {
    font-family: 'Barlow Condensed', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 1.8rem;
    font-weight: 700;
    color: #f5f0eb;
    margin: 0 0 10px;
  }
  .mantl-features-header p {
    font-family: 'Lora', serif;
    font-style: italic;
    font-size: 0.92rem;
    color: #9a938a;
    margin: 0;
    line-height: 1.6;
  }

  /* ── FEATURE BLOCKS ──────────────────────────────────────── */
  .mantl-feature-block {
    max-width: 420px;
    margin: 0 auto 64px;
    opacity: 0;
    transform: translateY(30px);
    transition: opacity 0.7s ease, transform 0.7s ease;
  }
  .mantl-feature-block.visible {
    opacity: 1;
    transform: translateY(0);
  }
  .mantl-feature-label {
    font-family: 'Barlow Condensed', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.72rem;
    color: var(--terracotta, #C75B3F);
    margin-bottom: 6px;
  }
  .mantl-feature-title {
    font-family: 'Barlow Condensed', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 1.35rem;
    font-weight: 700;
    color: #f5f0eb;
    margin-bottom: 8px;
  }
  .mantl-feature-desc {
    font-family: 'Lora', serif;
    font-size: 0.85rem;
    color: #9a938a;
    line-height: 1.65;
    margin-bottom: 12px;
  }

  /* ── BADGE COLLECTION DEMO ───────────────────────────────── */
  .badge-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
    padding: 18px;
    background: rgba(255,255,255,0.03);
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.06);
  }
  .badge-slot {
    aspect-ratio: 4 / 5;
    border-radius: 12px;
    position: relative;
    cursor: pointer;
    transition: transform 0.3s ease;
    perspective: 600px;
  }
  .badge-slot:hover {
    transform: scale(1.05);
  }
  .badge-slot:active {
    transform: scale(0.97);
  }
  .badge-inner {
    width: 100%;
    height: 100%;
    border-radius: 12px;
    position: relative;
    transform-style: preserve-3d;
    transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .badge-slot.revealed .badge-inner {
    transform: rotateY(180deg);
  }
  .badge-front, .badge-back {
    position: absolute;
    inset: 0;
    border-radius: 12px;
    backface-visibility: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 6px;
  }
  .badge-front {
    background: rgba(255,255,255,0.04);
    border: 1px dashed rgba(255,255,255,0.12);
    backdrop-filter: blur(8px);
  }
  .badge-front-art {
    width: 70px;
    height: 70px;
    object-fit: contain;
    filter: blur(5px) saturate(0) brightness(0.7);
    opacity: 0.35;
    transition: filter 0.3s, opacity 0.3s;
  }
  .badge-slot:hover .badge-front-art {
    filter: blur(3px) saturate(0.3) brightness(0.8);
    opacity: 0.5;
  }
  .badge-front-q {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: rgba(255,255,255,0.25);
  }
  .badge-back {
    transform: rotateY(180deg);
    border: 1px solid;
    padding: 10px;
    text-align: center;
    overflow: hidden;
  }
  .badge-back > img,
  .badge-back > span {
    position: relative;
    z-index: 2;
  }
  .badge-back-backdrop {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    z-index: 0;
  }
  .badge-back-backdrop-overlay {
    position: absolute;
    inset: 0;
    z-index: 1;
  }
  .badge-back-art {
    width: 78px;
    height: 78px;
    object-fit: contain;
    border-radius: 50%;
    border: 2px solid;
    padding: 2px;
    background: rgba(0,0,0,0.4);
  }
  .badge-back-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
    line-height: 1.2;
    text-shadow: 0 1px 6px rgba(0,0,0,0.85), 0 0 12px rgba(0,0,0,0.6);
    filter: brightness(1.3);
  }
  .badge-back-flair {
    font-family: 'Lora', serif;
    font-style: italic;
    font-size: 0.62rem;
    opacity: 0.85;
    text-shadow: 0 1px 5px rgba(0,0,0,0.85), 0 0 10px rgba(0,0,0,0.5);
    filter: brightness(1.2);
  }
  @keyframes badgeRevealPulse {
    0% { box-shadow: 0 0 0 0 var(--badge-color); }
    50% { box-shadow: 0 0 20px 4px var(--badge-color); }
    100% { box-shadow: 0 0 0 0 transparent; }
  }
  .badge-slot.revealed .badge-inner {
    animation: badgeRevealPulse 0.8s ease-out 0.3s;
  }

  /* ── LOG MOVIE DEMO ──────────────────────────────────────── */
  .log-demo {
    background: rgba(255,255,255,0.03);
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.06);
    overflow: hidden;
    position: relative;
  }
  .log-demo-backdrop {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center top;
  }
  .log-demo-backdrop::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(15,13,11,0.45) 0%, rgba(15,13,11,0.75) 35%, rgba(15,13,11,0.92) 60%, #0f0d0b 85%);
  }
  .log-demo-content {
    padding: 100px 16px 16px;
    position: relative;
    z-index: 1;
  }
  .log-demo-row {
    display: flex;
    align-items: flex-end;
    gap: 12px;
    margin-bottom: 14px;
  }
  .log-demo-poster {
    width: 56px;
    height: 84px;
    border-radius: 6px;
    background: linear-gradient(135deg, #C75B3F 0%, #8B3A2A 100%);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.6rem;
    box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    position: relative;
  }
  .log-demo-poster-badge {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 18px;
    height: 18px;
    border-radius: 4px;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.55rem;
    opacity: 0;
    transform: scale(0);
    transition: opacity 0.4s, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .log-demo-poster-badge.show {
    opacity: 1;
    transform: scale(1);
  }
  .log-demo-info h3 {
    font-family: 'Barlow Condensed', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 1rem;
    font-weight: 700;
    color: #f5f0eb;
    margin: 0 0 2px;
    line-height: 1.2;
  }
  .log-demo-info span {
    font-family: 'Lora', serif;
    font-size: 0.72rem;
    color: #9a938a;
    font-style: italic;
  }
  .log-demo-stars {
    display: flex;
    gap: 4px;
    margin-bottom: 12px;
  }
  .log-demo-star {
    width: 26px;
    height: 26px;
    border-radius: 6px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s ease;
    user-select: none;
  }
  .log-demo-star.filled {
    background: rgba(199,91,63,0.2);
    border-color: var(--terracotta, #C75B3F);
  }
  .log-demo-star:hover {
    background: rgba(199,91,63,0.15);
    transform: scale(1.1);
  }
  .log-demo-btn {
    width: 100%;
    padding: 10px;
    border-radius: 10px;
    border: none;
    font-family: 'Barlow Condensed', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.25s ease;
    position: relative;
    overflow: hidden;
  }
  .log-demo-btn.ready {
    background: #3A8F5C;
    color: #fff;
  }
  .log-demo-btn.ready:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }
  .log-demo-btn.logged {
    background: rgba(168,181,160,0.2);
    color: #A8B5A0;
    pointer-events: none;
  }
  @keyframes btnFlash {
    0% { opacity: 0; transform: translateX(-100%); }
    50% { opacity: 0.3; }
    100% { opacity: 0; transform: translateX(100%); }
  }
  .log-demo-btn.logged::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
    animation: btnFlash 0.6s ease-out;
  }

  /* ── TOAST ───────────────────────────────────────────────── */
  .demo-toast {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: #2a2520;
    border: 1px solid rgba(199,91,63,0.3);
    border-radius: 12px;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    opacity: 0;
    transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    z-index: 10;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  }
  .demo-toast.show {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  .demo-toast-icon {
    font-size: 1.1rem;
  }
  .demo-toast-text {
    font-family: 'Barlow Condensed', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 0.75rem;
    font-weight: 600;
    color: #f5f0eb;
  }
  .demo-toast-sub {
    font-family: 'Lora', serif;
    font-size: 0.62rem;
    color: var(--terracotta, #C75B3F);
    font-style: italic;
  }

  /* ── PROGRESS BAR ────────────────────────────────────────── */
  .demo-progress-wrap {
    margin-top: 12px;
    padding: 10px 12px;
    background: rgba(255,255,255,0.02);
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.05);
  }
  .demo-progress-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }
  .demo-progress-label span:first-child {
    font-family: 'Barlow Condensed', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 0.65rem;
    font-weight: 600;
    color: #9a938a;
  }
  .demo-progress-label span:last-child {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.6rem;
    color: var(--terracotta, #C75B3F);
    font-weight: 600;
  }
  .demo-progress-bar {
    height: 4px;
    background: rgba(255,255,255,0.06);
    border-radius: 2px;
    overflow: hidden;
  }
  .demo-progress-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.8s cubic-bezier(0.22, 1, 0.36, 1);
  }

  /* ── COMMUNITY DEMO ──────────────────────────────────────── */
  .community-demo {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .community-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    background: rgba(255,255,255,0.03);
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.06);
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }
  .community-backdrop {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    z-index: 0;
  }
  .community-backdrop-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, rgba(15,13,11,0.85) 0%, rgba(15,13,11,0.6) 50%, rgba(15,13,11,0.4) 100%);
    z-index: 0;
  }
  .community-row > :not(.community-backdrop):not(.community-backdrop-overlay) {
    position: relative;
    z-index: 1;
  }
  .community-row:hover {
    background: rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.1);
  }
  .community-row::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    border-radius: 0 2px 2px 0;
  }
  .community-avatar {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    object-fit: cover;
    flex-shrink: 0;
  }
  .community-info {
    flex: 1;
    min-width: 0;
  }
  .community-name {
    font-family: 'Barlow Condensed', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 0.78rem;
    font-weight: 700;
    color: #f5f0eb;
  }
  .community-stat {
    font-family: 'Lora', serif;
    font-size: 0.68rem;
    color: #9a938a;
    font-style: italic;
  }
  .community-donut {
    position: relative;
    width: 52px;
    height: 52px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .community-donut svg {
    position: absolute;
    inset: 0;
  }
  .community-donut-pct {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.68rem;
    font-weight: 700;
    position: relative;
    z-index: 1;
    text-shadow: 0 1px 3px rgba(0,0,0,0.5);
  }


  /* ── BOTTOM CTA ──────────────────────────────────────────── */
  .mantl-bottom-cta {
    text-align: center;
    margin-top: 20px;
    padding: 0 12px;
  }
  .mantl-bottom-tagline {
    font-family: 'Lora', serif;
    font-style: italic;
    font-size: 0.82rem;
    color: #9a938a;
    margin-top: 14px;
  }

  /* ── HINT TAP ────────────────────────────────────────────── */
  .tap-hint {
    font-family: 'Lora', serif;
    font-style: italic;
    font-size: 0.68rem;
    color: rgba(255,255,255,0.25);
    text-align: center;
    margin-top: 10px;
  }
  @keyframes tapPulse {
    0%, 100% { opacity: 0.25; }
    50% { opacity: 0.5; }
  }
  .tap-hint {
    animation: tapPulse 2.5s ease-in-out infinite;
  }

  /* ── GROWING COMMUNITIES ──────────────────────────────────── */
  .growing-section {
    text-align: center;
    padding: 20px 0;
  }
  .growing-divider {
    width: 48px;
    height: 1px;
    margin: 0 auto;
    background: linear-gradient(90deg, transparent, var(--terracotta, #C75B3F), transparent);
    opacity: 0.4;
  }
  /* ── PODCAST HORIZONTAL MARQUEE ─────────────────────────── */
  .podcast-marquee {
    position: relative;
    overflow: hidden;
    margin: 24px -18px 28px;
  }
  .podcast-marquee-row {
    overflow: hidden;
  }
  .podcast-marquee-track {
    display: flex;
    gap: 28px;
    width: max-content;
  }
  .podcast-marquee-track.track-left {
    animation: marquee-left 40s linear infinite;
  }
  @keyframes marquee-left {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .podcast-marquee-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  .podcast-marquee-thumb {
    width: 86px;
    height: 86px;
    border-radius: 18px;
    object-fit: cover;
    flex-shrink: 0;
    opacity: 0.6;
    filter: saturate(0.5);
    border: 1px solid rgba(255,255,255,0.08);
    transition: opacity 0.3s, filter 0.3s;
  }
  .podcast-marquee-item:hover .podcast-marquee-thumb {
    opacity: 0.9;
    filter: saturate(0.9);
  }
  .podcast-marquee-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: rgba(255,255,255,0.3);
    font-weight: 500;
    white-space: nowrap;
  }
  .podcast-marquee-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(90deg, #0f0d0b 0%, transparent 15%, transparent 85%, #0f0d0b 100%);
  }
  .growing-headline {
    font-family: 'Barlow Condensed', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 1.25rem;
    font-weight: 700;
    color: #f5f0eb;
    line-height: 1.3;
    margin-bottom: 10px;
  }
  .growing-sub {
    font-family: 'Lora', serif;
    font-style: italic;
    font-size: 0.82rem;
    color: #9a938a;
    line-height: 1.65;
    margin-bottom: 24px;
  }
`;

// ── Podcast art for horizontal marquee ──
const PODCAST_ART = [
  { src: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts126/v4/3c/7c/bb/3c7cbbce-5847-c26c-f3c5-04cbd9e88e5e/mza_18038029828846701875.jpg/300x300bb.webp", name: "Film Junk" },
  { src: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts116/v4/4b/6d/ff/4b6dff78-28f3-8a50-a6aa-47c69e0bf797/mza_6072961650790924101.jpeg/300x300bb.webp", name: "Get Played" },
  { src: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/bd/8c/05/bd8c05d9-fd70-e35f-da50-f3d67256d648/mza_6805140787842707960.jpg/300x300bb.webp", name: "Filmspotting" },
  { src: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/4b/06/00/4b06006c-8936-1653-fc82-132b64441f4f/mza_5523773122723324139.jpg/300x300bb.webp", name: "HDTGM" },
];

/* ── Badge data for the demo ────────────────────────────── */
const DEMO_BADGES = [
  { art: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/pumpkin_badge.png", backdrop: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/Backgroundhalloweenhero.jpg", name: "Haddonfield Historian", sub: "Halloween", color: "#ff6a00", bg: "rgba(255,106,0,0.12)" },
  { art: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/badge_alien.png", backdrop: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/BackgroundAlienHero.jpg", name: "Weyland-Yutani Employee", sub: "Alien", color: "#4a9eff", bg: "rgba(74,158,255,0.12)" },
  { art: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/badge_mad_max.png", backdrop: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/BackgroundMadMaxHero.jpg", name: "Witnessed", sub: "Mad Max", color: "#ff4a4a", bg: "rgba(255,74,74,0.12)" },
  { art: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/badge_chucky.png", backdrop: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/BackgroundChucky.jpg", name: "Friend Till the End", sub: "Child's Play", color: "#9b59b6", bg: "rgba(155,89,182,0.12)" },
];

const DEMO_COMMUNITIES = [
  { name: "Now Playing Podcast", art: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/1200x1200bf-60.jpg", color: "#C75B3F", stat: "Marvel Infinity Saga", done: 18, total: 23, backdrop: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/Infinityhero.jpeg" },
  { name: "Blank Check with Griffin & David", art: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/FeedLogoBlankCheck.png", color: "#4a9eff", stat: "Pod Country for Old Cast", done: 10, total: 21, backdrop: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/Fargoherodrop.jpg" },
];

function LandingScreen({ onSignIn }) {
  const featuresRef = useRef(null);
  const [visibleBlocks, setVisibleBlocks] = useState(new Set());

  // ── Email auth state ──────────────────────────────────────
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [emailStep, setEmailStep] = useState('input');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState(null);
  const [usePassword, setUsePassword] = useState(false);

  // ── Interactive demo state ────────────────────────────────
  const [revealedBadges, setRevealedBadges] = useState(new Set());
  const [demoRating, setDemoRating] = useState(0);
  const [demoLogged, setDemoLogged] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showPinBadge, setShowPinBadge] = useState(false);

  // ── Intersection observer for scroll reveals ──────────────
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setVisibleBlocks(prev => new Set([...prev, entry.target.dataset.block]));
        }
      });
    }, { threshold: 0.15 });

    const blocks = document.querySelectorAll('.mantl-feature-block');
    blocks.forEach(block => observer.observe(block));
    return () => observer.disconnect();
  }, []);


  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const resetEmail = () => {
    setShowEmailInput(false);
    setEmail('');
    setPassword('');
    setOtpCode('');
    setEmailStep('input');
    setEmailError(null);
    setUsePassword(false);
  };

  // ── Badge reveal handler ──────────────────────────────────
  const handleBadgeReveal = useCallback((idx) => {
    setRevealedBadges(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  // ── Log movie handler ─────────────────────────────────────
  const handleLogMovie = useCallback(() => {
    if (demoLogged) return;
    setDemoLogged(true);
    setShowPinBadge(true);
    setTimeout(() => setShowToast(true), 300);
    setTimeout(() => setShowToast(false), 3200);
    setTimeout(() => {
      setDemoLogged(false);
      setDemoRating(0);
      setShowPinBadge(false);
    }, 5000);
  }, [demoLogged]);

  // ── Send OTP code ─────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!email.trim()) return;
    setEmailError(null);
    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setEmailStep('otp');
    } catch (err) {
      setEmailError(err.message);
    } finally {
      setEmailLoading(false);
    }
  };

  // ── Verify OTP code ───────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) return;
    setEmailError(null);
    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode.trim(),
        type: 'email',
      });
      if (error) throw error;
    } catch (err) {
      setEmailError(err.message);
    } finally {
      setEmailLoading(false);
    }
  };

  // ── Password sign in / sign up ────────────────────────────
  const handlePasswordSignIn = async () => {
    if (!email.trim() || !password) return;
    setEmailError(null);
    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        if (error.message === 'Invalid login credentials') {
          setEmailStep('signup');
          setEmailError('No account found. Create one?');
        } else {
          throw error;
        }
      }
    } catch (err) {
      setEmailError(err.message);
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordSignUp = async () => {
    if (!email.trim() || !password) return;
    if (password.length < 6) {
      setEmailError('Password must be at least 6 characters');
      return;
    }
    setEmailError(null);
    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (err) {
      setEmailError(err.message);
    } finally {
      setEmailLoading(false);
    }
  };

  // ── Email auth UI ─────────────────────────────────────────
  const renderEmailAuth = () => {
    if (emailStep === 'otp') {
      return (
        <div className="landing-email-section">
          <div style={{ fontSize: '2rem', marginBottom: 4 }}>🔑</div>
          <div style={{ color: '#f5f0eb', fontSize: '1rem', fontWeight: 600, marginBottom: 2,
            fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Enter your code
          </div>
          <div style={{ color: '#9a938a', fontSize: '0.82rem', lineHeight: 1.5, marginBottom: 8,
            fontFamily: "'Lora', serif", fontStyle: 'italic' }}>
            We sent a code to <strong style={{ color: '#f5f0eb', fontStyle: 'normal' }}>{email}</strong>
          </div>
          {emailError && <div className="landing-email-error">{emailError}</div>}
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otpCode}
            onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8)); setEmailError(null); }}
            placeholder="00000000"
            className="landing-email-input"
            autoFocus
            maxLength={8}
            style={{ textAlign: 'center', letterSpacing: '0.25em', fontSize: '1.3rem',
              fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}
            onKeyDown={(e) => e.key === 'Enter' && otpCode.length === 8 && handleVerifyOtp()}
          />
          <button
            className="btn-primary"
            onClick={handleVerifyOtp}
            disabled={emailLoading || otpCode.length < 8}
            style={{ opacity: emailLoading || otpCode.length < 8 ? 0.5 : 1 }}
          >
            {emailLoading ? 'Verifying...' : 'Verify & Sign In'}
          </button>
          <button className="landing-email-back" onClick={() => { setEmailStep('input'); setOtpCode(''); setEmailError(null); }}>
            ← Resend or try different email
          </button>
        </div>
      );
    }

    if (emailStep === 'signup') {
      return (
        <div className="landing-email-section">
          {emailError && <div className="landing-email-error">{emailError}</div>}
          <div style={{ color: '#9a938a', fontSize: '0.82rem',
            fontFamily: "'Lora', serif", fontStyle: 'italic' }}>
            Creating account for <strong style={{ color: '#f5f0eb', fontStyle: 'normal' }}>{email}</strong>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setEmailError(null); }}
            placeholder="Choose a password (min 6 chars)"
            className="landing-email-input"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handlePasswordSignUp()}
          />
          <button
            className="btn-primary"
            onClick={handlePasswordSignUp}
            disabled={emailLoading || password.length < 6}
            style={{ opacity: emailLoading || password.length < 6 ? 0.5 : 1 }}
          >
            {emailLoading ? 'Creating account...' : 'Create Account'}
          </button>
          <button className="landing-email-back" onClick={resetEmail}>← Start over</button>
        </div>
      );
    }

    return (
      <div className="landing-email-section">
        {emailError && <div className="landing-email-error">{emailError}</div>}
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
          placeholder="your@email.com"
          className="landing-email-input"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && !usePassword && handleSendOtp()}
        />
        {usePassword && (
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setEmailError(null); }}
            placeholder="Password"
            className="landing-email-input"
            onKeyDown={(e) => e.key === 'Enter' && handlePasswordSignIn()}
          />
        )}
        <button
          className="btn-primary"
          onClick={usePassword ? handlePasswordSignIn : handleSendOtp}
          disabled={emailLoading || !email.trim() || (usePassword && !password)}
          style={{ opacity: emailLoading || !email.trim() || (usePassword && !password) ? 0.5 : 1 }}
        >
          {emailLoading ? 'Sending...' : usePassword ? 'Sign In' : 'Send sign-in code'}
        </button>
        <button
          className="landing-email-back"
          onClick={() => { setUsePassword(!usePassword); setEmailError(null); }}
        >
          {usePassword ? '← Use email code instead' : 'Use password instead'}
        </button>
        <button className="landing-email-back" onClick={resetEmail}>← Back</button>
      </div>
    );
  };

  return (
    <div className="landing">
      <style>{heroEnhancementStyles}</style>
      <style>{featureStyles}</style>

      {/* ═══════ HERO (unchanged) ═══════════════════════════ */}
      <div className="landing-hero">
        {/* ── Poster marquee background ─────────────────── */}
        <div className="poster-marquee">
          <div className="poster-marquee-inner">
            {POSTER_COLUMNS.map((col, ci) => (
              <div className="poster-col" key={ci}>
                <div className="poster-col-track">
                  {/* Duplicate the posters for seamless loop */}
                  {[...col, ...col].map((path, pi) => (
                    <div
                      key={pi}
                      className="poster-thumb"
                      style={{ backgroundImage: `url(https://image.tmdb.org/t/p/w185${path})` }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="poster-overlay" />
        <div className="film-grain" />

        <div className="landing-glow" />
        <div className="landing-top">
          <div className="landing-eyebrow">From the <strong>podcast</strong> to your <strong>shelf</strong></div>
          <div className="landing-wordmark">
            <span className="landing-shelf-letters">
              {"MANTL".split("").map((letter, i) => (
                <span key={i} className="shelf-letter" style={{ animationDelay: `${0.3 + i * 0.1}s` }}>
                  {letter}
                </span>
              ))}
            </span>
            <span className="landing-wordmark-line" />
          </div>
          <div className="landing-tagline">
            Discover what to watch,<br />
            read, and play from<br />
            voices you trust.
          </div>
        </div>
        <div className="landing-bottom">
          <button className="btn-primary" onClick={onSignIn}>
            Sign in with Google
          </button>
          <div className="landing-auth-divider">
            <span className="landing-auth-divider-line" />
            <span className="landing-auth-divider-text">or</span>
            <span className="landing-auth-divider-line" />
          </div>
          {!showEmailInput ? (
            <button className="btn-secondary" onClick={() => setShowEmailInput(true)}>
              Continue with email
            </button>
          ) : (
            renderEmailAuth()
          )}
          <div className="landing-learn-more" onClick={scrollToFeatures}>
            <span>Another reason to press play</span>
            <span className="landing-learn-more-arrow">↓</span>
          </div>
        </div>
      </div>

      {/* ═══════ FEATURES – INTERACTIVE ═════════════════════ */}
      <div className="mantl-features" ref={featuresRef}>
        <div className="mantl-features-header">
          <h2>More than a watchlist.</h2>
          <p>Discover what to watch, read, and play next<br />from the voices you trust.</p>
        </div>

        {/* ── 1. COMMUNITIES (moved to top) ────────────────── */}
        <div
          className={`mantl-feature-block${visibleBlocks.has('communities') ? ' visible' : ''}`}
          data-block="communities"
        >
          <div className="mantl-feature-label">Discover</div>
          <div className="mantl-feature-title">Your Podcast, Your Dashboard</div>
          <div className="mantl-feature-desc">
            Each podcast gets its own home — franchise lists, episode guides,
            leaderboards, and listeners tracking right alongside you.
          </div>
          <div className="community-demo">
            {DEMO_COMMUNITIES.map((c, i) => {
              const pct = Math.round((c.done / c.total) * 100);
              const r = 21;
              const circ = 2 * Math.PI * r;
              const offset = circ - (pct / 100) * circ;
              return (
                <div
                  key={i}
                  className="community-row"
                  style={{ transitionDelay: visibleBlocks.has('communities') ? `${i * 0.12}s` : '0s' }}
                >
                  {c.backdrop && (
                    <>
                      <div className="community-backdrop" style={{ backgroundImage: `url(${c.backdrop})` }} />
                      <div className="community-backdrop-overlay" />
                    </>
                  )}
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: '0 2px 2px 0', background: c.color }} />
                  <img
                    className="community-avatar"
                    src={c.art}
                    alt={c.name}
                    style={{ background: c.color + '20' }}
                  />
                  <div className="community-info">
                    <div className="community-name">{c.name}</div>
                    <div className="community-stat">{c.stat}</div>
                  </div>
                  <div className="community-donut">
                    <svg width="52" height="52" viewBox="0 0 52 52">
                      <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4.5" />
                      <circle
                        cx="26" cy="26" r={r} fill="none"
                        stroke={c.color} strokeWidth="4.5"
                        strokeLinecap="round"
                        strokeDasharray={circ}
                        strokeDashoffset={offset}
                        transform="rotate(-90 26 26)"
                        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)' }}
                      />
                    </svg>
                    <span className="community-donut-pct" style={{ color: c.color }}>{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{
            fontFamily: "'Lora', serif",
            fontStyle: 'italic',
            fontSize: '0.72rem',
            color: 'rgba(255,255,255,0.3)',
            textAlign: 'center',
            marginTop: 12,
          }}>
            New communities coming soon
          </div>
        </div>

        {/* ── 2. BADGE COLLECTION ──────────────────────────── */}
        <div
          className={`mantl-feature-block${visibleBlocks.has('badges') ? ' visible' : ''}`}
          data-block="badges"
          style={{ transitionDelay: '0.1s' }}
        >
          <div className="mantl-feature-label">Collect</div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div className="mantl-feature-title" style={{ marginBottom: 4 }}>Earn the Badge</div>
            <div className="tap-hint" style={{ animation: 'none', margin: 0 }}>tap to reveal</div>
          </div>
          <div className="mantl-feature-desc" style={{ marginBottom: 14 }}>
            Complete franchises and collect badges along the way.
          </div>
          <div className="badge-grid">
            {DEMO_BADGES.map((badge, i) => (
              <div
                key={i}
                className={`badge-slot${revealedBadges.has(i) ? ' revealed' : ''}`}
                onClick={() => handleBadgeReveal(i)}
                style={{ '--badge-color': badge.color }}
              >
                <div className="badge-inner">
                  <div className="badge-front">
                    <img className="badge-front-art" src={badge.art} alt="" />
                    <span className="badge-front-q">?</span>
                  </div>
                  <div className="badge-back" style={{ borderColor: badge.color + '44' }}>
                    <div className="badge-back-backdrop" style={{ backgroundImage: `url(${badge.backdrop})` }} />
                    <div className="badge-back-backdrop-overlay" style={{ background: `radial-gradient(circle at center, ${badge.bg} 0%, rgba(15,13,11,0.85) 100%)` }} />
                    <img className="badge-back-art" src={badge.art} alt={badge.name} style={{ borderColor: badge.color + '66' }} />
                    <span className="badge-back-name" style={{ color: badge.color }}>{badge.name}</span>
                    <span className="badge-back-flair" style={{ color: badge.color }}>{badge.sub}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 3. LOG A MOVIE ───────────────────────────────── */}
        <div
          className={`mantl-feature-block${visibleBlocks.has('log') ? ' visible' : ''}`}
          data-block="log"
          style={{ transitionDelay: '0.2s' }}
        >
          <div className="mantl-feature-label">Track</div>
          <div className="mantl-feature-title">Every Log Counts</div>
          <div className="mantl-feature-desc">
            Rate, log, and watch your progress grow.
          </div>
          <div className="log-demo" style={{ position: 'relative' }}>
            <div className="log-demo-backdrop" style={{
              backgroundImage: 'url(https://image.tmdb.org/t/p/w780/AmR3JG1VQVxU8TfAvljUhfSFUOx.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
            }} />
            <div className="log-demo-content">
              <div className="log-demo-row">
                <div className="log-demo-poster" style={{
                  backgroundImage: 'url(https://image.tmdb.org/t/p/w185/vfrQk5IPloGg1v9Rzbh2Eg3VGyM.jpg)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  fontSize: 0,
                }}>
                  <div className={`log-demo-poster-badge${showPinBadge ? ' show' : ''}`}>
                    📌
                  </div>
                </div>
                <div className="log-demo-info">
                  <h3>Alien</h3>
                  <span>Ridley Scott · 1979</span>
                </div>
              </div>
              <div className="log-demo-stars">
                {[1, 2, 3, 4, 5].map(n => (
                  <div
                    key={n}
                    className={`log-demo-star${demoRating >= n ? ' filled' : ''}`}
                    onClick={() => !demoLogged && setDemoRating(demoRating === n ? 0 : n)}
                  >
                    {demoRating >= n ? '★' : '☆'}
                  </div>
                ))}
              </div>
              <button
                className={`log-demo-btn ${demoLogged ? 'logged' : 'ready'}`}
                onClick={handleLogMovie}
                disabled={demoLogged}
                style={{ opacity: demoLogged ? 1 : 1 }}
              >
                {demoLogged ? '✓ Shelved' : 'Shelf It'}
              </button>
              <div className="demo-progress-wrap">
                <div className="demo-progress-label">
                  <span>Alien Franchise</span>
                  <span>{demoLogged ? '5' : '4'} / 8</span>
                </div>
                <div className="demo-progress-bar">
                  <div
                    className="demo-progress-fill"
                    style={{
                      width: demoLogged ? '62.5%' : '50%',
                      background: `linear-gradient(90deg, #4a9eff, ${demoLogged ? '#6ab4ff' : '#4a9eff'})`,
                    }}
                  />
                </div>
              </div>
            </div>
            {/* Toast */}
            <div className={`demo-toast${showToast ? ' show' : ''}`}>
              <span className="demo-toast-icon">👽</span>
              <div>
                <div className="demo-toast-text">Alien Shelved!</div>
                <div className="demo-toast-sub">5 of 8 toward Weyland-Yutani Employee</div>
              </div>
            </div>
          </div>
          <div className="tap-hint">Try it — rate and shelf</div>
        </div>

        {/* ── 4. GROWING COMMUNITIES ────────────────────────── */}
        <div
          className={`mantl-feature-block${visibleBlocks.has('growing') ? ' visible' : ''}`}
          data-block="growing"
          style={{ transitionDelay: '0.3s' }}
        >
          <div className="growing-section">
            <div className="growing-divider" />
            <div className="podcast-marquee">
              <div className="podcast-marquee-row">
                <div className="podcast-marquee-track track-left">
                  {[...PODCAST_ART, ...PODCAST_ART].map((p, i) => (
                    <div key={i} className="podcast-marquee-item">
                      <img className="podcast-marquee-thumb" src={p.src} alt={p.name} />
                      <span className="podcast-marquee-label">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="podcast-marquee-overlay" />
            </div>
            <div className="growing-headline">New communities<br />added regularly</div>
            <div className="growing-sub">
              If your podcast has a shelf, we're building it.
            </div>
            <div className="growing-divider" />
          </div>
        </div>

        {/* ── BOTTOM CTA ───────────────────────────────────── */}
        <div className="mantl-bottom-cta">
          <button className="btn-primary" onClick={onSignIn}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="18" viewBox="0 0 16 18" fill="none" style={{ marginTop: -1 }}>
                <path d="M2 1.5L14.5 9L2 16.5V1.5Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
              Press Play
            </span>
          </button>
          <div className="mantl-bottom-tagline">New communities coming soon</div>
        </div>
      </div>
    </div>
  );
}

export default LandingScreen;
