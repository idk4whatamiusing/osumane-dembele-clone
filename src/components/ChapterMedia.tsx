"use client";

import { useEffect, useState } from "react";
import type {
  AssetProfile,
  FrameSequence as FrameSequenceData,
  VideoMedia
} from "@/src/content/schema";
import { resolveMediaPath } from "@/src/lib/media";

interface ChapterMediaProps {
  sequence: FrameSequenceData;
  mobileVideo: VideoMedia;
  profile: AssetProfile;
}

/**
 * The static fallback for the chapter's frame sequence.
 *
 * On the enhanced desktop layout the rotating jersey is painted by the
 * single global frame stage, so this component only carries the poster and
 * the small-screen video. Decoding the 152 frames of every chapter here is
 * what used to hold several gigabytes of bitmaps in memory.
 */
export function ChapterMedia({ sequence, mobileVideo, profile }: ChapterMediaProps) {
  const [mobile, setMobile] = useState(false);
  const fallback = "/assets/core/fallback-poster.svg";
  const poster = resolveMediaPath(sequence.poster, profile);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 991px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return (
    <figure className="frame-sequence" data-reveal>
      <div className="frame-sequence__number" aria-hidden="true">
        <span>{String(sequence.startFrame).padStart(4, "0")}</span>
        <span>{String(sequence.startFrame + sequence.frameCount - 1).padStart(4, "0")}</span>
      </div>
      {mobile ? (
        <video
          className="frame-sequence__mobile"
          poster={poster}
          muted
          loop
          playsInline
          preload="metadata"
          controls
          aria-label={mobileVideo.description}
        >
          {mobileVideo.webm ? (
            <source src={resolveMediaPath(mobileVideo.webm, profile)} type="video/webm" />
          ) : null}
          {mobileVideo.mp4 ? (
            <source src={resolveMediaPath(mobileVideo.mp4, profile)} type="video/mp4" />
          ) : null}
        </video>
      ) : null}
      <img
        className="frame-sequence__fallback"
        src={poster}
        alt={sequence.description}
        width={sequence.posterWidth}
        height={sequence.posterHeight}
        loading="lazy"
        decoding="async"
        onError={(event) => {
          event.currentTarget.src = fallback;
        }}
      />
      <figcaption>{sequence.description}</figcaption>
    </figure>
  );
}
