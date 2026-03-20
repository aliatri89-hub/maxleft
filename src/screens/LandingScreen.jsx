import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "../supabase";

/* ════════════════════════════════════════════════════════════
   LANDING SCREEN  –  "Another reason to press play."
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
  /* ── VHS SCANLINES OVERLAY ─────────────────────────────── */
  .vhs-scanlines {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 6;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0,0,0,0.12) 2px,
      rgba(0,0,0,0.12) 4px
    );
  }

  /* ── M▶NTL LOGO ────────────────────────────────────────── */
  .vhs-logo-wrap {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  .vhs-eyebrow {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: #e8c4a0;
    margin-bottom: 10px;
    display: block;
    opacity: 0;
    animation: fadeUp 0.6s ease 0.1s forwards;
    line-height: 1.6;
    text-shadow: 0 1px 6px rgba(0,0,0,0.6);
  }
  .vhs-eyebrow strong {
    display: block;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800;
    font-size: 15px;
    letter-spacing: 0.22em;
    color: #f5f0eb;
    margin-top: 4px;
    padding-left: 68px;
  }
  .vhs-logo {
    display: flex;
    align-items: center;
    gap: 0;
    opacity: 0;
    animation: fadeIn 0.01s ease 0.2s forwards;
  }
  .vhs-logo-letter {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 105px;
    line-height: 0.85;
    letter-spacing: 0.02em;
    color: #f5f0eb;
    display: inline-block;
    opacity: 0;
    transform: translateY(110%);
    animation: shelfRise 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }
  .vhs-play-btn {
    position: relative;
    width: 72px;
    height: 82px;
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: flex-end;
    margin: 0 -2px;
    cursor: pointer;
    opacity: 0;
    transform: translateY(110%);
    animation: shelfRise 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }
  .vhs-play-btn-bg {
    position: absolute;
    inset: 0px 0px;
    background: rgba(15,13,11,0.85);
    border: 1.5px solid rgba(255,255,255,0.12);
    border-radius: 5px;
    transition: all 0.3s ease;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.06),
      0 2px 6px rgba(0,0,0,0.3);
  }
  .vhs-play-btn:hover .vhs-play-btn-bg {
    background: rgba(15,13,11,0.9);
    border-color: rgba(255,255,255,0.22);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.1),
      0 4px 16px rgba(0,0,0,0.4),
      0 0 30px rgba(240, 236, 224, 0.06);
  }
  .vhs-play-triangle {
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 21px 0 21px 35px;
    border-color: transparent transparent transparent #f5f0eb;
    position: relative;
    z-index: 2;
    margin-left: 5px;
    filter: drop-shadow(0 0 8px rgba(240, 236, 224, 0.15));
    transition: filter 0.3s ease;
  }
  .vhs-play-btn:hover .vhs-play-triangle {
    filter: drop-shadow(0 0 16px rgba(240, 236, 224, 0.3));
  }
  .vhs-wordmark-line {
    display: block;
    width: 100%;
    height: 4px;
    background: var(--terracotta, #C75B3F);
    border-radius: 2px;
    margin-top: 6px;
  }

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
    padding: 60px 12px 48px;
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

  /* ── FEATURE BLOCKS ──────────────────────────────────────── */
  .mantl-feature-block {
    max-width: 420px;
    margin: 0 auto 44px;
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


  /* ── SYNC DEMO ─────────────────────────────────────────── */
  .sync-demo {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .sync-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 14px;
    background: rgba(255,255,255,0.03);
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.06);
    transition: all 0.3s ease;
  }
  .sync-row:hover {
    background: rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.1);
  }
  .sync-logo {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    object-fit: cover;
    flex-shrink: 0;
  }
  .sync-logo-rounded {
    border-radius: 12px;
  }
  .sync-info {
    flex: 1;
    min-width: 0;
  }
  .sync-name {
    font-family: 'Barlow Condensed', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 0.78rem;
    font-weight: 700;
    color: #f5f0eb;
  }
  .sync-stat {
    font-family: 'Lora', serif;
    font-size: 0.68rem;
    color: #9a938a;
    font-style: italic;
  }
  .sync-badge {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.58rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(0,200,100,0.7);
    padding: 4px 8px;
    border-radius: 6px;
    background: rgba(0,200,100,0.08);
    border: 1px solid rgba(0,200,100,0.15);
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* ── PLAY BUTTON DEMO ─────────────────────────────────────── */
  .play-demo-wrap {
    max-width: 420px;
    margin: 0 auto;
    border-radius: 6px;
    background: #302c28;
    padding: 1px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  }
  .play-demo-tape {
    background: #1a1612;
    border-radius: 5px;
    overflow: hidden;
    display: flex;
    min-height: 80px;
  }
  .play-demo-tape-end { width: 5px; flex-shrink: 0; background: #1a1612; }
  .play-demo-label {
    flex: 1;
    background: #f0ebe1;
    padding: 14px 12px 10px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    position: relative;
    overflow: hidden;
  }
  .play-demo-label::before {
    content: '';
    position: absolute; inset: 0; pointer-events: none;
    background-image: repeating-linear-gradient(0deg, transparent, transparent 17px, rgba(0,0,0,0.03) 17px, rgba(0,0,0,0.03) 18px);
  }
  /* Brand stamps */
  .play-demo-brand-left, .play-demo-brand-right {
    position: absolute; top: 0; bottom: 0; font-weight: 800; text-transform: uppercase; white-space: nowrap;
    display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 1;
  }
  .play-demo-brand-left {
    left: 4px; writing-mode: vertical-rl; transform: rotate(180deg);
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 7px; letter-spacing: 0.12em; color: var(--terracotta, #C75B3F);
  }
  .play-demo-brand-right {
    right: 4px; writing-mode: vertical-rl; transform: rotate(180deg);
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 7px; letter-spacing: 0.1em; color: #999;
  }
  .play-demo-headphones {
    position: absolute; bottom: 18px; right: 26px; opacity: 0.4;
  }
  /* VCR Deck */
  .play-demo-deck {
    background: linear-gradient(180deg, #1e1a16 0%, #1a1612 50%, #161310 100%);
    border-top: 1px solid rgba(255,255,255,0.04);
    padding: 8px 16px 7px;
    display: flex; align-items: center; justify-content: center; gap: 16;
    position: relative; cursor: pointer;
  }
  .play-demo-deck-edge {
    position: absolute; top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 15%, rgba(255,255,255,0.08) 85%, transparent);
  }
  .play-demo-corner { position: absolute; width: 10px; height: 10px; pointer-events: none; }
  .play-demo-corner-tl { top: 5px; left: 10px; border-top: 2px solid rgba(255,255,255,0.75); border-left: 2px solid rgba(255,255,255,0.75); }
  .play-demo-corner-tr { top: 5px; right: 10px; border-top: 2px solid rgba(255,255,255,0.75); border-right: 2px solid rgba(255,255,255,0.75); }
  .play-demo-corner-bl { bottom: 5px; left: 10px; border-bottom: 2px solid rgba(255,255,255,0.75); border-left: 2px solid rgba(255,255,255,0.75); }
  .play-demo-corner-br { bottom: 5px; right: 10px; border-bottom: 2px solid rgba(255,255,255,0.75); border-right: 2px solid rgba(255,255,255,0.75); }
  .play-demo-grille {
    flex: 1; height: 20px; border-radius: 3px;
    background: radial-gradient(circle, rgba(255,255,255,0.22) 1px, transparent 1px);
    background-size: 5px 5px;
    border: 1px solid rgba(255,255,255,0.12);
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.2);
  }
  .play-demo-play-btn {
    background: linear-gradient(180deg, #2a2520 0%, #1a1612 40%, #151210 100%);
    border: 1px solid rgba(255,255,255,0.1);
    border-bottom-color: rgba(0,0,0,0.4);
    border-top-color: rgba(255,255,255,0.12);
    border-radius: 4px; padding: 5px 24px;
    display: flex; align-items: center; justify-content: center;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 4px rgba(0,0,0,0.4);
    position: relative;
  }
  .play-demo-led {
    position: absolute; top: -1px; right: -1px;
    width: 5px; height: 5px; border-radius: 50%;
    background: rgba(52,211,153,0.2);
    border: 0.5px solid rgba(52,211,153,0.15);
    pointer-events: none; transition: all 0.3s;
  }
  .play-demo-led.active {
    background: #34d399; border: none;
    box-shadow: 0 0 4px #34d399, 0 0 8px rgba(52,211,153,0.3);
  }
  /* Picker */
  .play-demo-picker {
    background: #1a1612;
    border-top: 1px solid rgba(255,255,255,0.06);
    padding: 6px 12px;
    border-radius: 0 0 4px 4px;
    max-height: 0; overflow: hidden;
    transition: max-height 0.28s cubic-bezier(0.4, 0, 0.2, 1), padding 0.28s ease;
  }
  .play-demo-picker.open { max-height: 250px; padding: 6px 12px; }
  .play-demo-picker-row {
    display: flex; align-items: center; gap: 8;
    padding: 5px 4px; cursor: pointer; border-radius: 4px;
    transition: background 0.15s;
  }
  .play-demo-picker-row:hover { background: rgba(255,255,255,0.04); }
  .play-demo-picker-art {
    width: 28px; height: 28px; border-radius: 6px; object-fit: cover;
    border: 1.5px solid rgba(199,91,63,0.25);
  }
  .play-demo-picker-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 13px;
    color: rgba(255,255,255,0.7);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .play-demo-picker-ep {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px; color: rgba(255,255,255,0.3);
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .play-demo-now-playing {
    display: flex; align-items: center; gap: 8;
    padding: 6px 12px; margin-top: 6px;
    background: rgba(199,91,63,0.06);
    border: 1px solid rgba(199,91,63,0.12);
    border-radius: 6px;
    animation: fadeIn 0.3s ease;
  }
  .play-demo-now-playing img {
    width: 24px; height: 24px; border-radius: 6px; object-fit: cover;
  }
  .play-demo-now-playing-text {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px; font-weight: 600;
    color: rgba(255,255,255,0.7);
  }
  .play-demo-now-playing-ep {
    font-family: 'Lora', serif;
    font-size: 9px; color: rgba(255,255,255,0.35);
    font-style: italic;
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
    font-size: 0.72rem;
    color: rgba(255,255,255,0.4);
    text-align: center;
    margin-top: 10px;
  }
  @keyframes tapPulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.7; }
  }
  .tap-hint {
    animation: tapPulse 2.5s ease-in-out infinite;
  }

  /* ── GROWING COMMUNITIES ──────────────────────────────────── */
  .growing-section {
    text-align: center;
    padding: 8px 0;
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
    margin: 16px -18px 20px;
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
  .podcast-marquee-track.track-right {
    animation: marquee-right 36s linear infinite;
  }
  @keyframes marquee-left {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes marquee-right {
    0% { transform: translateX(-50%); }
    100% { transform: translateX(0); }
  }
  .podcast-marquee-row + .podcast-marquee-row {
    margin-top: 18px;
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
    margin-bottom: 16px;
  }
`;

// ── Podcast art for horizontal marquee (two rows) ──
const PODCAST_ART_ROW1 = [
  { src: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts126/v4/3c/7c/bb/3c7cbbce-5847-c26c-f3c5-04cbd9e88e5e/mza_18038029828846701875.jpg/300x300bb.webp", name: "Film Junk" },
  { src: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts116/v4/4b/6d/ff/4b6dff78-28f3-8a50-a6aa-47c69e0bf797/mza_6072961650790924101.jpeg/300x300bb.webp", name: "Get Played" },
  { src: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/bd/8c/05/bd8c05d9-fd70-e35f-da50-f3d67256d648/mza_6805140787842707960.jpg/300x300bb.webp", name: "Filmspotting" },
  { src: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/4b/06/00/4b06006c-8936-1653-fc82-132b64441f4f/mza_5523773122723324139.jpg/300x300bb.webp", name: "HDTGM" },
  { src: "https://i1.sndcdn.com/artworks-PVO0X1iIYkoyTfeK-8eSxuA-t500x500.png", name: "Movie Mindset" },
  { src: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/83/47/e2/8347e2b8-a5da-a3b0-d475-19288bdf855d/mza_1646255428613610425.jpeg/300x300bb.webp", name: "Films To Be Buried With" },
];
const PODCAST_ART_ROW2 = [
  { src: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/3c/11/eb/3c11eb85-f49b-da0f-ccf2-28b7b417487e/mza_830543288936089485.jpeg/300x300bb.webp", name: "Unspooled" },
  { src: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts125/v4/12/c8/45/12c8453e-02cd-8526-1415-22f2ddc7f864/mza_16416337016232027675.jpg/300x300bb.webp", name: "The Flop House" },
  { src: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts116/v4/97/02/d0/9702d058-288c-a931-f3b1-55f5697fad0e/mza_11250256298198911552.jpg/300x300bb.webp", name: "Video Archives" },
  { src: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/44/b3/f9/44b3f953-fbae-4e99-4d82-4c2cc83630e5/mza_1552332279859047099.jpg/300x300bb.webp", name: "Filmcast" },
  { src: "https://pbcdn1.podbean.com/imglogo/dir-logo/238399/238399_300x300.png", name: "Next Picture Show" },
  { src: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts112/v4/da/e9/e6/dae9e6d3-6b4e-b600-bb37-0ce7833c24d5/mza_9711243178432328693.jpg/300x300bb.webp", name: "You Must Remember This" },
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

// ── Demo movies for play button demo (3 tapes, 3 audiences) ──
const DEMO_PLAY_MOVIES = [
  {
    title: "Iron Man 3",
    logo: "https://image.tmdb.org/t/p/original/w5ZYdSp1Dut7tGRPEG0Cn1GkwrU.png",
    brand: "T-120 KODAK",
    podcasts: [
      { name: "Now Playing Podcast", art: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/1200x1200bf-60.jpg", episode: "Iron Man 3 Retrospective" },
      { name: "Blank Check", art: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/FeedLogoBlankCheck.png", episode: "Iron Man Three" },
      { name: "Filmspotting", art: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/bd/8c/05/bd8c05d9-fd70-e35f-da50-f3d67256d648/mza_6805140787842707960.jpg/300x300bb.webp", episode: "#437: Iron Man 3" },
    ],
  },
  {
    title: "Barbie",
    logo: "https://image.tmdb.org/t/p/original/nsMnkuWIZCBxkBLPi0ZXuRloYL2.png",
    brand: "E-180 BASF",
    podcasts: [
      { name: "Pop Culture Happy Hour", art: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts126/v4/ab/41/b7/ab41b73e-0a94-1c2a-13e0-0d43bbf3f237/mza_11270718702900498122.jpg/300x300bb.webp", episode: "Barbie" },
      { name: "Unspooled", art: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/3c/11/eb/3c11eb85-f49b-da0f-ccf2-28b7b417487e/mza_830543288936089485.jpeg/300x300bb.webp", episode: "Barbie (2023)" },
      { name: "The Big Picture", art: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts116/v4/9c/f0/17/9cf01712-63e3-ceae-0613-e6861a621247/mza_17940498907480255498.jpeg/300x300bb.webp", episode: "The 'Barbie' Bonanza" },
    ],
  },
  {
    title: "Alien",
    logo: "https://image.tmdb.org/t/p/original/2VtdN0UaK2RISxUgPw04oT4oWTO.png",
    brand: "HGX MAXELL",
    podcasts: [
      { name: "The Rewatchables", art: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts116/v4/34/87/28/348728f8-06e7-c834-5a13-eee13e7f6e2e/mza_7588498015474203498.jpg/300x300bb.webp", episode: "Alien" },
      { name: "Film Junk", art: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts126/v4/3c/7c/bb/3c7cbbce-5847-c26c-f3c5-04cbd9e88e5e/mza_18038029828846701875.jpg/300x300bb.webp", episode: "Film Junk Podcast: Alien" },
      { name: "Eye of the Duck", art: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts116/v4/0d/e1/1e/0de11e40-a1c4-22ee-19c1-408a3a03e46e/mza_12363992498403595498.jpg/300x300bb.webp", episode: "Alien (1979)" },
    ],
  },
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

  // ── Play button demo state ───────────────────────────────
  const [showDemoPicker, setShowDemoPicker] = useState(false);
  const [demoPodcast, setDemoPodcast] = useState(null);
  const [demoMovieIdx, setDemoMovieIdx] = useState(0);
  const demoMovie = DEMO_PLAY_MOVIES[demoMovieIdx];
  const cycleDemoMovie = () => { setDemoMovieIdx(i => (i + 1) % DEMO_PLAY_MOVIES.length); setShowDemoPicker(false); setDemoPodcast(null); };

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

        {/* ── VHS scanlines ──────────────────────────────── */}

        <div className="landing-glow" />
        <div className="landing-top">
          <div className="vhs-scanlines" />
          <div className="vhs-logo-wrap">
            <span className="vhs-eyebrow">The podcast platform for<br /><strong>movie lovers</strong></span>
            <div className="vhs-logo">
              <span className="vhs-logo-letter" style={{ animationDelay: '0.3s' }}>M</span>
              <div className="vhs-play-btn" style={{ animationDelay: '0.4s' }} onClick={scrollToFeatures}>
                <div className="vhs-play-btn-bg" />
                <div className="vhs-play-triangle" />
              </div>
              <span className="vhs-logo-letter" style={{ animationDelay: '0.5s' }}>N</span>
              <span className="vhs-logo-letter" style={{ animationDelay: '0.6s' }}>T</span>
              <span className="vhs-logo-letter" style={{ animationDelay: '0.7s' }}>L</span>
            </div>
            <span className="vhs-wordmark-line" />
          </div>
          <div className="landing-tagline">
            <strong>Watch. Log. Listen.</strong><br />
            Another reason to <strong>press play.</strong>
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
            <span>See how it works</span>
            <span className="landing-learn-more-arrow">↓</span>
          </div>
        </div>
      </div>

      {/* ═══════ FEATURES – INTERACTIVE ═════════════════════ */}
      <div className="mantl-features" ref={featuresRef}>
        {/* ── 0. PLAY BUTTON DEMO (the hook) ────────────────── */}
        <div
          className={`mantl-feature-block${visibleBlocks.has('play') ? ' visible' : ''}`}
          data-block="play"
        >
          <div className="mantl-feature-label">Listen</div>
          <div className="mantl-feature-title">Tap Play on Any Movie</div>
          <div className="mantl-feature-desc">
            See which podcasts covered it. Pick a show. Listen.
          </div>
          <div className="play-demo-wrap">
            <div style={{ borderRadius: 4, overflow: "hidden" }}>
              {/* VHS Tape */}
              <div className="play-demo-tape" onClick={cycleDemoMovie} style={{ cursor: "pointer" }}>
                <div className="play-demo-tape-end" />
                <div className="play-demo-label">
                  <span className="play-demo-brand-left">{demoMovie.brand}</span>
                  <span className="play-demo-brand-right">VHS</span>
                  <img
                    key={demoMovie.title}
                    src={demoMovie.logo}
                    alt={demoMovie.title}
                    crossOrigin="anonymous"
                    style={{
                      maxHeight: 54, minHeight: 36, maxWidth: "85%", width: "auto",
                      objectFit: "contain", position: "relative",
                      opacity: 0.85,
                      animation: "fadeIn 0.3s ease",
                    }}
                    onError={(e) => { e.target.style.display = "none"; if (e.target.nextSibling) e.target.nextSibling.style.display = "block"; }}
                  />
                  <div style={{ display: "none", fontFamily: "'Permanent Marker', cursive", fontSize: 26, color: "#2C2824", textTransform: "uppercase", position: "relative", textAlign: "center" }}>{demoMovie.title}</div>
                  {/* Sharpie stars — bottom right */}
                  <div style={{ position: "absolute", bottom: 6, right: 24, display: "flex", gap: 0, alignItems: "center" }}>
                    {[
                      "M12 1 L14.5 8 L22 9.5 L16.5 14.5 L18 22 L12 18 L6 22 L7.5 14.5 L2 9.5 L9.5 8 Z",
                      "M11.5 2 L14 9 L21.5 10 L15.5 14 L17 21 L11.5 17.5 L5.5 20.5 L7.5 13.5 L2.5 9 L10 8.5 Z",
                      "M12 2.5 L15 8.5 L22.5 9 L17 13.5 L18.5 20.5 L12 17 L5.5 20.5 L7 13.5 L1.5 9 L9 8.5 Z",
                    ].map((d, i) => (
                      <svg key={i} width={14} height={14} viewBox="0 0 24 24" style={{ display: "block" }}>
                        <path d={d} fill="none" stroke="#6b5a10" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round"
                          style={{ transform: `rotate(${[-3, 2, -1][i]}deg)`, transformOrigin: "center" }} />
                      </svg>
                    ))}
                  </div>
                  <div className="play-demo-headphones">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2C2824" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                    </svg>
                  </div>
                </div>
                <div className="play-demo-tape-end" />
              </div>
              {/* VCR Deck */}
              <div className="play-demo-deck" onClick={() => setShowDemoPicker(p => !p)}>
                <div className="play-demo-deck-edge" />
                <div className="play-demo-corner play-demo-corner-tl" />
                <div className="play-demo-corner play-demo-corner-tr" />
                <div className="play-demo-corner play-demo-corner-bl" />
                <div className="play-demo-corner play-demo-corner-br" />
                <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center" }}>
                  <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, transform: "translateY(-50%)", background: "linear-gradient(90deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)", pointerEvents: "none" }} />
                  <div className="play-demo-grille" />
                </div>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div className="play-demo-play-btn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <div className={`play-demo-led${demoPodcast ? ' active' : ''}`} />
                  </div>
                </div>
                <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center" }}>
                  <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, transform: "translateY(-50%)", background: "linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.18) 100%)", pointerEvents: "none" }} />
                  <div className="play-demo-grille" />
                </div>
              </div>
              {/* Picker */}
              <div className={`play-demo-picker${showDemoPicker ? ' open' : ''}`}>
                {demoMovie.podcasts.map((p, i) => (
                  <div key={i} className="play-demo-picker-row" onClick={(e) => { e.stopPropagation(); setDemoPodcast(p); setShowDemoPicker(false); }}>
                    <img className="play-demo-picker-art" src={p.art} alt={p.name} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="play-demo-picker-name">{p.episode}</div>
                      <div className="play-demo-picker-ep">{p.name}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,0.4)"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                ))}
              </div>
            </div>
            {/* Now playing */}
            {demoPodcast && (
              <div className="play-demo-now-playing" onClick={() => setDemoPodcast(null)}>
                <img src={demoPodcast.art} alt="" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="play-demo-now-playing-text">{demoPodcast.name}</div>
                  <div className="play-demo-now-playing-ep">{demoPodcast.episode}</div>
                </div>
              </div>
            )}
            {/* Movie dots */}
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12 }}>
              {DEMO_PLAY_MOVIES.map((m, i) => (
                <div
                  key={i}
                  onClick={() => { setDemoMovieIdx(i); setShowDemoPicker(false); setDemoPodcast(null); }}
                  style={{
                    width: i === demoMovieIdx ? 18 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: i === demoMovieIdx ? "var(--terracotta, #C75B3F)" : "rgba(255,255,255,0.15)",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                  }}
                />
              ))}
            </div>
          </div>
          <div className="tap-hint">tap the play button</div>
        </div>

        {/* ── 1. COMMUNITIES ────────────────────────────────── */}
        <div
          className={`mantl-feature-block${visibleBlocks.has('communities') ? ' visible' : ''}`}
          data-block="communities"
        >
          <div className="mantl-feature-label">Go Deeper</div>
          <div className="mantl-feature-title">Join a Community</div>
          <div className="mantl-feature-desc">
            Your favorite podcasts get their own home — with miniseries,
            badges, and your progress across everything they cover.
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
                {demoLogged ? '✓ Logged' : 'Log'}
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
                <div className="demo-toast-text">Alien Logged!</div>
                <div className="demo-toast-sub">5 of 8 toward Weyland-Yutani Employee</div>
              </div>
            </div>
          </div>
          <div className="tap-hint">Try it — rate and log</div>
        </div>

        {/* ── 3.5 SYNC IMPORTS ──────────────────────────────── */}
        <div
          className={`mantl-feature-block${visibleBlocks.has('sync') ? ' visible' : ''}`}
          data-block="sync"
          style={{ transitionDelay: '0.25s' }}
        >
          <div className="mantl-feature-label">Sync</div>
          <div className="mantl-feature-title">Already Tracking? Import It.</div>
          <div className="mantl-feature-desc">
            Connect your Letterboxd account.
            Your logs sync automatically.
          </div>
          <div className="sync-demo">
            <div className="sync-row">
              <img className="sync-logo" src="https://a.ltrbxd.com/logos/letterboxd-mac-icon.png" alt="Letterboxd" />
              <div className="sync-info">
                <div className="sync-name">Letterboxd</div>
                <div className="sync-stat">Films & ratings</div>
              </div>
              <div className="sync-badge">Auto-sync</div>
            </div>
          </div>
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
                  {[...PODCAST_ART_ROW1, ...PODCAST_ART_ROW1].map((p, i) => (
                    <div key={i} className="podcast-marquee-item">
                      <img className="podcast-marquee-thumb" src={p.src} alt={p.name} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="podcast-marquee-row">
                <div className="podcast-marquee-track track-right">
                  {[...PODCAST_ART_ROW2, ...PODCAST_ART_ROW2].map((p, i) => (
                    <div key={`r2-${i}`} className="podcast-marquee-item">
                      <img className="podcast-marquee-thumb" src={p.src} alt={p.name} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="podcast-marquee-overlay" />
            </div>
            <div className="growing-headline">30+ podcasts<br />and growing</div>
            <div className="growing-sub">
              Every film with coverage gets a play button.
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
        </div>
      </div>
    </div>
  );
}

export default LandingScreen;
