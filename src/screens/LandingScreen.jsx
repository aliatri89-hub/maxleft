import { t } from "../theme";
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
    color: var(--text-primary);
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
    color: var(--text-primary);
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
    border-color: var(--border-strong);
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
    color: var(--text-primary);
    margin-bottom: 8px;
  }
  .mantl-feature-desc {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.85rem;
    color: var(--text-muted);
    line-height: 1.65;
    margin-bottom: 12px;
  }

  /* ── BADGE COLLECTION DEMO ───────────────────────────────── */
  .badge-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    padding: 14px;
    background: rgba(255,255,255,0.03);
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.06);
  }
  .badge-slot {
    aspect-ratio: 3 / 4;
    border-radius: 10px;
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
    width: 48px;
    height: 48px;
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
    color: var(--text-secondary);
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
    width: 52px;
    height: 52px;
    object-fit: contain;
    border-radius: 50%;
    border: 2px solid;
    padding: 2px;
    background: rgba(0,0,0,0.4);
  }
  .badge-back-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
    line-height: 1.2;
    text-shadow: 0 1px 6px rgba(0,0,0,0.85), 0 0 12px rgba(0,0,0,0.6);
    filter: brightness(1.3);
  }
  .badge-back-flair {
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic;
    font-size: 0.52rem;
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

  /* ── TRIPLE FEATURE DEMO ────────────────────────────────── */
  .tf-demo {
    background: rgba(255,255,255,0.03);
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.06);
    padding: 14px 12px 12px;
    text-align: center;
  }
  .tf-target {
    margin-bottom: 10px;
    padding: 8px 16px;
    background: linear-gradient(135deg,rgba(212,175,55,0.10),rgba(212,175,55,0.03));
    border: 1px solid rgba(212,175,55,0.2);
    border-radius: 10px;
    display: inline-block;
  }
  .tf-target-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.55rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 2px;
  }
  .tf-target-val {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1.6rem;
    font-weight: 900;
    color: var(--gold);
    letter-spacing: 0.02em;
  }
  .tf-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
    margin-bottom: 10px;
  }
  .tf-card {
    position: relative;
    border-radius: 6px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }
  .tf-card.selected {
    box-shadow: 0 0 0 2px #d4af37, 0 4px 16px rgba(212,175,55,0.3);
    transform: scale(1.04);
  }
  .tf-card.locked.selected {
    box-shadow: 0 0 0 2px #d4af37, 0 4px 16px rgba(212,175,55,0.3);
    transform: scale(1.04);
  }
  .tf-card.locked.optimal {
    box-shadow: 0 0 0 2px #4ade80, 0 4px 16px rgba(74,222,128,0.3);
    opacity: 1 !important;
  }
  .tf-card.locked.selected.optimal {
    box-shadow: 0 0 0 2px #4ade80, 0 4px 16px rgba(74,222,128,0.4);
  }
  .tf-card.locked:not(.selected):not(.optimal) {
    opacity: 0.5;
  }
  .tf-card-poster {
    width: 100%;
    aspect-ratio: 2/3;
    object-fit: cover;
    display: block;
  }
  .tf-card-check {
    position: absolute;
    top: 3px;
    right: 3px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--gold);
    color: #0a0a0f;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    font-weight: 700;
  }
  .tf-card-rank {
    position: absolute;
    top: 3px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 3;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.6rem;
    font-weight: 800;
    color: var(--green);
    background: rgba(10,10,15,0.75);
    padding: 1px 5px;
    border-radius: 4px;
    letter-spacing: 0.03em;
    animation: fadeUp 0.4s ease;
  }
  .tf-card-rank.rank-dim {
    color: var(--text-faint);
    background: rgba(10,10,15,0.6);
  }
  .tf-card-gross {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(10,10,15,0.3) 0%, rgba(10,10,15,0.88) 100%);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-bottom: 6px;
    animation: fadeUp 0.4s ease;
  }
  .tf-card-gross-val {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.75rem;
    font-weight: 900;
    color: var(--gold);
  }
  .tf-card-gross-val.optimal-val {
    color: var(--green);
  }
  .tf-card-gross-val.dim-val {
    color: var(--text-faint);
  }
  .tf-card-optimal-tag {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.4rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--green);
    margin-top: 1px;
  }
  .tf-card-info {
    padding: 3px 2px;
    background: #111118;
    text-align: center;
  }
  .tf-card-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.55rem;
    font-weight: 600;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tf-card.selected .tf-card-title { color: var(--gold); }
  .tf-prompt {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.65rem;
    color: var(--text-secondary);
    margin-bottom: 8px;
    letter-spacing: 0.04em;
  }
  .tf-lock-btn {
    display: inline-block;
    padding: 8px 24px;
    border-radius: 10px;
    border: none;
    font-family: 'Barlow Condensed', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .tf-result {
    animation: fadeUp 0.5s ease;
  }
  .tf-result-rank {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1.8rem;
    font-weight: 900;
    color: var(--gold);
    line-height: 1;
  }
  .tf-result-sub {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.55rem;
    color: var(--text-faint);
    margin-top: 2px;
    letter-spacing: 0.04em;
  }
  .tf-result-total {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1.2rem;
    font-weight: 900;
    color: var(--text-primary);
    margin-top: 6px;
  }
  .tf-result-diff {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.6rem;
    font-weight: 600;
    margin-top: 2px;
  }
  .tf-new-puzzle {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.55rem;
    color: var(--text-faint);
    margin-top: 10px;
    letter-spacing: 0.06em;
  }
  .tf-try-again {
    display: inline-block;
    margin-top: 10px;
    padding: 0;
    background: none;
    border: none;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.6rem;
    color: var(--text-muted);
    cursor: pointer;
    letter-spacing: 0.04em;
    text-decoration: underline;
    text-underline-offset: 2px;
    transition: color 0.2s ease;
  }
  .tf-try-again:hover {
    color: var(--text-secondary);
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
    border-color: var(--border-medium);
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
    color: var(--text-primary);
  }
  .community-stat {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.68rem;
    color: var(--text-muted);
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
    border-color: var(--border-medium);
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
  .sync-logo-play {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    flex-shrink: 0;
    background: rgba(15,13,11,0.85);
    border: 1.5px solid rgba(255,255,255,0.12);
    display: flex;
    align-items: center;
    justify-content: center;
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
    color: var(--text-primary);
  }
  .sync-stat {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.68rem;
    color: var(--text-muted);
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

  /* ── FLIP CARD DEMO ─────────────────────────────────────── */
  .flip-card-wrap {
    perspective: 1000px;
    width: 100%;
    height: 160px;
  }
  .flip-card-inner {
    position: relative;
    width: 100%; height: 100%;
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    transform-style: preserve-3d;
    cursor: pointer;
  }
  .flip-card-inner.flipped { transform: rotateX(180deg); }
  .flip-card-front, .flip-card-back {
    position: absolute; inset: 0;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    border-radius: 12px;
    overflow: hidden;
  }
  .flip-card-front {
    background: #1a1714;
  }
  .flip-card-back {
    background: linear-gradient(180deg, #1e1a16 0%, #141210 100%);
    transform: rotateX(180deg);
    display: flex; flex-direction: column; justify-content: center;
    padding: 14px 16px;
    border: 1px solid rgba(255,255,255,0.06);
  }
  .flip-card-back-row {
    display: flex; align-items: center; gap: 10;
    padding: 7px 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }
  .flip-card-back-row:last-child { border-bottom: none; }
  .flip-card-back-art {
    width: 34px; height: 34px; border-radius: 8px; object-fit: cover;
    border: 1.5px solid rgba(199,91,63,0.2);
    flex-shrink: 0;
  }
  .flip-card-back-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 13px;
    color: var(--text-secondary);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .flip-card-back-ep {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .flip-card-play-btn {
    width: 30px; height: 30px; border-radius: 50%;
    background: rgba(199,91,63,0.15);
    border: 1px solid rgba(199,91,63,0.25);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; transition: all 0.15s;
  }
  .flip-card-play-btn.active {
    background: rgba(199,91,63,0.3);
    border-color: rgba(199,91,63,0.5);
  }
  .flip-nudge {
    text-align: center;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; color: var(--text-secondary);
    letter-spacing: 0.06em; text-transform: uppercase;
    padding: 8px 0 0;
    animation: flipNudgePulse 2.5s ease infinite;
  }
  @keyframes flipNudgePulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
  }
  @keyframes demoSpin {
    to { transform: rotate(360deg); }
  }

  /* ── BOTTOM CTA ──────────────────────────────────────────── */
  .mantl-bottom-cta {
    text-align: center;
    margin-top: 20px;
    padding: 0 12px;
  }
  .mantl-bottom-tagline {
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic;
    font-size: 0.82rem;
    color: var(--text-muted);
    margin-top: 14px;
  }

  /* ── HINT TAP ────────────────────────────────────────────── */
  .tap-hint {
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic;
    font-size: 0.72rem;
    color: var(--text-secondary);
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
    color: var(--text-muted);
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
    color: var(--text-primary);
    line-height: 1.3;
    margin-bottom: 10px;
  }
  .growing-sub {
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic;
    font-size: 0.82rem;
    color: var(--text-muted);
    line-height: 1.65;
    margin-bottom: 16px;
  }
`;

// ── Podcast art for horizontal marquee (two rows) ──
const PODCAST_ART_ROW1 = [
  { src: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/30/57/26/305726f4-a910-986d-af15-9d9630b96722/mza_632554795848485854.jpg/600x600bb.webp", name: "Now Playing Podcast" },
  { src: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/bb/82/cf/bb82cfa4-0bf8-bbe8-b5a6-407702ab1764/mza_4979053321172937662.jpeg/540x540bb.webp", name: "Blank Check" },
  { src: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts126/v4/3c/7c/bb/3c7cbbce-5847-c26c-f3c5-04cbd9e88e5e/mza_18038029828846701875.jpg/540x540bb.webp", name: "Film Junk" },
  { src: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/bd/8c/05/bd8c05d9-fd70-e35f-da50-f3d67256d648/mza_6805140787842707960.jpg/540x540bb.webp", name: "Filmspotting" },
  { src: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/4b/06/00/4b06006c-8936-1653-fc82-132b64441f4f/mza_5523773122723324139.jpg/540x540bb.webp", name: "HDTGM" },
  { src: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/d0/b2/86/d0b286b1-c111-4346-18ab-8c1632551a41/mza_18001309740433796361.jpg/540x540bb.webp", name: "The Rewatchables" },
  { src: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/73/12/f9/7312f903-6bdd-344f-5f5f-ccded1d6a6b9/mza_265011236225794238.jpg/540x540bb.webp", name: "The Big Picture" },
  { src: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/29/ca/0b/29ca0bf1-aa5b-3da8-9be0-f357793116a7/mza_16337213754400532987.jpg/540x540bb.webp", name: "Pop Culture Happy Hour" },
  { src: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/93/c4/59/93c4595d-f0e6-f9cb-6578-374cd1e6ce20/mza_7318291685223746152.jpg/600x600bb.webp", name: "We Hate Movies" },
];
const PODCAST_ART_ROW2 = [
  { src: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/3c/11/eb/3c11eb85-f49b-da0f-ccf2-28b7b417487e/mza_830543288936089485.jpeg/600x600bb.webp", name: "Unspooled" },
  { src: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts116/v4/97/02/d0/9702d058-288c-a931-f3b1-55f5697fad0e/mza_11250256298198911552.jpg/600x600bb.webp", name: "The Flop House" },
  { src: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts125/v4/12/c8/45/12c8453e-02cd-8526-1415-22f2ddc7f864/mza_16416337016232027675.jpg/540x540bb.webp", name: "The Filmcast" },
  { src: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/2d/2c/2d/2d2c2d54-1e9b-5bb1-5864-31a183c0de1a/mza_5314311699607555935.jpg/540x540bb.webp", name: "Black Men Can't Jump" },
  { src: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/44/cb/e2/44cbe27f-5b66-5248-8ad0-36434efcaa09/mza_6406640264505080139.jpg/540x540bb.webp", name: "Eye of the Duck" },
  { src: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/65/d8/50/65d85018-7ee1-902d-9028-14b7aa9afc95/mza_3318676276652185584.jpg/540x540bb.webp", name: "Next Best Picture" },
  { src: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts122/v4/c5/c2/ca/c5c2ca3f-21c0-5579-258e-2dfb52121e56/mza_3963697153676465571.jpg/600x600bb.webp", name: "Kinda Funny In Review" },
  { src: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/9a/50/6c/9a506c74-6dfa-70e8-20bf-a247ecd247f6/mza_15282793178977422943.jpg/540x540bb.webp", name: "Project Big Screen" },
  { src: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/c8/e4/fe/c8e4fed6-653c-5dbb-9219-db03b0bea340/mza_2747040203623055191.jpg/540x540bb.webp", name: "The Director's Cut" },
];

/* ── Badge data for the demo (3 in a row) ────────────────── */
const DEMO_BADGES = [
  { art: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/pumpkin_badge.png", backdrop: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/Backgroundhalloweenhero.jpg", name: "Haddonfield Historian", sub: "Halloween", color: "#ff6a00", bg: "rgba(255,106,0,0.12)" },
  { art: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/badge_alien.png", backdrop: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/BackgroundAlienHero.jpg", name: "Weyland-Yutani Employee", sub: "Alien", color: "#4a9eff", bg: "rgba(74,158,255,0.12)" },
  { art: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/badge_mad_max.png", backdrop: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/BackgroundMadMaxHero.jpg", name: "Witnessed", sub: "Mad Max", color: "#ff4a4a", bg: "rgba(255,74,74,0.12)" },
];

/* ── Triple Feature demo (static mini-game) ──────────────── */
const TF_DEMO_MOVIES = [
  { title: "Alien",        year: 1979, poster: "https://image.tmdb.org/t/p/w185/vfrQk5IPloGg1v9Rzbh2Eg3VGyM.jpg", gross: 84 },
  { title: "Die Hard",     year: 1988, poster: "https://image.tmdb.org/t/p/w185/yFihWxQcmqcaBR31QM6Y8gT6aYV.jpg", gross: 86 },
  { title: "The Matrix",   year: 1999, poster: "https://image.tmdb.org/t/p/w185/dXNAPwY7VrqMAo51EKhhCJfaGb5.jpg", gross: 171 },
  { title: "Jaws",         year: 1975, poster: "https://image.tmdb.org/t/p/w185/lxM6kqilAdpdhqUl2biYp5frUxE.jpg", gross: 260 },
  { title: "Scream",       year: 1996, poster: "https://image.tmdb.org/t/p/w185/lr9ZIrmuwVmZhpZuTCW8D9g0ZJe.jpg", gross: 103 },
];
// optimal = Jaws + Matrix + Scream = 260+171+103 = 534 (top 3 grossing)

const DEMO_COMMUNITIES = [
  { name: "Now Playing Podcast", art: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/1200x1200bf-60.jpg", color: t.terra, stat: "Marvel Infinity Saga", done: 18, total: 23, backdrop: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/Infinityhero.jpeg" },
  { name: "Blank Check with Griffin & David", art: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/FeedLogoBlankCheck.png", color: "#4a9eff", stat: "Pod Country for Old Cast", done: 10, total: 21, backdrop: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/Fargoherodrop.jpg" },
];

// ── Demo movies for play button demo (3 tapes, 3 audiences) ──
const DEMO_PLAY_MOVIES = [
  {
    title: "Iron Man 3",
    logo: "https://image.tmdb.org/t/p/original/w5ZYdSp1Dut7tGRPEG0Cn1GkwrU.png",
    backdrop: "https://image.tmdb.org/t/p/w780/iVped1djsF0tvGkvnHbzsE3ZPTF.jpg",
    podcasts: [
      { name: "Blank Check", art: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/FeedLogoBlankCheck.png", episode: "Iron Man 3", audio: "https://api.mymantl.app/storage/v1/object/public/banners/audio_BlankCheckTheme_fade.ogg" },
      { name: "Filmspotting", art: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/bd/8c/05/bd8c05d9-fd70-e35f-da50-f3d67256d648/mza_6805140787842707960.jpg/300x300bb.webp", episode: "#437: Iron Man 3", audio: "https://api.mymantl.app/storage/v1/object/public/banners/audio_Filmspotting%20(1).ogg" },
    ],
  },
  {
    title: "Barbie",
    logo: "https://image.tmdb.org/t/p/original/nsMnkuWIZCBxkBLPi0ZXuRloYL2.png",
    backdrop: "https://image.tmdb.org/t/p/w780/3N5QNUqS76GFYNoEayfkkJyAyTN.jpg",
    podcasts: [
      { name: "Pop Culture Happy Hour", art: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/29/ca/0b/29ca0bf1-aa5b-3da8-9be0-f357793116a7/mza_16337213754400532987.jpg/300x300bb.webp", episode: "Barbie", audio: "https://api.mymantl.app/storage/v1/object/public/banners/audio_PCHH.ogg" },
      { name: "The Big Picture", art: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/73/12/f9/7312f903-6bdd-344f-5f5f-ccded1d6a6b9/mza_265011236225794238.jpg/300x300bb.webp", episode: "The 'Barbie' Bonanza", audio: "https://api.mymantl.app/storage/v1/object/public/banners/audio_BigPicture.ogg" },
    ],
  },
  {
    title: "Alien",
    logo: "https://image.tmdb.org/t/p/original/lTXB6JCQ0k8kBcDIwZXuR6orx1w.png",
    backdrop: "https://image.tmdb.org/t/p/w780/AmR3JG1VQVxU8TfAvljUhfSFUOx.jpg",
    podcasts: [
      { name: "The Rewatchables", art: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/d0/b2/86/d0b286b1-c111-4346-18ab-8c1632551a41/mza_18001309740433796361.jpg/300x300bb.webp", episode: "Alien", audio: "https://api.mymantl.app/storage/v1/object/public/banners/audio_Rewatchables.ogg" },
      { name: "Film Junk", art: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts126/v4/3c/7c/bb/3c7cbbce-5847-c26c-f3c5-04cbd9e88e5e/mza_18038029828846701875.jpg/300x300bb.webp", episode: "Film Junk Podcast: Alien", audio: "https://api.mymantl.app/storage/v1/object/public/banners/audio_FilmJunk.ogg" },
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
  const [tfSelected, setTfSelected] = useState(new Set());
  const [tfLocked, setTfLocked] = useState(false);

  // ── Play button demo state ───────────────────────────────
  const [demoPickerIdx, setDemoPickerIdx] = useState(null);
  const [demoPodcast, setDemoPodcast] = useState(null);
  const [demoPlaying, setDemoPlaying] = useState(false);
  const [demoBuffering, setDemoBuffering] = useState(false);
  const [flippedCards, setFlippedCards] = useState(new Set());
  const demoAudioRef = useRef(null);
  const demoTimerRef = useRef(null);

  const stopDemoAudio = () => {
    clearTimeout(demoTimerRef.current);
    if (demoAudioRef.current) { demoAudioRef.current.pause(); demoAudioRef.current = null; }
    setDemoPlaying(false);
    setDemoBuffering(false);
  };

  useEffect(() => () => stopDemoAudio(), []);
  const toggleDemoPicker = (idx) => { setDemoPickerIdx(prev => prev === idx ? null : idx); };

  const handleDemoPlay = (podcast, movieIdx) => {
    // Toggle pause/play if tapping the same podcast
    if (demoAudioRef.current && demoPodcast?.name === podcast.name && demoPodcast?._movieIdx === movieIdx) {
      if (demoPlaying) {
        demoAudioRef.current.pause();
        setDemoPlaying(false);
        clearTimeout(demoTimerRef.current);
      } else {
        demoAudioRef.current.play().catch(() => {});
        setDemoPlaying(true);
      }
      return;
    }

    stopDemoAudio();
    setDemoPodcast({ ...podcast, _movieIdx: movieIdx });
    setDemoPickerIdx(null);
    if (podcast.audio) {
      const audio = new Audio(podcast.audio);
      audio.volume = 0.8;
      demoAudioRef.current = audio;
      setDemoBuffering(true);

      audio.addEventListener("canplay", () => {
        setDemoBuffering(false);
        setDemoPlaying(true);
      }, { once: true });

      audio.play().catch(() => { setDemoBuffering(false); });

      // Fade out at 13s, stop at 15s
      demoTimerRef.current = setTimeout(() => {
        let vol = 0.8;
        const fade = setInterval(() => {
          vol -= 0.1;
          if (vol <= 0) {
            clearInterval(fade);
            audio.pause();
            demoAudioRef.current = null;
            setDemoPlaying(false);
          } else {
            audio.volume = Math.max(0, vol);
          }
        }, 200);
      }, 13000);

      audio.addEventListener("ended", () => {
        clearTimeout(demoTimerRef.current);
        demoAudioRef.current = null;
        setDemoPlaying(false);
      }, { once: true });
    }
  };

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
          <div style={{ color: t.textPrimary, fontSize: '1rem', fontWeight: 600, marginBottom: 2,
            fontFamily: t.fontDisplay, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Enter your code
          </div>
          <div style={{ color: t.textSecondary, fontSize: '0.82rem', lineHeight: 1.5, marginBottom: 8,
            fontFamily: t.fontDisplay, fontStyle: 'italic' }}>
            We sent a code to <strong style={{ color: t.textPrimary, fontStyle: 'normal' }}>{email}</strong>
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
              fontFamily: t.fontMono, fontWeight: 600 }}
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
          <div style={{ color: t.textSecondary, fontSize: '0.82rem',
            fontFamily: t.fontDisplay, fontStyle: 'italic' }}>
            Creating account for <strong style={{ color: t.textPrimary, fontStyle: 'normal' }}>{email}</strong>
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
        {usePassword && (
          <button
            className="landing-email-back"
            onClick={() => { setEmailStep('signup'); setEmailError(null); }}
          >
            New here? Create an account
          </button>
        )}
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
          <div className="mantl-feature-title">Tap Any Movie</div>
          <div className="mantl-feature-desc">
            See which podcasts covered it. Pick a show. Listen.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {DEMO_PLAY_MOVIES.map((movie, idx) => {
              const isFlipped = flippedCards.has(idx);
              return (
                <div key={idx} className="flip-card-wrap">
                  <div
                    className={`flip-card-inner${isFlipped ? ' flipped' : ''}`}
                    onClick={() => {
                      if (!isFlipped) {
                        setFlippedCards(prev => new Set([...prev, idx]));
                      }
                    }}
                  >
                    {/* ── FRONT: backdrop + logo ── */}
                    <div className="flip-card-front">
                      <img src={movie.backdrop} loading="lazy" alt="" style={{
                        position: "absolute", inset: 0, width: "100%", height: "100%",
                        objectFit: "cover", objectPosition: "center top",
                      }} />
                      {/* Gradient overlay */}
                      <div style={{
                        position: "absolute", inset: 0,
                        background: "linear-gradient(180deg, rgba(15,13,11,0.3) 0%, rgba(15,13,11,0.6) 60%, rgba(15,13,11,0.85) 100%)",
                      }} />
                      {/* Logo */}
                      <div style={{
                        position: "absolute", inset: 0,
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        padding: 16,
                      }}>
                        <img
                          src={movie.logo} alt={movie.title} crossOrigin="anonymous"
                          style={{ maxHeight: 60, maxWidth: "70%", objectFit: "contain", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.7))" }}
                          onError={(e) => { e.target.style.display = "none"; if (e.target.nextSibling) e.target.nextSibling.style.display = "block"; }}
                        />
                        <div style={{ display: "none", fontFamily: t.fontSerif, fontWeight: 700, fontSize: 28, color: t.textPrimary, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>{movie.title}</div>
                      </div>
                      {/* Headphones icon + tap hint */}
                      <div style={{
                        position: "absolute", bottom: 10, left: 0, right: 0,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                        </svg>
                        <span style={{ fontSize: 9, fontFamily: t.fontMono, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          tap to flip
                        </span>
                      </div>
                    </div>

                    {/* ── BACK: podcasts ── */}
                    <div className="flip-card-back" onClick={(e) => e.stopPropagation()}>
                      <div style={{
                        fontSize: 10, fontWeight: 600, color: t.textSecondary,
                        fontFamily: t.fontMono, textTransform: "uppercase",
                        letterSpacing: "0.08em", marginBottom: 6,
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                      }}>
                        <span>{movie.title} — covered by</span>
                        <span
                          onClick={(e) => { e.stopPropagation(); setFlippedCards(prev => { const n = new Set(prev); n.delete(idx); return n; }); }}
                          style={{ cursor: "pointer", color: t.textMuted, fontSize: 12, padding: "0 2px" }}
                        >✕</span>
                      </div>
                      {movie.podcasts.map((p, i) => {
                        const isThisPlaying = demoPlaying && demoPodcast?.name === p.name && demoPodcast?._movieIdx === idx;
                        const isThisBuffering = demoBuffering && demoPodcast?.name === p.name && demoPodcast?._movieIdx === idx;
                        return (
                          <div key={i} className="flip-card-back-row">
                            <img className="flip-card-back-art" src={p.art} loading="lazy" alt={p.name} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="flip-card-back-name">{p.episode}</div>
                              <div className="flip-card-back-ep">{p.name}</div>
                            </div>
                            {p.audio && (
                              <div
                                className={`flip-card-play-btn${isThisPlaying || isThisBuffering ? ' active' : ''}`}
                                onClick={(e) => { e.stopPropagation(); handleDemoPlay(p, idx); }}
                              >
                                {isThisBuffering ? (
                                  <div style={{
                                    width: 12, height: 12,
                                    border: "2px solid #C75B3F",
                                    borderTopColor: "transparent",
                                    borderRadius: "50%",
                                    animation: "demoSpin 0.8s linear infinite",
                                  }} />
                                ) : (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill={isThisPlaying ? "#C75B3F" : t.textMuted}>
                                    {isThisPlaying
                                      ? <><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>
                                      : <path d="M8 5v14l11-7z" />
                                    }
                                  </svg>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flip-nudge">tap a movie to see who covered it</div>
        </div>

        {/* ── 1. TRACK — Communities + Badges ──────────────────── */}
        <div
          className={`mantl-feature-block${visibleBlocks.has('track') ? ' visible' : ''}`}
          data-block="track"
        >
          <div className="mantl-feature-label">Track</div>
          <div className="mantl-feature-title">Join a Community</div>
          <div className="mantl-feature-desc">
            Your favorite podcasts get their own home — with miniseries,
            progress tracking, and badges to earn along the way.
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
                  style={{ transitionDelay: visibleBlocks.has('track') ? `${i * 0.12}s` : '0s' }}
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

          {/* Badges — inline under communities */}
          <div style={{
            marginTop: 18,
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          }}>
            <div style={{
              fontFamily: t.fontDisplay,
              textTransform: 'uppercase', letterSpacing: '0.04em',
              fontSize: '0.95rem', fontWeight: 700, color: t.textPrimary,
              marginBottom: 4,
            }}>Earn Badges</div>
            <div className="tap-hint" style={{ animation: 'none', margin: 0 }}>tap to reveal</div>
          </div>
          <div style={{
            fontFamily: t.fontDisplay,
            fontSize: '0.82rem', color: t.textSecondary, lineHeight: 1.5,
            marginBottom: 12,
          }}>
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
                    <img className="badge-front-art" src={badge.art} loading="lazy" alt="" />
                    <span className="badge-front-q">?</span>
                  </div>
                  <div className="badge-back" style={{ borderColor: badge.color + '44' }}>
                    <div className="badge-back-backdrop" style={{ backgroundImage: `url(${badge.backdrop})` }} />
                    <div className="badge-back-backdrop-overlay" style={{ background: `radial-gradient(circle at center, ${badge.bg} 0%, rgba(15,13,11,0.85) 100%)` }} />
                    <img className="badge-back-art" src={badge.art} loading="lazy" alt={badge.name} style={{ borderColor: badge.color + '66' }} />
                    <span className="badge-back-name" style={{ color: badge.color }}>{badge.name}</span>
                    <span className="badge-back-flair" style={{ color: badge.color }}>{badge.sub}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 2. TRIPLE FEATURE — Daily Puzzle ────────────────── */}
        <div
          className={`mantl-feature-block${visibleBlocks.has('triplefeature') ? ' visible' : ''}`}
          data-block="triplefeature"
          style={{ transitionDelay: '0.1s' }}
        >
          <div className="mantl-feature-label">New Puzzles Every Day</div>
          <div className="mantl-feature-title">Triple Feature</div>
          <div className="mantl-feature-desc">
            Pick the 3 highest grossing films. Original domestic gross — not adjusted for inflation.
          </div>
          <div className="tf-demo">
            {(() => {
              // Compute gross rank for each movie (1 = highest grossing)
              const grossRanks = TF_DEMO_MOVIES.map((m, i) => ({ idx: i, gross: m.gross }));
              grossRanks.sort((a, b) => b.gross - a.gross);
              const rankMap = {};
              grossRanks.forEach((m, rank) => { rankMap[m.idx] = rank + 1; });
              // Top 3 grossing = optimal picks
              const optimalSet = new Set(grossRanks.slice(0, 3).map(m => m.idx));
              const optimalTotal = grossRanks.slice(0, 3).reduce((s, m) => s + m.gross, 0);

              const arr = Array.from(tfSelected);
              const userTotal = arr.reduce((s, i) => s + TF_DEMO_MOVIES[i].gross, 0);
              const isPerfect = userTotal === optimalTotal;
              const pct = optimalTotal > 0 ? Math.round((userTotal / optimalTotal) * 100) : 0;

              const flavorText = isPerfect ? "Perfect triple. You nailed it."
                : pct >= 95 ? "So close to the top."
                : pct >= 85 ? "Solid instincts."
                : pct >= 75 ? "Not bad — left a little on the table."
                : pct >= 60 ? "Rough night at the box office."
                : "Oof. Better luck tomorrow.";

              return (
                <>
                  <div className="tf-grid">
                    {TF_DEMO_MOVIES.map((movie, idx) => {
                      const sel = tfSelected.has(idx);
                      const rank = rankMap[idx];
                      const isTop3 = tfLocked && rank <= 3;
                      return (
                        <div
                          key={idx}
                          className={`tf-card${sel ? ' selected' : ''}${tfLocked ? ' locked' : ''}${isTop3 ? ' optimal' : ''}`}
                          onClick={() => {
                            if (tfLocked) return;
                            const next = new Set(tfSelected);
                            if (next.has(idx)) next.delete(idx);
                            else if (next.size < 3) next.add(idx);
                            setTfSelected(next);
                          }}
                        >
                          <div style={{ position: 'relative' }}>
                            <img className="tf-card-poster" src={movie.poster} alt={movie.title} loading="lazy" />
                            {sel && !tfLocked && <div className="tf-card-check">✓</div>}
                            {tfLocked && <div className={`tf-card-rank${!isTop3 ? ' rank-dim' : ''}`}>#{rank}</div>}
                            {tfLocked && (
                              <div className="tf-card-gross">
                                <div className={`tf-card-gross-val${isTop3 && !sel ? ' optimal-val' : ''}${!isTop3 && !sel ? ' dim-val' : ''}`}>${movie.gross}M</div>
                              </div>
                            )}
                          </div>
                          <div className="tf-card-info">
                            <div className="tf-card-title" style={isTop3 && sel ? { color: t.green } : isTop3 && !sel ? { color: t.green } : undefined}>{movie.title}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {!tfLocked ? (
                    <div>
                      <div className="tf-prompt">
                        {tfSelected.size === 0 && "Pick 3 movies"}
                        {tfSelected.size === 1 && "Pick 2 more"}
                        {tfSelected.size === 2 && "Pick 1 more"}
                        {tfSelected.size === 3 && "Ready to lock in!"}
                      </div>
                      <button
                        className="tf-lock-btn"
                        onClick={() => tfSelected.size === 3 && setTfLocked(true)}
                        style={{
                          background: tfSelected.size === 3 ? 'linear-gradient(135deg,#d4af37,#f4d03f)' : 'rgba(255,255,255,0.05)',
                          color: tfSelected.size === 3 ? '#0a0a0f' : t.textFaint,
                          cursor: tfSelected.size === 3 ? 'pointer' : 'not-allowed',
                        }}
                      >Lock It In</button>
                    </div>
                  ) : (
                    <div className="tf-result">
                      <div className="tf-result-rank" style={{
                        color: isPerfect ? t.gold : pct >= 90 ? t.cream : t.textMuted,
                      }}>${userTotal}M<span style={{ fontSize: '0.9rem', color: t.textMuted }}>/${optimalTotal}M</span></div>
                      <div className="tf-result-diff" style={{
                        color: isPerfect ? t.gold : pct >= 90 ? t.green : pct >= 75 ? '#f59e0b' : t.red,
                        fontStyle: 'italic',
                      }}>
                        {flavorText}
                      </div>
                      {!isPerfect && (
                        <div className="tf-result-sub" style={{ marginTop: 4 }}>
                          Best was ${optimalTotal}M
                        </div>
                      )}
                      <button
                        className="tf-try-again"
                        onClick={() => { setTfSelected(new Set()); setTfLocked(false); }}
                      >Try again</button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        {/* ── 3. SYNC IMPORTS ──────────────────────────────────── */}
        <div
          className={`mantl-feature-block${visibleBlocks.has('sync') ? ' visible' : ''}`}
          data-block="sync"
          style={{ transitionDelay: '0.2s' }}
        >
          <div className="mantl-feature-label">Sync</div>
          <div className="mantl-feature-title">Already Tracking? Import It.</div>
          <div className="mantl-feature-desc">
            Connect your Letterboxd account.
            Your logs sync automatically.
          </div>
          <div className="sync-demo">
            <div className="sync-row">
              <img className="sync-logo" loading="lazy" src="https://a.ltrbxd.com/logos/letterboxd-mac-icon.png" alt="Letterboxd" />
              <div className="sync-info">
                <div className="sync-name">Letterboxd</div>
                <div className="sync-stat">Films & ratings</div>
              </div>
              <div className="sync-badge">Auto-sync</div>
            </div>
            <div className="sync-row">
              <div className="sync-logo-play">
                <svg width="18" height="20" viewBox="0 0 16 18" fill="none">
                  <path d="M2 1.5L14.5 9L2 16.5V1.5Z" fill="#f5f0eb" stroke="#f5f0eb" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="sync-info">
                <div className="sync-name">No Letterboxd? No problem.</div>
                <div className="sync-stat">Log movies right inside the app</div>
              </div>
              <div className="sync-badge" style={{ color: 'rgba(212,175,55,0.8)', background: 'rgba(212,175,55,0.08)', borderColor: 'rgba(212,175,55,0.15)' }}>Built-in</div>
            </div>
          </div>
        </div>

        {/* ── 4. GROWING COMMUNITIES ────────────────────────────── */}
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
                      <img className="podcast-marquee-thumb" src={p.src} loading="lazy" alt={p.name} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="podcast-marquee-row">
                <div className="podcast-marquee-track track-right">
                  {[...PODCAST_ART_ROW2, ...PODCAST_ART_ROW2].map((p, i) => (
                    <div key={`r2-${i}`} className="podcast-marquee-item">
                      <img className="podcast-marquee-thumb" src={p.src} loading="lazy" alt={p.name} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="podcast-marquee-overlay" />
            </div>
            <div className="growing-headline">20+ podcasts<br />and growing</div>
            <div className="growing-sub">
              Every film with coverage gets a play button.
            </div>
            <div className="growing-divider" />
          </div>
        </div>

        {/* ── BOTTOM CTA ───────────────────────────────────────── */}
        <div className="mantl-bottom-cta">
          <button className="btn-primary" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
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
