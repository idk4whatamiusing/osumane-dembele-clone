"use client";

import { useGSAP } from "@gsap/react";
import { useEffect, useRef, type ReactNode } from "react";
import { createMotionExperience } from "@/src/motion/setup";

interface MotionRootProps {
  children: ReactNode;
}

export function MotionRoot({ children }: MotionRootProps) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = window.matchMedia("(min-width: 992px)");
    const update = () => {
      document.documentElement.classList.toggle(
        "motion-enhanced",
        !reduced.matches && desktop.matches
      );
    };
    update();
    const timer = window.setTimeout(update, 4600);
    reduced.addEventListener("change", update);
    desktop.addEventListener("change", update);
    return () => {
      window.clearTimeout(timer);
      reduced.removeEventListener("change", update);
      desktop.removeEventListener("change", update);
    };
  }, []);

  useGSAP(
    () => {
      let dispose: () => void = () => undefined;
      let cancelled = false;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
      const desktop = window.matchMedia("(min-width: 992px)");
      let loaderReady = document.documentElement.dataset.loaderReady === "true";
      const updateMode = () => {
        const ready = loaderReady || document.documentElement.dataset.loaderReady === "true";
        document.documentElement.classList.toggle(
          "motion-enhanced",
          ready && !reduced.matches && desktop.matches
        );
      };
      const onLoaderReady = () => {
        loaderReady = true;
        updateMode();
      };
      updateMode();
      const modeFallback = window.setTimeout(updateMode, 4800);
      reduced.addEventListener("change", updateMode);
      desktop.addEventListener("change", updateMode);
      window.addEventListener("ankhi:loader-ready", onLoaderReady);
      void createMotionExperience(root.current).then((cleanup) => {
        if (cancelled) cleanup();
        else dispose = cleanup;
      });
      return () => {
        cancelled = true;
        window.clearTimeout(modeFallback);
        dispose();
        reduced.removeEventListener("change", updateMode);
        desktop.removeEventListener("change", updateMode);
        window.removeEventListener("ankhi:loader-ready", onLoaderReady);
        document.documentElement.classList.remove("motion-enhanced");
      };
    },
    { scope: root }
  );

  return <div ref={root}>{children}</div>;
}
