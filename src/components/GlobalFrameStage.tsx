"use client";

import { useEffect, useRef } from "react";
import type { AssetProfile, FrameSequence } from "@/src/content/schema";
import { frameUrl } from "@/src/content/schema";
import { resolveMediaPath } from "@/src/lib/media";
import {
  DECODE_SIZE,
  getCacheEntry,
  trackCacheEntry,
  type CacheEntry,
  type Decoded
} from "@/src/motion/frameCache";
import { publishFrameStage, subscribeFrameStage, type FrameStageState } from "@/src/motion/frameStage";

interface GlobalFrameStageProps {
  profile: AssetProfile;
}

/**
 * The reference site keeps one fixed canvas at the centre of the viewport.
 * The scroll timeline only moves and fades that canvas; the jersey itself
 * spins on its own clock at thirty frames per second, accelerated by the
 * wheel. This is the same split: CSS/GSAP own the position, this component
 * owns the rotation.
 */
const BASE_SPEED = 30;
const MAX_VELOCITY = 500;
const DRAW_SCALE = 0.65;

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

export function GlobalFrameStage({ profile }: GlobalFrameStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (profile === "owned") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(max-width: 991px)").matches) {
      return;
    }

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    let disposed = false;
    let controller: AbortController | null = null;
    let activeSequence: FrameSequence | null = null;
    let activeChapter: string | null = null;
    let currentFrame = 0;
    let opacity = 0;
    let yPercent = -50;
    let scrollVelocity = 0;
    let scrollDirection = 1;
    let raf = 0;
    let lastTime = 0;

    const sizeCanvas = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (
        canvas.width !== Math.round(width * ratio) ||
        canvas.height !== Math.round(height * ratio)
      ) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
    };

    const draw = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      context.clearRect(0, 0, width, height);
      canvas.style.opacity = String(opacity);
      canvas.style.transform = `translate(-50%, ${yPercent}%)`;
      if (!activeSequence || opacity <= 0.001) return;

      const entry = getCacheEntry(activeSequence.basePath);
      if (!entry?.frames.length) return;
      const total = activeSequence.frameCount;
      let index = Math.floor(currentFrame) % total;
      if (index < 0) index += total;
      const frame = entry.frames[index];
      if (!frame) return;

      const sourceWidth = frame.width || activeSequence.width || 1200;
      const sourceHeight = frame.height || activeSequence.height || 1200;
      const scale =
        Math.min(width / sourceWidth, height / sourceHeight) * DRAW_SCALE;
      const drawWidth = sourceWidth * scale;
      const drawHeight = sourceHeight * scale;
      context.drawImage(
        frame,
        (width - drawWidth) / 2,
        (height - drawHeight) / 2,
        drawWidth,
        drawHeight
      );
    };

    const tick = (time: number) => {
      if (disposed) return;
      const delta = lastTime ? Math.min(0.05, (time - lastTime) / 1000) : 0;
      lastTime = time;
      scrollVelocity *= 0.9;
      if (activeSequence && activeChapter) {
        const speed = BASE_SPEED + Math.abs(scrollVelocity) / 3;
        currentFrame += speed * delta * scrollDirection;
        draw();
      }
      raf = window.requestAnimationFrame(tick);
    };

    const load = async (sequence: FrameSequence, chapterId: string) => {
      controller?.abort();
      controller = new AbortController();
      activeSequence = sequence;
      activeChapter = chapterId;
      currentFrame = 0;

      let entry = getCacheEntry(sequence.basePath);
      if (!entry || entry.sequence !== sequence) {
        entry = { frames: [], sequence };
        trackCacheEntry(entry);
      }

      if (entry.frames.length >= sequence.frameCount) {
        draw();
        return;
      }

      const key = sequence.basePath;
      const urls = Array.from({ length: sequence.frameCount }, (_, index) =>
        resolveMediaPath(frameUrl(sequence, index), profile)
      );

      for (let start = 0; start < urls.length; start += 16) {
        if (disposed || controller.signal.aborted) return;
        const batch = await Promise.all(
          urls.slice(start, start + 16).map(async (url) => {
            try {
              const response = await fetch(url, { signal: controller?.signal });
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
        if (disposed || controller.signal.aborted) {
          closeFrames(batch);
          return;
        }
        const cache = getCacheEntry(key);
        if (cache !== entry) {
          closeFrames(batch);
          return;
        }
        entry.frames.push(...batch);
        draw();
      }
    };

    const closeFrames = (frames: Array<Decoded | undefined>) => {
      for (const frame of frames) {
        if (typeof ImageBitmap !== "undefined" && frame instanceof ImageBitmap) {
          frame.close();
        }
      }
    };

    const onWheel = (event: WheelEvent) => {
      if (!activeSequence) return;
      scrollVelocity = Math.max(
        -MAX_VELOCITY,
        Math.min(MAX_VELOCITY, event.deltaY * 6)
      );
      if (event.deltaY > 0) scrollDirection = 1;
      else if (event.deltaY < 0) scrollDirection = -1;
    };

    const unsub = subscribeFrameStage((next) => {
      opacity = next.opacity;
      yPercent = next.yPercent;
      if (next.active && next.sequence && next.chapterId) {
        if (next.chapterId !== activeChapter || next.sequence !== activeSequence) {
          void load(next.sequence, next.chapterId);
        }
      } else if (!next.active) {
        activeChapter = null;
        activeSequence = null;
        currentFrame = 0;
      }
      draw();
    });

    const onResize = () => {
      sizeCanvas();
      draw();
    };

    sizeCanvas();
    draw();
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    raf = window.requestAnimationFrame(tick);

    return () => {
      disposed = true;
      controller?.abort();
      unsub();
      window.cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      activeSequence = null;
      activeChapter = null;
      context.clearRect(0, 0, canvas.width, canvas.height);
      publishFrameStage({ active: false, opacity: 0, yPercent: -50 });
    };
  }, [profile]);

  return (
    <canvas
      ref={canvasRef}
      className="global-frame-stage"
      aria-hidden="true"
      data-global-frame-stage
    />
  );
}
