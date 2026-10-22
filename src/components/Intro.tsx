import type { AssetProfile, IntroContent } from "@/src/content/schema";

interface IntroProps {
  intro: IntroContent;
  profile: AssetProfile;
  label: string;
  galleryLabel: string;
}

/**
 * The introduction.
 *
 * The title is built from three words that the motion runtime scatters
 * across the viewport while the section scrolls away, and the paragraph is
 * revealed word by word.
 */
export function Intro({ intro, label }: IntroProps) {
  return (
    <section id="introduction" className="intro" aria-labelledby="intro-title">
      <div className="intro__head">
        <p className="eyebrow" data-reveal>
          {label}
        </p>
        <h2 id="intro-title" className="intro__title">
          {intro.titleLines.map((line, index) => (
            <span key={line} className="intro__word" data-intro-word={index}>
              <span className="intro__word-inner" data-split="chars">
                {line}
              </span>
            </span>
          ))}
        </h2>
      </div>
      <div className="intro__copy" data-reveal data-split="words">
        {intro.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}
