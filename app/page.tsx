"use client";

import { useEffect, useRef } from "react";
import LaceSection from "./components/LaceSection";

const SWORD_CURSOR =
  "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"32\" height=\"32\" viewBox=\"0 0 32 32\"><path d=\"M16 2 L16 19\" stroke=\"white\" stroke-width=\"1.6\" fill=\"none\"/><path d=\"M8 19 L24 19\" stroke=\"white\" stroke-width=\"1.6\" fill=\"none\"/><path d=\"M16 19 L16 25\" stroke=\"white\" stroke-width=\"2.2\" fill=\"none\"/><circle cx=\"16\" cy=\"27\" r=\"1.8\" fill=\"white\"/></svg>') 16 2, crosshair";

export default function Home() {
  const stageRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const touchedRef = useRef(false);
  const rafRef = useRef<number | null>(null);

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
        <span>the new</span>
        <span>ritual.</span>
      </div>

      <div className="darkness">
        <div className="layer" />
      </div>

      <nav>
        <div className="mark" aria-hidden="true">
          <svg viewBox="0 0 100 100" fill="none" stroke="#cfc9c8" strokeWidth={2.2}>
            <path d="M20 70 Q15 50 25 35 Q30 20 45 18 Q55 15 60 22 Q68 20 72 28 Q80 30 78 40 Q85 45 80 52 Q84 60 76 62 Q78 70 68 70 Q65 78 55 74 Q48 80 40 74 Q28 78 20 70 Z" />
            <path d="M35 45 Q38 42 42 45" />
            <circle cx="38" cy="38" r="1.4" fill="#cfc9c8" />
          </svg>
        </div>
        <div className="links">
          <a href="#story">our story</a>
          <a href="#visuals">visuals</a>
          <a href="#contact">contact</a>
        </div>
      </nav>

      <footer>move your cursor to part the dark</footer>
      <div className="intro-cover" ref={introRef} />

      <style jsx>{`
        .stage {
          position: relative;
          width: 100vw;
          height: 100vh;
          height: 100dvh;
          overflow: hidden;
          cursor: ${SWORD_CURSOR};
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
          width: 26px;
          height: 26px;
          opacity: 0.85;
        }
        .mark svg {
          width: 100%;
          height: 100%;
          display: block;
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
          padding: 20px 0 calc(18px + env(safe-area-inset-bottom, 0px));
          color: #5c5555;
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

        @media (prefers-reduced-motion: reduce) {
          .darkness .layer {
            animation: none;
          }
        }
      `}</style>
    </div>
    <LaceSection />
    </>
  );
}