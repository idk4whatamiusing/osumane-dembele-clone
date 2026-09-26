"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type CSSProperties } from "react";

const ThreeParticleScene = dynamic(
  () => import("@/src/scenes/ThreeParticleScene").then((module) => module.ThreeParticleScene),
  { ssr: false }
);

const fallbackParticles = Array.from({ length: 520 }, (_, index) => {
  const vertical = 1 - (2 * (index + 0.5)) / 520;
  const radial = Math.sqrt(Math.max(0, 1 - vertical * vertical));
  const angle = Math.PI * (3 - Math.sqrt(5)) * index;
  const depth = radial * Math.sin(angle);
  const perspective = 1 / (1.18 - depth * 0.16);
  const size = (0.62 + ((index * 17) % 13) / 18) * perspective;
  return {
    x: 50 + Math.cos(angle) * radial * 48,
    y: 50 + vertical * 48,
    size,
    rotation: (index * 29) % 90,
    opacity: 0.42 + ((index * 13) % 55) / 100
  };
});

interface SceneEnhancementProps {
  variant: "hero" | "footer";
  model: string;
  hdr?: string;
  textures?: string[];
  particleCount?: number;
  accent: string;
  fallbackLabel: string;
}

export function SceneEnhancement({
  variant,
  model,
  hdr,
  textures,
  particleCount,
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
      style={{ "--scene-accent": accent } as CSSProperties}
      role="img"
      aria-label={fallbackLabel}
    >
      <span className="sr-only">{fallbackLabel}</span>
      <div
        className={`scene-fallback scene-fallback--${variant}${enabled ? " is-enhanced" : ""}`}
        aria-hidden="true"
      >
        {variant === "hero" ? (
          <svg viewBox="0 0 100 100" role="presentation">
            {fallbackParticles.map((particle, index) => (
              <rect
                key={index}
                x={particle.x}
                y={particle.y}
                width={particle.size}
                height={particle.size}
                fill={accent}
                opacity={particle.opacity}
                transform={`rotate(${particle.rotation} ${particle.x} ${particle.y})`}
              />
            ))}
          </svg>
        ) : (
          <>
            <span className="scene-fallback__ball" />
            <span className="scene-fallback__ring" />
          </>
        )}
      </div>
      {enabled ? (
        <ThreeParticleScene
          variant={variant}
          model={model}
          hdr={hdr}
          textures={textures}
          particleCount={particleCount}
          accent={accent}
        />
      ) : null}
    </div>
  );
}
