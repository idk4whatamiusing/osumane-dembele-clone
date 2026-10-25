"use client";

import { useEffect, useRef } from "react";
import { loaderSignaturePaths, loaderSignatureViewBox } from "@/src/content/loaderSignature";

interface WordmarkProps {
  /** Accent colour of the mark, the gold of the reference site. */
  accent: string;
}

/**
 * The wordmark that sits at the bottom of the viewport.
 *
 * The reference ships this as a vector mark, not live type. Using the same
 * paths keeps the letterforms and the 140 × 10 mini mark identical to the
 * source instead of approximating them with the display font.
 */
export function Wordmark({ accent }: WordmarkProps) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const hero = element.querySelector<HTMLElement>("[data-wordmark-hero]");
    const mini = element.querySelector<HTMLElement>("[data-wordmark-mini]");
    if (!hero || !mini) return;

    const onScroll = () => {
      const progress = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.5)));
      const footerTop = document.getElementById("credits")?.getBoundingClientRect().top ?? Infinity;
      const atFooter = footerTop < window.innerHeight * 0.8;
      hero.style.opacity = String(1 - progress);
      hero.style.transform = `translateY(${-progress * 12}px)`;
      mini.style.opacity = atFooter ? "0" : String(progress);
      mini.style.transform = `translate(-50%, ${(1 - progress) * 8}px)`;
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const mark = (
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
  );

  return (
    <div
      ref={root}
      className="wordmark"
      style={{ "--wordmark-accent": accent } as React.CSSProperties}
      aria-hidden="true"
      data-wordmark="true"
    >
      <div className="wordmark__hero" data-wordmark-hero>
        {mark}
      </div>
      <div className="wordmark__mini" data-wordmark-mini>
        {mark}
      </div>
    </div>
  );
}
