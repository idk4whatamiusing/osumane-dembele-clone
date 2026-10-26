"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

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
  const lastState = useRef("");

  useEffect(() => {
    const intro = document.getElementById("introduction");
    const footer = document.getElementById("credits");
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => Boolean(section));
    if (!sections.length) return;

    const tracks = sections
      .map((section) =>
        section.querySelector<HTMLElement>("[data-chapter-track]")
      )
      .filter((track): track is HTMLElement => Boolean(track));

    type ChapterNavState = {
      id: string;
      top: number;
      end: number;
      idle: string;
      highlight: string;
    };

    let states: ChapterNavState[] = [];
    let introTop = 0;
    let footerTop = Number.POSITIVE_INFINITY;

    const measure = () => {
      introTop = intro
        ? intro.getBoundingClientRect().top + window.scrollY
        : 0;
      footerTop = footer
        ? footer.getBoundingClientRect().top + window.scrollY
        : document.documentElement.scrollHeight;
      states = sections.map((section) => {
        const track = section.querySelector<HTMLElement>("[data-chapter-track]");
        const top = section.getBoundingClientRect().top + window.scrollY;
        const distance = track
          ? Math.max(0, track.scrollWidth - window.innerWidth)
          : 0;
        const styles = getComputedStyle(section);
        const idle = styles.getPropertyValue("--nav-color").trim() || "#0d0d0d";
        const highlight =
          styles.getPropertyValue("--nav-active-color").trim() || idle;
        return {
          id: section.id,
          top,
          end: top + distance + 3000 + 5,
          idle,
          highlight
        };
      });
    };

    const update = () => {
      const y = window.scrollY;
      let nextActive: string | null = null;
      let nextPalette: { idle: string; active: string } | null = null;

      if (y < introTop + 100) {
        nextPalette = null;
      } else if (y < states[0].top + 15) {
        nextPalette = { idle: "#fffcf5", active: "#fffcf5" };
      } else if (y >= footerTop - window.innerHeight * 0.47) {
        nextPalette = null;
      } else {
        const last = states[states.length - 1];
        if (y >= last.end) {
          nextPalette = { idle: last.idle, active: last.highlight };
        } else {
          let index = 0;
          for (let i = 0; i < states.length; i += 1) {
            if (y >= states[i].end) index = i + 1;
          }
          index = Math.min(index, states.length - 1);
          nextActive = window.innerWidth <= 991 ? null : states[index].id;
          nextPalette = {
            idle: states[index].idle,
            active: states[index].highlight
          };
        }
      }

      const key = `${nextActive || ""}|${nextPalette?.idle || ""}|${nextPalette?.active || ""}`;
      if (key === lastState.current) return;
      lastState.current = key;
      setActive(nextActive);
      setPalette(nextPalette);
    };

    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };
    const onResize = () => {
      measure();
      update();
    };

    let disposed = false;
    const remeasure = () => {
      if (disposed) return;
      measure();
      update();
    };
    const observer = new ResizeObserver(remeasure);
    tracks.forEach((track) => observer.observe(track));
    const settleTimer = window.setTimeout(remeasure, 800);
    void document.fonts?.ready.then(remeasure).catch(() => undefined);

    measure();
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      disposed = true;
      window.clearTimeout(settleTimer);
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", onResize);
    };
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
