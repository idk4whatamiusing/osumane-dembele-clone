import type { CSSProperties } from "react";
import type {
  AssetProfile,
  AudioContent,
  FooterContent,
  GalleryImage,
  SceneContent
} from "@/src/content/schema";
import { resolveMediaPath } from "@/src/lib/media";
import { SceneEnhancement } from "./SceneEnhancement";
import { HoldToPlayAudio } from "./HoldToPlayAudio";
import { SafeImage } from "./SafeImage";
import { FooterSignature } from "./FooterSignature";

interface SiteFooterProps {
  footer: FooterContent;
  scene: SceneContent;
  audio: AudioContent;
  gallery: GalleryImage[];
  profile: AssetProfile;
  label: string;
  galleryLabel: string;
  unavailableLabel: string;
  total: number;
}

export function SiteFooter({
  footer,
  scene,
  audio,
  gallery,
  profile,
  label,
  galleryLabel,
  unavailableLabel,
  total
}: SiteFooterProps) {
  const style = { "--footer-accent": scene.accent } as CSSProperties;
  return (
    <footer id="credits" className="site-footer" style={style} aria-label={label}>
      <SceneEnhancement
        variant="footer"
         model={resolveMediaPath(scene.model, profile)}
         hdr={scene.hdr ? resolveMediaPath(scene.hdr, profile) : undefined}
         textures={scene.textures?.map((texture) => resolveMediaPath(texture, profile))}
         particleCount={scene.footerParticles}
         accent={scene.accent}
        fallbackLabel={scene.fallbackLabel}
      />
      <div className="site-footer__topline">
        <span>{footer.statement}</span>
        <span>{String(total).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
      </div>
      <FooterSignature className="site-footer__signature" />
      <p className="site-footer__wordmark" aria-label={footer.wordmark}>
        {footer.wordmark}
      </p>
      <ul className="site-footer__gallery" aria-label={galleryLabel}>
        {gallery.map((item, index) => (
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
      <HoldToPlayAudio
        audio={audio}
        profile={profile}
        unavailableLabel={unavailableLabel}
      />
      <div className="site-footer__credits">
        <h2>Crédits</h2>
        <dl>
          {footer.credits.map((credit) => (
            <div key={`${credit.name}-${credit.role}`}>
              <dt>{credit.name}</dt>
              <dd>{credit.role}</dd>
            </div>
          ))}
        </dl>
        <a href="#top">Retour en haut ↑</a>
      </div>
    </footer>
  );
}
