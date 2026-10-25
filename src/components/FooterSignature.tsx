"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { loaderSignaturePaths, loaderSignatureViewBox } from "@/src/content/loaderSignature";
import { footerMobileMarkPaths, footerMobileMarkViewBox } from "@/src/content/footerMobileMark";

export function FooterSignature({ className }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const paths = svg.querySelectorAll("path");
    paths.forEach((path) => {
      const length = (path as SVGPathElement).getTotalLength();
      gsap.set(path, {
        strokeDasharray: length,
        strokeDashoffset: length,
        fillOpacity: 0
      });
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          gsap.to(paths, {
            strokeDashoffset: 0,
            fillOpacity: 1,
            duration: 1.2,
            stagger: 0.1,
            ease: "power2.inOut"
          });
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2 }
    );
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox={loaderSignatureViewBox}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {loaderSignaturePaths.map((d, i) => (
        <path key={i} d={d} fill="currentColor" stroke="currentColor" strokeWidth={1} />
      ))}
    </svg>
  );
}

export function FooterSignatureMobile({ className }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const paths = root.querySelectorAll("path");
    paths.forEach((path) => {
      const length = (path as SVGPathElement).getTotalLength();
      gsap.set(path, {
        strokeDasharray: length,
        strokeDashoffset: length,
        fillOpacity: 0
      });
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          gsap.to(paths, {
            strokeDashoffset: 0,
            fillOpacity: 1,
            duration: 1.2,
            stagger: 0.1,
            ease: "power2.inOut"
          });
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2 }
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} className={className} aria-hidden="true">
      {footerMobileMarkPaths.map((paths, line) => (
        <svg
          key={line}
          viewBox={footerMobileMarkViewBox}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {paths.map((d, index) => (
            <path
              key={index}
              d={d}
              fill="currentColor"
              stroke="currentColor"
              strokeWidth={1}
            />
          ))}
        </svg>
      ))}
    </div>
  );
}
