import type { CSSProperties } from "react";
import type { AssetProfile, Chapter, SiteLabels } from "@/src/content/schema";
import { resolveMediaPath } from "@/src/lib/media";
import { CinematicMedia } from "./CinematicMedia";
import { FrameSequence } from "./FrameSequence";
import { SafeImage } from "./SafeImage";

interface ChapterTrackProps {
  chapter: Chapter;
  index: number;
  total: number;
  profile: AssetProfile;
  labels: SiteLabels;
}

export function ChapterTrack({ chapter, index, total, profile, labels }: ChapterTrackProps) {
  const style = {
    "--chapter-accent": chapter.accent,
    "--chapter-foreground": chapter.foreground
  } as CSSProperties;

  return (
    <section
      id={chapter.id}
      className="chapter-shell"
      style={style}
      aria-labelledby={`${chapter.id}-title`}
    >
      <div className="chapter-track" data-chapter-track>
        <header className="chapter-panel chapter-panel--intro">
          <div className="chapter-panel__index" data-reveal>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <svg viewBox="0 0 180 20" preserveAspectRatio="none" aria-hidden="true">
              <path data-draw d="M0 10H180" />
            </svg>
            <span>{String(total).padStart(2, "0")}</span>
          </div>
          <p className="eyebrow" data-reveal>
            {chapter.period} · {chapter.navLabel}
          </p>
          <h2 id={`${chapter.id}-title`} data-reveal>
            {chapter.title}
          </h2>
          <p className="chapter-panel__kicker" data-reveal>
            {chapter.kicker}
          </p>
          <div className="chapter-panel__copy" data-reveal>
            <p>{chapter.intro}</p>
            {chapter.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </header>
        <div className="chapter-panel chapter-panel--frame">
          <FrameSequence sequence={chapter.frameSequence} profile={profile} />
        </div>
        <div className="chapter-panel chapter-panel--media">
          <p className="eyebrow" data-reveal>
            {labels.feature}
          </p>
          {chapter.featureVideo ? (
            <CinematicMedia
              media={chapter.featureVideo}
              profile={profile}
              title={`${chapter.navLabel} · ${chapter.period}`}
              playLabel={labels.play}
              pauseLabel={labels.pause}
            />
          ) : (
            <SafeImage
              className="chapter-panel__feature"
              src={resolveMediaPath(chapter.featureMedia.src, profile)}
              alt={chapter.featureMedia.alt}
              width={chapter.featureMedia.width}
              height={chapter.featureMedia.height}
              srcSet={profile === "owned" ? undefined : chapter.featureMedia.srcSet}
              sizes="(max-width: 991px) 92vw, 42vw"
              loading="lazy"
              decoding="async"
              data-reveal
            />
          )}
          <div className="chapter-panel__secondary-media">
            <CinematicMedia
              media={chapter.mobileVideo}
              profile={profile}
              title={`${chapter.navLabel} · ${chapter.period}`}
              playLabel={labels.play}
              pauseLabel={labels.pause}
            />
          </div>
        </div>
        <div className="chapter-panel chapter-panel--stats">
          <p className="eyebrow" data-reveal>
            {labels.statistics}
          </p>
          <dl>
            {chapter.stats.map((stat) => (
              <div key={stat.label} data-reveal>
                <dt>{stat.label}</dt>
                <dd>{stat.value}</dd>
              </div>
            ))}
          </dl>
          {chapter.jersey ? (
            <SafeImage
              className="chapter-panel__jersey"
              src={resolveMediaPath(chapter.jersey.src, profile)}
              alt={chapter.jersey.alt}
              width={chapter.jersey.width}
              height={chapter.jersey.height}
              srcSet={profile === "owned" ? undefined : chapter.jersey.srcSet}
              loading="lazy"
              decoding="async"
            />
          ) : null}
        </div>
        <div className="chapter-panel chapter-panel--gallery">
          <p className="eyebrow" data-reveal>
            {labels.gallery}
          </p>
          <ul aria-label={`${labels.gallery} — ${chapter.title}`}>
            {chapter.gallery.map((item, itemIndex) => (
              <li key={item.src} data-gallery-item data-reveal>
                <SafeImage
                  src={resolveMediaPath(item.src, profile)}
                  alt={item.alt}
                  width={item.width}
                  height={item.height}
                  srcSet={profile === "owned" ? undefined : item.srcSet}
                  sizes="(max-width: 991px) 92vw, 31vw"
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
      </div>
    </section>
  );
}
