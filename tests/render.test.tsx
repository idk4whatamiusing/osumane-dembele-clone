import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";
import RootLayout from "@/app/layout";
import { referencePerson } from "@/src/content/ousmane";

const count = (source: string, pattern: RegExp): number => source.match(pattern)?.length ?? 0;

describe("semantic server rendering", () => {
  it("renders one French h1 and the complete content outline", () => {
    const markup = renderToStaticMarkup(createElement(Home));
    expect(count(markup, /<h1(?:\s|>)/g)).toBe(1);
    expect(markup).toContain("id=\"content\"");
    expect(markup).toContain("id=\"introduction\"");
    referencePerson.chapters.forEach((chapter) => {
      expect(markup).toContain(`id=\"${chapter.id}\"`);
      expect(markup).toContain(`id=\"${chapter.id}-title\"`);
    });
    expect(markup).toContain("aria-label=\"Écouter l’ambiance sonore\"");
    expect(markup).toContain("Crédits");
    expect(markup).toContain("<canvas");
    expect(markup).toContain("frame-sequence__fallback");
  });

  it("renders the document language and skip link", () => {
    const markup = renderToStaticMarkup(
      createElement(
        RootLayout,
        null,
        createElement("main", { id: "content" }, "Contenu")
      )
    );
    expect(markup).toContain("<html lang=\"fr\">");
    expect(markup).toContain("class=\"skip-link\"");
    expect(markup).toContain("href=\"#content\"");
  });
});

describe("component boundaries", () => {
  it("keeps subject and club names out of generic components", async () => {
    const directory = resolve("src/components");
    const files = await readdir(directory, { recursive: true });
    const sourceFiles = files.filter((file) => typeof file === "string" && file.endsWith(".tsx"));
    const forbidden = ["Ousmane", "Évreux", "Rennes", "Dortmund", "Barcelone", "Paris"];
    for (const file of sourceFiles) {
      const source = await readFile(resolve(directory, file), "utf8");
      forbidden.forEach((term) => expect(source).not.toContain(term));
    }
  });
});
