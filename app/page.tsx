"use client";

import { useEffect, useRef, useState } from "react";
import BottleRitual from "./components/BottleRitual";

export default function Home() {
  const stageRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const touchedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const [hint, setHint] = useState("move your cursor to part the dark");

  useEffect(() => {
    const stage = stageRef.current;
    const intro = introRef.current;
    if (!stage || !intro) return;

    const setPos = (x: number, y: number) => {
      stage.style.setProperty("--mx", `${x}px`);
      stage.style.setProperty("--my", `${y}px`);
    };

    const handlePointerMove = (e: PointerEvent) => {
      touchedRef.current = true;
      setPos(e.clientX, e.clientY);
    };
    const handlePointerLeave = () => {
      setPos(window.innerWidth * 0.5, window.innerHeight * 0.4);
    };

    stage.addEventListener("pointermove", handlePointerMove);
    stage.addEventListener("pointerleave", handlePointerLeave);

    // ---- mobile: no hover state, so tilting the phone drives the reveal ----
    const isCoarsePointer =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      touchedRef.current = true;
      const gamma = Math.max(-45, Math.min(45, e.gamma)); // left/right tilt
      const beta = Math.max(0, Math.min(90, e.beta)); // front/back tilt
      const x = window.innerWidth * (0.5 + gamma / 90);
      const y = window.innerHeight * (0.15 + (beta / 90) * 0.7);
      setPos(x, y);
    };

    const enableOrientation = () => {
      const DeviceOrientationEventTyped = window.DeviceOrientationEvent as
        | (typeof DeviceOrientationEvent & {
            requestPermission?: () => Promise<"granted" | "denied">;
          })
        | undefined;
      if (!DeviceOrientationEventTyped) return;

      if (typeof DeviceOrientationEventTyped.requestPermission === "function") {
        // iOS 13+: must be called from within a user gesture to succeed.
        DeviceOrientationEventTyped.requestPermission()
          .then((state) => {
            if (state === "granted") {
              window.addEventListener("deviceorientation", handleOrientation);
            }
          })
          .catch(() => {
            /* denied, or called outside a gesture — falls back to touch-drag / idle drift */
          });
      } else {
        // Android and everything else: no permission prompt needed.
        window.addEventListener("deviceorientation", handleOrientation);
      }
    };

    if (isCoarsePointer) {
      setHint("touch and move — or tilt your phone — to part the dark");
      enableOrientation(); // works immediately on non-iOS
      stage.addEventListener("pointerdown", enableOrientation, { once: true }); // satisfies iOS's gesture requirement
    }

    // initial position, before the intro reveals anything
    setPos(window.innerWidth * 0.5, window.innerHeight * 0.4);

    let t = 0;
    const idle = () => {
      if (!touchedRef.current) {
        t += 0.006;
        const x = window.innerWidth * (0.5 + 0.12 * Math.sin(t));
        const y = window.innerHeight * (0.42 + 0.08 * Math.cos(t * 0.8));
        setPos(x, y);
      }
      rafRef.current = requestAnimationFrame(idle);
    };

    const introTimer = setTimeout(() => {
      intro.classList.add("hide");
      idle();
    }, 2000);

    return () => {
      stage.removeEventListener("pointermove", handlePointerMove);
      stage.removeEventListener("pointerleave", handlePointerLeave);
      stage.removeEventListener("pointerdown", enableOrientation);
      window.removeEventListener("deviceorientation", handleOrientation);
      clearTimeout(introTimer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <>
    <div className="stage" ref={stageRef}>
      <div className="base" />
      <div className="glow" />
      <div className="grid" />

      <div className="content">
        <span>Brosé,</span>
        <span>the ne</span>
        <span>ritual.</span>
      </div>

      <div className="darkness">
        <div className="layer" />
      </div>

      <nav>
        <div className="mark" aria-hidden="true">
          <img src="/images/griff.png" alt="griffindor" />


        </div>
        <div className="links">
          <a
            href="#ritual-wrap"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById("ritual-wrap");
              if (el) window.scrollTo({ top: el.offsetTop, behavior: "smooth" });
            }}
          >
            visuals
          </a>
          <a
            href="#ritual-wrap"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById("ritual-wrap");
              if (!el) return;
              // Lands just past the point where the rotation phase
              // completes — the pinned cinematic (fall/word/wave/cards)
              // then plays out on its own from there, same as scrolling
              // there by hand, ending on the cards.
              const target = el.offsetTop + el.offsetHeight - window.innerHeight + 60;
              window.scrollTo({ top: target, behavior: "smooth" });
            }}
          >
            our story
          </a>
        </div>
      </nav>

      <footer>{hint}</footer>
      <div className="intro-cover" ref={introRef} />

      <style jsx>{`
        .stage {
          position: relative;
          width: 100vw;
          height: 100vh;
          height: 100dvh;
          overflow: hidden;
          touch-action: pan-y; /* was "none", which blocked ALL touch gestures including the vertical swipe needed to scroll past this section — pan-y allows vertical scroll while still suppressing horizontal drag/pinch */
        }

        .base {
          position: absolute;
          inset: 0;
          background: #08070a;
          z-index: 0;
        }

        .glow {
          position: absolute;
          inset: 0;
          z-index: 1;
          background: radial-gradient(
            ellipse 68% 58% at 50% 46%,
            #ff2b2b 0%,
            #d4111c 34%,
            #7a0812 60%,
            transparent 78%
          );
          filter: blur(34px) saturate(115%);
          opacity: 0.95;
        }

        .grid {
          position: absolute;
          inset: 0;
          z-index: 1;
          background-image: linear-gradient(
              to right,
              rgba(0, 0, 0, 0.35) 1px,
              transparent 1px
            ),
            linear-gradient(to bottom, rgba(0, 0, 0, 0.35) 1px, transparent 1px);
          background-size: 80px 80px;
          mix-blend-mode: multiply;
          opacity: 0.5;
        }

        nav {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          z-index: 6;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: env(safe-area-inset-top, 0px) 42px 0 42px;
          padding-top: calc(env(safe-area-inset-top, 0px) + 26px);
        }
        .mark {
          width: 20px;
          height: 20px;
          opacity: 0.85;
          flex-shrink: 0;
        }
        .mark svg {
          width: 100%;
          height: 100%;
          display: block;
        }
          .mark img {
          width:70px;
          height:50px;
          display:block;
        }
        .links {
          display: flex;
          gap: 34px;
        }
        .links a {
          color: #cfc9c8;
          text-decoration: none;
          font-size: 15px;
          letter-spacing: 0.02em;
          opacity: 0.8;
          cursor: pointer;
          transition: opacity 0.25s ease;
          white-space: nowrap;
        }
        .links a:hover {
          opacity: 1;
        }

        .content {
          position: absolute;
          inset: 0;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          line-height: 0.86;
          padding: 0 6vw;
          opacity: 0.9;
        }
          
        .content :global(span) {
          display: block;
          font-family: var(--font-respira-black), serif;
          font-weight: 400;
          color: #0c0407;
          text-shadow: 0 0 40px rgba(255, 40, 40, 0.15);
          font-size: clamp(64px, 15vw, 168px);
        }

        .darkness {
          position: absolute;
          inset: -10%;
          z-index: 4;
          -webkit-mask-image: radial-gradient(
            circle at var(--mx) var(--my),
            transparent 0,
            transparent 70px,
            black 300px
          );
          mask-image: radial-gradient(
            circle at var(--mx) var(--my),
            transparent 0,
            transparent 70px,
            black 300px
          );
        }
        .darkness .layer {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 22% 30%, #000 0%, transparent 42%),
            radial-gradient(circle at 78% 62%, #000 0%, transparent 46%),
            radial-gradient(circle at 50% 85%, #000 0%, transparent 50%),
            radial-gradient(circle at 65% 15%, #050505 0%, transparent 40%),
            #030202;
          background-size: 180% 180%, 200% 200%, 220% 220%, 160% 160%, 100% 100%;
          animation: drift 34s ease-in-out infinite alternate;
          filter: blur(6px);
        }

        @keyframes drift {
          0% {
            background-position: 10% 20%, 80% 70%, 40% 90%, 60% 10%, 0 0;
          }
          50% {
            background-position: 40% 60%, 55% 30%, 65% 55%, 30% 45%, 0 0;
          }
          100% {
            background-position: 75% 35%, 25% 65%, 55% 20%, 70% 75%, 0 0;
          }
        }

        footer {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 6;
          text-align: center;
          padding: 20px 16px calc(18px + env(safe-area-inset-bottom, 0px));
          color: #E9E5DA;
          font-size: 12px;
          letter-spacing: 0.04em;
          opacity: 0.6;
        }

        .intro-cover {
          position: absolute;
          inset: 0;
          z-index: 10;
          background: #000;
          opacity: 1;
          pointer-events: none;
          transition: opacity 1.4s ease;
        }
        .intro-cover.hide {
          opacity: 0;
        }

        @media (max-width: 480px) {
          nav {
            padding-left: 20px;
            padding-right: 20px;
          }
          .links {
            gap: 16px;
          }
          .links a {
            font-size: 12px;
          }
          footer {
            font-size: 11px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .darkness .layer {
            animation: none;
          }
        }
      `}</style>
    </div>
    <BottleRitual />
    </>
  );
}