import { describe, expect, it } from "vitest";
import { referencePerson } from "@/src/content/ousmane";
import { frameUrl, validatePersonContent } from "@/src/content/schema";
import { contentForProfile, resolveMediaPath } from "@/src/lib/media";

const collectPaths = (value: unknown, paths: string[] = []): string[] => {
  if (typeof value === "string" && value.startsWith("/assets/")) paths.push(value);
  if (Array.isArray(value)) value.forEach((item) => collectPaths(item, paths));
  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectPaths(item, paths));
  }
  return paths;
};

describe("person content contract", () => {
  it("validates the temporary reference person", () => {
    expect(() => validatePersonContent(referencePerson)).not.toThrow();
    expect(referencePerson.language).toBe("fr");
    expect(referencePerson.chapters).toHaveLength(5);
    expect(new Set(referencePerson.chapters.map(({ id }) => id)).size).toBe(5);
  });

  it("keeps every media path local and deploy-swappable", () => {
    const paths = collectPaths(referencePerson);
    expect(paths.length).toBeGreaterThan(40);
    paths.forEach((path) => {
      expect(path).toMatch(/^\/assets\//);
      expect(path).not.toMatch(/^https?:\/\//);
      expect(path).not.toContain("..");
    });
    // Reference imagery is shipped with the owned bundle; only heavyweight
    // or non-image media is swapped for the owned fallbacks.
    expect(resolveMediaPath(referencePerson.hero.image.src, "owned")).toBe(
      referencePerson.hero.image.src
    );
    expect(
      resolveMediaPath("/assets/reference/video/chapter-01-jersey-data.mp4", "owned")
    ).toBe("/assets/core/fallback.mp4");
  });

  it("keeps reference imagery but swaps non-image media in owned content", () => {
    const owned = contentForProfile(referencePerson, "owned");
    const paths = collectPaths(owned);
    expect(paths.length).toBeGreaterThan(40);
    paths.forEach((path) => {
      if (path.startsWith("/assets/reference/")) {
        // srcSet descriptors are space-separated, so match the extension
        // anywhere in the value rather than only at the end.
        expect(path).toMatch(/\.(avif|webp|png|jpe?g|svg)(?:\s|$)/i);
      }
    });
    expect(owned.hero.image.src).toBe(referencePerson.hero.image.src);
    expect(owned.audio.src).toBe("/assets/core/ambient.mp3");
    expect(owned.scene.model).toBe("");
    expect(owned.chapters.every((chapter) => chapter.featureVideo?.mp4 === "/assets/core/fallback.mp4")).toBe(true);
    expect(
      owned.chapters
        .filter((chapter) => chapter.filmVideo)
        .every((chapter) => chapter.filmVideo?.mp4 === "/assets/core/fallback.mp4")
    ).toBe(true);
    expect(owned.chapters.every((chapter) => chapter.mobileVideo.mp4 === "/assets/core/fallback.mp4")).toBe(true);
  });

  it("builds the configured frame sequence", () => {
    const sequence = referencePerson.chapters[0].frameSequence;
    expect(sequence.frameCount).toBe(152);
    expect(frameUrl(sequence, 0)).toBe(
      "/assets/reference/frames/chapter-01/0040.webp"
    );
    expect(frameUrl(sequence, 151)).toBe(
      "/assets/reference/frames/chapter-01/0191.webp"
    );
  });
});
