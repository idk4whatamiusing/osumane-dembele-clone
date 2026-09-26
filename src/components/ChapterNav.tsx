"use client";

import { useEffect, useState } from "react";

export interface ChapterNavItem {
  id: string;
  label: string;
}

interface ChapterNavProps {
  name: string;
  items: ChapterNavItem[];
  navigationLabel: string;
  introductionLabel: string;
}

export function ChapterNav({
  name,
  items,
  navigationLabel
}: ChapterNavProps) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const sections = [
      document.getElementById("introduction"),
      ...items.map((item) => document.getElementById(item.id))
    ].filter((section): section is HTMLElement => Boolean(section));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-35% 0px -50%", threshold: [0, 0.1, 0.5, 1] }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav className="site-nav" aria-label={navigationLabel}>
      <a className="site-nav__brand" href="#top">
        {name}
      </a>
      <div className="site-nav__track">
        {items.map((item, index) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            aria-current={active === item.id ? "location" : undefined}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
