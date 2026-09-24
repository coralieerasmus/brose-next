"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

type CardId = "bottle" | "grape" | "pair";

const CARDS: { id: CardId; title: string; body: string }[] = [
  {
    id: "bottle",
    title: "What's in\nthe bottle?",
    body: "Dry rosé made from Grenache, Tempranillo and Syrah. Expect bright strawberry, red cherry and citrus notes with a crisp, clean finish.",
  },
  {
    id: "grape",
    title: "From grape\nto glass",
    body: "Red grapes are gently pressed and kept with their skins to create BROSÉ's signature pale-pink colour. The juice is then cool-fermented to keep it fresh, fruity and crisp.",
  },
  {
    id: "pair",
    title: "Pairs well\nwith…",
    body: "Perfect with grilled meats, pizza, seafood, spicy food and charcuterie. Serve chilled and let the food do the talking.",
  },
];

/**
 * Full sequence, pinned in one viewport-height wrapper:
 *  1. "rotate"  — scroll-driven. Lion + lace mat + bottle are all pinned;
 *     scroll only spins the bottle, a full 360° turntable.
 *  2. "falling" — scroll LOCKS. The bottle (and the camera with it) falls,
 *     tumbling, then lands upright near the bottom of the screen.
 *  3. 2s hold, then "Unbreakable" fills the screen in Respira Black.
 *  4. A slow black wave rises to cover everything.
 *  5. Three cards slide in from both sides — click one to expand it
 *     (accordion: one open at a time). Scroll unlocks once landed.
 *  6. Scrolling back up from the cards reverses the whole cinematic:
 *     cards out -> wave recedes -> word fades -> bottle un-falls -> rotate.
 */
export default function BottleRitual() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null); // lion + lace, faded out at fall-start
  const vignetteRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const backlightRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const cardsGlowRef = useRef<HTMLDivElement>(null);
  const debugRef = useRef<HTMLDivElement>(null); // remove this + SHOW_DEBUG once the sequence is confirmed working

  const [openCard, setOpenCard] = useState<CardId>("bottle");

  useEffect(() => {
    if (
      !wrapRef.current ||
      !pinRef.current ||
      !mountRef.current ||
      !bgRef.current ||
      !vignetteRef.current ||
      !wordRef.current ||
      !backlightRef.current ||
      !waveRef.current ||
      !cardsRef.current ||
      !cardsGlowRef.current ||
      !debugRef.current
    ) {
      return;
    }
    const wrap = wrapRef.current!;
    const pin = pinRef.current!;
    const mount = mountRef.current!;
    const bg = bgRef.current!;
    const vignette = vignetteRef.current!;
    const word = wordRef.current!;
    const backlight = backlightRef.current!;
    const wave = waveRef.current!;
    const cards = cardsRef.current!;
    const cardsGlow = cardsGlowRef.current!;
    const debug = debugRef.current!;
    const SHOW_DEBUG = true; // flip to false (or delete the overlay) once confirmed working

    // ---- three.js setup — perspective camera (not orthographic): the
    // fall needs real depth cues an orthographic projection can't give. ----
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.75;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    let w = window.innerWidth;
    let h = window.innerHeight;
    const BASE_FOV = 32;
    const CAM_DISTANCE = 900;
    const camera = new THREE.PerspectiveCamera(BASE_FOV, w / h, 0.1, 5000);
    camera.position.set(0, 0, CAM_DISTANCE);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(200, 300, 400);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffe3e3, 0.4);
    rim.position.set(-200, -100, 200);
    scene.add(rim);

    const ROUGHNESS_FLOOR = 0.5;
    const ENV_MAP_INTENSITY = 0.5;

    const bottle = new THREE.Group();
    scene.add(bottle);
    let modelReady = false;

    function visibleHalfHeight(fovDeg: number) {
      return CAM_DISTANCE * Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2);
    }
    let restY = 0;
    let landedY = 0;
    function recomputeAnchors() {
      const hh = visibleHalfHeight(BASE_FOV);
      restY = hh * 0.05;
      landedY = -hh * 0.62;
    }
    recomputeAnchors();

    // On a narrow/tall (mobile) viewport, the vertical FOV extent is the
    // same in world units regardless of width — so the bottle ends up
    // occupying a much smaller fraction of a tall phone screen, reading as
    // small and adrift in empty space. Bigger on mobile compensates.
    function getTargetHeight() {
      return window.innerWidth < 760 ? 380 : 260;
    }
    let modelNaturalHeight = 1;
    let loadedModel: THREE.Object3D | null = null;
    function applyModelScale() {
      if (!loadedModel) return;
      const scale = getTargetHeight() / modelNaturalHeight;
      loadedModel.scale.setScalar(scale);
    }

    new GLTFLoader().load(
      "/models/Meshy_AI_Silver_Thorn_Rosé_0922080315_texture.glb",
      (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);

        const size = box.getSize(new THREE.Vector3());
        modelNaturalHeight = size.y || 1;
        loadedModel = model;
        applyModelScale();

        model.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((mat) => {
            if (!mat) return;
            const m = mat as THREE.MeshStandardMaterial;
            if (typeof m.roughness === "number") m.roughness = Math.max(m.roughness, ROUGHNESS_FLOOR);
            if (typeof m.envMapIntensity === "number") m.envMapIntensity = ENV_MAP_INTENSITY;
          });
        });

        bottle.add(model);
        bottle.position.y = restY;
        modelReady = true;
      },
      undefined,
      (err) => console.error("Failed to load bottle model:", err)
    );

    // ---- sequence state ----
    type Phase =
      | "rotate"
      | "falling"
      | "landed"
      | "word"
      | "wave"
      | "cards"
      | "uncards"
      | "unwave"
      | "unword"
      | "unfalling";
    let phase: Phase = "rotate";
    let rotationProgress = 0;
    let displayRotation = 0; // eases toward rotationProgress each frame — see use below
    let fallStart = 0;
    let landedStart = 0;
    let raf = 0;

    const ROTATIONS = 1;
    const FALL_MS = 950;
    const IMPACT_MS = 380;
    const WORD_DELAY_MS = 2000;
    const WORD_HOLD_MS = 1800;
    const WAVE_MS = 3000;

    let scrollLocked = false;
    let lockedScrollY = 0;
    function blockScroll(e: Event) {
      e.preventDefault();
    }
    function blockKeyScroll(e: KeyboardEvent) {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(e.key)) {
        e.preventDefault();
      }
    }
    function lockScroll() {
      if (scrollLocked) return;
      scrollLocked = true;
      lockedScrollY = window.scrollY;
      window.addEventListener("wheel", blockScroll, { passive: false });
      window.addEventListener("touchmove", blockScroll, { passive: false });
      window.addEventListener("keydown", blockKeyScroll);
    }
    function unlockScroll() {
      if (!scrollLocked) return;
      scrollLocked = false;
      window.removeEventListener("wheel", blockScroll);
      window.removeEventListener("touchmove", blockScroll);
      window.removeEventListener("keydown", blockKeyScroll);
    }

    let lastScrollY = window.scrollY;
    function updatePinAndProgress() {
      const rect = wrap.getBoundingClientRect();

      if (rect.top <= 0 && rect.bottom > window.innerHeight) {
        pin.style.position = "fixed";
        pin.style.top = "0";
        pin.style.bottom = "";
      } else if (rect.top > 0) {
        pin.style.position = "absolute";
        pin.style.top = "0";
        pin.style.bottom = "";
      } else {
        pin.style.position = "absolute";
        pin.style.top = "";
        pin.style.bottom = "0";
      }

      // Scrolling back up while sitting in "cards" (unlocked) triggers the
      // whole cinematic to reverse instead of just snapping away.
      if (phase === "cards" && !scrollLocked && window.scrollY < lastScrollY) {
        phase = "uncards";
        lockScroll();
        cards.classList.remove("show");
        cardsGlow.classList.remove("show");
        landedStart = performance.now();
      }
      lastScrollY = window.scrollY;

      if (scrollLocked || phase !== "rotate") return;

      const scrollable = rect.height - window.innerHeight;
      const t = scrollable > 0 ? Math.max(0, Math.min(1, -rect.top / scrollable)) : 0;
      rotationProgress = t;

      if (t >= 0.995) {
        phase = "falling";
        lockScroll();
        fallStart = performance.now();
        bg.classList.add("hide");
      }
    }

    function onScroll() {
      if (scrollLocked && window.scrollY !== lockedScrollY) {
        window.scrollTo(0, lockedScrollY);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });

    function onResize() {
      w = window.innerWidth;
      h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      recomputeAnchors();
      applyModelScale();
    }
    window.addEventListener("resize", onResize);

    function easeInCubic(t: number) {
      return t * t * t;
    }
    function easeOutBack(t: number) {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    let lastLoggedPhase = "";
    let phaseSince = performance.now();

    function animate(now: number) {
      raf = requestAnimationFrame(animate);
      updatePinAndProgress();

      if (phase !== lastLoggedPhase) {
        lastLoggedPhase = phase;
        phaseSince = now;
      }
      if (SHOW_DEBUG) {
        debug.textContent = `phase: ${phase} | rotation: ${(rotationProgress * 100).toFixed(1)}% | in phase: ${((now - phaseSince) / 1000).toFixed(1)}s | scrollLocked: ${scrollLocked}`;
      }

      if (!modelReady) {
        renderer.render(scene, camera);
        return;
      }

      if (phase === "rotate") {
        // Eases toward the scroll-derived target instead of snapping to it —
        // on a fast scroll, the raw value can jump a large angle between
        // two frames, which reads as a glitch/pop rather than a spin.
        displayRotation += (rotationProgress - displayRotation) * 0.18;
        bottle.rotation.set(0, displayRotation * ROTATIONS * Math.PI * 2, 0);
        bottle.position.y = restY;
        bottle.scale.setScalar(1);
        camera.fov = BASE_FOV;
        camera.position.set(0, 0, CAM_DISTANCE);
        camera.updateProjectionMatrix();
        vignette.style.opacity = "0";
      } else if (phase === "falling") {
        const elapsed = now - fallStart;

        if (elapsed <= FALL_MS) {
          const t = easeInCubic(elapsed / FALL_MS);
          const y = restY + (landedY - restY) * t;
          bottle.position.y = y;
          camera.position.y = (restY - y) * -0.35;
          bottle.rotation.x = Math.sin(t * Math.PI * 2.2) * 0.35 * (1 - t);
          bottle.rotation.z = Math.cos(t * Math.PI * 1.7) * 0.22 * (1 - t);
          camera.fov = BASE_FOV + t * 10;
          camera.updateProjectionMatrix();
          vignette.style.opacity = String(0.5 * t);
        } else {
          const t = Math.min(1, (elapsed - FALL_MS) / IMPACT_MS);
          bottle.position.y = landedY;
          bottle.rotation.x = 0;
          bottle.rotation.z = 0;
          const squash = t < 0.35 ? 1 - (t / 0.35) * 0.16 : 0.84 + (easeOutBack(Math.min(1, (t - 0.35) / 0.65)) * 0.16);
          bottle.scale.set(1 + (1 - squash) * 0.5, squash, 1 + (1 - squash) * 0.5);
          camera.fov = BASE_FOV + 10 * (1 - t);
          camera.position.y = (restY - landedY) * -0.35 * (1 - t) + (t < 0.2 ? (Math.random() - 0.5) * 6 * (1 - t / 0.2) : 0);
          camera.updateProjectionMatrix();
          vignette.style.opacity = String(0.5 * (1 - t));

          if (t >= 1) {
            phase = "landed";
            landedStart = now;
            camera.fov = BASE_FOV;
            camera.position.set(0, 0, CAM_DISTANCE);
            camera.updateProjectionMatrix();
            bottle.scale.setScalar(1);
          }
        }
      } else if (phase === "landed") {
        if (now - landedStart >= WORD_DELAY_MS) {
          phase = "word";
          word.classList.add("show");
          backlight.classList.add("show");
          landedStart = now;
        }
      } else if (phase === "word") {
        if (now - landedStart >= WORD_HOLD_MS) {
          phase = "wave";
          wave.classList.add("rise");
          landedStart = now;
        }
      } else if (phase === "wave") {
        if (now - landedStart >= WAVE_MS) {
          phase = "cards";
          cards.classList.add("show");
          cardsGlow.classList.add("show");
          unlockScroll();
        }
      } else if (phase === "uncards") {
        if (now - landedStart >= 900) {
          phase = "unwave";
          wave.classList.remove("rise");
          landedStart = now;
        }
      } else if (phase === "unwave") {
        if (now - landedStart >= WAVE_MS) {
          phase = "unword";
          word.classList.remove("show");
          backlight.classList.remove("show");
          landedStart = now;
        }
      } else if (phase === "unword") {
        if (now - landedStart >= 800) {
          phase = "unfalling";
          bg.classList.remove("hide");
          landedStart = now;
        }
      } else if (phase === "unfalling") {
        const UNFALL_MS = FALL_MS + IMPACT_MS;
        const t = Math.min(1, (now - landedStart) / UNFALL_MS);
        const ease = 1 - Math.pow(1 - t, 3);
        bottle.position.y = landedY + (restY - landedY) * ease;
        bottle.rotation.x = Math.sin((1 - t) * Math.PI * 2.2) * 0.35 * t;
        bottle.rotation.z = Math.cos((1 - t) * Math.PI * 1.7) * 0.22 * t;
        vignette.style.opacity = String(0.4 * (1 - t));
        if (t >= 1) {
          phase = "rotate";
          rotationProgress = 1;
          displayRotation = 1;
          bottle.rotation.set(0, ROTATIONS * Math.PI * 2, 0);
          unlockScroll();
        }
      }

      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      unlockScroll();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <section id="ritual-wrap" ref={wrapRef} className="ritual-wrap">
      <div ref={debugRef} className="debug" />
      <div ref={pinRef} className="ritual-pin">
        <div ref={bgRef} className="bg">
          <img className="lion" src="/images/lion.png" alt="" aria-hidden="true" />
          <div className="mat">
            <img src="/images/lace.png" alt="" />
          </div>
        </div>

        <div ref={backlightRef} className="backlight" />
        <div ref={wordRef} className="word">
          Unbreakable
        </div>

        <div ref={mountRef} className="canvas-mount" />
        <div ref={vignetteRef} className="vignette" />

        <div ref={waveRef} className="wave" />

        <div ref={cardsGlowRef} className="cards-glow" aria-hidden="true" />
        <div ref={cardsRef} className="cards">
          {CARDS.map((c) => (
            <button
              key={c.id}
              className={`card card-${c.id}${openCard === c.id ? " open" : ""}`}
              onClick={() => setOpenCard(c.id)}
              type="button"
            >
              <span className="icon" aria-hidden="true">
                {c.id === "bottle" && <img src="/images/icon-bottle.png" alt="" />}
                {c.id === "grape" && <img src="/images/icon-grape.png" alt="" />}
                {c.id === "pair" && <img src="/images/icon-pair.png" alt="" />}
              </span>
              <span className="title">
                {c.title.split("\n").map((line, i) => (
                  <span key={i} className="title-line">{line}</span>
                ))}
              </span>
              <span className="body-wrap">
                <span className="body">{c.body}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <style jsx>{`
        .debug {
          position: fixed;
          top: 10px;
          left: 10px;
          z-index: 99999;
          background: rgba(0, 0, 0, 0.75);
          color: #7dff9e;
          font-family: monospace;
          font-size: 12px;
          padding: 6px 10px;
          border-radius: 6px;
          pointer-events: none;
          white-space: nowrap;
        }
        .ritual-wrap {
          position: relative;
          height: 220vh;
          height: 220dvh; /* the wrap was missing this fallback (everything else here already had it) — the mismatch between plain vh and the actual visible viewport on mobile is what left a dead scrollable gap of empty page background at the end */
        }
        .ritual-pin {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100vh;
          height: 100dvh;
          overflow: hidden;
          /* static gradient, not a scroll-driven fade — black at the top
             (continuing from the hero) into red where the bottle sits */
          background: linear-gradient(180deg, #08070a 0%, #d21414 55%);
        }

        .bg {
          position: absolute;
          inset: 0;
          transition: opacity 0.4s ease;
        }
        .bg.hide {
          opacity: 0;
        }
        .lion {
          position: absolute;
          left: 50%;
          top: 8vh;
          width: 100%;
          max-width: 900px;
          transform: translateX(-50%);
          opacity: 0.9;
          mix-blend-mode: multiply;
        }
        .mat {
          position: absolute;
          left: 50%;
          top: 50%;
          width: min(800px, 70vw);
          transform: translate(-50%, -50%);
        }
        .mat img {
          display: block;
          width: 100%;
          height: auto;
        }

        .canvas-mount {
          position: absolute;
          inset: 0;
        }
        .vignette {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(ellipse at 50% 50%, transparent 40%, #000 105%);
          opacity: 0;
        }

        .backlight {
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 1s ease;
          background: radial-gradient(
            circle at 50% 55%,
            rgba(255, 236, 190, 0.9) 0%,
            rgba(255, 200, 160, 0.5) 22%,
            transparent 55%
          );
          pointer-events: none;
        }
        .backlight.show {
          opacity: 1;
        }

        .word {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          font-family: var(--font-respira-black), serif;
          color: #000;
          font-size: clamp(80px, 20vw, 220px);
          opacity: 0;
          transform: scale(0.92);
          transition: opacity 0.8s ease, transform 0.8s ease;
          pointer-events: none;
        }
        .word.show {
          opacity: 1;
          transform: scale(1);
        }

        .wave {
          position: absolute;
          inset: 0;
          background: #050405;
          transform: translateY(100%);
          transition: transform 3000ms cubic-bezier(0.45, 0, 0.25, 1);
        }
        .wave.rise {
          transform: translateY(0%);
        }

        .cards-glow {
          position: absolute;
          inset: -20%;
          opacity: 0;
          transition: opacity 1.2s ease;
          background: radial-gradient(circle at 20% 30%, rgba(230, 30, 30, 0.4) 0%, transparent 38%),
            radial-gradient(circle at 80% 70%, rgba(210, 20, 20, 0.35) 0%, transparent 40%),
            radial-gradient(circle at 50% 90%, rgba(140, 10, 15, 0.35) 0%, transparent 42%),
            radial-gradient(circle at 65% 15%, rgba(180, 15, 20, 0.3) 0%, transparent 38%);
          background-size: 200% 200%, 220% 220%, 240% 240%, 210% 210%;
          animation: cardsDrift 14s ease-in-out infinite alternate;
          pointer-events: none;
        }
        .cards-glow.show {
          opacity: 1;
        }
        @keyframes cardsDrift {
          0% {
            background-position: 0% 10%, 100% 90%, 30% 100%, 90% 0%;
          }
          25% {
            background-position: 40% 60%, 70% 30%, 60% 70%, 50% 40%;
          }
          50% {
            background-position: 90% 20%, 20% 60%, 80% 30%, 10% 80%;
          }
          75% {
            background-position: 30% 80%, 60% 10%, 20% 50%, 70% 60%;
          }
          100% {
            background-position: 100% 100%, 0% 0%, 60% 20%, 20% 90%;
          }
        }
        .cards {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 28px;
          padding: 0 6vw;
        }
        .card {
          all: unset;
          box-sizing: border-box;
          cursor: pointer;
          width: 260px;
          min-height: 400px;
          border-radius: 22px;
          padding: 28px 24px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          gap: 14px;
          /* transform + opacity only — animating width/min-height forces a
             layout recalc every frame, which was the "glitchy resize" look */
          transition: transform 0.9s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.9s ease;
          opacity: 0;
        }
        .cards.show .card {
          opacity: 1;
        }
        .card-bottle {
          background: linear-gradient(160deg, #e21b1b, #7a0812);
          transform: translateX(-140vw) rotate(-6deg);
        }
        .card-grape {
          background: #161616;
          transform: translateY(60px) scale(0.85);
          transition-delay: 0.15s;
        }
        .card-pair {
          background: #efe9dc;
          transform: translateX(140vw) rotate(6deg);
        }
        .cards.show .card-bottle {
          transform: translateX(0) rotate(0deg);
        }
        .cards.show .card-grape {
          transform: translateY(0) scale(1);
        }
        .cards.show .card-pair {
          transform: translateX(0) rotate(0deg);
        }
        /* "open" is a scale bump layered onto the already-settled resting
           transform — still transform-only, still smooth */
        .cards.show .card-bottle.open {
          transform: translateX(0) rotate(0deg) scale(1.04);
        }
        .cards.show .card-grape.open {
          transform: translateY(0) scale(1.09);
        }
        .cards.show .card-pair.open {
          transform: translateX(0) rotate(0deg) scale(1.04);
        }

        .icon {
          display: block;
          width: 64px;
          height: 64px;
          margin-bottom: 8px;
          transform: scale(1);
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .card.open .icon {
          transform: scale(1.18);
        }
        .icon img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .title {
          display: block;
          font-family: "Cormorant", serif;
          font-style: italic;
          font-size: 22px;
          line-height: 1.15;
        }
        .title-line {
          display: block;
        }
        .card-bottle .title,
        .card-grape .title {
          color: #f2ece2;
        }
        .card-pair .title {
          color: #1c1c1c;
        }

        .body-wrap {
          display: grid;
          /* animates toward "auto" height smoothly — max-height (the old
             approach) transitions toward a guessed number, not the real
             content height, which produced the glitchy resize */
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.5s cubic-bezier(0.65, 0, 0.35, 1);
        }
        .card.open .body-wrap {
          grid-template-rows: 1fr;
        }
        .body {
          display: block;
          overflow: hidden;
          min-height: 0;
          font-family: "Cormorant", serif;
          font-size: 14px;
          line-height: 1.4;
          opacity: 0;
          transition: opacity 0.35s ease;
        }
        .card-bottle .body,
        .card-grape .body {
          color: rgba(242, 236, 226, 0.85);
        }
        .card-pair .body {
          color: rgba(28, 28, 28, 0.8);
        }
        .card.open .body {
          opacity: 1;
          transition: opacity 0.35s ease 0.15s;
        }

        @media (max-width: 760px) {
          /* rotated to portrait orientation — both were landscape-shaped
             graphics that left a lot of dead space on a tall narrow
             screen; sized off vh now instead of vw since that's the
             dimension that becomes the visual width after rotating */
          .lion {
            width: 80vh;
            max-width: none;
            transform: translateX(-50%) rotate(90deg);
          }
          .mat {
            width: 80vh;
            transform: translate(-50%, -50%) rotate(90deg);
          }
          /* single line, same as desktop — just small enough to actually
             fit the width without wrapping or overflowing */
          .word {
            font-size: clamp(32px, 9.5vw, 60px);
            white-space: nowrap;
          }
          /* stacked instead of side-by-side — not enough width for three
             columns on a phone */
          .cards {
            flex-direction: column;
            gap: 12px;
            padding: 4vh 6vw;
            overflow-y: auto;
          }
          .card {
            width: 100%;
            min-height: auto;
            padding: 16px 20px;
          }
          /* all three now just rise/fade in from below — "from both sides"
             doesn't apply once they're stacked instead of side-by-side */
          .card-bottle,
          .card-grape,
          .card-pair {
            transform: translateY(50px);
            transition-delay: 0s;
          }
          .cards.show .card-bottle,
          .cards.show .card-grape,
          .cards.show .card-pair {
            transform: translateY(0);
          }
          .icon {
            width: 44px;
            height: 44px;
            margin-bottom: 4px;
          }
          .title {
            font-size: 16px;
          }
        }
      `}</style>
    </section>
  );
}