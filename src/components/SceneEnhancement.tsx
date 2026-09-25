"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const ThreeParticleScene = dynamic(
  () => import("@/src/scenes/ThreeParticleScene").then((module) => module.ThreeParticleScene),
  { ssr: false }
);

interface SceneEnhancementProps {
  variant: "hero" | "footer";
  model: string;
  accent: string;
  fallbackLabel: string;
}

export function SceneEnhancement({
  variant,
  model,
  accent,
  fallbackLabel
}: SceneEnhancementProps) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    const update = () => setEnabled(!reduced.matches && Boolean(context));
    update();
    reduced.addEventListener("change", update);
    return () => reduced.removeEventListener("change", update);
  }, []);

  return (
    <div
      className={`scene-enhancement scene-enhancement--${variant}`}
      role="img"
      aria-label={fallbackLabel}
    >
      <span className="sr-only">{fallbackLabel}</span>
      {enabled ? <ThreeParticleScene variant={variant} model={model} accent={accent} /> : null}
    </div>
  );
}
