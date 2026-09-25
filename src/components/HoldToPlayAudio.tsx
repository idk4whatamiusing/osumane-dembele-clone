"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
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
  const holds = useRef(new Set<string>());
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const source = resolveMediaPath(audio.src, profile);

  const start = (holdId: string) => {
    const element = audioRef.current;
    if (!element || failed) return;
    holds.current.add(holdId);
    element.currentTime = 0;
    element.volume = 0.35;
    void element
      .play()
      .then(() => setPlaying(true))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFailed(true);
      });
  };

  const stop = (holdId: string) => {
    holds.current.delete(holdId);
    if (holds.current.size > 0) return;
    const element = audioRef.current;
    if (!element) return;
    element.pause();
    setPlaying(false);
  };

  const stopAll = () => {
    holds.current.clear();
    const element = audioRef.current;
    element?.pause();
    setPlaying(false);
  };

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
        onError={() => setFailed(true)}
        onEnded={() => setPlaying(false)}
      />
      <button
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
        <span className="audio-control__rings" aria-hidden="true">
          <i />
          <i />
          <i />
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
