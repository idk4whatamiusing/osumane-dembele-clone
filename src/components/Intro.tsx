import type { AssetProfile, IntroContent } from "@/src/content/schema";
import { resolveMediaPath } from "@/src/lib/media";
import { SafeImage } from "./SafeImage";

interface IntroProps {
  intro: IntroContent;
  profile: AssetProfile;
  label: string;
  galleryLabel: string;
}

export function Intro({ intro, profile, label, galleryLabel }: IntroProps) {
  return (
    <section id="introduction" className="intro" aria-labelledby="intro-title">
      <div className="intro__lead" data-reveal>
        <p className="eyebrow">{label}</p>
        <h2 id="intro-title">{intro.title}</h2>
      </div>
      <div className="intro__copy" data-reveal>
        {intro.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <ul className="intro__gallery" aria-label={galleryLabel}>
        {intro.gallery.map((item, index) => (
          <li key={item.src} data-gallery-item data-reveal>
            <SafeImage
              src={resolveMediaPath(item.src, profile)}
              alt={item.alt}
              width={item.width}
              height={item.height}
              srcSet={profile === "owned" ? undefined : item.srcSet}
              sizes="(max-width: 991px) 86vw, 31vw"
              loading="lazy"
              decoding="async"
            />
            <span>
              <b>{String(index + 1).padStart(2, "0")}</b>
              {item.caption}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
