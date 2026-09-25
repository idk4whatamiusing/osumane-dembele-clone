export async function createMotionExperience(root: HTMLElement | null): Promise<() => void> {
  if (!root) return () => undefined;

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
      duration: 1.05,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 0.9,
      touchMultiplier: 1
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
          delay: 1.8
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
        const distance = () =>
          Math.max(0, track.scrollWidth - window.innerWidth + window.innerWidth * 0.24);
        gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: shell,
            start: "top top",
            end: () => `+=${distance() + window.innerHeight * 0.72}`,
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
          { xPercent: -7 },
          {
            xPercent: 7,
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
