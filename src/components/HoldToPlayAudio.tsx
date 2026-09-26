"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { AssetProfile, AudioContent } from "@/src/content/schema";
import { resolveMediaPath } from "@/src/lib/media";

interface HoldToPlayAudioProps {
  audio: AudioContent;
  profile: AssetProfile;
  unavailableLabel: string;
}

export function HoldToPlayAudio({
  audio,
  profile,
  unavailableLabel
}: HoldToPlayAudioProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const holds = useRef(new Set<string>());
  const progressFrame = useRef<number | null>(null);
  const progressStartedAt = useRef(0);
  const completed = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const source = resolveMediaPath(audio.src, profile);

  const setProgress = (value: number) => {
    buttonRef.current?.style.setProperty("--hold-progress", String(value));
  };

  const stopAnimation = () => {
    if (progressFrame.current !== null) {
      window.cancelAnimationFrame(progressFrame.current);
      progressFrame.current = null;
    }
  };

  const start = (holdId: string) => {
    const element = audioRef.current;
    if (!element || failed) return;
    const wasIdle = holds.current.size === 0;
    holds.current.add(holdId);
    if (!wasIdle) return;
    completed.current = false;
    progressStartedAt.current = performance.now();
    element.currentTime = 0;
    element.volume = 0;
    const animate = () => {
      if (holds.current.size === 0) return;
      const elapsed = performance.now() - progressStartedAt.current;
      const progress = Math.min(1, elapsed / 8000);
      element.volume = Math.min(0.35, (elapsed / 2500) * 0.35);
      setProgress(progress);
      if (progress >= 1 && !completed.current) {
        completed.current = true;
        window.dispatchEvent(new CustomEvent("ankhi:audio-complete"));
      }
      progressFrame.current = window.requestAnimationFrame(animate);
    };
    void element
      .play()
      .then(() => setPlaying(true))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFailed(true);
      });
    progressFrame.current = window.requestAnimationFrame(animate);
  };

  const stop = (holdId: string) => {
    holds.current.delete(holdId);
    if (holds.current.size > 0) return;
    stopAnimation();
    setProgress(0);
    completed.current = false;
    const element = audioRef.current;
    if (!element) return;
    element.pause();
    element.volume = 0;
    setPlaying(false);
  };

  const stopAll = () => {
    holds.current.clear();
    stopAnimation();
    setProgress(0);
    completed.current = false;
    const element = audioRef.current;
    if (element) {
      element.pause();
      element.volume = 0;
    }
    setPlaying(false);
  };

  useEffect(() => () => {
    holds.current.clear();
    stopAnimation();
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
    event.currentTarget.setPointerCapture(event.pointerId);
    start(`pointer:${event.pointerId}`);
  };

  return (
    <div className="audio-control" data-audio-control>
      <audio
        ref={audioRef}
        src={source}
        preload="none"
        loop
        controls
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
        onPointerDown={handlePointerDown}
        onPointerUp={(event) => stop(`pointer:${event.pointerId}`)}
        onPointerCancel={(event) => stop(`pointer:${event.pointerId}`)}
        onPointerLeave={(event) => stop(`pointer:${event.pointerId}`)}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={stopAll}
      >
        <span className="audio-control__progress" aria-hidden="true">
          <svg viewBox="0 0 44 44">
            <circle className="audio-control__progress-track" cx="22" cy="22" r="19" pathLength="1" />
            <circle className="audio-control__progress-value" cx="22" cy="22" r="19" pathLength="1" />
          </svg>
        </span>
        <span>{failed ? unavailableLabel : audio.holdLabel}</span>
      </button>
      <details className="audio-control__details">
        <summary>{audio.label}</summary>
        <p id="audio-description">{audio.description}</p>
        <p>{audio.transcript}</p>
      </details>
    </div>
  );
}
