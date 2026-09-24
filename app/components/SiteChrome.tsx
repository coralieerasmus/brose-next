"use client";

import { useEffect, useRef, useState } from "react";

const AGE_KEY = "brose-age-verified";
const UNDERAGE_REDIRECT = "https://www.youtube.com/watch?v=-XUxWllIpZk";

export default function SiteChrome() {
  // null = "haven't checked localStorage yet" (avoids a hydration
  // mismatch — server always renders nothing, client fills this in
  // right after mount, before anything is painted to the user).
  const [verified, setVerified] = useState<boolean | null>(null);
  const [muted, setMuted] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // The actual bug behind "sends me to the 3D bottle section instead of
    // the landing page": browsers try to restore your exact scroll
    // position on reload by default. Since this site has been scrolled
    // deep into BottleRitual constantly during testing, a refresh was
    // snapping straight back there — nothing to do with the age gate
    // itself, the gate was just overlaying on top of wherever that
    // restoration landed. Both lines below are needed: scrollRestoration
    // stops the browser doing it on future reloads, scrollTo cleans up
    // the current one.
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);

    setVerified(localStorage.getItem(AGE_KEY) === "true");
  }, []);

  useEffect(() => {
    document.body.style.overflow = verified === false ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [verified]);

  const handleYes = () => {
    localStorage.setItem(AGE_KEY, "true");
    setVerified(true);

    // This click is the user gesture browsers require before audio with
    // sound is allowed to play — this is the one moment site-wide that's
    // guaranteed to have one, so audio starts right here.
    const audio = audioRef.current;
    if (audio) {
      audio.muted = false;
      audio.volume = 0.35;
      audio.play().catch(() => {
        // Autoplay can still be refused by some browsers/settings even
        // with a gesture — the mute toggle covers that; it just starts
        // muted instead of failing silently forever.
      });
      setMuted(false);
    }
  };

  const handleNo = () => {
    window.location.href = UNDERAGE_REDIRECT;
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    audio.muted = !audio.muted;
    setMuted(audio.muted);
  };

  return (
    <>
      {/* Swap this src for a track you actually have the rights to use —
          this is just the plumbing (autoplay-after-gesture, loop, mute
          toggle), not an audio file. */}
      <audio ref={audioRef} src="/audio/theme.mp3" loop playsInline muted />

      {verified === false && (
        <div className="age-gate" role="dialog" aria-modal="true">
          <img className="age-gate-mark" src="/images/griff.png" alt="" aria-hidden="true" />
          <h2>Savour responsibly:</h2>
          <p className="age-gate-copy">Are you above the age of 18?</p>
          <div className="age-gate-buttons">
            <button type="button" className="age-gate-btn" onClick={handleYes}>
              yes
            </button>
            <button type="button" className="age-gate-btn" onClick={handleNo}>
              no
            </button>
          </div>
        </div>
      )}

      {verified === true && (
        <button
          type="button"
          className="mute-toggle"
          onClick={toggleMute}
          aria-label={muted ? "Unmute background music" : "Mute background music"}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      )}

      <style jsx>{`
        .age-gate {
          position: fixed;
          inset: 0;
          z-index: 100000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 24px;
          background: #000;
          text-align: center;
        }
        .age-gate-mark {
          width: 84px;
          height: auto;
          opacity: 0.9;
          margin-bottom: 14px;
        }
        .age-gate h2 {
          font-family: "Cormorant", serif;
          font-weight: 700;
          color: #f2ece2;
          font-size: clamp(24px, 4vw, 32px);
          margin: 0;
        }
        .age-gate-copy {
          font-family: "Cormorant", serif;
          font-style: italic;
          color: rgba(242, 236, 226, 0.65);
          font-size: 16px;
          margin: 0 0 30px;
        }
        .age-gate-buttons {
          display: flex;
          gap: 22px;
        }
        .age-gate-btn {
          all: unset;
          box-sizing: border-box;
          cursor: pointer;
          padding: 12px 34px;
          color: #f2ece2;
          font-family: "Cormorant", serif;
          font-size: 16px;
          letter-spacing: 0.03em;
          border: 1.5px dashed #d21414;
          /* slightly irregular radii — reads as hand-drawn rather than a
             perfectly mechanical oval, matching the sketch-line style
             used elsewhere on the site (the sword cursor, the linework) */
          border-radius: 52% 48% 50% 50% / 55% 60% 40% 45%;
          transition: background 0.2s ease;
        }
        .age-gate-btn:hover {
          background: rgba(210, 20, 20, 0.15);
        }

        .mute-toggle {
          all: unset;
          box-sizing: border-box;
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 99997; /* below the age gate, below the grain (9999) — a deliberate site-wide control */
          cursor: pointer;
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.2);
          font-size: 17px;
        }
      `}</style>
    </>
  );
}