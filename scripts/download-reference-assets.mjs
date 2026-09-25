import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  AUDIO_ASSET,
  FRAME_ASSETS,
  REFERENCE_ASSETS,
  projectRoot,
  referenceRoot
} from "./reference-assets.mjs";

const args = new Set(process.argv.slice(2));
const force = args.has("--force");
const skipFrames = args.has("--skip-frames");
const concurrencyArgument = process.argv.find((value) => value.startsWith("--concurrency="));
const requestedConcurrency = Number(concurrencyArgument?.split("=")[1] ?? 4);
if (!Number.isInteger(requestedConcurrency) || requestedConcurrency < 1 || requestedConcurrency > 8) {
  throw new Error("--concurrency must be an integer between 1 and 8");
}
const concurrency = requestedConcurrency;
const minimumInterval = 45;
const maximumAssetBytes = 64 * 1024 * 1024;
let nextSlot = 0;

class RateLimiter {
  async wait() {
    const now = Date.now();
    const slot = Math.max(now, nextSlot);
    nextSlot = slot + minimumInterval;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, slot - now));
  }
}

const limiter = new RateLimiter();
const allowedHosts = [
  "cdn.prod.website-files.com",
  "flowdrivecdn.com",
  "r2.dev"
];

function localFile(localPath) {
  if (localPath.startsWith("/assets/reference/")) {
    const relativePath = localPath.replace("/assets/reference/", "");
    const file = resolve(referenceRoot, relativePath);
    if (relative(referenceRoot, file).startsWith("..")) {
      throw new Error(`Unsafe asset path: ${localPath}`);
    }
    return file;
  }
  if (localPath.startsWith("/assets/core/")) {
    const file = resolve(projectRoot, "public", localPath.replace(/^\//, ""));
    if (relative(resolve(projectRoot, "public"), file).startsWith("..")) {
      throw new Error(`Unsafe asset path: ${localPath}`);
    }
    return file;
  }
  throw new Error(`Unsupported local asset path: ${localPath}`);
}

function inferContentType(file) {
  const extension = extname(file).toLowerCase();
  return {
    ".avif": "image/avif",
    ".webp": "image/webp",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webm": "video/webm",
    ".mp4": "video/mp4",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".otf": "font/otf",
    ".ttf": "font/ttf",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".glb": "model/gltf-binary",
    ".hdr": "image/vnd.radiance"
  }[extension] ?? "application/octet-stream";
}

function validateSourceUrl(url) {
  if (url.protocol !== "https:") throw new Error(`Only HTTPS sources are allowed: ${url}`);
  const hostAllowed = allowedHosts.some(
    (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
  );
  if (!hostAllowed) throw new Error(`Host is not allowlisted: ${url.hostname}`);
  const lower = `${url.pathname}${url.search}`.toLowerCase();
  if (/\.(?:html?|js|mjs|css)(?:$|\?)/i.test(lower)) {
    throw new Error(`Source code is excluded: ${url}`);
  }
  if (/(?:analytics|googletagmanager|gtag|dead[-_]?redirect)/i.test(lower)) {
    throw new Error(`Excluded source path: ${url}`);
  }
}

function validateDefinition(asset) {
  validateSourceUrl(new URL(asset.sourceUrl));
  if (
    (!asset.localPath.startsWith("/assets/reference/") &&
      !asset.localPath.startsWith("/assets/core/")) ||
    asset.localPath.includes("..")
  ) {
    throw new Error(`Unsafe local path: ${asset.id}`);
  }
}

async function hashFile(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

async function fetchAsset(asset) {
  let current = new URL(asset.sourceUrl);
  for (let redirectCount = 0; redirectCount < 5; redirectCount += 1) {
    validateSourceUrl(current);
    const response = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(45_000),
      headers: {
        Accept: "*/*",
        "User-Agent": "AnkhiReferenceAssetStager/1.0"
      }
    });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      current = new URL(location, current);
      continue;
    }
    if (!response.ok || !response.body) {
      throw new Error(`${asset.id}: HTTP ${response.status} ${response.statusText}`);
    }
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > maximumAssetBytes) {
      throw new Error(`${asset.id}: response exceeds ${maximumAssetBytes} bytes`);
    }
    return {
      response,
      contentType: response.headers.get("content-type")?.split(";")[0] ?? inferContentType(asset.localPath)
    };
  }
  throw new Error(`${asset.id}: too many redirects`);
}

async function download(asset) {
  validateDefinition(asset);
  const file = localFile(asset.localPath);
  await mkdir(dirname(file), { recursive: true });
  let contentType = inferContentType(file);
  let downloaded = false;
  const temporary = `${file}.part-${process.pid}`;

  if (force || !(await stat(file).catch(() => null))) {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await rm(temporary, { force: true });
        await limiter.wait();
        const { response, contentType: responseType } = await fetchAsset(asset);
        contentType = responseType;
        await pipeline(Readable.fromWeb(response.body), createWriteStream(temporary));
        const temporaryDetails = await stat(temporary);
        if (temporaryDetails.size > maximumAssetBytes) {
          throw new Error(`${asset.id}: downloaded response exceeds ${maximumAssetBytes} bytes`);
        }
        await rename(temporary, file);
        downloaded = true;
        break;
      } catch (error) {
        lastError = error;
        await rm(temporary, { force: true });
        if (attempt < 2) {
          await new Promise((resolveDelay) => setTimeout(resolveDelay, 500 * 2 ** attempt));
        }
      }
    }
    if (!downloaded) throw lastError;
  }

  const details = await stat(file);
  return {
    id: asset.id,
    sourceUrl: asset.sourceUrl,
    category: asset.category,
    localPath: asset.localPath,
    bytes: details.size,
    contentType,
    sha256: await hashFile(file),
    rightsStatus: asset.rightsStatus
  };
}

async function runPool(definitions) {
  const entries = [];
  let cursor = 0;
  let completed = 0;
  async function worker() {
    while (cursor < definitions.length) {
      const index = cursor;
      cursor += 1;
      const asset = definitions[index];
      entries[index] = await download(asset);
      completed += 1;
      if (completed % 50 === 0 || completed === definitions.length) {
        process.stdout.write(`Downloaded ${completed}/${definitions.length}\n`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, definitions.length) }, worker));
  return entries;
}

const definitions = skipFrames
  ? [...REFERENCE_ASSETS, AUDIO_ASSET]
  : [...REFERENCE_ASSETS, ...FRAME_ASSETS, AUDIO_ASSET];
await mkdir(referenceRoot, { recursive: true });
const freshEntries = await runPool(definitions);
let entries = freshEntries;
if (skipFrames) {
  const manifestPath = resolve(referenceRoot, "manifest.json");
  const previous = JSON.parse(await readFile(manifestPath, "utf8"));
  const previousFrames = previous.assets.filter((entry) => entry.category === "frame");
  if (previousFrames.length !== FRAME_ASSETS.length) {
    throw new Error("A complete frame manifest is required before using --skip-frames");
  }
  entries = [...freshEntries, ...previousFrames];
}

const totals = entries.reduce(
  (summary, entry) => {
    summary.count += 1;
    summary.bytes += entry.bytes;
    summary.categories[entry.category] = (summary.categories[entry.category] ?? 0) + 1;
    return summary;
  },
  { count: 0, bytes: 0, categories: {} }
);

const manifest = {
  generatedAt: new Date().toISOString(),
  rightsNotice:
    "Reference media is temporary and excluded from deployment. The reference audio is marked reference-only and must be replaced before public use.",
  deployment: {
    includeReferenceAssets: false,
    publicPath: "/assets/reference"
  },
  totals,
  assets: entries.sort((a, b) => a.localPath.localeCompare(b.localPath))
};

await writeFile(
  resolve(referenceRoot, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8"
);

process.stdout.write(
  `Staged ${totals.count} assets (${(totals.bytes / 1024 / 1024).toFixed(2)} MiB)\n`
);
