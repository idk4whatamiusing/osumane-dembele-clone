import type { CSSProperties } from "react";
import type { AssetProfile, AudioContent, FooterContent, SceneContent } from "@/src/content/schema";
import { resolveMediaPath } from "@/src/lib/media";
import { SceneEnhancement } from "./SceneEnhancement";
import { HoldToPlayAudio } from "./HoldToPlayAudio";

interface SiteFooterProps {
  footer: FooterContent;
  scene: SceneContent;
  audio: AudioContent;
  profile: AssetProfile;
  label: string;
  unavailableLabel: string;
  total: number;
}

export function SiteFooter({ footer, scene, audio, profile, label, unavailableLabel, total }: SiteFooterProps) {
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
      <p className="site-footer__wordmark" aria-label={footer.wordmark}>
        {footer.wordmark}
      </p>
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
