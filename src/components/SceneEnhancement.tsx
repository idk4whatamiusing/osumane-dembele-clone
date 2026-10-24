"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

const ThreeParticleScene = dynamic(
  () => import("@/src/scenes/ThreeParticleScene").then((module) => module.ThreeParticleScene),
  { ssr: false }
);

// The particle field is rendered on the server as well, so every value has
// to be rounded: `Math.cos`/`Math.sqrt` are allowed to differ in the last
// bits between the Node and the browser engine, which would break hydration.
const round = (value: number) => Math.round(value * 1000) / 1000;

const fallbackParticles = Array.from({ length: 520 }, (_, index) => {
  const vertical = 1 - (2 * (index + 0.5)) / 520;
  const radial = Math.sqrt(Math.max(0, 1 - vertical * vertical));
  const angle = Math.PI * (3 - Math.sqrt(5)) * index;
  const depth = radial * Math.sin(angle);
  const perspective = 1 / (1.18 - depth * 0.16);
  const size = (0.62 + ((index * 17) % 13) / 18) * perspective;
  return {
    x: round(50 + Math.cos(angle) * radial * 48),
    y: round(50 + vertical * 48),
    size: round(size),
    rotation: (index * 29) % 90,
    opacity: round(0.42 + ((index * 13) % 55) / 100)
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
  const [sceneSupported, setSceneSupported] = useState(false);
  const [enhanced, setEnhanced] = useState(false);
  const readyRef = useRef(false);

  const signalHeroReady = useCallback(() => {
    if (variant !== "hero") return;
    document.documentElement.dataset.heroReady = "true";
    window.dispatchEvent(new Event("osumane:hero-ready"));
  }, [variant]);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    const supported = Boolean(context);
    if (!supported) signalHeroReady();
    // Release the probe context immediately so it cannot starve the real renderer.
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    const frame = window.requestAnimationFrame(() => setSceneSupported(supported));
    return () => window.cancelAnimationFrame(frame);
  }, [signalHeroReady]);

  const handleReady = useCallback(() => {
    readyRef.current = true;
    setEnhanced(true);
    signalHeroReady();
  }, [signalHeroReady]);

  const handleFail = useCallback((reason: string) => {
    console.warn(`[scene] WebGL scene disabled (${reason}); keeping CSS fallback.`);
    (window as unknown as { __sceneFail?: string }).__sceneFail = reason;
    setEnhanced(false);
    setSceneSupported(false);
    signalHeroReady();
  }, [signalHeroReady]);

  // Watchdog: the scene mounted but never signalled its first render
  // (dynamic import stall, zero-sized container, silent renderer failure).
  useEffect(() => {
    if (!sceneSupported || readyRef.current) return;
    const timer = setTimeout(() => {
      if (!readyRef.current) handleFail("timeout: no first render within 3s");
    }, 3000);
    return () => clearTimeout(timer);
  }, [sceneSupported, handleFail]);

  return (
    <div
      className={`scene-enhancement scene-enhancement--${variant}`}
      style={{ "--scene-accent": accent } as CSSProperties}
      role="img"
      aria-label={fallbackLabel}
    >
      <span className="sr-only">{fallbackLabel}</span>
      <div
        className={`scene-fallback scene-fallback--${variant}${enhanced ? " is-enhanced" : ""}`}
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
      {sceneSupported ? (
        <ThreeParticleScene
          variant={variant}
          model={model}
          hdr={hdr}
          textures={textures}
          particleCount={particleCount}
          accent={accent}
          onReady={handleReady}
          onFail={handleFail}
        />
      ) : null}
    </div>
  );
}
