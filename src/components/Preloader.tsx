"use client";

import { useEffect, useState } from "react";

interface PreloaderProps {
  name: string;
}

/**
 * The signature finishes drawing at ~1.6s and the panel clears at ~2.6s.
 * The ready event is fired right after so the motion runtime can start while
 * the panel is still fading out.
 */
const READY_DELAY = 2600;

export function Preloader({ name }: PreloaderProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let finished = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finish = () => {
      if (finished) return;
      finished = true;
      setReady(true);
      document.documentElement.dataset.loaderReady = "true";
      window.dispatchEvent(new Event("ankhi:loader-ready"));
    };
    const timeout = window.setTimeout(finish, reduced.matches ? 0 : READY_DELAY);
    return () => {
      window.clearTimeout(timeout);
      if (!finished) {
        finished = true;
        document.documentElement.dataset.loaderReady = "true";
      }
    };
  }, []);

  return (
    <div
      className={`preloader${ready ? " is-ready" : ""}`}
      role="status"
      aria-live="polite"
      aria-hidden={ready}
      data-loader
    >
      <span className="preloader__sig" aria-hidden="true">
        <span className="preloader__sig-line">Ne Pour Briller</span>
      </span>
      <span className="preloader__bar" aria-hidden="true">
        <i />
      </span>
      <span className="sr-only">{ready ? "" : name}</span>
    </div>
  );
}
