"use client";

import { useGSAP } from "@gsap/react";
import { useRef, type ReactNode } from "react";
import { createMotionExperience } from "@/src/motion/setup";

interface MotionRootProps {
  children: ReactNode;
}

export function MotionRoot({ children }: MotionRootProps) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      let dispose: () => void = () => undefined;
      let cancelled = false;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
      const desktop = window.matchMedia("(min-width: 992px)");
      const updateMode = () => {
        document.documentElement.classList.toggle(
          "motion-enhanced",
          !reduced.matches && desktop.matches
        );
      };
      updateMode();
      reduced.addEventListener("change", updateMode);
      desktop.addEventListener("change", updateMode);
      void createMotionExperience(root.current).then((cleanup) => {
        if (cancelled) cleanup();
        else dispose = cleanup;
      });
      return () => {
        cancelled = true;
        dispose();
        reduced.removeEventListener("change", updateMode);
        desktop.removeEventListener("change", updateMode);
        document.documentElement.classList.remove("motion-enhanced");
      };
    },
    { scope: root }
  );

  return <div ref={root}>{children}</div>;
}
