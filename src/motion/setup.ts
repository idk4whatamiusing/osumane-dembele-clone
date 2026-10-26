import type { FrameSequence } from "@/src/content/schema";
import { releaseAllFrames } from "@/src/motion/frameCache";
import { publishFrameStage } from "@/src/motion/frameStage";
import { restoreSplit, splitElement } from "@/src/motion/split";

const MOTION_QUERY = "(min-width: 0px)";

/** The reference site always appends three thousand pixels to a chapter. */
const CHAPTER_OVERSCROLL = 3000;

function readSequence(shell: HTMLElement): FrameSequence | null {
  const raw = shell.dataset.frameSequence;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FrameSequence;
  } catch {
    return null;
  }
}

function playFootage(shell: HTMLElement, playing: boolean): void {
  const videos = Array.from(
    shell.querySelectorAll<HTMLVideoElement>(".chapter-story__video")
  );
  // The mobile jersey is a separate webm. Browsers pause off-screen videos
  // after autoplay, so it has to be explicitly resumed with its chapter.
  if (window.innerWidth <= 991) {
    videos.push(
      ...shell.querySelectorAll<HTMLVideoElement>(".chapter-jersey__video--mobile")
    );
  }
  videos.forEach((video) => {
    if (playing) {
      video.muted = true;
      void video.play().catch(() => undefined);
      return;
    }
    video.pause();
  });
}

function waitForLoader(): Promise<void> {
  if (document.documentElement.dataset.loaderReady === "true") return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.removeEventListener("osumane:loader-ready", finish);
      window.clearTimeout(timeout);
      resolve();
    };
    const timeout = window.setTimeout(finish, 8000);
    window.addEventListener("osumane:loader-ready", finish, { once: true });
  });
}

export async function createMotionExperience(root: HTMLElement | null): Promise<() => void> {
  if (!root) return () => undefined;

  document.documentElement.classList.add("motion-pending");

  await waitForLoader();

  const [{ gsap }, scrollModule, lenisModule] = await Promise.all([
    import("gsap"),
    import("gsap/ScrollTrigger"),
    import("lenis")
  ]);
  const { ScrollTrigger } = scrollModule;
  const Lenis = lenisModule.default;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const matchMedia = gsap.matchMedia();
  const splitElements: HTMLElement[] = [];

  matchMedia.add(MOTION_QUERY, () => {
    const lenis = new Lenis({
      autoRaf: false,
      duration: 1.4,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 0.9,
      touchMultiplier: 1,
      easing: (value) => Math.min(1, 1.001 - Math.pow(2, -10 * value))
    });
    lenis.on("scroll", ScrollTrigger.update);
    const ticker = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);
    (window as unknown as { lenis?: unknown }).lenis = lenis;
    (window as unknown as { gsap?: unknown }).gsap = gsap;
    (window as unknown as { ScrollTrigger?: unknown }).ScrollTrigger = ScrollTrigger;

    const onAnchorClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>(
        'a[href^="#"]'
      );
      const href = anchor?.getAttribute("href");
      if (!anchor || !href || href === "#") return;
      const target = document.getElementById(href.slice(1));
      if (!target) return;
      event.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY;
      lenis.scrollTo(top, {
        duration: 1.2,
        onComplete: () => ScrollTrigger.refresh()
      });
      history.pushState(null, "", href);
    };
    document.addEventListener("click", onAnchorClick);

    const context = gsap.context(() => {
      document.documentElement.classList.add("motion-enhanced");
      document.documentElement.classList.remove("motion-pending");

      // --- The hero ------------------------------------------------------
      // The reference lets the cream body show through the opening screen,
      // then fades a dark layer in behind it as the sphere explodes. The
      // second half of that transition uses the same easeOutQuad curve.
      const main = document.querySelector<HTMLElement>("main");
      if (main) {
        gsap.fromTo(
          main,
          { backgroundColor: "rgba(0, 0, 0, 0)" },
          {
            backgroundColor: "#0d0d0d",
            ease: "power1.out",
            scrollTrigger: {
              trigger: main,
              start: () => window.innerHeight * 0.3,
              end: () => window.innerHeight * 0.5,
              scrub: true,
              invalidateOnRefresh: true
            }
          }
        );
      }

      gsap.fromTo(
        "[data-wordmark-hero]",
        { autoAlpha: 0, yPercent: 12 },
        { autoAlpha: 1, yPercent: 0, duration: 1.2, ease: "power3.out", delay: 0.1 }
      );

      // --- The introduction ---------------------------------------------
      const intro = document.getElementById("introduction");
      if (intro) {
        const titleWords = intro.querySelectorAll<HTMLElement>(".intro__word-inner");
        gsap.set(titleWords, { yPercent: 120 });
        gsap.to(titleWords, {
          yPercent: 0,
          duration: 1,
          stagger: 0.07,
          ease: "power3.out",
          scrollTrigger: {
            trigger: intro,
            start: "top 78%",
            once: true
          }
        });

        // The first two words start centred as a group. As the intro settles,
        // the group travels to the left gutter while BRILLER travels to the
        // right, exactly like the reference's margin tween.
        const title = intro.querySelector<HTMLElement>(".intro__title");
        const group = intro.querySelector<HTMLElement>(".intro__group");
        const lastWord = intro.querySelector<HTMLElement>(".intro__word--last");
        if (
          title &&
          group &&
          lastWord &&
          window.matchMedia("(min-width: 992px)").matches
        ) {
          const gap = Number.parseFloat(getComputedStyle(title).gap) || 0;
          const endMargin = () =>
            Math.max(
              0,
              title.clientWidth -
                group.offsetWidth -
                lastWord.offsetWidth -
                gap
            );
          gsap.fromTo(
            group,
            { marginRight: 0 },
            {
              marginRight: endMargin,
              ease: "none",
              scrollTrigger: {
                trigger: intro,
                start: "top 33.3%",
                end: "top 22.2%",
                scrub: 1,
                invalidateOnRefresh: true
              }
            }
          );
        }

        const copy = intro.querySelector<HTMLElement>(".intro__copy");
        const paragraphWords = Array.from(
          intro.querySelectorAll<HTMLElement>("[data-intro-para-word]")
        );
        if (copy && paragraphWords.length) {
          // The reference groups the copy into rendered lines, then reveals
          // each line with a short word stagger on a scrubbed timeline.
          const lines: HTMLElement[][] = [];
          let lastTop: number | null = null;
          paragraphWords.forEach((word) => {
            if (lastTop === null || word.offsetTop !== lastTop) {
              lines.push([]);
              lastTop = word.offsetTop;
            }
            lines[lines.length - 1].push(word);
          });

          gsap.set(paragraphWords, { opacity: 0 });
          const writeTimeline = gsap.timeline({
            scrollTrigger: {
              trigger: copy,
              start: "top 80%",
              end: "bottom 60%",
              scrub: 1
            }
          });

          lines.forEach((line, index) => {
            writeTimeline.to(
              line,
              {
                opacity: 1,
                duration: 0.5,
                stagger: 0.1,
                ease: "none"
              },
              0.3 * index
            );
          });
        }
      }

      // --- Chapters ------------------------------------------------------
      const shells = gsap.utils.toArray<HTMLElement>(".chapter-shell");
      // Only the chapter that currently owns the viewport may drive the
      // global canvas. Adjacent pinned triggers overlap for a few pixels;
      // without this guard an old chapter's onLeave can hide the stage after
      // the new chapter has already shown it.
      let activeStageChapter: string | null = null;

      shells.forEach((shell) => {
        const track = shell.querySelector<HTMLElement>("[data-chapter-track]");
        if (!track) return;
        const sequence = readSequence(shell);
        const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

        const mark = shell.querySelector<HTMLElement>(".chapter-jersey__mark");
        const markPaths = Array.from(
          shell.querySelectorAll<SVGPathElement>(".chapter-jersey__mark-svg path")
        );
        const jerseyVideo = shell.querySelector<HTMLVideoElement>(
          ".chapter-jersey__video--desktop"
        );
        const numbers = shell.querySelectorAll<HTMLElement>("[data-number-half]");
        const galleryPanel = shell.querySelector<HTMLElement>(".chapter-panel--gallery");
        const galleryStrip = shell.querySelector<HTMLElement>("[data-gallery-strip]");
        const storyPanel = shell.querySelector<HTMLElement>(".chapter-panel--story");
        const film = shell.querySelector<HTMLElement>("[data-chapter-film]");
        const storyIntro = shell.querySelector<HTMLElement>("[data-story-intro]");
        const storyOverlay = shell.querySelector<HTMLElement>("[data-story-overlay]");

        // The reference draws one path per letter of the hand-lettered mark,
        // one second each with a tenth-of-a-second stagger.
        markPaths.forEach((path) => {
          const length = path.getTotalLength();
          path.style.strokeDasharray = `${length}`;
          path.style.strokeDashoffset = `${length}`;
          path.style.fillOpacity = "0";
        });
        const pathsComplete = markPaths.length
          ? 1 + (markPaths.length - 1) * 0.1
          : 0;
        const moveStart = pathsComplete + 1.7;

        gsap.set(numbers, {
          yPercent: (index) => (index === 0 ? -100 : 100),
          opacity: 0
        });
        if (jerseyVideo) gsap.set(jerseyVideo, { width: "0%" });
        if (film) {
          gsap.set(film, {
            clipPath:
              window.innerWidth <= 991
                ? "polygon(10% 35%, 90% 35%, 90% 50%, 10% 50%)"
                : "polygon(25% 36%, 70% 36%, 70% 55%, 25% 55%)"
          });
        }
        if (storyOverlay) gsap.set(storyOverlay, { yPercent: 200 });

        const stage = { opacity: 0, yPercent: -50 };
        const publishStage = () => {
          if (activeStageChapter !== shell.id) return;
          publishFrameStage({
            chapterId: shell.id,
            sequence,
            opacity: stage.opacity,
            yPercent: stage.yPercent,
            active: true
          });
        };
        const releaseStage = (yPercent = stage.yPercent) => {
          if (activeStageChapter !== shell.id) return;
          activeStageChapter = null;
          publishFrameStage({
            chapterId: shell.id,
            sequence,
            opacity: 0,
            yPercent,
            active: false
          });
        };

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: shell,
            start: "top top",
            end: () => `+=${Math.round(distance() + CHAPTER_OVERSCROLL)}`,
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onEnter: () => {
              activeStageChapter = shell.id;
              // Publish the values the scrubbed timeline already reached.
              // Resetting the stage to opacity 0 here used to blank a chapter
              // when a programmatic jump landed in the middle of its timeline.
              publishStage();
              playFootage(shell, true);
            },
            onEnterBack: () => {
              activeStageChapter = shell.id;
              publishFrameStage({
                chapterId: shell.id,
                sequence,
                opacity: stage.opacity,
                yPercent: stage.yPercent,
                active: true
              });
              playFootage(shell, true);
            },
            onLeave: () => {
              playFootage(shell, false);
              releaseStage();
            },
            onLeaveBack: () => {
              playFootage(shell, false);
              releaseStage(-50);
            },
            onUpdate: publishStage
          }
        });

        timeline.eventCallback("onUpdate", publishStage);

        // The reference timeline: the paths draw one by one, the garment video
        // opens behind them, the number rolls in over the jersey, then the
        // horizontal track takes over.
        timeline.to(
          markPaths,
          {
            strokeDashoffset: 0,
            fillOpacity: 1,
            duration: 1,
            stagger: 0.1,
            ease: "power2.inOut"
          },
          0
        );
        timeline.to(stage, { opacity: 1, duration: 0.8, ease: "power2.inOut" }, 0);
        if (jerseyVideo) {
          timeline.to(
            jerseyVideo,
            { width: "100%", duration: 1, ease: "power2.inOut" },
            pathsComplete + 0.3
          );
        }
        timeline.to(
          mark,
          { opacity: 0, duration: 0.5, ease: "power2.out" },
          pathsComplete + 0.5
        );
        timeline.to(
          numbers,
          {
            yPercent: 0,
            opacity: 1,
            duration: 0.8,
            stagger: 0.1,
            ease: "power2.out"
          },
          pathsComplete + 0.8
        );

        // The track waits for the number beat, then runs through the gallery
        // and the film. The jersey stays centred over the gallery.
        timeline.to(
          track,
          { x: () => -distance(), duration: 2, ease: "none" },
          moveStart
        );

        // The film opens only once the story panel has arrived. At the same
        // time the jersey canvas drops away below it.
        if (film) {
          timeline.to(
            film,
            {
              clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
              duration: 1.2,
              ease: "power2.inOut"
            },
            moveStart + 2
          );
        }
        timeline.to(
          stage,
          {
            yPercent: 125,
            opacity: 0,
            duration: 1.2,
            ease: "power2.inOut",
            onUpdate: publishStage
          },
          moveStart + 2
        );
        if (storyIntro) {
          timeline.to(
            storyIntro,
            { opacity: 0, duration: 0.72, ease: "none" },
            moveStart + 2.4
          );
        }
        if (storyOverlay) {
          timeline.to(
            storyOverlay,
            { yPercent: 0, duration: 2, ease: "power2.out" },
            moveStart + 3.4
          );
        }

        // The title and the photographs move at different speeds, exactly
        // like the reference containerAnimation parallax.
        if (galleryPanel && galleryStrip) {
          const items = Array.from(
            galleryStrip.querySelectorAll<HTMLElement>("[data-gallery-item]")
          );
          gsap.set(items, {
            xPercent: (index) => (index < 2 ? 50 : 0)
          });
          gsap.set(galleryStrip, { xPercent: 20 });

          const stripTrigger = {
            trigger: galleryPanel,
            containerAnimation: timeline,
            start: "left left",
            end: "right left-=25%",
            invalidateOnRefresh: true
          };
          gsap.to(galleryStrip, {
            xPercent: -30,
            ease: "power1.out",
            scrollTrigger: { ...stripTrigger, scrub: 3 }
          });
          gsap.to(items, {
            xPercent: (index) => (index < 2 ? -50 : -100),
            ease: "power1.out",
            stagger: 0.05,
            scrollTrigger: { ...stripTrigger, scrub: 2 }
          });
        }

        if (galleryPanel) {
          const title = galleryPanel.querySelector<HTMLElement>("[data-split]");
          if (title) {
            const parts = splitElement(title, "chars");
            splitElements.push(title);
            const inner = parts
              .map((part) => part.firstElementChild)
              .filter((part): part is HTMLElement => part instanceof HTMLElement);
            if (inner.length) {
              gsap.set(inner, { yPercent: 150 });
              gsap.to(inner, {
                yPercent: 0,
                duration: 1,
                stagger: 0.01,
                ease: "expo.out",
                scrollTrigger: {
                  trigger: galleryPanel,
                  containerAnimation: timeline,
                  start: "left+=9% left",
                  toggleActions: "play none none reverse",
                  invalidateOnRefresh: true
                }
              });
            }
          }
        }

        if (storyPanel) {
          storyPanel
            .querySelectorAll<HTMLElement>("[data-split]")
            .forEach((element) => {
              const isOverlay = Boolean(element.closest("[data-story-overlay]"));
              const parts = splitElement(element, "chars");
              splitElements.push(element);
              const inner = parts
                .map((part) => part.firstElementChild)
                .filter((part): part is HTMLElement => part instanceof HTMLElement);
              if (!inner.length) return;
              if (isOverlay) {
                gsap.set(inner, { yPercent: 150 });
                timeline.to(
                  inner,
                  {
                    yPercent: 0,
                    duration: 0.55,
                    stagger: 0.012,
                    ease: "expo.out"
                  },
                  moveStart + 3.4
                );
                return;
              }
              gsap.fromTo(
                inner,
                { yPercent: 150 },
                {
                  yPercent: 0,
                  duration: 0.8,
                  stagger: 0.04,
                  ease: "expo.out",
                  scrollTrigger: {
                    trigger: storyPanel,
                    containerAnimation: timeline,
                    start: "left 65%",
                    toggleActions: "play none none reverse",
                    invalidateOnRefresh: true
                  }
                }
              );
            });
        }
      });

      // --- Reveals outside the chapters ---------------------------------
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
        if (element.closest(".chapter-shell")) return;
        if (element.getClientRects().length === 0) return;
        gsap.fromTo(
          element,
          { y: 42, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: {
              trigger: element,
              start: "top 82%",
              once: true
            }
          }
        );
      });

      // --- The footer signature -----------------------------------------
      const signature = document.querySelector<HTMLElement>(".site-footer__signature");
      const footer = document.getElementById("credits");
      if (signature && footer) {
        gsap.set(signature, {
          scale: 0.1,
          transformOrigin: "50% 50%"
        });
        gsap.to(signature, {
          scale: 1,
          duration: 1.2,
          ease: "expo.out",
          scrollTrigger: {
            trigger: footer,
            start: "center bottom",
            once: true
          }
        });
      }
    }, root);

    const refresh = () => ScrollTrigger.refresh();
    void document.fonts?.ready.then(refresh);
    window.addEventListener("load", refresh, { once: true });
    const raf = window.requestAnimationFrame(refresh);

    return () => {
      window.removeEventListener("load", refresh);
      window.cancelAnimationFrame(raf);
      document.removeEventListener("click", onAnchorClick);
      context.revert();
      for (const element of splitElements) restoreSplit(element);
      splitElements.length = 0;
      lenis.destroy();
      gsap.ticker.remove(ticker);
      if ((window as unknown as { lenis?: unknown }).lenis === lenis) {
        delete (window as unknown as { lenis?: unknown }).lenis;
      }
      document.documentElement.classList.remove("motion-enhanced");
      publishFrameStage({
        chapterId: null,
        sequence: null,
        opacity: 0,
        yPercent: -50,
        active: false
      });
      releaseAllFrames();
      ScrollTrigger.refresh();
    };
  });
  return () => {
    matchMedia.revert();
    document.documentElement.classList.remove("motion-pending");
  };
}

interface Experience {
  promise: Promise<() => void>;
  consumers: number;
}

let experience: Experience | null = null;

/**
 * Builds the motion experience once and hands out a release function.
 *
 * The setup is asynchronous, so React strict mode (which mounts, unmounts and
 * mounts again) would otherwise build two competing sets of scroll triggers
 * and tear the shared one down at the wrong moment. The experience is
 * reference counted instead: it is only disposed once the last consumer
 * releases it.
 */
export function acquireMotionExperience(root: HTMLElement | null): () => void {
  if (!root) return () => undefined;

  if (!experience) {
    experience = { promise: createMotionExperience(root), consumers: 0 };
  }
  const current = experience;
  current.consumers += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    current.consumers -= 1;
    void current.promise.then((cleanup) => {
      if (current.consumers > 0) return;
      if (experience === current) experience = null;
      cleanup();
    });
  };
}
