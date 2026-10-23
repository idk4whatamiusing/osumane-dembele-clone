import type { FrameSequence } from "@/src/content/schema";
import { releaseAllFrames } from "@/src/motion/frameCache";
import { publishFrameStage } from "@/src/motion/frameStage";
import { restoreSplit, splitElement } from "@/src/motion/split";

const DESKTOP_MOTION_QUERY = "(min-width: 992px) and (prefers-reduced-motion: no-preference)";

/**
 * The reference site scrubs the horizontal track of a chapter over roughly
 * twice its own width, which is what makes the movement feel unhurried.
 */
const PIN_RATIO = 2.1;

/** Extra travel appended to a chapter so the last scene settles. */
const CHAPTER_OVERSCROLL = 240;

// The rotating jersey is a beat that passes over the chapter between the
// club mark and the title, the way the reference site brings the fabric
// full screen for a moment before the chapter carries on.
const STAGE_IN_START = 0.26;
const STAGE_IN_END = 0.33;
const STAGE_OUT_START = 0.42;
const STAGE_OUT_END = 0.5;

/** The jersey completes a full rotation over the first half of a chapter. */
function stageIndex(progress: number, frameCount: number): number {
  const span = Math.min(1, Math.max(0, (progress - 0.02) / 0.5));
  return Math.round(span * (frameCount - 1));
}

function stageOpacity(progress: number): number {
  if (progress <= STAGE_IN_START) return 0;
  if (progress <= STAGE_IN_END) {
    return (progress - STAGE_IN_START) / (STAGE_IN_END - STAGE_IN_START);
  }
  if (progress <= STAGE_OUT_START) return 1;
  if (progress >= STAGE_OUT_END) return 0;
  return 1 - (progress - STAGE_OUT_START) / (STAGE_OUT_END - STAGE_OUT_START);
}

/** The jersey grows a little while it passes, the way it zooms on the reference. */
function stageScale(progress: number): number {
  if (progress <= STAGE_IN_START) return 1;
  if (progress >= STAGE_OUT_END) return 1;
  const span = Math.min(1, Math.max(0, (progress - STAGE_IN_START) / (STAGE_OUT_END - STAGE_IN_START)));
  return 1 + span * 0.18;
}

function readSequence(shell: HTMLElement): FrameSequence | null {
  const raw = shell.dataset.frameSequence;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FrameSequence;
  } catch {
    return null;
  }
}

/** Starts or stops the footage of a chapter. */
function playFootage(shell: HTMLElement, playing: boolean): void {
  const video = shell.querySelector<HTMLVideoElement>(".chapter-scene__video");
  if (!video) return;
  if (playing) {
    void video.play().catch(() => undefined);
    return;
  }
  video.pause();
}

function waitForLoader(): Promise<void> {
  if (document.documentElement.dataset.loaderReady === "true") return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.removeEventListener("ankhi:loader-ready", finish);
      window.clearTimeout(timeout);
      resolve();
    };
    const timeout = window.setTimeout(finish, 5000);
    window.addEventListener("ankhi:loader-ready", finish, { once: true });
  });
}

export async function createMotionExperience(root: HTMLElement | null): Promise<() => void> {
  if (!root) return () => undefined;

  if (window.matchMedia(DESKTOP_MOTION_QUERY).matches) {
    document.documentElement.classList.add("motion-pending");
  }

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

  matchMedia.add(DESKTOP_MOTION_QUERY, () => {
    const lenis = new Lenis({
      autoRaf: false,
      duration: 1.6,
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

    // In-page links are scrolled by Lenis so the pinned sections keep their
    // position instead of being jumped to by the native anchor behaviour.
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
        duration: 1.4,
        onComplete: () => ScrollTrigger.refresh()
      });
      history.pushState(null, "", href);
    };
    document.addEventListener("click", onAnchorClick);

    const context = gsap.context(() => {
      // The pinned horizontal layout is switched on here, behind the
      // preloader fade, so the reflow never happens in front of the reader.
      document.documentElement.classList.add("motion-enhanced");
      document.documentElement.classList.remove("motion-pending");

      // --- The hero --------------------------------------------------------
      // The reference site paints the cream of the opening screen on a fixed
      // layer that fades away while the introduction arrives.
      const hero = document.querySelector<HTMLElement>(".hero");
      if (hero) {
        gsap.to(hero, {
          "--hero-veil": 0,
          ease: "none",
          scrollTrigger: {
            trigger: hero,
            start: "top top",
            end: () => `+=${Math.round(window.innerHeight * 0.55)}`,
            scrub: 0.4,
            invalidateOnRefresh: true
          }
        });
      }

      // --- The wordmark ----------------------------------------------------
      gsap.fromTo(
        "[data-wordmark-hero]",
        { autoAlpha: 0, yPercent: 12 },
        { autoAlpha: 1, yPercent: 0, duration: 1.2, ease: "power3.out", delay: 0.15 }
      );

      // --- The introduction ------------------------------------------------
      // The title starts centred and its words scatter to the edges of the
      // viewport while the section scrolls away.
      const intro = document.getElementById("introduction");
      const words = gsap.utils.toArray<HTMLElement>("[data-intro-word]");
      if (intro && words.length) {
        const targets = [18, 131, 1138];
        const introTop = () => intro.getBoundingClientRect().top + window.scrollY;
        words.forEach((word, index) => {
          const target = targets[index] ?? targets[targets.length - 1];
          const from = word.getBoundingClientRect().left;
          gsap.to(word, {
            x: target - from,
            duration: 1.2,
            ease: "power4.inOut",
            scrollTrigger: {
              trigger: intro,
              start: "top center",
              toggleActions: "play none none reverse",
              invalidateOnRefresh: true
            }
          });
        });
      }

      // --- Chapters --------------------------------------------------------
      // Each chapter is one horizontal timeline. The tween is kept so that
      // every reveal inside the track can be attached to it with
      // `containerAnimation`, which makes an element animate exactly when it
      // slides into the viewport instead of when the section is entered.
      const trackTweens = new Map<HTMLElement, gsap.core.Tween>();
      const shells = gsap.utils.toArray<HTMLElement>(".chapter-shell");
      let activeChapter: string | null = null;

      shells.forEach((shell) => {
        const track = shell.querySelector<HTMLElement>("[data-chapter-track]");
        if (!track) return;
        const sequence = readSequence(shell);
        const distance = () =>
          Math.max(0, track.scrollWidth - window.innerWidth + CHAPTER_OVERSCROLL);
        const tween = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: shell,
            start: "top top",
            end: () => `+=${Math.round(track.scrollWidth + 3000)}`,
            pin: true,
            scrub: 0.8,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onEnter: () => {
              activeChapter = shell.id;
              publishFrameStage({ chapterId: shell.id, sequence: sequence ?? null, active: true });
              playFootage(shell, true);
            },
            onEnterBack: () => {
              activeChapter = shell.id;
              publishFrameStage({ chapterId: shell.id, sequence: sequence ?? null, active: true });
              playFootage(shell, true);
            },
            onLeave: () => playFootage(shell, false),
            onLeaveBack: () => playFootage(shell, false),
            onUpdate: (self) => {
              if (activeChapter !== shell.id || !sequence) return;
              publishFrameStage({
                chapterId: shell.id,
                sequence,
                index: stageIndex(self.progress, sequence.frameCount),
                opacity: stageOpacity(self.progress),
                offsetY: 0,
                scale: stageScale(self.progress),
                active: stageOpacity(self.progress) > 0.001
              });
            }
          }
        });
        trackTweens.set(track, tween);

        // The club mark is drawn on as a stroke, the way the reference site
        // brings the brush script to life, then its fill fades in.
        const clubPath = shell.querySelector<SVGPathElement>(".chapter-scene__club-svg path");
        if (clubPath) {
          const length = clubPath.getTotalLength();
          gsap.set(clubPath, {
            strokeDasharray: length,
            strokeDashoffset: length,
            fillOpacity: 0
          });
          ScrollTrigger.create({
            trigger: shell,
            start: "top top",
            end: () => `+=${Math.round(track.scrollWidth + 3000)}`,
            scrub: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const p = Math.min(1, Math.max(0, self.progress * 5)); // draw on in first 20%
              clubPath.style.strokeDashoffset = (length * (1 - p)) + "px";
              clubPath.style.fillOpacity = String(Math.min(1, self.progress * 3));
            }
          });
        }

        // The footage of the season fades in over the portrait, the way the
        // reference site replaces the illustration with the match scenes. The
        // headline of the chapter gives way to the headings of the footage.
        const film = shell.querySelector<HTMLElement>("[data-chapter-film]");
        if (film) {
          const range = {
            trigger: film,
            containerAnimation: tween,
            start: "left 62%",
            end: "left 18%",
            scrub: true,
            invalidateOnRefresh: true
          };
          gsap.fromTo(film, { autoAlpha: 0 }, { autoAlpha: 1, ease: "none", scrollTrigger: range });
          const headline = shell.querySelector<HTMLElement>(".chapter-scene__headline");
          if (headline) {
            gsap.fromTo(
              headline,
              { autoAlpha: 1 },
              { autoAlpha: 0, ease: "none", scrollTrigger: { ...range } }
            );
          }
          const overlay = shell.querySelector<HTMLElement>(".chapter-scene__overlay");
          if (overlay) {
            gsap.fromTo(
              overlay,
              { autoAlpha: 0 },
              {
                autoAlpha: 1,
                ease: "none",
                scrollTrigger: { ...range, start: "left 40%", end: "left 12%" }
              }
            );
          }
        }
      });

      // --- Reveals --------------------------------------------------------
      const triggerFor = (element: HTMLElement) => {
        const track = element.closest<HTMLElement>("[data-chapter-track]");
        const tween = track ? trackTweens.get(track) : undefined;
        const scene = element.closest<HTMLElement>(".chapter-scene");
        // The first scene of a chapter is already on screen when the section
        // pins, so it reveals on the section itself. Every later scene is
        // revealed by its horizontal position inside the track.
        const leads = scene?.getAttribute("data-scene") === "mark";
        if (tween && !leads) {
          return {
            trigger: element,
            containerAnimation: tween,
            start: "left+=9% left",
            once: true
          };
        }
        return {
          trigger: element.closest<HTMLElement>(".chapter-shell") ?? element,
          start: "top 70%",
          once: true
        };
      };

      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
        // Elements the current layout does not render (hidden panels) have no
        // measurable box, so a scroll trigger on them can never resolve.
        if (element.getClientRects().length === 0) return;
        // Split text is animated through its own parts.
        if (element.hasAttribute("data-split")) return;
        const delay = parseFloat(element.getAttribute("delay") ?? "0") || 0;
        gsap.fromTo(
          element,
          { y: 46, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.9, delay, ease: "power3.out", scrollTrigger: triggerFor(element) }
        );
      });

      // --- Split text ------------------------------------------------------
      gsap.utils.toArray<HTMLElement>("[data-split]").forEach((element) => {
        if (element.getClientRects().length === 0) return;
        const mode = element.getAttribute("data-split") === "words" ? "words" : "chars";
        const parts = splitElement(element, mode);
        splitElements.push(element);
        const inner = parts
          .map((part) => part.firstElementChild)
          .filter((part): part is HTMLElement => part instanceof HTMLElement);
        if (inner.length === 0) return;
        const scrollTrigger = triggerFor(element);
        if (mode === "words") {
          gsap.fromTo(
            inner,
            { yPercent: 60, autoAlpha: 0 },
            {
              yPercent: 0,
              autoAlpha: 1,
              duration: 1.3,
              stagger: 0.05,
              delay: parseFloat(element.getAttribute("delay") ?? "0") || 0,
              ease: "power3.inOut",
              scrollTrigger
            }
          );
        } else {
          gsap.fromTo(
            inner,
            { yPercent: 115 },
            {
              yPercent: 0,
              duration: 1,
              stagger: 0.01,
              delay: parseFloat(element.getAttribute("delay") ?? "0") || 0,
              ease: "expo.out",
              scrollTrigger
            }
          );
        }
      });

      gsap.utils.toArray<HTMLElement>("[data-gallery-item]").forEach((item) => {
        const image = item.querySelector("img");
        if (!image) return;
        const track = item.closest<HTMLElement>("[data-chapter-track]");
        const tween = track ? trackTweens.get(track) : undefined;
        if (!tween) return;
        gsap.fromTo(
          image,
          { xPercent: -6 },
          {
            xPercent: 6,
            ease: "none",
            scrollTrigger: {
              trigger: item,
              containerAnimation: tween,
              start: "left right",
              end: "right left",
              scrub: true
            }
          }
        );
      });
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
        index: 0,
        opacity: 0,
        offsetY: 0,
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
