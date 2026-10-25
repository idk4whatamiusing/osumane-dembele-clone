import { copyFile, readdir, rm, stat } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { projectRoot } from "./reference-assets.mjs";

const assetsRoot = resolve(projectRoot, ".open-next/assets");
const coreRoot = resolve(assetsRoot, "assets/core");
const staticIndex = resolve(projectRoot, ".next/server/app/index.html");
const allowedCoreFiles = new Set([
  "ambient.mp3",
  "fallback-poster.svg",
  "fallback.mp4",
  "grain.svg",
  "icon.svg"
]);

await stat(assetsRoot);
await stat(coreRoot);
await stat(staticIndex);

// Serve the generated static document for `/` instead of asking the Worker to
// stream a six-megabyte RSC page. The streaming path can split a very large SVG
// attribute across its flight-data insertion boundary, which produces invalid
// HTML in the deployed Worker. The document still boots the same React bundle.
await copyFile(staticIndex, join(assetsRoot, "index.html"));

// Keep images and fonts (needed for the owned profile to show real photos);
// strip the heavy/unused reference media (frames, video, audio, model, hdr, textures).
const STRIP_DIRS = new Set(["frames", "video", "audio"]);
async function collectStripDirectories(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const matches = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && STRIP_DIRS.has(entry.name)) matches.push(path);
    if (entry.isDirectory()) matches.push(...(await collectStripDirectories(path)));
  }
  return matches;
}

const directories = await collectStripDirectories(assetsRoot);
for (const directory of directories) await rm(directory, { recursive: true, force: true });

async function findReferenceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const matches = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) matches.push(...(await findReferenceFiles(path)));
    else if (relative(assetsRoot, path).split(sep).includes("reference")) matches.push(path);
  }
  return matches;
}

// (No strict check: images/fonts are intentionally retained.)

for (const entry of await readdir(coreRoot, { withFileTypes: true })) {
  if (entry.isFile() && !allowedCoreFiles.has(entry.name)) {
    await rm(join(coreRoot, entry.name), { force: true });
  }
}

for (const filename of allowedCoreFiles) {
  await stat(join(coreRoot, filename));
}

process.stdout.write(
  `Removed ${directories.length} reference asset directories and restricted Worker core assets\n`
);
