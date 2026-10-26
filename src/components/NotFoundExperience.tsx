"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import {
  notFoundBackLabel,
  notFoundBall,
  notFoundMemes,
  notFoundTitle
} from "@/src/content/notFound";
import {
  notFoundCageInner,
  notFoundCageViewBox,
  notFoundPitchInner,
  notFoundPitchViewBox
} from "@/src/content/notFoundGraphics";

const SHOOT_POWER = 6;
const SHOOT_DURATION = 1.5;

export function NotFoundExperience() {
  const rootRef = useRef<HTMLElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);
  const videoWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const ball = ballRef.current;
    const videoWrap = videoWrapRef.current;
    if (!root || !ball || !videoWrap) return;

    gsap.registerPlugin(Draggable);
    document.documentElement.classList.remove("motion-pending");

    const title = root.querySelector<HTMLElement>(".not-found__title");
    const letters = root.querySelectorAll<HTMLElement>(".not-found__letter");
    const link = root.querySelector<HTMLElement>(".not-found__link");
    const cage = root.querySelector<HTMLElement>(".not-found__cage");
    const pitch = root.querySelector<HTMLElement>(".not-found__pitch");
    const memes = Array.from(root.querySelectorAll<HTMLElement>(".not-found__meme"));
    const videos = Array.from(root.querySelectorAll<HTMLVideoElement>("[data-meme-video]"));
    const start = { x: 0, y: 0 };
    let hasHit = false;
    let currentVideo: HTMLVideoElement | null = null;
    let draggables: Draggable[] = [];

    const stopVideo = () => {
      if (!currentVideo) return;
      currentVideo.pause();
      currentVideo.style.display = "none";
      currentVideo.currentTime = 0;
      currentVideo.muted = true;
      currentVideo = null;
      videoWrap.classList.remove("is-open");
    };

    const playVideo = (meme: HTMLElement) => {
      const id = meme.dataset.meme;
      const video = videos.find((item) => item.dataset.meme === id);
      if (!video) return;

      videos.forEach((item) => {
        item.style.display = "none";
        item.pause();
        item.currentTime = 0;
      });

      currentVideo = video;
      video.style.display = "block";
      video.muted = false;
      video.volume = 0.3;
      videoWrap.classList.add("is-open");
      video.addEventListener("ended", stopVideo, { once: true });
      void video.play().catch(() => {
        // Browsers can still reject audible playback in some environments.
        // The clip remains visible, which is the important part of the hit.
        video.muted = true;
        void video.play().catch(() => undefined);
      });
    };

    const isColliding = (rect1: DOMRect, rect2: DOMRect) =>
      !(
        rect1.right < rect2.left ||
        rect1.left > rect2.right ||
        rect1.bottom < rect2.top ||
        rect1.top > rect2.bottom
      );

    const checkCollisions = () => {
      if (hasHit) return;
      const ballRect = ball.getBoundingClientRect();
      for (const meme of memes) {
        if (getComputedStyle(meme).display === "none") continue;
        if (isColliding(ballRect, meme.getBoundingClientRect())) {
          meme.style.display = "none";
          hasHit = true;
          playVideo(meme);
          return;
        }
      }
    };

    const context = gsap.context(() => {
      if (title) gsap.set(title, { yPercent: 250, opacity: 1 });
      if (letters.length) gsap.set(letters, { yPercent: 100, opacity: 0 });
      if (link) gsap.set(link, { opacity: 0 });
      if (cage) gsap.set(cage, { opacity: 0 });
      if (pitch) gsap.set(pitch, { opacity: 0 });
      gsap.set(memes, { opacity: 0, scale: 0.7 });
      gsap.set(ball, { y: -300, opacity: 0 });

      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
      if (title) timeline.to(title, { yPercent: 0, duration: 1.2 }, 0);
      if (letters.length) {
        timeline.to(
          letters,
          { yPercent: 0, opacity: 1, duration: 0.8, stagger: 0.025 },
          0.05
        );
      }
      if (link) timeline.to(link, { opacity: 1, duration: 0.5 }, 0.8);
      if (cage) timeline.to(cage, { opacity: 1, duration: 0.8 }, 0.9);
      if (pitch) timeline.to(pitch, { opacity: 1, duration: 1.2 }, 0.9);
      timeline.to(
        memes,
        { opacity: 1, scale: 1, duration: 0.8, stagger: 0.07 },
        1
      );
      timeline.to(ball, { y: 0, opacity: 1, duration: 1, ease: "power3.out" }, 1.1);

      draggables = Draggable.create(ball, {
        type: "x,y",
        onDragStart() {
          start.x = Number(gsap.getProperty(ball, "x"));
          start.y = Number(gsap.getProperty(ball, "y"));
          hasHit = false;
        },
        onDragEnd() {
          const deltaX = this.x - start.x;
          const deltaY = this.y - start.y;
          gsap.to(ball, {
            x: `+=${-deltaX * SHOOT_POWER}`,
            y: `+=${-deltaY * SHOOT_POWER}`,
            duration: SHOOT_DURATION,
            ease: "power2.out",
            onUpdate: checkCollisions,
            onComplete: () => {
              gsap.to(ball, {
                x: 0,
                y: 0,
                duration: 0.5,
                ease: "back.out"
              });
            }
          });
        }
      });
    }, root);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") stopVideo();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      stopVideo();
      draggables.forEach((draggable) => draggable.kill());
      context.revert();
    };
  }, []);

  const words = notFoundTitle.split(" ");

  return (
    <main className="not-found" id="content" ref={rootRef}>
      <div className="not-found__grain" aria-hidden="true" />
      <div className="not-found__pitch" aria-hidden="true">
        <svg
          viewBox={notFoundPitchViewBox}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          dangerouslySetInnerHTML={{ __html: notFoundPitchInner }}
        />
      </div>

      <h1 className="not-found__title" aria-label={notFoundTitle}>
        <span aria-hidden="true">
          {words.map((word, wordIndex) => (
            <span className="not-found__word" key={`${word}-${wordIndex}`}>
              {Array.from(word).map((letter, letterIndex) => (
                <span
                  className="not-found__letter"
                  key={`${letter}-${letterIndex}`}
                >
                  {letter}
                </span>
              ))}
              {wordIndex < words.length - 1 ? " " : null}
            </span>
          ))}
        </span>
      </h1>

      <Link className="not-found__link" href="/">
        {notFoundBackLabel}
      </Link>

      <div className="not-found__cage" aria-hidden="true">
        <svg
          className="not-found__cage-svg"
          viewBox={notFoundCageViewBox}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          dangerouslySetInnerHTML={{ __html: notFoundCageInner }}
        />
        {notFoundMemes.map((meme, index) => (
          <div
            className={`not-found__meme not-found__meme--${index + 1}`}
            data-meme={meme.id}
            key={meme.id}
          >
            <img
              src={meme.src}
              alt=""
              width={meme.width}
              height={meme.height}
              draggable={false}
            />
          </div>
        ))}
      </div>

      <div className="not-found__ball" ref={ballRef} aria-hidden="true">
        <img
          src={notFoundBall.src}
          alt=""
          width={notFoundBall.width}
          height={notFoundBall.height}
          draggable={false}
        />
      </div>

      <div className="not-found__video-wrap" ref={videoWrapRef} aria-hidden="true">
        {notFoundMemes.map((meme) => (
          <video
            key={meme.id}
            className="not-found__video"
            data-meme-video
            data-meme={meme.id}
            src={meme.video}
            muted
            loop
            playsInline
            preload="metadata"
          />
        ))}
      </div>
    </main>
  );
}
