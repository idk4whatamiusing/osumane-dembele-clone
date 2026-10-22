import type { FrameSequence } from "@/src/content/schema";

/**
 * Shared cache of decoded frames.
 *
 * Every chapter owns a stage, so the cache has to live outside the
 * components: otherwise a full scroll would leave a decoded copy of every
 * chapter in memory. The cache keeps a small number of chapters at a time and
 * releases the bitmaps of the others.
 */

/**
 * Decoded frames are resized to the size they are actually painted at.
 *
 * The source frames are 1200x1200. Keeping them at full resolution costs
 * roughly 875 MB of RGBA bitmap per chapter, which is why the previous
 * implementation (one canvas per chapter, every chapter decoded at once)
 * held several gigabytes. One chapter at 768px is about 360 MB.
 */
export const DECODE_SIZE = 768;

/** How many chapters may stay decoded at the same time. */
export const MAX_CACHED_SEQUENCES = 2;

export type Decoded = ImageBitmap | HTMLImageElement;

export interface CacheEntry {
  frames: Array<Decoded | undefined>;
  sequence: FrameSequence;
}

const cache = new Map<string, CacheEntry>();

function release(entry: CacheEntry): void {
  for (const frame of entry.frames) {
    if (typeof ImageBitmap !== "undefined" && frame instanceof ImageBitmap) frame.close();
  }
}

export function getCacheEntry(key: string): CacheEntry | undefined {
  return cache.get(key);
}

/** Registers a chapter and releases the oldest ones when the limit is hit. */
export function trackCacheEntry(entry: CacheEntry): void {
  cache.set(entry.sequence.basePath, entry);
  while (cache.size > MAX_CACHED_SEQUENCES) {
    const oldest = cache.keys().next();
    if (oldest.done) break;
    const value = cache.get(oldest.value);
    cache.delete(oldest.value);
    if (value) release(value);
  }
}

export function releaseAllFrames(): void {
  for (const entry of cache.values()) release(entry);
  cache.clear();
}
