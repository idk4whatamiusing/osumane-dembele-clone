"use client";

import { useEffect, useRef, useState } from "react";
import type { AssetProfile, VideoMedia } from "@/src/content/schema";
import { resolveMediaPath } from "@/src/lib/media";
import { SafeImage } from "./SafeImage";

interface CinematicMediaProps {
  media: VideoMedia;
  profile: AssetProfile;
  title: string;
  playLabel: string;
  pauseLabel: string;
}

export function CinematicMedia({
  media,
  profile,
  title,
  playLabel,
  pauseLabel
}: CinematicMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const poster = resolveMediaPath(media.poster ?? "/assets/core/fallback-poster.svg", profile);
  const sources = [
    media.webm
      ? { src: resolveMediaPath(media.webm, profile), type: "video/webm" }
      : null,
    media.mp4
      ? { src: resolveMediaPath(media.mp4, profile), type: "video/mp4" }
      : null
  ].filter((source): source is { src: string; type: string } => Boolean(source));

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || failed) return;
    if (reducedMotion) {
      video.pause();
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
        } else {
          video.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.35 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [failed, reducedMotion]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().then(() => setPlaying(true)).catch(() => setFailed(true));
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  return (
    <figure className="cinematic-media" data-reveal>
      <div className="cinematic-media__frame">
        {failed ? (
          <SafeImage
            src={poster}
            alt={media.description}
            width={1366}
            height={768}
            loading="lazy"
            decoding="async"
            fallbackSrc="/assets/core/fallback-poster.svg"
          />
        ) : (
          <video
            ref={videoRef}
            poster={poster}
            muted
            loop
            playsInline
            preload="metadata"
            controls
            aria-label={media.description}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onError={() => setFailed(true)}
          >
            {sources.map((source) => (
              <source key={source.src} src={source.src} type={source.type} />
            ))}
          </video>
        )}
        <button
          className="media-toggle"
          type="button"
          onClick={toggle}
          disabled={failed}
          aria-label={playing ? pauseLabel : playLabel}
        >
          <span aria-hidden="true">{playing ? "Ⅱ" : "▶"}</span>
        </button>
      </div>
      <figcaption>
        <span>{title}</span>
        <span>{media.description}</span>
      </figcaption>
      {media.transcript ? <p className="sr-only">{media.transcript}</p> : null}
    </figure>
  );
}
