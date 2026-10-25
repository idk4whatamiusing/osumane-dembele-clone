"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { loaderMarkPaths, loaderMarkViewBox } from "@/src/content/loaderMark";

interface PreloaderProps {
  name: string;
}

export function Preloader({ name }: PreloaderProps) {
  const [ready, setReady] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const svg = svgRef.current;
    const html = document.documentElement;
    html.classList.add("is-loading");
    window.scrollTo(0, 0);

    // The reference loader is a drawn wordmark rather than a font. Fade the
    // complete mark into place instead of stroking half a megabyte of SVG
    // paths, which is expensive and makes the loader look like a different
    // word while it is still incomplete.
    if (svg) gsap.set(svg, { opacity: 0, y: 10 });

    // The loader is allowed to finish its signature while the hero scene
    // warms up. The site is only revealed once both are ready.
    let signatureDone = false;
    let heroReady = false;
    let startedFade = false;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      setReady(true);
      html.classList.remove("is-loading");
      html.dataset.loaderReady = "true";
      window.dispatchEvent(new Event("osumane:loader-ready"));
    };

    const maybeReveal = () => {
      if (!root || startedFade || !signatureDone || !heroReady) return;
      startedFade = true;
      gsap.to(root, {
        opacity: 0,
        duration: 0.2,
        ease: "none",
        onComplete: finish
      });
    };

    const signature = gsap.timeline({
      delay: 0.15,
      onComplete: () => {
        signatureDone = true;
        maybeReveal();
      }
    });
    if (svg) {
      signature.to(svg, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: "power2.out"
      });
    }
    signature.to({}, { duration: 0.7 });

    const onHeroReady = () => {
      heroReady = true;
      maybeReveal();
    };
    window.addEventListener("osumane:hero-ready", onHeroReady, { once: true });
    if (html.dataset.heroReady === "true") onHeroReady();

    const gateTimeout = window.setTimeout(() => {
      heroReady = true;
      maybeReveal();
    }, 5000);
    const hardTimeout = window.setTimeout(finish, 7000);

    return () => {
      signature.kill();
      window.clearTimeout(gateTimeout);
      window.clearTimeout(hardTimeout);
      window.removeEventListener("osumane:hero-ready", onHeroReady);
      html.classList.remove("is-loading");
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={`preloader${ready ? " is-ready" : ""}`}
      role="status"
      aria-live="polite"
      aria-hidden={ready}
      data-loader
    >
      <span className="preloader__sig" aria-hidden="true">
        <svg
          ref={svgRef}
          viewBox={loaderMarkViewBox}
          className="preloader__sig-svg"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {loaderMarkPaths.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="currentColor"
              stroke="currentColor"
              strokeWidth={1}
            />
          ))}
        </svg>
      </span>
      <span className="preloader__bar" aria-hidden="true">
        <i />
      </span>
      <span className="sr-only">{ready ? "" : name}</span>
    </div>
  );
}
