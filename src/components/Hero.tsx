import type { CSSProperties } from "react";
import type { AssetProfile, PersonContent } from "@/src/content/schema";
import { resolveMediaPath } from "@/src/lib/media";
import { SafeImage } from "./SafeImage";
import { SceneEnhancement } from "./SceneEnhancement";

interface HeroProps {
  person: PersonContent;
  profile: AssetProfile;
}

export function Hero({ person, profile }: HeroProps) {
  const style = { "--hero-accent": person.scene.accent } as CSSProperties;
  const model = resolveMediaPath(person.scene.model, profile);

  return (
    <section id="top" className="hero" style={style} aria-labelledby="hero-title">
      <div className="hero__media" data-hero-image>
        <SafeImage
          src={resolveMediaPath(person.hero.image.src, profile)}
          alt={person.hero.image.alt}
          width={person.hero.image.width}
          height={person.hero.image.height}
          srcSet={profile === "owned" ? undefined : person.hero.image.srcSet}
          sizes="(max-width: 991px) 100vw, 48vw"
          loading="eager"
          fetchPriority="high"
        />
        <SceneEnhancement
          variant="hero"
           model={model}
           hdr={person.scene.hdr ? resolveMediaPath(person.scene.hdr, profile) : undefined}
           textures={person.scene.textures?.map((texture) => resolveMediaPath(texture, profile))}
           particleCount={person.scene.heroParticles}
           accent={person.scene.accent}
          fallbackLabel={person.scene.fallbackLabel}
        />
      </div>
      <div className="hero__copy">
        <p className="eyebrow" data-hero-reveal>
          {person.hero.eyebrow}
        </p>
        <h1 id="hero-title" className="hero__title">
          <span className="sr-only">{person.name} — </span>
          {person.hero.titleLines.map((line, index) => (
            <span key={line} className={`hero__line hero__line--${index + 1}`} data-hero-reveal>
              {line}
            </span>
          ))}
        </h1>
        <p className="hero__summary" data-hero-reveal>
          {person.hero.summary}
        </p>
      </div>
      <p className="hero__name" aria-hidden="true" data-hero-reveal>
        {person.name}
      </p>
      <a className="hero__scroll" href="#introduction" data-hero-reveal>
        <span>{person.hero.scrollLabel}</span>
        <svg viewBox="0 0 20 28" aria-hidden="true">
          <path d="M10 1v24M3 18l7 7 7-7" />
        </svg>
      </a>
    </section>
  );
}
