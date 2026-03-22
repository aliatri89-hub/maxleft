/**
 * HeroBanner — background layer for community hero sections.
 *
 * Renders either:
 *   - A banner image with gradient overlay (when bannerUrl is provided)
 *   - A plain dark gradient fallback (when no banner)
 *
 * All banner display options (contain vs cover, position, opacity) are
 * driven by the community's theme_config tab_heroes entry.
 *
 * Props:
 *   bannerUrl         — image URL or null
 *   contain           — bool, use object-fit: contain instead of cover
 *   position          — CSS object-position string (default: "center center")
 *   opacity           — banner image opacity (default: 0.6)
 *   gradientStrength  — 0–1 multiplier for the dark overlay (default: 1.0)
 *                       0 = no overlay, 0.5 = half strength, 1 = full default
 */
export default function HeroBanner({ bannerUrl, contain = false, position = "center center", opacity = 0.6, gradientStrength = 1.0 }) {
  if (!bannerUrl) {
    return (
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, #0f0d0b 0%, #0a0906 100%)",
      }} />
    );
  }

  return (
    <>
      <img
        src={bannerUrl}
        alt=""
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: contain ? "contain" : "cover",
          objectPosition: position,
          opacity,
        }}
      />
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(180deg, rgba(15,13,11,${0.3 * gradientStrength}) 0%, rgba(15,13,11,${0.65 * gradientStrength}) 50%, rgba(15,13,11,${gradientStrength}) 100%)`,
      }} />
    </>
  );
}
