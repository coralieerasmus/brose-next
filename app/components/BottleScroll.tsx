"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * Renders the bottle model on a fixed full-screen transparent canvas and
 * moves it between two on-screen anchor points (#lace-start, #lace-end) as
 * the user scrolls through #lace-section, rotating it to read as "rolling".
 */
export default function BottleScroll() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    // Orthographic camera mapped 1:1 to screen pixels, so we can position
    // the bottle using plain getBoundingClientRect() coordinates.
    const w = window.innerWidth;
    const h = window.innerHeight;
    const camera = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0.1, 2000);
    camera.position.z = 1000;

    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(200, 300, 400);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffe3e3, 0.6);
    rim.position.set(-200, -100, 200);
    scene.add(rim);

    const bottle = new THREE.Group();
    scene.add(bottle);
    let modelReady = false;

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
        const targetHeight = 220; // px, at scroll progress start
        const scale = targetHeight / (size.y || 1);
        model.scale.setScalar(scale);

        bottle.add(model);
        modelReady = true;
      },
      undefined,
      (err) => console.error("Failed to load bottle model:", err)
    );

    // ---- scroll-driven position + rotation ----
    const start = { x: w * 0.35, y: h * 0.55 }; // fallback until anchors measured
    const end = { x: w * 0.65, y: h * 0.45 };
    let progress = 0;

    function toWorld(px: number, py: number) {
      return { x: px - w / 2, y: h / 2 - py };
    }

    function measureAnchors() {
      const startEl = document.getElementById("lace-start");
      const endEl = document.getElementById("lace-end");
      if (startEl) {
        const r = startEl.getBoundingClientRect();
        start.x = r.left + r.width * 0.3;
        start.y = r.top + r.height * 0.4;
      }
      if (endEl) {
        const r = endEl.getBoundingClientRect();
        end.x = r.right - r.width * 0.22;
        end.y = r.top + r.height * 0.5;
      }
    }

    function updateProgress() {
      const section = document.getElementById("lace-section");
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      progress = scrollable > 0 ? -rect.top / scrollable : 0;
      progress = Math.max(0, Math.min(1, progress));
      mount.style.opacity = rect.top < window.innerHeight && rect.bottom > 0 ? "1" : "0";
    }

    function easeInOutCubic(t: number) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function onScroll() {
      measureAnchors();
      updateProgress();
    }
    function onResize() {
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      camera.left = -nw / 2;
      camera.right = nw / 2;
      camera.top = nh / 2;
      camera.bottom = -nh / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
      onScroll();
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    onScroll();

    let raf = 0;
    const rollSpins = 5.5; // how many rotations across the whole journey

    function animate() {
      raf = requestAnimationFrame(animate);
      if (!modelReady) {
        renderer.render(scene, camera);
        return;
      }
      const eased = easeInOutCubic(progress);
      const px = start.x + (end.x - start.x) * eased;
      const py = start.y + (end.y - start.y) * eased;
      const world = toWorld(px, py);

      bottle.position.set(world.x, world.y, 0);
      bottle.rotation.z = -Math.min(progress, 0.92) / 0.92 * rollSpins * Math.PI * 2;
      // settle to a slight resting tilt once it "arrives"
      bottle.rotation.x = 1.4 + (progress > 0.92 ? (progress - 0.92) / 0.08 * 0.2 : 0);

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
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
