import { Fragment } from "react";
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
 * The two first words form one group that the motion runtime pushes toward
 * the left edge; the final word travels to the right edge. Each word is
 * masked and rises on load, exactly like the reference title. The paragraph
 * is revealed word by word while it crosses the viewport.
 */
export function Intro({ intro }: IntroProps) {
  const first = intro.titleLines.slice(0, -1);
  const last = intro.titleLines[intro.titleLines.length - 1];

  return (
    <section id="introduction" className="intro" aria-labelledby="intro-title">
      <div className="intro__head">
        <h2 id="intro-title" className="intro__title" data-intro-title>
          <span className="intro__group">
            {first.map((line) => (
              <span key={line} className="intro__word">
                <span className="intro__word-inner">{line}</span>
              </span>
            ))}
          </span>
          <span className="intro__word intro__word--last">
            <span className="intro__word-inner">{last}</span>
          </span>
        </h2>
      </div>
      <div className="intro__copy" data-p-write>
        <p>
          {intro.paragraphs.map((paragraph, paragraphIndex) => (
            <Fragment key={`paragraph-${paragraphIndex}`}>
              {paragraphIndex > 0 ? (
                <>
                  <br />
                  <br />
                </>
              ) : null}
              {paragraph.split("\n").map((line, lineIndex) => {
                const lineWords = line.split(" ").filter(Boolean);
                return (
                  <Fragment key={`line-${paragraphIndex}-${lineIndex}`}>
                    {lineIndex > 0 ? <br /> : null}
                    {lineWords.map((word, wordIndex) => (
                      <Fragment key={`word-${paragraphIndex}-${lineIndex}-${wordIndex}`}>
                        <span data-intro-para-word>{word}</span>
                        {wordIndex < lineWords.length - 1 ? " " : null}
                      </Fragment>
                    ))}
                  </Fragment>
                );
              })}
            </Fragment>
          ))}
        </p>
      </div>
    </section>
  );
}
