import type {
  AssetProfile,
  Chapter,
  PersonContent,
  ResponsiveImage,
  VideoMedia
} from "@/src/content/schema";

const ownedFallbacks: Record<string, string> = {
  image: "/assets/core/fallback-poster.svg",
  video: "/assets/core/fallback.mp4",
  audio: "/assets/core/ambient.mp3",
  frame: "/assets/core/fallback-poster.svg",
  model: ""
};

function categoryForPath(path: string): keyof typeof ownedFallbacks {
  if (/\.(mp4|webm|mov)$/i.test(path)) return "video";
  if (/\.(mp3|wav|ogg|m4a|aac)$/i.test(path)) return "audio";
  if (/\.(glb|gltf)$/i.test(path)) return "model";
  if (/\/\d{4}\./.test(path)) return "frame";
  return "image";
}

export function resolveMediaPath(path: string, profile: AssetProfile): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (profile === "owned" && normalized.includes("/assets/reference/")) {
    return ownedFallbacks[categoryForPath(normalized)];
  }
  const base = process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.replace(/\/$/, "");
  return base ? `${base}${normalized}` : normalized;
}

function ownedImage(image: ResponsiveImage): ResponsiveImage {
  return {
    ...image,
    src: resolveMediaPath(image.src, "owned"),
    srcSet: undefined
  };
}

function ownedVideo(video: VideoMedia): VideoMedia {
  return {
    ...video,
    mp4: ownedFallbacks.video,
    webm: undefined,
    poster: video.poster ? resolveMediaPath(video.poster, "owned") : undefined
  };
}

function ownedChapter(chapter: Chapter): Chapter {
  return {
    ...chapter,
    gallery: chapter.gallery.map(ownedImage),
    featureMedia: ownedImage(chapter.featureMedia),
    featureVideo: chapter.featureVideo ? ownedVideo(chapter.featureVideo) : undefined,
    jersey: chapter.jersey ? ownedImage(chapter.jersey) : undefined,
    frameSequence: {
      ...chapter.frameSequence,
      basePath: "",
      poster: ownedFallbacks.frame
    },
    mobileVideo: ownedVideo(chapter.mobileVideo)
  };
}

export function contentForProfile(person: PersonContent, profile: AssetProfile): PersonContent {
  if (profile === "reference") return person;
  return {
    ...person,
    hero: {
      ...person.hero,
      image: ownedImage(person.hero.image)
    },
    intro: {
      ...person.intro,
      gallery: person.intro.gallery.map(ownedImage)
    },
    chapters: person.chapters.map(ownedChapter),
    audio: {
      ...person.audio,
      src: ownedFallbacks.audio
    },
    scene: {
      ...person.scene,
      model: ownedFallbacks.model,
      hdr: undefined,
      textures: [],
      heroParticles: 900,
      footerParticles: 300
    }
  };
}
