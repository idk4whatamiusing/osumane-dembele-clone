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
    const timeout = window.setTimeout(finish, 5200);
    window.addEventListener("ankhi:loader-ready", finish, { once: true });
  });
}

export async function createMotionExperience(root: HTMLElement | null): Promise<() => void> {
  if (!root) return () => undefined;
  await waitForLoader();

  const [{ gsap }, scrollModule, drawModule, lenisModule] = await Promise.all([
    import("gsap"),
    import("gsap/ScrollTrigger"),
    import("gsap/DrawSVGPlugin"),
    import("lenis")
  ]);
  const { ScrollTrigger } = scrollModule;
  const { DrawSVGPlugin } = drawModule;
  const Lenis = lenisModule.default;
  gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const matchMedia = gsap.matchMedia();

  matchMedia.add("(min-width: 992px) and (prefers-reduced-motion: no-preference)", () => {
    const lenis = new Lenis({
      autoRaf: false,
      duration: 2,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 0.9,
      touchMultiplier: 1,
      easing: (value) => Math.min(1, 1.001 - Math.pow(2, -10 * value))
    });
    lenis.on("scroll", ScrollTrigger.update);
    const ticker = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(ticker);

    const context = gsap.context(() => {
      gsap.fromTo(
        "[data-hero-reveal]",
        { yPercent: 115, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1.15,
          stagger: 0.08,
          ease: "power4.out",
          delay: 0.15
        }
      );

      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
        gsap.from(element, {
          y: 56,
          opacity: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: element,
            start: "top 88%",
            once: true
          }
        });
      });

      gsap.utils.toArray<SVGPathElement>("[data-draw]").forEach((path) => {
        gsap.fromTo(
          path,
          { drawSVG: "0% 0%" },
          {
            drawSVG: "0% 100%",
            ease: "none",
            scrollTrigger: {
              trigger: path,
              start: "top 92%",
              end: "top 45%",
              scrub: 0.6
            }
          }
        );
      });

      gsap.to("[data-hero-image]", {
        yPercent: 14,
        scale: 1.06,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "bottom top",
          scrub: 0.7
        }
      });

      gsap.utils.toArray<HTMLElement>("[data-chapter-track]").forEach((track) => {
        const shell = track.closest<HTMLElement>(".chapter-shell");
        if (!shell) return;
        const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + 3000);
        gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: shell,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 0.75,
            anticipatePin: 1,
            invalidateOnRefresh: true
          }
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-gallery-item]").forEach((item) => {
        const image = item.querySelector("img");
        if (!image) return;
        gsap.fromTo(
          image,
          { xPercent: -12 },
          {
            xPercent: 12,
            ease: "none",
            scrollTrigger: {
              trigger: item,
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

    return () => {
      window.removeEventListener("load", refresh);
      context.revert();
      lenis.destroy();
      gsap.ticker.remove(ticker);
      ScrollTrigger.refresh();
    };
  });

  return () => {
    matchMedia.revert();
  };
}
