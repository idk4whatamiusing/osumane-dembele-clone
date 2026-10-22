"use client";

import { useEffect, useRef } from "react";

interface WordmarkProps {
  /** Full name, rendered without its diacritics and in capitals. */
  text: string;
  /** Colour of the mark, the gold of the reference site. */
  accent: string;
}

/**
 * The wordmark that sits at the bottom of the viewport.
 *
 * The reference site keeps a single mark in view: a large gold version while
 * the hero is on screen, and a small one pinned to the bottom edge for the
 * rest of the journey. Both states are rendered and cross faded so the
 * strokes keep their weight instead of being scaled down.
 */
export function Wordmark({ text, accent }: WordmarkProps) {
  const root = useRef<HTMLDivElement>(null);
  const letters = Array.from(
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
  );

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const hero = element.querySelector<HTMLElement>("[data-wordmark-hero]");
    const mini = element.querySelector<HTMLElement>("[data-wordmark-mini]");
    if (!hero || !mini) return;

    const onScroll = () => {
      const progress = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.5)));
      hero.style.opacity = String(1 - progress);
      hero.style.transform = `translateY(${-progress * 12}px)`;
      mini.style.opacity = String(progress);
      mini.style.transform = `translateY(${(1 - progress) * 8}px)`;
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
      <p className="wordmark__hero" data-wordmark-hero>
        {letters.map((letter, index) => (
          <span key={`${letter}-${index}`}>{letter === " " ? " " : letter}</span>
        ))}
      </p>
      <p className="wordmark__mini" data-wordmark-mini>
        {letters.map((letter, index) => (
          <span key={`${letter}-${index}`}>{letter === " " ? " " : letter}</span>
        ))}
      </p>
    </div>
  );
}
