"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

type Point = { x: number; y: number };

/**
 * Renders the bottle model on a fixed full-screen transparent canvas and
 * rolls it through #lace-section: starts on the left of mat 1, rolls to
 * the right edge of the page and bounces, rolls to the left edge and
 * bounces again, then finishes on the right of mat 2.
 */
export default function BottleScroll() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Metallic/PBR materials render close to black without something to
    // reflect. A neutral room environment gives it something to catch
    // highlights from. (If your three version predates ~0.152, swap
    // outputColorSpace/SRGBColorSpace for outputEncoding/sRGBEncoding.)
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.75; // pushed down again — was still blowing out
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    // Note: only scene.environment is set (for lighting/reflections) — never
    // scene.background, which would paint over the red section behind it.
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    let w = window.innerWidth;
    let h = window.innerHeight;
    const camera = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0.1, 2000);
    camera.position.z = 1000;

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(200, 300, 400);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffe3e3, 0.4);
    rim.position.set(-200, -100, 200);
    scene.add(rim);

    // Dials for softening a too-mirror-like metal into a brushed/pewter
    // look (raise ROUGHNESS_FLOOR for softer, blurrier highlights instead
    // of hard white streaks; lower ENV_MAP_INTENSITY for less reflection).
    // Pushed further than last round — still tune by eye from here.
    const ROUGHNESS_FLOOR = 0.5;
    const ENV_MAP_INTENSITY = 0.5;

    const bottle = new THREE.Group();
    scene.add(bottle);
    let modelReady = false;

    // ---- a soft "grounding" shadow under the bottle, since there's no
    // real floor geometry in this scene for it to cast a true shadow onto
    // (the "floor" is the HTML/CSS lace section behind the transparent
    // canvas). A simple radial-gradient sprite reads as natural here and
    // is far more predictable than trying to shadow-map onto nothing. ----
    function makeShadowTexture() {
      const size = 256;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      const gradient = ctx.createRadialGradient(
        size / 2,
        size / 2,
        0,
        size / 2,
        size / 2,
        size / 2
      );
      gradient.addColorStop(0, "rgba(0,0,0,0.45)");
      gradient.addColorStop(0.7, "rgba(0,0,0,0.18)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }
    const shadowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: makeShadowTexture(),
        transparent: true,
        depthWrite: false,
      })
    );
    shadowMesh.position.z = -5; // just behind the bottle so it never clips through it
    shadowMesh.visible = false;
    scene.add(shadowMesh);

    new GLTFLoader().load(
      "/models/Meshy_AI_Silver_Thorn_Rosé_0922080315_texture.glb",
      (gltf) => {
        const model = gltf.scene;

        // Recenter the model on its own bounding-box middle so rotation
        // ("rolling") happens around its center rather than an offset origin.
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);

        // Scale to a comfortable on-screen pixel height.
        const size = box.getSize(new THREE.Vector3());
        const targetHeight = 400; // px, at scroll progress start
        const scale = targetHeight / (size.y || 1);
        model.scale.setScalar(scale);

        // Soften the metal — a very low-roughness metalness material reads
        // as blown-out mirror chrome rather than the brushed pewter look
        // you're after; this raises the floor on roughness and dials back
        // how strongly it reflects the room environment.
        model.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((mat) => {
            if (!mat) return;
            const m = mat as THREE.MeshStandardMaterial;
            if (typeof m.roughness === "number") {
              m.roughness = Math.max(m.roughness, ROUGHNESS_FLOOR);
            }
            if (typeof m.envMapIntensity === "number") {
              m.envMapIntensity = ENV_MAP_INTENSITY;
            }
          });
        });

        bottle.add(model);

        // Size the shadow off the bottle's own scaled footprint: once laid
        // on its side, its original height becomes its on-screen length,
        // and its width/depth becomes its diameter.
        const length = size.y * scale;
        const diameter = Math.max(size.x, size.z) * scale;
        shadowMesh.scale.set(length * 1.1, diameter * 1.6, 1);
        shadowMesh.visible = true;

        modelReady = true;
      },
      undefined,
      (err) => console.error("Failed to load bottle model:", err)
    );

    // ---- the path: starts on the left of mat 1, rolls down-right until
    // the cork reaches the right edge of the page, bounces and rolls back
    // left until the cork reaches the left edge, bounces again, and rolls
    // right to finish on the right of mat 2. The two bounce points are
    // pinned to the viewport's edges (not the mats), exactly as described —
    // everything else here is guesswork on the parts that weren't fully
    // specified (how far down each bounce sits), clearly marked below. ----
    const EDGE_INSET = 70; // how close the cork gets to the viewport edge before bouncing — tune to taste
    const points: Point[] = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }];
    let progress = 0;

    const toWorld = (px: number, py: number) => ({ x: px - w / 2, y: h / 2 - py });
    const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
    const lerp = (a: Point, b: Point, t: number): Point => ({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    });

    function measureAnchors() {
      const startRect = document.getElementById("lace-start")?.getBoundingClientRect();
      const endRect = document.getElementById("lace-end")?.getBoundingClientRect();
      if (!startRect || !endRect) return;

      // 0: start — left side of mat 1
      points[0].x = startRect.left + startRect.width * 0.12;
      points[0].y = startRect.top + startRect.height * 0.2;

      // 1: bounce off the right edge of the page, low on mat 1 — GUESS: the
      // "right bottom side of mat 1" part of the y-position, since only the
      // x (viewport edge) was fully specified
      points[1].x = window.innerWidth - EDGE_INSET;
      points[1].y = startRect.top + startRect.height * 0.85;

      // 2: bounce off the left edge of the page — GUESS: y sits roughly
      // 60% of the way through the gap between the two mats
      points[2].x = EDGE_INSET;
      points[2].y = startRect.bottom + (endRect.top - startRect.bottom) * 0.6;

      // 3: end — right side of mat 2
      points[3].x = endRect.left + endRect.width * 0.85;
      points[3].y = endRect.top + endRect.height * 0.5;
    }

    // distance-weighted, so the bottle doesn't visibly speed up/slow down
    // just because one leg of the path happens to be shorter than another.
    // Returns both the interpolated point and the total path length in one
    // pass (both are needed each frame, so no reason to walk it twice).
    function getPathState(t: number) {
      let total = 0;
      const segLens: number[] = [];
      for (let i = 0; i < points.length - 1; i++) {
        const d = dist(points[i], points[i + 1]);
        segLens.push(d);
        total += d;
      }
      let point = points[0];
      if (total > 0) {
        let target = t * total;
        for (let i = 0; i < segLens.length; i++) {
          if (target <= segLens[i]) {
            point = lerp(points[i], points[i + 1], segLens[i] ? target / segLens[i] : 0);
            break;
          }
          target -= segLens[i];
          point = points[points.length - 1];
        }
      }
      return { point, total };
    }

    // Progress is anchored directly to the mats themselves — from mat 1's
    // top reaching the viewport top, to mat 2's bottom reaching it — not to
    // the whole section's scroll range. The section has ~28vh of padding
    // above/below the mats that isn't part of the path; using the section's
    // scroll extent for progress meant progress and the mats' actual
    // on-screen position could drift out of sync (progress reporting
    // "still early in the path" while mat 1 had already scrolled off the
    // top of the screen), which is what was sending the bottle off-frame.
    function updateProgress() {
      const startRect = document.getElementById("lace-start")?.getBoundingClientRect();
      const endRect = document.getElementById("lace-end")?.getBoundingClientRect();
      if (!startRect || !endRect) return;

      // Distance from mat 1's top to mat 2's bottom, in document space —
      // constant regardless of scroll position (everything scrolls
      // together), so this is safe to recompute every frame off live rects.
      const totalSpan = endRect.bottom - startRect.top;
      const rawProgress = totalSpan > 0 ? -startRect.top / totalSpan : 0;
      progress = Math.max(0, Math.min(1, rawProgress));

      // Visibility is tied to this SAME range, not the section's — the
      // section has padding above/below the mats that isn't part of the
      // path, and showing the canvas during that padding was the bug:
      // progress stays clamped at 0/1 there, but the waypoints are still
      // recalculated every frame from the mats' live (still-moving)
      // position, so the bottle kept drifting even after progress had
      // "finished" — a drift with nothing stopping it from eventually
      // carrying the bottle out of frame. Hiding the canvas outside this
      // range (with a small buffer for a clean fade) sidesteps that
      // entirely, rather than trying to freeze the drift in place.
      const buffer = 0.03;
      const nextOpacity = rawProgress >= -buffer && rawProgress <= 1 + buffer ? "1" : "0";
      if (mount.style.opacity !== nextOpacity) mount.style.opacity = nextOpacity;
    }

    function easeInOutCubic(t: number) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function onResize() {
      w = window.innerWidth;
      h = window.innerHeight;
      camera.left = -w / 2;
      camera.right = w / 2;
      camera.top = h / 2;
      camera.bottom = -h / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);

    // ---- tilt: a gentle lean, not a spin. Your reference (the Gucci key)
    // never spins fast either — it holds a diagonal angle and eases
    // between angles as you scroll. This interpolates the bottle's tilt
    // directly from -14.56° at the start of the path to +14.56° at the
    // end, tied to progress (not to distance travelled — no more
    // accumulating spin state that could lag behind or drift). ----
    const TILT_START_DEG = -14.56;
    const TILT_END_DEG = 14.56;
    // Rotates the model from its GLB's own default orientation onto its
    // side. This assumes the model was modeled standing upright (the usual
    // convention) — if it was modeled already lying flat, set this to 0;
    // if the lean still looks wrong (e.g. it leans into the screen instead
    // of across it), this is the value to try flipping/adjusting first.
    const BASE_TILT = Math.PI / 2;

    let raf = 0;

    // Anchors, progress and the render are all driven from this single rAF
    // loop now, at a consistent cadence. Previously these were updated from
    // the raw "scroll" event instead, which fires on its own cadence
    // (sometimes several times per rendered frame, sometimes not synced to
    // it at all) — that mismatch between "when state changed" and "when it
    // got drawn" was the source of the glitchy/stuttery motion.
    function animate() {
      raf = requestAnimationFrame(animate);

      measureAnchors();
      updateProgress();

      if (!modelReady) {
        renderer.render(scene, camera);
        return;
      }
      const eased = easeInOutCubic(progress);
      const { point } = getPathState(eased);
      const world = toWorld(point.x, point.y);
      bottle.position.set(world.x, world.y, 0);
      shadowMesh.position.x = world.x;
      shadowMesh.position.y = world.y - 8; // sits slightly "below" the bottle

      const tiltDeg = TILT_START_DEG + eased * (TILT_END_DEG - TILT_START_DEG);
      bottle.rotation.set(0, 0, BASE_TILT + THREE.MathUtils.degToRad(tiltDeg));

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        pointerEvents: "none",
        opacity: 0,
        transition: "opacity 0.3s ease",
      }}
    />
  );
}