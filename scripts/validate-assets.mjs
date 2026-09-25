import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { open, readFile, stat } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";
import { ALL_ASSETS, projectRoot, referenceRoot } from "./reference-assets.mjs";

const manifestPath = resolve(referenceRoot, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

if (manifest.deployment?.includeReferenceAssets !== false) {
  throw new Error("Manifest must exclude reference assets from deployment");
}

if (!Array.isArray(manifest.assets) || manifest.assets.length !== ALL_ASSETS.length) {
  throw new Error(`Expected ${ALL_ASSETS.length} manifest entries`);
}

const expectedById = new Map(ALL_ASSETS.map((asset) => [asset.id, asset]));
const seenIds = new Set();
const seenPaths = new Set();
let totalBytes = 0;
const categories = {};

function safeFile(localPath) {
  if (
    typeof localPath !== "string" ||
    (!localPath.startsWith("/assets/reference/") && !localPath.startsWith("/assets/core/"))
  ) {
    throw new Error(`Unsafe manifest path: ${localPath}`);
  }
  if (localPath.includes("..") || /\.(?:html?|js|mjs|css)(?:$|\?)/i.test(localPath)) {
    throw new Error(`Excluded manifest path: ${localPath}`);
  }
  if (localPath.startsWith("/assets/reference/")) {
    const file = resolve(referenceRoot, localPath.replace("/assets/reference/", ""));
    if (relative(referenceRoot, file).startsWith("..")) {
      throw new Error(`Path escapes reference root: ${localPath}`);
    }
    return file;
  }
  const publicRoot = resolve(projectRoot, "public");
  const file = resolve(publicRoot, localPath.replace(/^\//, ""));
  if (relative(publicRoot, file).startsWith("..")) {
    throw new Error(`Path escapes public root: ${localPath}`);
  }
  return file;
}

async function hashFile(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

async function signature(file) {
  const handle = await open(file, "r");
  try {
    const buffer = Buffer.alloc(16);
    await handle.read(buffer, 0, buffer.length, 0);
    return buffer;
  } finally {
    await handle.close();
  }
}

function validateSignature(file, category, bytes) {
  const extension = extname(file).toLowerCase();
  const ascii = bytes.toString("ascii");
  const imageSignature =
    (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP") ||
    (extension === ".png" && bytes.subarray(1, 4).toString("ascii") === "PNG") ||
    (extension === ".avif" && bytes.subarray(4, 12).toString("ascii").includes("ftyp"));
  const videoSignature =
    (extension === ".webm" && bytes.subarray(0, 4).toString("hex") === "1a45dfa3") ||
    (extension === ".mp4" && bytes.subarray(4, 8).toString("ascii") === "ftyp");
  const audioSignature =
    extension === ".mp3" &&
    (ascii.startsWith("ID3") || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0));
  const fontSignature =
    (extension === ".otf" && ascii.startsWith("OTTO")) ||
    (extension === ".ttf" && (ascii.startsWith("\u0000\u0001\u0000\u0000") || ascii.startsWith("true"))) ||
    (extension === ".woff" && ascii.startsWith("wOFF")) ||
    (extension === ".woff2" && ascii.startsWith("wOF2"));
  if (
    (category === "image" || category === "texture" || category === "frame") &&
    !imageSignature
  ) {
    throw new Error(`Invalid ${category} signature: ${file}`);
  }
  if (category === "video" && !videoSignature) {
    throw new Error(`Invalid video signature: ${file}`);
  }
  if (category === "audio" && !audioSignature) {
    throw new Error(`Invalid audio signature: ${file}`);
  }
  if (category === "font" && !fontSignature) {
    throw new Error(`Invalid font signature: ${file}`);
  }
  if (category === "model" && !(extension === ".glb" && ascii.startsWith("glTF"))) {
    throw new Error(`Invalid model signature: ${file}`);
  }
  if (category === "hdr" && extension !== ".hdr") {
    throw new Error(`Invalid HDR signature: ${file}`);
  }
}

for (const entry of manifest.assets) {
  for (const field of [
    "id",
    "sourceUrl",
    "category",
    "localPath",
    "bytes",
    "contentType",
    "sha256",
    "rightsStatus"
  ]) {
    if (entry[field] === undefined || entry[field] === null || entry[field] === "") {
      throw new Error(`${entry.id ?? "unknown"} is missing ${field}`);
    }
  }
  const expected = expectedById.get(entry.id);
  if (!expected) throw new Error(`Unexpected manifest id: ${entry.id}`);
  if (seenIds.has(entry.id)) throw new Error(`Duplicate manifest id: ${entry.id}`);
  if (seenPaths.has(entry.localPath)) throw new Error(`Duplicate local path: ${entry.localPath}`);
  seenIds.add(entry.id);
  seenPaths.add(entry.localPath);

  const source = new URL(entry.sourceUrl);
  const sourceText = `${source.pathname}${source.search}`.toLowerCase();
  if (source.protocol !== "https:") throw new Error(`Non-HTTPS source: ${entry.id}`);
  if (/(?:analytics|googletagmanager|gtag|dead[-_]?redirect)/i.test(sourceText)) {
    throw new Error(`Excluded source: ${entry.id}`);
  }
  if (/\.(?:html?|js|mjs|css)(?:$|\?)/i.test(sourceText)) {
    throw new Error(`Source code is excluded: ${entry.id}`);
  }
  if (entry.rightsStatus !== expected.rightsStatus) {
    throw new Error(`Rights status mismatch: ${entry.id}`);
  }
  if (entry.sourceUrl !== expected.sourceUrl) {
    throw new Error(`Source URL mismatch: ${entry.id}`);
  }
  if (entry.localPath !== expected.localPath) {
    throw new Error(`Local path mismatch: ${entry.id}`);
  }
  if (entry.localPath.startsWith("/assets/reference/") && entry.rightsStatus !== "reference-only") {
    throw new Error(`Reference asset rights must remain explicit: ${entry.id}`);
  }

  const file = safeFile(entry.localPath);
  const details = await stat(file);
  if (details.size !== entry.bytes) {
    throw new Error(`Byte mismatch for ${entry.id}: ${details.size} !== ${entry.bytes}`);
  }
  if (await hashFile(file) !== entry.sha256) {
    throw new Error(`SHA-256 mismatch for ${entry.id}`);
  }
  await validateSignature(file, entry.category, await signature(file));
  totalBytes += details.size;
  categories[entry.category] = (categories[entry.category] ?? 0) + 1;
}

const frameEntries = manifest.assets.filter((entry) => entry.category === "frame");
if (frameEntries.length !== 760) throw new Error(`Expected 760 frame files, found ${frameEntries.length}`);
for (let chapter = 1; chapter <= 5; chapter += 1) {
  const prefix = `/assets/reference/frames/chapter-${String(chapter).padStart(2, "0")}/`;
  const chapterFrames = frameEntries.filter((entry) => entry.localPath.startsWith(prefix));
  if (chapterFrames.length !== 152) {
    throw new Error(`Expected 152 frames in chapter ${chapter}`);
  }
}

if (manifest.totals?.count !== manifest.assets.length || manifest.totals?.bytes !== totalBytes) {
  throw new Error("Manifest totals are incorrect");
}
for (const [category, count] of Object.entries(categories)) {
  if (manifest.totals?.categories?.[category] !== count) {
    throw new Error(`Manifest category total is incorrect: ${category}`);
  }
}

process.stdout.write(
  `Validated ${manifest.assets.length} assets (${(totalBytes / 1024 / 1024).toFixed(2)} MiB), including 760 frames\n`
);
