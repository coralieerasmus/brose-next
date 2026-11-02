"use client";

import { useEffect, useState } from "react";

/**
 * Black cover that is present in the server-rendered HTML (styled by
 * globals.css, so it paints on frame one). Once React has hydrated, fonts
 * are ready and two frames have painted — meaning the hero's styled-jsx
 * styles are applied — it fades out and unmounts.
 *
 * The hero's own black `.intro-cover` sits underneath and continues the
 * reveal, so the hand-off is seamless.
 */
export default function Preloader() {
  const [done, setDone] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const finish = () => {
      if (cancelled) return;
      // two rAFs: make sure the styled hero has actually painted underneath
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (!cancelled) setDone(true);
        })
      );
    };

    const fontsReady: Promise<unknown> =
      typeof document !== "undefined" && document.fonts?.ready
        ? document.fonts.ready
        : Promise.resolve();
    // cap the wait so a slow font can never hold the site hostage
    const cap = new Promise((r) => setTimeout(r, 2500));
    Promise.race([fontsReady, cap]).then(finish);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setGone(true), 700);
    return () => clearTimeout(t);
  }, [done]);

  if (gone) return null;
  return (
    <div
      className={`site-preload${done ? " is-done" : ""}`}
      aria-hidden="true"
    />
  );
}