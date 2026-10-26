"use client";

import { useEffect, useRef } from "react";
import { loaderSignaturePaths, loaderSignatureViewBox } from "@/src/content/loaderSignature";

interface WordmarkProps {
  /** Accent colour of the mark, the gold of the reference site. */
  accent: string;
}

/**
 * The wordmark pinned to the bottom of the viewport.
 *
 * The reference shrinks this single mark from the full page width to 10% as
 * the hero dissolves, then leaves the small mark in place for the rest of the
 * page. Using the same paths keeps the letterforms identical to the source.
 */
export function Wordmark({ accent }: WordmarkProps) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const mark = element.querySelector<SVGElement>(".wordmark__svg");
    if (!mark) return;

    const onScroll = () => {
      const progress = Math.min(
        1,
        Math.max(0, window.scrollY / (window.innerHeight * 0.5))
      );
      if (window.innerWidth <= 991) {
        mark.style.width = "100%";
        mark.style.opacity = String(1 - progress);
        return;
      }
      mark.style.width = `${100 - progress * 90}%`;
      mark.style.opacity = "1";
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      ref={root}
      className="wordmark"
      style={{ "--wordmark-accent": accent } as React.CSSProperties}
      aria-hidden="true"
      data-wordmark="true"
    >
      <div className="wordmark__hero" data-wordmark-hero>
        <svg
          viewBox={loaderSignatureViewBox}
          className="wordmark__svg"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          focusable="false"
        >
          {loaderSignaturePaths.map((d, index) => (
            <path key={index} d={d} fill="currentColor" />
          ))}
        </svg>
      </div>
    </div>
  );
}
