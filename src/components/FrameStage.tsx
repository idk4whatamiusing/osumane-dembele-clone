"use client";

import { useEffect, useRef } from "react";
import type { AssetProfile, FrameSequence } from "@/src/content/schema";
import { frameUrl } from "@/src/content/schema";
import { resolveMediaPath } from "@/src/lib/media";
import {
  DECODE_SIZE,
  getCacheEntry,
  trackCacheEntry,
  type CacheEntry
} from "@/src/motion/frameCache";
import { subscribeFrameStage, type FrameStageState } from "@/src/motion/frameStage";

interface FrameStageProps {
  chapterId: string;
  sequence: FrameSequence;
  /** Colour of the chapter, used as the field behind the jersey. */
  accent: string;
  profile: AssetProfile;
}

/**
 * The jersey is painted far wider than the viewport, the way the reference
 * site zooms into the fabric until only the cloth and the number are visible.
 */
const STAGE_SCALE = 2.05;

const emptyState: FrameStageState = {
  chapterId: null,
  sequence: null,
  index: 0,
  opacity: 0,
  yPercent: -50,
  offsetY: 0,
  scale: 1,
  active: false
};

export function FrameStage({ chapterId, sequence, accent, profile }: FrameStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const state = useRef<FrameStageState>(emptyState);
  const drawn = useRef(-1);

  useEffect(() => {
    if (profile === "owned") return;
    let cancelled = false;
    const controller = new AbortController();

    const decode = async (target: FrameSequence) => {
      const key = target.basePath;
      if (getCacheEntry(key)) return;
      const urls = Array.from({ length: target.frameCount }, (_, index) =>
        resolveMediaPath(frameUrl(target, index), profile)
      );
      const entry: CacheEntry = { frames: [], sequence: target };
      trackCacheEntry(entry);

      for (let start = 0; start < urls.length; start += 12) {
        if (cancelled) return;
        const batch = await Promise.all(
          urls.slice(start, start + 12).map(async (url) => {
            try {
              const response = await fetch(url, { signal: controller.signal });
              if (!response.ok) return undefined;
              const blob = await response.blob();
              if ("createImageBitmap" in window) {
                return await createImageBitmap(blob, {
                  resizeWidth: DECODE_SIZE,
                  resizeHeight: DECODE_SIZE,
                  resizeQuality: "medium"
                });
              }
              const image = new Image();
              image.src = URL.createObjectURL(blob);
              await image.decode();
              return image;
            } catch {
              return undefined;
            }
          })
        );
        if (cancelled) return;
        // The entry can be evicted by another chapter starting to decode.
        if (getCacheEntry(key) !== entry) {
          for (const frame of batch) {
            if (typeof ImageBitmap !== "undefined" && frame instanceof ImageBitmap) frame.close();
          }
          return;
        }
        entry.frames.push(...batch);
        // Newly decoded frames are painted immediately.
        drawn.current = -1;
        render();
      }
    };

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext("2d");
      if (!context) return;

      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const host = canvas.parentElement;
      const width = host?.clientWidth || window.innerWidth;
      const height = host?.clientHeight || window.innerHeight;
      if (
        canvas.width !== Math.round(width * ratio) ||
        canvas.height !== Math.round(height * ratio)
      ) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        drawn.current = -1;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      if (state.current.active && state.current.opacity > 0.001) {
        // The beat covers the scene, the way the reference site replaces the
        // illustration with the fabric of the shirt.
        context.fillStyle = accent;
        context.fillRect(0, 0, width, height);
      }

      const current = state.current;
      const target = current.sequence;
      if (!target || !current.active) return;
      const entry = getCacheEntry(target.basePath);
      const index = Math.max(0, Math.min(target.frameCount - 1, current.index));
      const frame = entry?.frames[index];
      if (!frame) return;
      drawn.current = index;
      const size = Math.max(width, height) * STAGE_SCALE;
      context.drawImage(frame, (width - size) / 2, (height - size) / 2 - size * 0.06, size, size);
    };

    const unsub = subscribeFrameStage((next) => {
      // A stage only reacts to the chapter it belongs to.
      if (next.chapterId && next.chapterId !== chapterId) return;
      const sequenceChanged = next.sequence !== state.current.sequence;
      state.current = next;
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.setProperty("--frame-stage-opacity", String(next.opacity));
        canvas.style.setProperty("--frame-stage-y", `${next.offsetY}px`);
        canvas.style.setProperty("--frame-stage-scale", String(next.scale));
        canvas.classList.toggle("is-active", next.active && next.opacity > 0.001);
      }
      if (sequenceChanged) drawn.current = -1;
      if (next.sequence && next.active) void decode(next.sequence);
      render();
    });

    render();
    return () => {
      cancelled = true;
      controller.abort();
      unsub();
    };
  }, [accent, chapterId, profile]);

  return (
    <canvas
      ref={canvasRef}
      className="frame-stage"
      aria-hidden="true"
      data-frame-stage={chapterId}
    />
  );
}
