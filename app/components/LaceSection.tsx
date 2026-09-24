"use client";

import { useEffect, useRef } from "react";
import BottleScroll from "./BottleScroll";

export default function LaceSection() {
  const sectionRef = useRef<HTMLElement>(null);

  // Fades the section's own background from black to red as it's scrolled
  // into view (real background-color, not an overlay layered on top).
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const COLOR_A = { r: 0x08, g: 0x07, b: 0x0a }; // near-black
    const COLOR_B = { r: 0xd2, g: 0x14, b: 0x14 }; // section red

    const lerpColor = (t: number) => {
      const r = Math.round(COLOR_A.r + (COLOR_B.r - COLOR_A.r) * t);
      const g = Math.round(COLOR_A.g + (COLOR_B.g - COLOR_A.g) * t);
      const b = Math.round(COLOR_A.b + (COLOR_B.b - COLOR_A.b) * t);
      return `rgb(${r}, ${g}, ${b})`;
    };

    const update = () => {
      const rect = section.getBoundingClientRect();
      const fadeDistance = window.innerHeight * 0.9;
      const t =
        rect.top <= 0
          ? 1
          : Math.max(0, Math.min(1, (window.innerHeight - rect.top) / fadeDistance));
      section.style.backgroundColor = lerpColor(t);
    };

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <section id="lace-section" ref={sectionRef}>
      <img className="lion" src="/images/lion.png" alt="" aria-hidden="true" />

      <div className="mat">
        <img id="lace-start" src="/images/lace.png" alt="" />
      </div>

      {/* Swords behind the second mat, the same way the lion sits behind
          the first — but built with grid stacking instead of absolute
          positioning, since that turned out to be more reliable here. */}
      <div className="mat-end-stack">
        <img className="swords" src="/images/swords.png" alt="" aria-hidden="true" />
        <div className="mat mat-end">
          <img id="lace-end" src="/images/lace.png" alt="" />
        </div>
      </div>

      <BottleScroll />

      <style jsx>{`
        section {
          position: relative;
          background: #08070a; /* JS fades this to red as the section is entered */
          min-height: 220vh;
          min-height: 220dvh; /* mobile browser chrome makes plain vh unreliable */
          overflow: hidden;
          padding: 12vh 0 16vh;
        }
        .lion {
          position: absolute;
          left: 50%;
          top: 3vh;
          width: 100%; /* not 100vw — that includes the scrollbar's width and
                           was pushing the page wide enough to scroll horizontally */
          max-width: 1100px;
          transform: translateX(-50%);
          opacity: 0.9;
          mix-blend-mode: multiply;
          z-index: 0; /* behind the first lace mat */
        }
        .mat {
          position: relative;
          z-index: 1;
          width: min(1000px, 78vw);
          margin: 0 auto;
        }
        .mat img {
          display: block;
          width: 100%;
          height: auto;
        }
        /* Both children below sit in the SAME single grid cell (grid-area:
           1 / 1), so the swords is guaranteed to be positioned against the
           second mat's actual box — no percentage/margin math that can
           silently drift, the same guarantee position: absolute gives the
           lion, just without needing to know the mat's exact position up
           front. */
        .mat-end-stack {
          display: grid;
          width: min(1000px, 78vw);
          margin: 16vh auto 0;
        }
        .mat-end-stack > * {
          grid-area: 1 / 1;
        }
        .mat-end-stack .mat-end {
          width: 100%;
        }
        .swords {
          z-index: 0; /* behind .mat-end, which is z-index: 1 */
          align-self: start;
          justify-self: center;
          width: 55%;
          transform: translateY(-45%); /* how much pokes out above the mat's top edge */
          opacity: 0.9;
          mix-blend-mode: multiply;
          pointer-events: none;
        }
      `}</style>
    </section>
  );
}