"use client";

import { useEffect, useRef, useState } from "react";

// Silent looping product demo for the homepage. Picks the light or dark version to match the
// visitor's theme, and shows a still image instead for people who prefer reduced motion.
export default function HeroDemo() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [still, setStill] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const dark = window.matchMedia("(prefers-color-scheme: dark)");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { setTheme(dark.matches ? "dark" : "light"); setStill(calm.matches); };
    sync();
    dark.addEventListener("change", sync); calm.addEventListener("change", sync);
    return () => { dark.removeEventListener("change", sync); calm.removeEventListener("change", sync); };
  }, []);

  useEffect(() => { ref.current?.load(); ref.current?.play().catch(() => {}); }, [theme]);

  const poster = `/media/stack-demo-${theme}.jpg`;
  const label = "Track My Stack in action: live value at spot, spreadsheet import, junk silver by face value, and export to Excel";
  return still ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="hero-demo" src={poster} alt={label} />
  ) : (
    <video ref={ref} className="hero-demo" src={`/media/stack-demo-${theme}.mp4`} poster={poster}
      autoPlay muted loop playsInline preload="auto" aria-label={label} />
  );
}
