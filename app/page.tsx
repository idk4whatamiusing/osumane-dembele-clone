import type { CSSProperties } from "react";
import { configuredPerson } from "@/src/content/config";
import type { AssetProfile } from "@/src/content/schema";
import { contentForProfile } from "@/src/lib/media";
import { ChapterNav } from "@/src/components/ChapterNav";
import { ChapterTrack } from "@/src/components/ChapterTrack";
import { Hero } from "@/src/components/Hero";
import { Intro } from "@/src/components/Intro";
import { MotionRoot } from "@/src/components/MotionRoot";
import { Preloader } from "@/src/components/Preloader";
import { SiteFooter } from "@/src/components/SiteFooter";

export default function Home() {
  const sourcePerson = configuredPerson;
  const profile: AssetProfile =
    process.env.ASSET_PROFILE === "owned" ||
    (process.env.ASSET_PROFILE !== "reference" && process.env.NODE_ENV === "production")
      ? "owned"
      : "reference";
  const person = contentForProfile(sourcePerson, profile);
  const style = {
    "--page-bg": person.theme.background,
    "--page-surface": person.theme.surface,
    "--page-ink": person.theme.ink,
    "--page-muted": person.theme.muted,
    "--page-accent": person.scene.accent
  } as CSSProperties;

  return (
    <MotionRoot>
      <div className="site-shell" data-asset-profile={profile} style={style}>
        <Preloader name={person.name} />
        <ChapterNav
          name={person.name}
          items={person.chapters.map(({ id, navLabel }) => ({ id, label: navLabel }))}
          navigationLabel={person.labels.navigation}
          introductionLabel={person.labels.introduction}
        />
        <main id="content">
          <Hero person={person} profile={profile} />
          <Intro
            intro={person.intro}
            profile={profile}
            label={person.labels.introduction}
            galleryLabel={person.labels.gallery}
          />
          {person.chapters.map((chapter, index) => (
            <ChapterTrack
              key={chapter.id}
              chapter={chapter}
              index={index}
              total={person.chapters.length}
              profile={profile}
              labels={person.labels}
            />
          ))}
        </main>
        <SiteFooter
           footer={person.footer}
           scene={person.scene}
           audio={person.audio}
           profile={profile}
           label={person.labels.footer}
           unavailableLabel={person.labels.audioUnavailable}
           total={person.chapters.length}
        />
        <noscript>
          <p className="noscript-note">La version statique reste entièrement lisible sans JavaScript.</p>
        </noscript>
      </div>
    </MotionRoot>
  );
}
