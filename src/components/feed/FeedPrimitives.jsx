import { useState } from "react";

/**
 * FadeImg — safe image component for mobile/Capacitor.
 * Fades in on load, shows placeholder color until ready.
 */
export function FadeImg({ src, alt = "", style = {}, placeholderColor = "rgba(30,22,14,0.9)", onLoad, onError, loading = "lazy", ...rest }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleLoad = (e) => { setLoaded(true); onLoad?.(e); };
  const handleError = (e) => { setFailed(true); onError?.(e); };

  if (failed || !src) return null;

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      onLoad={handleLoad}
      onError={handleError}
      style={{
        ...style,
        background: loaded ? undefined : placeholderColor,
        opacity: loaded ? 1 : 0,
        transition: loaded ? "opacity 0.2s ease" : "none",
      }}
      {...rest}
    />
  );
}
