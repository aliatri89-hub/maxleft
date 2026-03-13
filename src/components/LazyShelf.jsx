import { useState, useEffect, useRef } from "react";

function LazyShelf({ children, skeleton, style }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" } // start rendering 200px before scrolling into view
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div ref={ref} style={style}>
      {visible ? children : skeleton}
    </div>
  );
}

export default LazyShelf;
