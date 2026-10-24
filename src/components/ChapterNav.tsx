"use client";

import { useEffect, useState, type CSSProperties } from "react";

export interface ChapterNavItem {
  id: string;
  label: string;
  /** Compact label used below the desktop breakpoint. */
  shortLabel?: string;
}

interface ChapterNavProps {
  name: string;
  items: ChapterNavItem[];
  navigationLabel: string;
  introductionLabel: string;
}

/**
 * The fixed navigation of the reference site.
 *
 * The links are spread across the whole width in a very small face, the
 * chapter on screen takes the highlight colour of that chapter and the other
 * links take its navigation colour.
 */
export function ChapterNav({ name, items, navigationLabel }: ChapterNavProps) {
  const [active, setActive] = useState<string | null>(null);
  const [palette, setPalette] = useState<{ idle: string; active: string } | null>(null);

  useEffect(() => {
    const sections = [
      document.getElementById("introduction"),
      ...items.map((item) => document.getElementById(item.id))
    ].filter((section): section is HTMLElement => Boolean(section));

    const read = (section: HTMLElement) => {
      const styles = getComputedStyle(section);
      const idle = styles.getPropertyValue("--nav-color").trim();
      const highlight = styles.getPropertyValue("--nav-active-color").trim();
      if (idle) setPalette({ idle, active: highlight || idle });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        setActive(visible.target.id);
        read(visible.target as HTMLElement);
      },
      { rootMargin: "-40% 0px -45%", threshold: [0, 0.05, 0.5, 1] }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [items]);

  return (
    <header
      className="site-nav"
      aria-label={navigationLabel}
      style={
        palette
          ? ({
              "--nav-idle": palette.idle,
              "--nav-highlight": palette.active
            } as CSSProperties)
          : undefined
      }
    >
      <nav className="site-nav__track">
        <a className="site-nav__brand" href="#top">
          {name}
        </a>
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            aria-label={item.label}
            aria-current={active === item.id ? "location" : undefined}
          >
            {item.shortLabel ? (
              <>
                <span className="site-nav__label site-nav__label--long">{item.label}</span>
                <span className="site-nav__label site-nav__label--short" aria-hidden="true">
                  {item.shortLabel}
                </span>
              </>
            ) : (
              item.label
            )}
          </a>
        ))}
        </nav>
    </header>
  );
}
