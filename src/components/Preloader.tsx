"use client";

import { useEffect, useState } from "react";

interface PreloaderProps {
  name: string;
}

export function Preloader({ name }: PreloaderProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timeout = window.setTimeout(() => setReady(true), reduced.matches ? 0 : 1700);
    const finish = () => setReady(true);
    window.addEventListener("load", finish, { once: true });
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("load", finish);
    };
  }, []);

  return (
    <div
      className={`preloader${ready ? " is-ready" : ""}`}
      role="status"
      aria-live="polite"
      aria-hidden={ready}
    >
      <span className="preloader__name">{name}</span>
      <span className="preloader__line" aria-hidden="true" />
      <span className="preloader__status">{ready ? "" : "Chargement"}</span>
    </div>
  );
}
