"use client";

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useRef, useState } from "react";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";
import type { AssetProfile, FrameSequence as FrameSequenceData } from "@/src/content/schema";
import { frameUrl } from "@/src/content/schema";
import { resolveMediaPath } from "@/src/lib/media";

interface FrameSequenceProps {
  sequence: FrameSequenceData;
  profile: AssetProfile;
}

export function FrameSequence({ sequence, profile }: FrameSequenceProps) {
  const root = useRef<HTMLElement>(null);
  const fallback = "/assets/core/fallback-poster.svg";
  const [source, setSource] = useState(resolveMediaPath(sequence.poster, profile));
  const [failed, setFailed] = useState(false);

  useGSAP(
    () => {
      if (profile === "owned") return;
      let cleanup: (() => void) | undefined;
      let cancelled = false;
      void import("gsap/ScrollTrigger").then(({ ScrollTrigger }) => {
        if (cancelled || !root.current) return;
        gsap.registerPlugin(ScrollTrigger);
        const matchMedia = gsap.matchMedia();
        matchMedia.add("(min-width: 992px) and (prefers-reduced-motion: no-preference)", () => {
          const shell = root.current?.closest<HTMLElement>(".chapter-shell");
          const track = root.current?.closest<HTMLElement>("[data-chapter-track]");
          if (!shell || !track) return;
          let previous = -1;
          const trigger: ScrollTriggerType = ScrollTrigger.create({
            trigger: shell,
            start: "top top",
            end: () => {
              const distance = Math.max(
                0,
                track.scrollWidth - window.innerWidth + window.innerWidth * 0.24
              );
              return `+=${distance + window.innerHeight * 0.72}`;
            },
            scrub: true,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const index = Math.min(
                sequence.frameCount - 1,
                Math.max(0, Math.floor(self.progress * sequence.frameCount))
              );
              if (index === previous) return;
              previous = index;
              setSource(resolveMediaPath(frameUrl(sequence, index), profile));
            }
          });
          return () => trigger.kill();
        });
        cleanup = () => matchMedia.revert();
      });
      return () => {
        cancelled = true;
        cleanup?.();
      };
    },
    { scope: root }
  );

  return (
    <figure ref={root} className="frame-sequence" data-reveal>
      <div className="frame-sequence__number" aria-hidden="true">
        <span>{String(sequence.startFrame).padStart(4, "0")}</span>
        <span>{String(sequence.startFrame + sequence.frameCount - 1).padStart(4, "0")}</span>
      </div>
      <img
        src={failed ? fallback : source}
        alt={sequence.description}
        width={sequence.width}
        height={sequence.height}
        loading="eager"
        decoding="async"
        onError={() => {
          setFailed(true);
          setSource(fallback);
        }}
      />
      <figcaption>{sequence.description}</figcaption>
    </figure>
  );
}
