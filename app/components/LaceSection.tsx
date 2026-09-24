"use client";

import BottleScroll from "./BottleScroll";

export default function LaceSection() {
  return (
    <section id="lace-section">
      <img className="lion lion-top" src="/images/lion.png" alt="" aria-hidden="true" />

      <div className="mat">
        <img id="lace-start" src="/images/lace.png" alt="" />
      </div>

      <img className="swords" src="/images/swords.png" alt="" aria-hidden="true" />

      <div className="mat mat-end">
        <img id="lace-end" src="/images/lace.png" alt="" />
      </div>


      <BottleScroll />

      <style jsx>{`
        section {
          position: relative;
          background: #d21414;
          min-height: 220vh;
          overflow: hidden;
          padding: 12vh 0 16vh;
        }
        .lion {
          position: absolute;
          left: 50%;
          width: 100vw;
          max-width: 1100px;
          transform: translateX(-50%);
          opacity: 0.9;
          mix-blend-mode: multiply;
        }
        .lion-top {
          top: 3vh;
        }
        .mat {
          position: relative;
          z-index: 1;
          width: min(1000px, 78vw);
          margin: 0 auto 0vh;
        }
        .mat-end {
          top: 6vh;
          margin-left: auto;
          margin-right: 11vw;
          margin-bottom: ;
        }
        .mat img {
          display: block;
          width: 100%;
          height: auto;
        }
        .swords {
          position: absolute;
          left: 50%;
          width: 80vw;
          max-width: 800px;
          transform: translateX(-50%);
          opacity: 0.9;
          mix-blend-mode: multiply;
        }
      `}</style>
    </section>
  );
}
