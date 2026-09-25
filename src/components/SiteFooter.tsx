import type { CSSProperties } from "react";
import type { AssetProfile, FooterContent, SceneContent } from "@/src/content/schema";
import { resolveMediaPath } from "@/src/lib/media";
import { SceneEnhancement } from "./SceneEnhancement";

interface SiteFooterProps {
  footer: FooterContent;
  scene: SceneContent;
  profile: AssetProfile;
  label: string;
  total: number;
}

export function SiteFooter({ footer, scene, profile, label, total }: SiteFooterProps) {
  const style = { "--footer-accent": scene.accent } as CSSProperties;
  return (
    <footer id="credits" className="site-footer" style={style} aria-label={label}>
      <SceneEnhancement
        variant="footer"
        model={resolveMediaPath(scene.model, profile)}
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
