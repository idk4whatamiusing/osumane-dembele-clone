import { readdir, rm, stat } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { projectRoot } from "./reference-assets.mjs";

const assetsRoot = resolve(projectRoot, ".open-next/assets");
const coreRoot = resolve(assetsRoot, "assets/core");
const allowedCoreFiles = new Set([
  "ambient.mp3",
  "fallback-poster.svg",
  "fallback.mp4",
  "grain.svg",
  "icon.svg"
]);

await stat(assetsRoot);
await stat(coreRoot);

async function collectReferenceDirectories(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const matches = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && entry.name === "reference") matches.push(path);
    if (entry.isDirectory()) matches.push(...(await collectReferenceDirectories(path)));
  }
  return matches;
}

const directories = await collectReferenceDirectories(assetsRoot);
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

const remaining = await findReferenceFiles(assetsRoot);
if (remaining.length > 0) {
  throw new Error(`Reference media remains in Worker assets: ${remaining.join(", ")}`);
}

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
