"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { acquireMotionExperience } from "@/src/motion/setup";

interface MotionRootProps {
  children: ReactNode;
}

export function MotionRoot({ children }: MotionRootProps) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const html = document.documentElement;

    // The pre-animation state is applied before the first paint by the
    // bootstrap script in the document. Release it if the motion runtime
    // never takes over so the page never stays stuck in its intro state.
    const release = window.setTimeout(() => html.classList.remove("motion-pending"), 6000);

    const dispose = acquireMotionExperience(root.current);

    return () => {
      window.clearTimeout(release);
      dispose();
      html.classList.remove("motion-pending");
    };
  }, []);

  return <div ref={root}>{children}</div>;
}
