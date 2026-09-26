"use client";

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useEffect, useRef, useState } from "react";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";
import type {
  AssetProfile,
  FrameSequence as FrameSequenceData,
  VideoMedia
} from "@/src/content/schema";
import { frameUrl } from "@/src/content/schema";
import { resolveMediaPath } from "@/src/lib/media";

type DecodedFrame = ImageBitmap | HTMLImageElement;

interface FrameSequenceProps {
  sequence: FrameSequenceData;
  mobileVideo: VideoMedia;
  profile: AssetProfile;
}

export function FrameSequence({ sequence, mobileVideo, profile }: FrameSequenceProps) {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const frames = useRef<Array<DecodedFrame | undefined>>([]);
  const loading = useRef(false);
  const destroyed = useRef(false);
  const objectUrls = useRef<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [mobile, setMobile] = useState(false);
  const fallback = "/assets/core/fallback-poster.svg";
  const poster = resolveMediaPath(sequence.poster, profile);

  const drawFrame = (index: number) => {
    const element = canvas.current;
    const frame = frames.current[index];
    if (!element || !frame) return;
    const context = element.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, element.width, element.height);
    context.drawImage(frame, 0, 0, element.width, element.height);
  };

  useEffect(() => {
    const query = window.matchMedia("(max-width: 991px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const target = root.current?.closest<HTMLElement>(".chapter-shell") ?? root.current;
    if (!target || profile === "owned") return;
    const controller = new AbortController();
    const objectUrlList = objectUrls.current;
    destroyed.current = false;

    const load = async () => {
      if (loading.current || mobile || destroyed.current) return;
      loading.current = true;
      const urls = Array.from({ length: sequence.frameCount }, (_, index) =>
        resolveMediaPath(frameUrl(sequence, index), profile)
      );
      const decoded: Array<DecodedFrame | undefined> = [];
      for (let start = 0; start < urls.length; start += 10) {
        if (destroyed.current) return;
        const batch = await Promise.all(
          urls.slice(start, start + 10).map(async (url) => {
            try {
              const response = await fetch(url, { signal: controller.signal });
              if (!response.ok) return undefined;
              const blob = await response.blob();
              if ("createImageBitmap" in window) return createImageBitmap(blob);
              const image = new Image();
              const objectUrl = URL.createObjectURL(blob);
              objectUrlList.push(objectUrl);
              image.src = objectUrl;
              await image.decode();
              return image;
            } catch {
              return undefined;
            }
          })
        );
        decoded.push(...batch);
        frames.current = decoded;
        if (decoded.length > 0) setLoaded(true);
      }
      loading.current = false;
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void load();
      },
      { rootMargin: "180% 0px" }
    );
    observer.observe(target);
    return () => {
      observer.disconnect();
      controller.abort();
      destroyed.current = true;
      objectUrlList.forEach((url) => URL.revokeObjectURL(url));
      frames.current.forEach((frame) => {
        if (typeof ImageBitmap !== "undefined" && frame instanceof ImageBitmap) frame.close();
      });
      frames.current = [];
      loading.current = false;
    };
  }, [mobile, profile, sequence]);

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
            end: () => `+=${Math.max(0, track.scrollWidth - window.innerWidth + 3000)}`,
            scrub: true,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const index = Math.min(
                sequence.frameCount - 1,
                Math.max(0, Math.floor(self.progress * sequence.frameCount))
              );
              if (index === previous) return;
              previous = index;
              drawFrame(index);
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
        loading="eager"
        decoding="async"
        onError={(event) => {
          event.currentTarget.src = fallback;
        }}
      />
      <canvas
        ref={canvas}
        className="frame-sequence__canvas"
        width={sequence.width}
        height={sequence.height}
        aria-label={sequence.description}
        data-loaded={loaded}
      />
      <figcaption>{sequence.description}</figcaption>
    </figure>
  );
}
