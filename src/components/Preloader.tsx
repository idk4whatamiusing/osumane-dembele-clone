"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { loaderSignaturePaths, loaderSignatureViewBox } from "@/src/content/loaderSignature";

interface PreloaderProps {
  name: string;
}

const READY_DELAY = 2600;

export function Preloader({ name }: PreloaderProps) {
  const [ready, setReady] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (svg) {
      const paths = svg.querySelectorAll("path");
      paths.forEach((path) => {
        const length = (path as SVGPathElement).getTotalLength();
        gsap.set(path, {
          strokeDasharray: length,
          strokeDashoffset: length,
          fillOpacity: 0,
          y: "105%"
        });
      });
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduced) {
        gsap.to(paths, {
          strokeDashoffset: 0,
          fillOpacity: 1,
          duration: 1,
          stagger: 0.2,
          ease: "power2.inOut",
          delay: 0.2
        });
        gsap.to(paths, {
          y: "0%",
          duration: 0.6,
          stagger: 0.04,
          ease: "expo.out",
          delay: 0.2
        });
      } else {
        gsap.set(paths, { strokeDashoffset: 0, fillOpacity: 1, y: "0%" });
      }
    }

    let finished = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finish = () => {
      if (finished) return;
      finished = true;
      setReady(true);
      document.documentElement.dataset.loaderReady = "true";
      window.dispatchEvent(new Event("ankhi:loader-ready"));
    };
    const timeout = window.setTimeout(finish, reduced.matches ? 0 : READY_DELAY);
    return () => {
      window.clearTimeout(timeout);
      if (!finished) {
        finished = true;
        document.documentElement.dataset.loaderReady = "true";
      }
    };
  }, []);

  return (
    <div
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
