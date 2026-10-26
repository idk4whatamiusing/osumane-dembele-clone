"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { AssetProfile, AudioContent } from "@/src/content/schema";
import { resolveMediaPath } from "@/src/lib/media";

interface HoldToPlayAudioProps {
  audio: AudioContent;
  profile: AssetProfile;
  unavailableLabel: string;
}

const HOLD_DURATION = 8000;
const AUDIO_FADE = 2500;
const MAX_VOLUME = 1;
const CIRCUMFERENCE = 315.73;

// The reference fades with GSAP's power2.out, both forwards and in reverse.
const fadeIn = (value: number) => 1 - Math.pow(1 - value, 2);
const fadeProgress = (value: number) =>
  1 - Math.sqrt(Math.max(0, 1 - Math.min(1, value)));

/**
 * The reference footer control is a 90px transparent circle. A thin beige
 * ring fills over eight seconds, the inner ring spins while idle, and the
 * whole button pulses while held. Releasing reverses both the ring and the
 * audio fade instead of snapping them back to zero.
 */
export function HoldToPlayAudio({
  audio,
  profile,
  unavailableLabel
}: HoldToPlayAudioProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const holds = useRef(new Set<string>());
  const progressFrame = useRef<number | null>(null);
  const progress = useRef(0);
  const holdStartedAt = useRef(0);
  const releaseStartedAt = useRef(0);
  const releaseFrom = useRef(0);
  const releaseVolume = useRef(0);
  const releaseVolumeProgress = useRef(0);
  const audioStartedAt = useRef(0);
  const completed = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const source = resolveMediaPath(audio.src, profile);

  const setProgress = (value: number) => {
    buttonRef.current?.style.setProperty(
      "--hold-offset",
      String(CIRCUMFERENCE * (1 - value))
    );
  };

  const stopAnimation = () => {
    if (progressFrame.current !== null) {
      window.cancelAnimationFrame(progressFrame.current);
      progressFrame.current = null;
    }
  };

  const tick = () => {
    const element = audioRef.current;
    if (!element) return;
    // eslint-disable-next-line react-hooks/purity -- animation frame callback
    const now = performance.now();
    const holding = holds.current.size > 0;

    if (holding) {
      progress.current = Math.min(
        1,
        Math.max(0, (now - holdStartedAt.current) / HOLD_DURATION)
      );
      const fade = Math.min(
        1,
        Math.max(0, (now - audioStartedAt.current) / AUDIO_FADE)
      );
      element.volume = Math.min(MAX_VOLUME, fadeIn(fade) * MAX_VOLUME);
      if (progress.current >= 1 && !completed.current) {
        completed.current = true;
        window.dispatchEvent(new CustomEvent("osumane:audio-complete"));
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/%C3%A7asentleroro");
      }
    } else {
      progress.current = Math.max(
        0,
        releaseFrom.current -
          (now - releaseStartedAt.current) / HOLD_DURATION
      );
      const fadeDuration = releaseVolumeProgress.current * AUDIO_FADE;
      const fade =
        fadeDuration > 0
          ? Math.max(
              0,
              1 - (now - releaseStartedAt.current) / fadeDuration
            )
          : 0;
      element.volume = Math.min(MAX_VOLUME, fadeIn(fade) * MAX_VOLUME);
      if (element.volume <= 0.001) {
        element.pause();
        element.volume = 0;
      }
    }

    setProgress(progress.current);
    if (progress.current <= 0 && !holding && element.paused) {
      progressFrame.current = null;
      return;
    }
    progressFrame.current = window.requestAnimationFrame(tick);
  };

  const ensureAnimation = () => {
    if (progressFrame.current === null) {
      progressFrame.current = window.requestAnimationFrame(tick);
    }
  };

  const start = (holdId: string) => {
    const element = audioRef.current;
    if (!element || failed) return;
    const wasIdle = holds.current.size === 0;
    holds.current.add(holdId);
    if (!wasIdle) return;

    completed.current = false;
    holdStartedAt.current = performance.now() - progress.current * HOLD_DURATION;
    if (progress.current <= 0) element.volume = 0;
    audioStartedAt.current =
      performance.now() -
      fadeProgress(element.volume / MAX_VOLUME) * AUDIO_FADE;

    if (element.paused) {
      void element
        .play()
        .then(() => {
          if (holds.current.size > 0) setPlaying(true);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setFailed(true);
        });
    } else {
      setPlaying(true);
    }

    window.dispatchEvent(new CustomEvent("osumane:hold-start"));
    ensureAnimation();
  };

  const stop = (holdId: string) => {
    const wasHeld = holds.current.delete(holdId);
    if (!wasHeld || holds.current.size > 0) return;

    const element = audioRef.current;
    releaseStartedAt.current = performance.now();
    releaseFrom.current = progress.current;
    releaseVolume.current = element?.volume ?? 0;
    releaseVolumeProgress.current = fadeProgress(releaseVolume.current / MAX_VOLUME);
    setPlaying(false);
    // A quick tap can release before the first frame has advanced the
    // progress. The footer still needs the hold-end event so its particles
    // and accelerated ring cannot stay stuck in the held state.
    window.dispatchEvent(new CustomEvent("osumane:hold-end"));
    ensureAnimation();
  };

  const stopAll = () => {
    const wasHolding = holds.current.size > 0;
    holds.current.clear();
    if (wasHolding) window.dispatchEvent(new CustomEvent("osumane:hold-end"));
    stopAnimation();
    progress.current = 0;
    releaseVolume.current = 0;
    releaseVolumeProgress.current = 0;
    setProgress(0);
    completed.current = false;
    const element = audioRef.current;
    if (element) {
      element.pause();
      element.volume = 0;
    }
    setPlaying(false);
  };

  useEffect(() => {
    const held = holds.current;
    setProgress(0);
    return () => {
      held.clear();
      stopAnimation();
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.repeat || (event.key !== " " && event.key !== "Enter")) return;
    event.preventDefault();
    start(`key:${event.key}`);
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    stop(`key:${event.key}`);
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    start(`pointer:${event.pointerId}`);
  };

  return (
    <div className="audio-control" data-audio-control>
      <audio
        ref={audioRef}
        src={source}
        preload="auto"
        loop
        controls
        playsInline
        className="audio-control__native"
        onError={() => setFailed(true)}
        onEnded={() => setPlaying(false)}
      />
      <button
        ref={buttonRef}
        type="button"
        className="audio-control__button"
        aria-label={audio.label}
        aria-describedby="audio-description"
        aria-pressed={playing}
        disabled={failed}
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={handlePointerDown}
        onPointerUp={(event) => stop(`pointer:${event.pointerId}`)}
        onPointerCancel={(event) => stop(`pointer:${event.pointerId}`)}
        onPointerLeave={(event) => stop(`pointer:${event.pointerId}`)}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={stopAll}
      >
        <span className="audio-control__spinner" aria-hidden="true" />
        <span className="audio-control__progress" aria-hidden="true">
          <svg viewBox="0 0 103 103" fill="none">
            <circle
              className="audio-control__progress-value"
              cx="51"
              cy="51"
              r="50.25"
              strokeDasharray={CIRCUMFERENCE}
              transform="matrix(0 1 1 0 0 0)"
            />
          </svg>
        </span>
        <span className="audio-control__label">
          {failed ? unavailableLabel : audio.holdLabel}
        </span>
      </button>
      <details className="audio-control__details">
        <summary>{audio.label}</summary>
        <p id="audio-description">{audio.description}</p>
        <p>{audio.transcript}</p>
      </details>
    </div>
  );
}
