import type { CSSProperties } from "react";
import type { AssetProfile, PersonContent } from "@/src/content/schema";
import { resolveMediaPath } from "@/src/lib/media";
import { SceneEnhancement } from "./SceneEnhancement";

interface HeroProps {
  person: PersonContent;
  profile: AssetProfile;
}

/**
 * The opening screen.
 *
 * The reference site opens on a cream page with a single golden particle
 * sphere and nothing else: no headline, no paragraph. The wordmark lives at
 * the bottom of the viewport and the title is revealed by the introduction
 * that follows.
 */
export function Hero({ person, profile }: HeroProps) {
  const style = { "--hero-accent": person.scene.accent } as CSSProperties;
  const model = resolveMediaPath(person.scene.model, profile);

  return (
    <section id="top" className="hero" style={style} aria-labelledby="hero-title">
      <div className="hero__media">
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
      <h1 id="hero-title" className="sr-only">
        {person.name}
        <span className="sr-only"> — {person.hero.titleLines.join(" ")}</span>
      </h1>
    </section>
  );
}
