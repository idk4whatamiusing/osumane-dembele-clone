import type { CSSProperties } from "react";
import type { AssetProfile, Chapter, SiteLabels } from "@/src/content/schema";
import { resolveMediaPath } from "@/src/lib/media";
import { SafeImage } from "./SafeImage";
import { ClubMark } from "./ClubMark";

interface ChapterTrackProps {
  chapter: Chapter;
  index: number;
  total: number;
  profile: AssetProfile;
  labels: SiteLabels;
}

/**
 * A chapter is the reference site's three-panel horizontal sequence:
 *
 *   1. the club mark, the rotating jersey and the shirt number;
 *   2. the chapter title behind the four photographs;
 *   3. the film and statement, closed by the statistics.
 *
 * The motion runtime pins the section and translates `.chapter-track` through
 * those panels. Without JavaScript the panels stack and every asset is still
 * readable.
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
  const jerseyVideo = chapter.featureVideo ?? chapter.mobileVideo;
  const filmVideo = chapter.filmVideo;
  const jersey = chapter.jersey ?? chapter.featureMedia;
  const markSlug =
    ["evreux", "rennes", "dortmund", "barca", "psg"][index] ?? "evreux";

  return (
    <section
      id={chapter.id}
      className="chapter-shell"
      style={style}
      aria-labelledby={`${chapter.id}-title`}
      data-chapter-title={chapter.title}
      data-chapter-period={chapter.period}
      data-club={markSlug}
      data-frame-sequence={JSON.stringify(chapter.frameSequence)}
    >
      <div className="chapter-track" data-chapter-track>
        {/* 1 — the mark, the rotating jersey and the shirt number */}
        <article className="chapter-panel chapter-panel--jersey" data-panel="jersey">
          <div className="chapter-jersey__media" aria-hidden="true">
            <SafeImage
              className="chapter-jersey__still"
              src={resolveMediaPath(jersey.src, profile)}
              alt=""
              width={jersey.width}
              height={jersey.height}
              sizes="(max-width: 991px) 92vw, 70vh"
              loading="lazy"
              decoding="async"
            />
            <video
              className="chapter-jersey__video"
              muted
              loop
              playsInline
              autoPlay
              preload="auto"
              aria-hidden="true"
            >
              {jerseyVideo.webm ? (
                <source src={resolveMediaPath(jerseyVideo.webm, profile)} type="video/webm" />
              ) : null}
              {jerseyVideo.mp4 ? (
                <source src={resolveMediaPath(jerseyVideo.mp4, profile)} type="video/mp4" />
              ) : null}
            </video>
          </div>

          <h2 id={`${chapter.id}-title`} className="chapter-jersey__mark">
            <ClubMark slug={markSlug} className="chapter-jersey__mark-svg" />
            <span className="sr-only">{chapter.clubName}</span>
          </h2>

          <p className="chapter-jersey__numbers" aria-hidden="true" data-jersey-numbers>
            {chapter.shirtNumber.split("").map((digit, digitIndex) => (
              <span key={`${digit}-${digitIndex}`} data-number-half>
                {digit}
              </span>
            ))}
          </p>

          <span className="chapter-shell__index" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
            <i />
            {String(total).padStart(2, "0")}
          </span>
        </article>

        {/* 2 — the chapter title behind the photographs */}
        <article className="chapter-panel chapter-panel--gallery" data-panel="gallery">
          <h3 className="chapter-gallery__title" data-split="chars">
            {chapter.title}
          </h3>
          <ul
            className="chapter-gallery__strip"
            data-gallery-strip
            aria-label={`${labels.gallery} — ${chapter.title}`}
          >
            {strip.map((item, itemIndex) => (
              <li key={item.src} data-gallery-item>
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
        </article>

        {/* 3 — the film, the statement and the statistics */}
        <article className="chapter-panel chapter-panel--story" data-panel="story">
          <div className="chapter-story__film" data-chapter-film>
            {filmVideo ? (
              <video
                className="chapter-story__video"
                muted
                loop
                playsInline
                autoPlay
                preload="metadata"
                aria-hidden="true"
                data-chapter-film-video
              >
                {filmVideo.webm ? (
                  <source src={resolveMediaPath(filmVideo.webm, profile)} type="video/webm" />
                ) : null}
                {filmVideo.mp4 ? (
                  <source src={resolveMediaPath(filmVideo.mp4, profile)} type="video/mp4" />
                ) : null}
              </video>
            ) : (
              <SafeImage
                className="chapter-story__poster"
                src={resolveMediaPath(chapter.featureMedia.src, profile)}
                alt=""
                width={chapter.featureMedia.width}
                height={chapter.featureMedia.height}
                srcSet={profile === "owned" ? undefined : chapter.featureMedia.srcSet}
                sizes="100vw"
                loading="lazy"
                decoding="async"
              />
            )}
          </div>

          <div className="chapter-story__intro" data-story-intro>
            <div className="chapter-story__heading">
              <h3 className="chapter-display chapter-story__lead">
                {chapter.storyHeadline.lead}
              </h3>
            </div>
            <div className="chapter-story__bottom">
              <div className="chapter-story__copy">
                <p>{chapter.intro}</p>
              </div>
              <h3 className="chapter-display chapter-story__tail">
                {chapter.storyHeadline.tail}
              </h3>
            </div>
          </div>

          <div className="chapter-story__overlay" data-story-overlay>
            <div className="chapter-story__overlay-heading">
              <p className="chapter-story__overlay-title">
                {chapter.overlay.title}
              </p>
              <p className="chapter-story__overlay-subtitle">
                {chapter.overlay.subtitle}
              </p>
            </div>
            <dl className="chapter-story__stats" data-stat-count={chapter.stats.length}>
              {chapter.stats.map((stat) => (
                <div key={stat.label} className="chapter-story__stat">
                  <dt>{stat.label}</dt>
                  <dd>{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </article>
      </div>
    </section>
  );
}
