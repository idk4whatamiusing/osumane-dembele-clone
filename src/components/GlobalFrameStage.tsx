"use client";

import { useEffect, useRef } from "react";
import type { AssetProfile, FrameSequence } from "@/src/content/schema";
import { frameUrl } from "@/src/content/schema";
import { resolveMediaPath } from "@/src/lib/media";
import {
  DECODE_SIZE,
  getCacheEntry,
  touchCacheEntry,
  trackCacheEntry,
  type CacheEntry,
  type Decoded
} from "@/src/motion/frameCache";
import { publishFrameStage, subscribeFrameStage } from "@/src/motion/frameStage";

interface GlobalFrameStageProps {
  profile: AssetProfile;
  sequences: FrameSequence[];
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
const BATCH_SIZE = 24;

export function GlobalFrameStage({ profile, sequences }: GlobalFrameStageProps) {
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
    let loadingKey: string | null = null;
    let prefetchController: AbortController | null = null;
    let prefetchKey: string | null = null;
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

    const closeFrames = (frames: Array<Decoded | undefined>) => {
      for (const frame of frames) {
        if (typeof ImageBitmap !== "undefined" && frame instanceof ImageBitmap) {
          frame.close();
        }
      }
    };

    const draw = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      context.clearRect(0, 0, width, height);
      canvas.style.opacity = String(opacity);
      canvas.style.transform = `translate(-50%, ${yPercent}%)`;
      if (!activeSequence || opacity <= 0.001) return;

      const entry = getCacheEntry(activeSequence.basePath);
      const loaded = entry?.frames.length ?? 0;
      if (!entry || loaded === 0) return;

      const total = activeSequence.frameCount;
      let index = Math.floor(currentFrame) % total;
      if (index < 0) index += total;

      // While the rest of the chapter is still arriving, hold the newest
      // decoded frame instead of wrapping back to frame zero. Once the
      // sequence is complete this clamp never applies.
      if (index >= loaded) index = loaded - 1;

      let frame = entry.frames[index];
      while (!frame && index > 0) {
        index -= 1;
        frame = entry.frames[index];
      }
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

      // Do not wait for the full sequence. As soon as one frame is decoded
      // the jersey starts rotating, exactly like the reference preloaded
      // canvas. Later batches simply extend the part of the loop available.
      const entry = activeSequence ? getCacheEntry(activeSequence.basePath) : null;
      if (activeSequence && activeChapter && entry?.frames.length) {
        const speed = BASE_SPEED + Math.abs(scrollVelocity) / 3;
        currentFrame += speed * delta * scrollDirection;
        draw();
      }
      raf = window.requestAnimationFrame(tick);
    };

    const ensureEntry = (sequence: FrameSequence): CacheEntry => {
      const key = sequence.basePath;
      let entry = getCacheEntry(key);
      if (!entry || entry.sequence.basePath !== key) {
        entry = { frames: [], sequence };
        trackCacheEntry(entry);
      } else {
        entry.sequence = sequence;
        touchCacheEntry(key);
      }
      return entry;
    };

    const decodeFrame = async (
      url: string,
      signal: AbortSignal
    ): Promise<Decoded | undefined> => {
      try {
        const response = await fetch(url, { signal });
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
    };

    const fillEntry = async (
      sequence: FrameSequence,
      entry: CacheEntry,
      signal: AbortSignal,
      onBatch?: () => void
    ): Promise<boolean> => {
      const key = sequence.basePath;
      const urls = Array.from({ length: sequence.frameCount }, (_, index) =>
        resolveMediaPath(frameUrl(sequence, index), profile)
      );

      // A previous pass may have loaded only the first few frames. Resume at
      // the first missing frame instead of appending a second copy of frame 0.
      let start = entry.frames.length;

      // Fetch frame zero on its own. Waiting for a full parallel batch made
      // the first paint wait for twenty-four decodes even though one frame is
      // enough to start the rotation.
      if (start === 0 && urls.length) {
        const first = await decodeFrame(urls[0], signal);
        if (disposed || signal.aborted || getCacheEntry(key) !== entry) {
          if (first) closeFrames([first]);
          return false;
        }
        entry.frames.push(first);
        start = 1;
        onBatch?.();
      }

      for (; start < urls.length; start += BATCH_SIZE) {
        if (disposed || signal.aborted) return false;
        const batch = await Promise.all(
          urls.slice(start, start + BATCH_SIZE).map((url) => decodeFrame(url, signal))
        );
        if (disposed || signal.aborted) {
          closeFrames(batch);
          return false;
        }
        const cache = getCacheEntry(key);
        if (cache !== entry) {
          closeFrames(batch);
          return false;
        }
        entry.frames.push(...batch);
        onBatch?.();
      }

      return !disposed && !signal.aborted && getCacheEntry(key) === entry;
    };

    /**
     * Loads the chapter after the active one in the background. The reference
     * preloads every section at startup; doing the same one chapter ahead
     * gives the same seamless hand-off while keeping only two decoded
     * sequences in memory.
     */
    const prefetch = async (sequence: FrameSequence) => {
      if (disposed) return;
      const key = sequence.basePath;
      if (!key || activeSequence?.basePath === key) return;

      const existing = getCacheEntry(key);
      if (existing && existing.frames.length >= sequence.frameCount) return;
      if (prefetchKey === key && prefetchController && !prefetchController.signal.aborted) {
        return;
      }

      prefetchController?.abort();
      const thisController = new AbortController();
      prefetchController = thisController;
      prefetchKey = key;

      // Keep the visible chapter as the most recent cache entry so adding the
      // next one evicts an older sequence, never the one on screen.
      if (activeSequence) touchCacheEntry(activeSequence.basePath);
      const entry = ensureEntry(sequence);
      const complete = await fillEntry(sequence, entry, thisController.signal);

      if (prefetchKey === key) {
        prefetchKey = null;
        prefetchController = null;
      }
      if (complete && activeSequence?.basePath === key) {
        draw();
        prefetchNext();
      }
    };

    const prefetchNext = () => {
      if (!activeSequence) return;
      const entry = getCacheEntry(activeSequence.basePath);
      if (!entry || entry.frames.length < activeSequence.frameCount) return;
      const index = sequences.findIndex(
        (sequence) => sequence.basePath === activeSequence?.basePath
      );
      if (index < 0) return;
      const next = sequences[index + 1];
      if (next) void prefetch(next);
    };

    const load = async (sequence: FrameSequence, chapterId: string) => {
      const key = sequence.basePath;

      // A repeated publish from the same chapter must not abort the batch
      // that is already in flight. The previous version restarted the whole
      // sequence on every scroll update, which caused hundreds of duplicate
      // requests and left the canvas empty after the first chapter.
      if (loadingKey === key && controller && !controller.signal.aborted) {
        activeSequence = sequence;
        activeChapter = chapterId;
        return;
      }

      // If the chapter is already being preloaded, promote that load instead
      // of aborting it and fetching the same frames again.
      if (
        prefetchKey === key &&
        prefetchController &&
        !prefetchController.signal.aborted
      ) {
        controller?.abort();
        controller = null;
        loadingKey = null;
        activeSequence = sequence;
        activeChapter = chapterId;
        currentFrame = 0;
        draw();
        return;
      }

      const existing = getCacheEntry(key);
      const alreadyComplete =
        existing?.sequence.basePath === key &&
        existing.frames.length >= sequence.frameCount;

      // The active chapter always takes priority over speculative loading.
      // If it is already complete, leave the next chapter's prefetch alone:
      // aborting it here would throw away useful work every time a chapter
      // becomes visible.
      if (!alreadyComplete) {
        prefetchController?.abort();
        prefetchController = null;
        prefetchKey = null;
      }
      controller?.abort();
      const thisController = new AbortController();
      controller = thisController;
      loadingKey = key;
      activeSequence = sequence;
      activeChapter = chapterId;
      currentFrame = 0;

      const entry = ensureEntry(sequence);
      if (entry.frames.length >= sequence.frameCount) {
        if (loadingKey === key) loadingKey = null;
        draw();
        prefetchNext();
        return;
      }

      const complete = await fillEntry(sequence, entry, thisController.signal, () => {
        if (activeSequence?.basePath === key) draw();
      });

      if (
        complete &&
        !disposed &&
        activeSequence?.basePath === key &&
        getCacheEntry(key) === entry
      ) {
        draw();
        prefetchNext();
      }
      if (loadingKey === key) loadingKey = null;
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
        const changed =
          next.chapterId !== activeChapter ||
          next.sequence.basePath !== activeSequence?.basePath;
        if (changed) {
          void load(next.sequence, next.chapterId);
        }
      } else if (!next.active) {
        controller?.abort();
        controller = null;
        loadingKey = null;
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

    // Match the reference's startup preload for the first chapter. The next
    // chapter is queued as soon as the active one is complete.
    if (sequences[0]) void prefetch(sequences[0]);

    return () => {
      disposed = true;
      controller?.abort();
      prefetchController?.abort();
      unsub();
      window.cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      activeSequence = null;
      activeChapter = null;
      context.clearRect(0, 0, canvas.width, canvas.height);
      publishFrameStage({ active: false, opacity: 0, yPercent: -50 });
    };
  }, [profile, sequences]);

  return (
    <canvas
      ref={canvasRef}
      className="global-frame-stage"
      aria-hidden="true"
      data-global-frame-stage
    />
  );
}
