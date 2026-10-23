"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { clubMarks } from "@/src/content/clubMarks";

export function ClubMark({ slug, className }: { slug: string; className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const mark = clubMarks[slug];

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !mark) return;
    const path = svg.querySelector("path");
    if (!path) return;
    const length = (path as SVGPathElement).getTotalLength();
    gsap.set(path, {
      strokeDasharray: length,
      strokeDashoffset: length,
      fillOpacity: 0
    });
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
