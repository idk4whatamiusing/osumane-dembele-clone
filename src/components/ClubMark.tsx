"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { clubMarks } from "@/src/content/clubMarks";

gsap.registerPlugin(ScrollTrigger);

export function ClubMark({ slug, className }: { slug: string; className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const mark = clubMarks[slug];

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !mark) return;
    const path = svg.querySelector("path");
    if (!path) return;
    const shell = svg.closest<HTMLElement>(".chapter-shell");
    const track = shell?.querySelector<HTMLElement>("[data-chapter-track]");
    if (!shell || !track) return;

    const length = (path as SVGPathElement).getTotalLength();
    gsap.set(path, {
      strokeDasharray: length,
      strokeDashoffset: length,
      fillOpacity: 0
    });

    const st = ScrollTrigger.create({
      trigger: shell,
      start: "top top",
      end: () => `+=${Math.round(track.scrollWidth + 3000)}`,
      scrub: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = Math.min(1, Math.max(0, self.progress * 5));
        path.style.strokeDashoffset = (length * (1 - p)) + "px";
        path.style.fillOpacity = String(Math.min(1, self.progress * 3));
      }
    });

    return () => { st.kill(); };
  }, [mark]);

  if (!mark) return null;
  return (
    <svg
      ref={svgRef}
      viewBox={mark.viewBox}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d={mark.d} fill="currentColor" stroke={mark.stroke} strokeWidth={1} />
    </svg>
  );
}
