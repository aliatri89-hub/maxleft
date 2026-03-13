import { decodePolyline } from "../utils/strava";

const StravaRouteMap = ({ polyline }) => {
  const points = decodePolyline(polyline);
  if (points.length < 2) return null;
  const lats = points.map(p => p[0]);
  const lngs = points.map(p => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const pad = 0.12;
  const w = (maxLng - minLng) || 0.001, h = (maxLat - minLat) || 0.001;
  const scale = (p) => [
    ((p[1] - minLng) / w) * (1 - pad * 2) + pad,
    (1 - (p[0] - minLat) / h) * (1 - pad * 2) + pad,
  ];
  const pathD = points.map((p, i) => {
    const [x, y] = scale(p);
    return `${i === 0 ? 'M' : 'L'}${(x * 300).toFixed(1)},${(y * 160).toFixed(1)}`;
  }).join(' ');
  const start = scale(points[0]);
  const end = scale(points[points.length - 1]);
  return (
    <svg viewBox="0 0 300 160" className="strava-route-svg" preserveAspectRatio="xMidYMid meet" style={{ background: "#2a2a2a", borderRadius: 8 }}>
      <defs>
        <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4caf50" />
          <stop offset="100%" stopColor="#c4653a" />
        </linearGradient>
        <filter id="routeGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path d={pathD} fill="none" stroke="rgba(196,101,58,0.15)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d={pathD} fill="none" stroke="url(#routeGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#routeGlow)" />
      <circle cx={(start[0] * 300).toFixed(1)} cy={(start[1] * 160).toFixed(1)} r="5" fill="#4caf50" stroke="#2a2a2a" strokeWidth="2" />
      <circle cx={(end[0] * 300).toFixed(1)} cy={(end[1] * 160).toFixed(1)} r="5" fill="#c4653a" stroke="#2a2a2a" strokeWidth="2" />
    </svg>
  );
};

export default StravaRouteMap;
