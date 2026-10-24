"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { loaderSignaturePaths, loaderSignatureViewBox } from "@/src/content/loaderSignature";

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

    const paths = svg?.querySelectorAll<SVGPathElement>("path") ?? [];
    paths.forEach((path) => {
      const length = path.getTotalLength();
      gsap.set(path, {
        strokeDasharray: length,
        strokeDashoffset: length,
        fillOpacity: 0
      });
    });

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
    if (paths.length) {
      signature.to(paths, {
        strokeDashoffset: 0,
        fillOpacity: 1,
        duration: 1,
        stagger: 0.2,
        ease: "power2.inOut"
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
          viewBox={loaderSignatureViewBox}
          className="preloader__sig-svg"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {loaderSignaturePaths.map((d, i) => (
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
