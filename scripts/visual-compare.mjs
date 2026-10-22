/**
 * Per-section visual parity harness.
 *
 * Records a scripted scroll-through video of the reference site and the local
 * site (Playwright, headless Chromium), then extracts 5 keyframes per section
 * and stitches reference|local rows into a labelled contact sheet per section.
 *
 * Usage:
 *   node scripts/visual-compare.mjs                 # all sections, desktop
 *   node scripts/visual-compare.mjs loader hero     # subset by name
 *   node scripts/visual-compare.mjs --mobile        # 390x844
 *   node scripts/visual-compare.mjs --refresh-ref   # re-record reference
 *
 * Output: <OUT>/composite-<section>-<desktop|mobile>.png  (+ raw videos)
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const OUT = "/var/folders/h4/tp7dybbd373cjd3d2gtjp55h0000gn/T/opencode/visual-compare";
const REF = "https://www.ousmaneballondor.fr/";
const LOCAL = "http://localhost:3000/";
// User's fresh-load reference recording (116.6s, 3420x2224, ground truth).
// Section windows mined from contact sheets — see refmine/TIMELINE.md.
// Resolved by glob: macOS puts U+202F (narrow nbsp) before "AM" in the name.
const REF_USER =
  fs
    .readdirSync("/Users/x/Desktop")
    .filter((n) => n.endsWith(".mov"))
    .map((n) => path.join("/Users/x/Desktop", n))
    .find((p) => fs.statSync(p).size > 5e8) || null;

const args = process.argv.slice(2);
const MOBILE = args.includes("--mobile");
const REFRESH_REF = args.includes("--refresh-ref");
const STITCH_ONLY = args.includes("--stitch-only");
const wanted = args.filter((a) => !a.startsWith("--"));

const VIEWPORT = MOBILE ? { width: 390, height: 844 } : { width: 1440, height: 900 };
const LABEL = MOBILE ? "mobile" : "desktop";

const SELECTORS = {
  ref: { intro: "#intro", chapter: "#evreux", footer: "#footer" },
  local: { intro: "#introduction", chapter: ".chapter-shell", footer: "#credits" },
};

// Fixed local script timeline (seconds from video start), shifted by the goto
// offset recorded in a sidecar .json manifest when the video was recorded here.
// refStart/refEnd = section windows inside the user's reference recording.
const TIMELINE = [
  { name: "loader", start: 0, end: 6.5, refStart: 12.5, refEnd: 17.5 },
  { name: "hero", start: 6.5, end: 10.5, refStart: 18, refEnd: 21.4 },
  { name: "intro", start: 10.5, end: 15.5, refStart: 22, refEnd: 29 },
  { name: "chapter", start: 15.5, end: 23, refStart: 30, refEnd: 47 },
  { name: "footer", start: 23, end: 29, refStart: 110, refEnd: 116 },
];
const SECTIONS = TIMELINE.filter((s) => !wanted.length || wanted.includes(s.name));

fs.mkdirSync(OUT, { recursive: true });

function log(...m) {
  console.log(`[compare] ${m.join(" ")}`);
}

async function smoothScrollTo(page, selector, extraY = 0, duration = 1600) {
  await page.evaluate(
    ({ selector, extraY, duration }) => {
      const el = document.querySelector(selector);
      const y = (el ? el.getBoundingClientRect().top + window.scrollY : 0) + extraY;
      const lenis = window.lenis;
      if (lenis && typeof lenis.scrollTo === "function") {
        lenis.scrollTo(y, { duration: duration / 1000 });
      } else {
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    },
    { selector, extraY, duration },
  );
  await page.waitForTimeout(duration + 500);
}

async function scrollByPixels(page, px, duration) {
  await page.evaluate(
    ({ px, duration }) => {
      const y = window.scrollY + px;
      const lenis = window.lenis;
      if (lenis && typeof lenis.scrollTo === "function") {
        lenis.scrollTo(y, { duration: duration / 1000 });
      } else {
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    },
    { px, duration },
  );
  await page.waitForTimeout(duration + 700);
}

async function record(site, url, videoPath) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    isMobile: MOBILE,
    hasTouch: MOBILE,
    reducedMotion: "no-preference",
    recordVideo: { dir: path.join(OUT, "raw"), size: VIEWPORT },
  });
  const page = await context.newPage();
  const sel = SELECTORS[site];

  const tPage = Date.now();
  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  const offset = (Date.now() - tPage) / 1000;
  // 0 – 6.5 loader
  await page.waitForTimeout(6500);
  // 6.5 – 10.5 hero hold (particles/reveal visible)
  await page.waitForTimeout(4000);
  // 10.5 – 15.5 intro
  await smoothScrollTo(page, sel.intro, 0, 1600);
  await page.waitForTimeout(2400);
  // 15.5 – 23 chapter: enter pin, then push through ~55% of horizontal distance
  await smoothScrollTo(page, sel.chapter, 0, 1600);
  await page.waitForTimeout(400);
  const distance = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const wrapper =
      el?.querySelector?.("[data-chapter-track], .horizontal-wrapper") || el;
    const w = wrapper?.scrollWidth || 0;
    return Math.max(0, w - window.innerWidth + 3000);
  }, sel.chapter);
  await scrollByPixels(page, Math.round(distance * 0.55), 3600);
  await page.waitForTimeout(700);
  // 23 – 29 footer
  await smoothScrollTo(page, sel.footer, -80, 2200);
  await page.waitForTimeout(3000);

  const tmp = await page.video().path();
  await context.close();
  await browser.close();
  fs.renameSync(tmp, videoPath);
  const sections = TIMELINE.map((s) => ({
    name: s.name,
    start: +(s.start + offset).toFixed(2),
    end: +(s.end + offset).toFixed(2),
  }));
  fs.writeFileSync(
    videoPath.replace(/\.\w+$/, ".json"),
    JSON.stringify({ offset: +offset.toFixed(2), sections }, null, 2),
  );
  log(`recorded ${site} -> ${videoPath} (goto offset ${offset.toFixed(2)}s)`);
}

function loadManifest(videoPath) {
  const p = videoPath.replace(/\.\w+$/, ".json");
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

// Resolve [start,end] for a section in a given video:
//  - user reference recording -> measured refStart/refEnd windows
//  - recorded video -> sidecar manifest (script timeline + goto offset)
//  - no manifest -> raw script timeline (unshifted fallback)
function windowsFor(videoPath, section, isUserRef) {
  if (isUserRef) return { start: section.refStart, end: section.refEnd };
  const man = loadManifest(videoPath);
  const hit = man?.sections?.find((s) => s.name === section.name);
  if (hit) return hit;
  return { start: section.start, end: section.end };
}

function frames(videoPath, section, prefix) {
  const dir = path.join(OUT, "frames", prefix, section.name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const isUserRef = prefix === "ref" && USE_USER_REF;
  const { start, end } = windowsFor(videoPath, section, isUserRef);
  const n = 5;
  const files = [];
  for (let i = 0; i < n; i++) {
    const t = start + ((end - start) * (i + 0.5)) / n;
    const out = path.join(dir, `${i}.png`);
    execFileSync("ffmpeg", [
      "-y",
      "-ss",
      t.toFixed(2),
      "-i",
      videoPath,
      "-frames:v",
      "1",
      "-vf",
      "scale='min(1440,iw)':-2",
      out,
    ], { stdio: "pipe" });
    files.push(out);
  }
  return files;
}

function stitch(section, refFiles, locFiles) {
  const framesPerPage = refFiles.length;
  const FW = 440; // frame width in sheet
  const b64 = (f) => `data:image/png;base64,${fs.readFileSync(f).toString("base64")}`;
  const html = `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;background:#111;font:13px monospace;color:#eee;width:${framesPerPage * (FW + 6) + 12}px}
    .cap{padding:4px 6px;background:#000;color:#6f6;font-weight:bold}
    .cap.loc{color:#6cf}
    .sec{padding:6px;background:#222;color:#ff0;font-size:15px;font-weight:bold}
    .row{display:flex;gap:6px;padding:0 6px 6px}
    img{width:${FW}px;display:block;outline:1px solid #444}
  </style>
  <div class="sec">${section.name} — ${LABEL} — ref (top) vs local (bottom)</div>
  <div class="cap">REFERENCE</div><div class="row">${refFiles
    .map((f) => `<img src="${b64(f)}">`)
    .join("")}</div>
  <div class="cap loc">LOCAL</div><div class="row">${locFiles
    .map((f) => `<img src="${b64(f)}">`)
    .join("")}</div>`;

  const outFile = path.join(OUT, `composite-${section.name}-${LABEL}.png`);
  const htmlFile = path.join(OUT, `composite-${section.name}-${LABEL}.html`);
  fs.writeFileSync(htmlFile, html);
  execFileSync(
    process.execPath,
    [
      "-e",
      `const {chromium}=require("playwright");(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:${
        framesPerPage * (FW + 6) + 12
      },height:1400}});await p.goto("file://${htmlFile}");await p.waitForTimeout(600);await p.screenshot({path:${JSON.stringify(
        outFile,
      )},fullPage:true});await b.close();})()`,
    ],
    { stdio: "pipe", cwd: "/Users/x/soptorshi" },
  );
  log(`stitched ${outFile}`);
  return outFile;
}

const USE_USER_REF = !MOBILE && !REFRESH_REF && !!REF_USER;
const refVideo = USE_USER_REF ? REF_USER : path.join(OUT, `ref-${LABEL}.webm`);
const locVideo = path.join(OUT, `local-${LABEL}.webm`);

if (!STITCH_ONLY) {
  if (USE_USER_REF) {
    log("using user reference recording");
  } else if (!fs.existsSync(refVideo) || REFRESH_REF) {
    await record("ref", REF, refVideo);
  } else {
    log(
      loadManifest(refVideo)
        ? "using cached reference video (sidecar manifest windows)"
        : "using cached reference video (WARN: no manifest, raw timeline windows)",
    );
  }
  await record("local", LOCAL, locVideo);
} else {
  log("stitch-only: using existing videos");
}

for (const section of SECTIONS) {
  const refFiles = frames(refVideo, section, "ref");
  const locFiles = frames(locVideo, section, "local");
  stitch(section, refFiles, locFiles);
}
log("done ->", OUT);
