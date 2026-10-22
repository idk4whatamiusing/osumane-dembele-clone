import type { CSSProperties } from "react";
import type { AssetProfile, Chapter, SiteLabels } from "@/src/content/schema";
import { resolveMediaPath } from "@/src/lib/media";
import { ChapterMedia } from "./ChapterMedia";
import { FrameStage } from "./FrameStage";
import { SafeImage } from "./SafeImage";

interface ChapterTrackProps {
  chapter: Chapter;
  index: number;
  total: number;
  profile: AssetProfile;
  labels: SiteLabels;
}

/**
 * A chapter is four horizontal scenes, following the reference site:
 *
 *  1. the club mark with the shirt number worn by the player
 *  2. the chapter title above a staggered grid of photographs
 *  3. the kicker over the chapter portrait, closed by the statistics
 *  4. the footage of the season under the headings of the chapter
 */
export function ChapterTrack({ chapter, index, total, profile, labels }: ChapterTrackProps) {
  const style = {
    "--chapter-accent": chapter.accent,
    "--chapter-foreground": chapter.foreground,
    "--chapter-type": chapter.typeColor,
    "--nav-color": chapter.navColor,
    "--nav-active-color": chapter.navActiveColor
  } as CSSProperties;

  const strip = chapter.gallery.slice(0, 4);
  const footage = chapter.featureVideo;

  return (
    <section
      id={chapter.id}
      className="chapter-shell"
      style={style}
      aria-labelledby={`${chapter.id}-title`}
      data-chapter-title={chapter.title}
      data-chapter-period={chapter.period}
      data-frame-sequence={JSON.stringify(chapter.frameSequence)}
    >
      <FrameStage chapterId={chapter.id} sequence={chapter.frameSequence} profile={profile} />
      <div className="chapter-track" data-chapter-track>
        {/* 1 — the club mark and the shirt number */}
        <div className="chapter-scene chapter-scene--mark" data-scene="mark">
          <p className="chapter-scene__numerals" aria-hidden="true">
            {chapter.shirtNumber.split("").map((digit, digitIndex) => (
              <span key={`${digit}-${digitIndex}`}>{digit}</span>
            ))}
          </p>
          <h2
            id={`${chapter.id}-title`}
            className="chapter-scene__club"
            data-reveal
            data-split="chars"
          >
            {chapter.clubName}
          </h2>
        </div>

        {/* 2 — the chapter title above the photographs */}
        <div className="chapter-scene chapter-scene--title" data-scene="title">
          <h3 className="chapter-scene__display" data-reveal data-split="chars">
            {chapter.title}
          </h3>
          <ul className="chapter-scene__strip" aria-label={`${labels.gallery} — ${chapter.title}`}>
            {strip.map((item, itemIndex) => (
              <li key={item.src} data-gallery-item data-reveal>
                <SafeImage
                  src={resolveMediaPath(item.src, profile)}
                  alt={item.alt}
                  width={item.width}
                  height={item.height}
                  srcSet={profile === "owned" ? undefined : item.srcSet}
                  sizes="(max-width: 991px) 92vw, 30vw"
                  loading="lazy"
                  decoding="async"
                />
                <span>
                  <b>{String(itemIndex + 1).padStart(2, "0")}</b>
                  {item.caption}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* 3 — the kicker over the portrait, closed by the statistics, then
            the footage of the season fades in over the portrait */}
        <div className="chapter-scene chapter-scene--portrait" data-scene="portrait">
          <div className="chapter-scene__portrait-media">
            <SafeImage
              src={resolveMediaPath(chapter.featureMedia.src, profile)}
              alt={chapter.featureMedia.alt}
              width={chapter.featureMedia.width}
              height={chapter.featureMedia.height}
              srcSet={profile === "owned" ? undefined : chapter.featureMedia.srcSet}
              sizes="(max-width: 991px) 92vw, 100vw"
              loading="lazy"
              decoding="async"
            />
          </div>
          {footage ? (
            <div className="chapter-scene__film" data-chapter-film>
              <video
                className="chapter-scene__video"
                poster={resolveMediaPath(footage.poster ?? chapter.featureMedia.src, profile)}
                muted
                loop
                playsInline
                preload="none"
                aria-label={footage.description}
              >
                {footage.webm ? (
                  <source src={resolveMediaPath(footage.webm, profile)} type="video/webm" />
                ) : null}
                {footage.mp4 ? (
                  <source src={resolveMediaPath(footage.mp4, profile)} type="video/mp4" />
                ) : null}
              </video>
            </div>
          ) : null}
          <div className="chapter-scene__headline">
            <p className="eyebrow" data-reveal>
              {chapter.period}
            </p>
            <h3 className="chapter-scene__display chapter-scene__display--kicker" data-reveal data-split="chars">
              {chapter.kicker}
            </h3>
          </div>
          <div className="chapter-scene__body" data-reveal data-split="words">
            <p>{chapter.intro}</p>
            {chapter.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <dl className="chapter-scene__stats">
            {chapter.stats.map((stat) => (
              <div key={stat.label} className="chapter-scene__stat">
                <dt data-reveal>{stat.label}</dt>
                <dd data-reveal data-split="chars">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="chapter-scene__overlay">
            <p className="chapter-scene__overlay-title" data-reveal data-split="chars">
              {chapter.overlay.title}
            </p>
            <p className="chapter-scene__overlay-subtitle" data-reveal data-split="chars">
              {chapter.overlay.subtitle}
            </p>
          </div>
          <ChapterMedia
            sequence={chapter.frameSequence}
            mobileVideo={chapter.mobileVideo}
            profile={profile}
          />
        </div>
      </div>
      <span className="chapter-shell__index" aria-hidden="true">
        {String(index + 1).padStart(2, "0")}
        <i />
        {String(total).padStart(2, "0")}
      </span>
    </section>
  );
}
