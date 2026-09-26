"use client";

import { useEffect, useState } from "react";

interface PreloaderProps {
  name: string;
}

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
    const timeout = window.setTimeout(finish, reduced.matches ? 0 : 4200);
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
      <svg className="preloader__mark" viewBox="0 0 180 42" aria-hidden="true">
        <path d="M8 31C23 8 38 8 53 31C68 54 83 54 98 31C113 8 128 8 143 31" />
        <path d="M18 35C39 17 54 17 75 35C96 53 111 53 132 35C148 21 159 21 172 31" />
      </svg>
      <span className="preloader__name">{name}</span>
      <span className="preloader__line" aria-hidden="true" />
      <span className="preloader__status">{ready ? "" : "Chargement"}</span>
    </div>
  );
}
