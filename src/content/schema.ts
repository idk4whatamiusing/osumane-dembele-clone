export type AssetCategory =
  | "image"
  | "video"
  | "audio"
  | "font"
  | "icon"
  | "model"
  | "hdr"
  | "texture"
  | "frame";

export type RightsStatus = "reference-only" | "owned" | "licensed";

export type AssetProfile = "reference" | "owned";

export interface AssetManifestEntry {
  id: string;
  sourceUrl: string;
  category: AssetCategory;
  localPath: string;
  bytes: number;
  contentType: string;
  sha256: string;
  rightsStatus: RightsStatus;
}

export interface ResponsiveImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes?: string;
  srcSet?: string;
}

export interface GalleryImage extends ResponsiveImage {
  caption?: string;
}

export interface VideoMedia {
  mp4?: string;
  webm?: string;
  poster?: string;
  description: string;
  transcript?: string;
  decorative?: boolean;
}

export interface Stat {
  value: string;
  label: string;
}

export interface FrameSequence {
  basePath: string;
  startFrame: number;
  frameCount: number;
  extension: string;
  poster: string;
  width: number;
  height: number;
  posterWidth: number;
  posterHeight: number;
  description: string;
}

export interface Chapter {
  id: string;
  navLabel: string;
  title: string;
  kicker: string;
  period: string;
  intro: string;
  body: string[];
  accent: string;
  foreground: string;
  stats: Stat[];
  gallery: GalleryImage[];
  jersey?: ResponsiveImage;
  featureMedia: ResponsiveImage;
  featureVideo?: VideoMedia;
  frameSequence: FrameSequence;
  mobileVideo: VideoMedia;
}

export interface AudioContent {
  src: string;
  label: string;
  holdLabel: string;
  description: string;
  transcript: string;
}

export interface SceneContent {
  model: string;
  hdr?: string;
  textures?: string[];
  heroParticles?: number;
  footerParticles?: number;
  alt: string;
  fallbackLabel: string;
  accent: string;
}

export interface Credit {
  name: string;
  role: string;
  href?: string;
}

export interface FooterContent {
  wordmark: string;
  statement: string;
  credits: Credit[];
}

export interface HeroContent {
  eyebrow: string;
  titleLines: string[];
  summary: string;
  image: ResponsiveImage;
  scrollLabel: string;
}

export interface IntroContent {
  eyebrow: string;
  title: string;
  paragraphs: string[];
  gallery: GalleryImage[];
}

export interface SiteLabels {
  skip: string;
  navigation: string;
  chapters: string;
  introduction: string;
  gallery: string;
  statistics: string;
  feature: string;
  play: string;
  pause: string;
  audioUnavailable: string;
  footer: string;
  sceneFallback: string;
}

export interface PersonTheme {
  background: string;
  surface: string;
  ink: string;
  muted: string;
}

export interface PersonContent {
  slug: string;
  language: "fr";
  name: string;
  role: string;
  seoDescription: string;
  theme: PersonTheme;
  labels: SiteLabels;
  hero: HeroContent;
  intro: IntroContent;
  chapters: Chapter[];
  audio: AudioContent;
  scene: SceneContent;
  footer: FooterContent;
}

export function frameUrl(sequence: FrameSequence, index: number): string {
  const frame = sequence.startFrame + index;
  return `${sequence.basePath}/${String(frame).padStart(4, "0")}.${sequence.extension}`;
}

function assertText(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
}

function assertLocalAsset(value: unknown, field: string): asserts value is string {
  assertText(value, field);
  if (!value.startsWith("/assets/") || value.includes("..") || /^https?:\/\//i.test(value)) {
    throw new Error(`${field} must be a local /assets path`);
  }
}

function assertColor(value: unknown, field: string): void {
  assertText(value, field);
  if (!/^#[0-9a-f]{6}$/i.test(value)) {
    throw new Error(`${field} must be a six-digit hex color`);
  }
}

function assertImage(image: ResponsiveImage, field: string): void {
  assertLocalAsset(image.src, `${field}.src`);
  assertText(image.alt, `${field}.alt`);
  if (!Number.isInteger(image.width) || image.width <= 0) {
    throw new Error(`${field}.width must be positive`);
  }
  if (!Number.isInteger(image.height) || image.height <= 0) {
    throw new Error(`${field}.height must be positive`);
  }
}

function assertVideo(video: VideoMedia, field: string): void {
  if (!video.mp4 && !video.webm) {
    throw new Error(`${field} must have a source`);
  }
  if (video.mp4) assertLocalAsset(video.mp4, `${field}.mp4`);
  if (video.webm) assertLocalAsset(video.webm, `${field}.webm`);
  if (video.poster) assertLocalAsset(video.poster, `${field}.poster`);
  assertText(video.description, `${field}.description`);
}

export function validatePersonContent(person: PersonContent): void {
  assertText(person.slug, "slug");
  assertText(person.name, "name");
  assertText(person.role, "role");
  assertText(person.seoDescription, "seoDescription");
  if (person.language !== "fr") {
    throw new Error("language must be fr");
  }
  assertColor(person.theme.background, "theme.background");
  assertColor(person.theme.surface, "theme.surface");
  assertColor(person.theme.ink, "theme.ink");
  assertColor(person.theme.muted, "theme.muted");
  assertText(person.labels.skip, "labels.skip");
  Object.entries(person.labels).forEach(([key, value]) => assertText(value, `labels.${key}`));
  if (person.hero.titleLines.length === 0) {
    throw new Error("hero.titleLines must not be empty");
  }
  person.hero.titleLines.forEach((line, index) => assertText(line, `hero.titleLines.${index}`));
  assertText(person.hero.summary, "hero.summary");
  assertText(person.hero.scrollLabel, "hero.scrollLabel");
  assertImage(person.hero.image, "hero.image");
  if (person.intro.paragraphs.length === 0 || person.chapters.length === 0) {
    throw new Error("intro.paragraphs and chapters must not be empty");
  }
  assertText(person.intro.eyebrow, "intro.eyebrow");
  assertText(person.intro.title, "intro.title");
  if (person.intro.gallery.length === 0) {
    throw new Error("intro.gallery must not be empty");
  }
  person.intro.gallery.forEach((image, index) => assertImage(image, `intro.gallery.${index}`));
  const ids = new Set<string>();
  const reservedIds = new Set(["introduction", "top", "content", "credits"]);
  for (const chapter of person.chapters) {
    assertText(chapter.id, "chapter.id");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(chapter.id)) {
      throw new Error(`chapter.id is not a safe slug: ${chapter.id}`);
    }
    if (reservedIds.has(chapter.id)) {
      throw new Error(`chapter.id is reserved: ${chapter.id}`);
    }
    if (ids.has(chapter.id)) {
      throw new Error(`duplicate chapter.id: ${chapter.id}`);
    }
    ids.add(chapter.id);
    assertText(chapter.navLabel, `${chapter.id}.navLabel`);
    assertText(chapter.title, `${chapter.id}.title`);
    assertText(chapter.kicker, `${chapter.id}.kicker`);
    assertText(chapter.period, `${chapter.id}.period`);
    assertText(chapter.intro, `${chapter.id}.intro`);
    if (chapter.body.length === 0) {
      throw new Error(`${chapter.id}.body must not be empty`);
    }
    chapter.body.forEach((paragraph, index) =>
      assertText(paragraph, `${chapter.id}.body.${index}`)
    );
    assertColor(chapter.accent, `${chapter.id}.accent`);
    assertColor(chapter.foreground, `${chapter.id}.foreground`);
    if (chapter.stats.length === 0 || chapter.gallery.length === 0) {
      throw new Error(`${chapter.id} requires stats and gallery images`);
    }
    chapter.stats.forEach((stat, index) => {
      assertText(stat.value, `${chapter.id}.stats.${index}.value`);
      assertText(stat.label, `${chapter.id}.stats.${index}.label`);
    });
    chapter.gallery.forEach((image, index) => assertImage(image, `${chapter.id}.gallery.${index}`));
    if (chapter.jersey) assertImage(chapter.jersey, `${chapter.id}.jersey`);
    assertImage(chapter.featureMedia, `${chapter.id}.featureMedia`);
    if (chapter.featureVideo) assertVideo(chapter.featureVideo, `${chapter.id}.featureVideo`);
    assertLocalAsset(chapter.frameSequence.basePath, `${chapter.id}.frameSequence.basePath`);
    assertLocalAsset(chapter.frameSequence.poster, `${chapter.id}.frameSequence.poster`);
    assertText(chapter.frameSequence.description, `${chapter.id}.frameSequence.description`);
    if (!/^[a-z0-9]+$/i.test(chapter.frameSequence.extension)) {
      throw new Error(`${chapter.id}.frameSequence.extension is invalid`);
    }
    if (
      !Number.isInteger(chapter.frameSequence.startFrame) ||
      !Number.isInteger(chapter.frameSequence.frameCount) ||
      chapter.frameSequence.frameCount < 1 ||
      !Number.isInteger(chapter.frameSequence.width) ||
      !Number.isInteger(chapter.frameSequence.height) ||
      !Number.isInteger(chapter.frameSequence.posterWidth) ||
      !Number.isInteger(chapter.frameSequence.posterHeight) ||
      chapter.frameSequence.width <= 0 ||
      chapter.frameSequence.height <= 0 ||
      chapter.frameSequence.posterWidth <= 0 ||
      chapter.frameSequence.posterHeight <= 0
    ) {
      throw new Error(`${chapter.id}.frameSequence contains invalid dimensions or frame values`);
    }
    assertVideo(chapter.mobileVideo, `${chapter.id}.mobileVideo`);
  }
  assertLocalAsset(person.audio.src, "audio.src");
  assertText(person.audio.label, "audio.label");
  assertText(person.audio.holdLabel, "audio.holdLabel");
  assertText(person.audio.description, "audio.description");
  assertText(person.audio.transcript, "audio.transcript");
  assertLocalAsset(person.scene.model, "scene.model");
  if (person.scene.hdr) assertLocalAsset(person.scene.hdr, "scene.hdr");
  if (person.scene.textures) {
    person.scene.textures.forEach((texture, index) =>
      assertLocalAsset(texture, `scene.textures.${index}`)
    );
  }
  if (
    person.scene.heroParticles !== undefined &&
    (!Number.isInteger(person.scene.heroParticles) || person.scene.heroParticles < 1)
  ) {
    throw new Error("scene.heroParticles must be a positive integer");
  }
  if (
    person.scene.footerParticles !== undefined &&
    (!Number.isInteger(person.scene.footerParticles) || person.scene.footerParticles < 1)
  ) {
    throw new Error("scene.footerParticles must be a positive integer");
  }
  assertText(person.scene.alt, "scene.alt");
  assertText(person.scene.fallbackLabel, "scene.fallbackLabel");
  assertColor(person.scene.accent, "scene.accent");
  assertText(person.footer.wordmark, "footer.wordmark");
  assertText(person.footer.statement, "footer.statement");
  if (person.footer.credits.length === 0) {
    throw new Error("footer.credits must not be empty");
  }
  person.footer.credits.forEach((credit, index) => {
    assertText(credit.name, `footer.credits.${index}.name`);
    assertText(credit.role, `footer.credits.${index}.role`);
    if (credit.href && !/^https?:\/\//i.test(credit.href)) {
      throw new Error(`footer.credits.${index}.href must be an HTTP(S) URL`);
    }
  });
}
