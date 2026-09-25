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
    expect(resolveMediaPath(referencePerson.hero.image.src, "owned")).toBe(
      "/assets/core/fallback-poster.svg"
    );
  });

  it("removes reference paths from owned Worker content", () => {
    const owned = contentForProfile(referencePerson, "owned");
    const paths = collectPaths(owned);
    expect(paths.length).toBeGreaterThan(40);
    paths.forEach((path) => expect(path).not.toContain("/assets/reference/"));
    expect(owned.audio.src).toBe("/assets/core/ambient.mp3");
    expect(owned.scene.model).toBe("");
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
