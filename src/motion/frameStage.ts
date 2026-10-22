import type { FrameSequence } from "@/src/content/schema";

/**
 * State of the frame stage.
 *
 * The reference site renders the rotating jersey on a fixed canvas that
 * sits behind the horizontally scrolling chapter scenes. Every chapter owns
 * one stage, so the state carries the chapter it belongs to and a stage only
 * reacts to the updates addressed to it.
 */
export interface FrameStageState {
  /** Id of the chapter that currently owns the stage. */
  chapterId: string | null;
  /** Frame sequence of the chapter that currently owns the stage. */
  sequence: FrameSequence | null;
  /** Index of the frame to draw inside the active sequence. */
  index: number;
  /** Opacity of the stage, 0 hides it completely. */
  opacity: number;
  /** Vertical offset in pixels, used for the exit slide. */
  offsetY: number;
  /** Whether the stage should be painted at all. */
  active: boolean;
}

type Listener = (state: FrameStageState) => void;

const state: FrameStageState = {
  chapterId: null,
  sequence: null,
  index: 0,
  opacity: 0,
  offsetY: 0,
  active: false
};

const listeners = new Set<Listener>();

export function subscribeFrameStage(listener: Listener): () => void {
  listeners.add(listener);
  listener(state);
  return () => {
    listeners.delete(listener);
  };
}

export function publishFrameStage(patch: Partial<FrameStageState>): void {
  Object.assign(state, patch);
  for (const listener of listeners) listener(state);
}

export function resetFrameStage(): void {
  publishFrameStage({
    chapterId: null,
    sequence: null,
    index: 0,
    opacity: 0,
    offsetY: 0,
    active: false
  });
}
