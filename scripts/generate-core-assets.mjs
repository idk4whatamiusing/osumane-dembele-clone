import { access, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { projectRoot } from "./reference-assets.mjs";

const execFileAsync = promisify(execFile);
const force = process.argv.includes("--force");
const output = resolve(projectRoot, "public/assets/core");
await mkdir(output, { recursive: true });
await rm(resolve(output, "hold-to-play.mp3"), { force: true });

const textAssets = {
  "grain.svg": `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#n)" opacity="0.9"/></svg>`,
  "fallback-poster.svg": `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000"><defs><radialGradient id="g" cx="62%" cy="42%" r="65%"><stop offset="0" stop-color="#6d5734"/><stop offset="0.42" stop-color="#24201a"/><stop offset="1" stop-color="#101010"/></radialGradient><filter id="b"><feGaussianBlur stdDeviation="28"/></filter></defs><rect width="1600" height="1000" fill="url(#g)"/><circle cx="990" cy="430" r="230" fill="none" stroke="#c6a15b" stroke-opacity=".5" stroke-width="2"/><circle cx="990" cy="430" r="148" fill="#c6a15b" fill-opacity=".12" filter="url(#b)"/><path d="M120 760C460 590 730 900 1480 650" fill="none" stroke="#f4efe5" stroke-opacity=".16" stroke-width="2"/><text x="90" y="150" fill="#f4efe5" font-family="Arial, sans-serif" font-size="28" letter-spacing="8">OSUMANE · DEMBELE</text></svg>`,
  "icon.svg": `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#151515"/><circle cx="32" cy="32" r="19" fill="none" stroke="#c6a15b" stroke-width="3"/><path d="M18 39 31 13l4 19 12-7-9 27-5-17z" fill="#c6a15b"/></svg>`
};

async function writeAtomic(file, contents) {
  const temporary = `${file}.part-${process.pid}`;
  try {
    await writeFile(temporary, contents, "utf8");
    await rename(temporary, file);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

for (const [filename, contents] of Object.entries(textAssets)) {
  const file = resolve(output, filename);
  const exists = await access(file).then(() => true).catch(() => false);
  if (!exists || force) await writeAtomic(file, `${contents}\n`);
}

async function runFfmpeg(args) {
  try {
    await execFileAsync("ffmpeg", ["-y", ...args], { maxBuffer: 1024 * 1024 * 8 });
  } catch (error) {
    throw new Error(`ffmpeg failed while generating core media: ${error.message}`);
  }
}

async function generateBinary(filename, args) {
  const file = resolve(output, filename);
  const exists = await access(file).then(() => true).catch(() => false);
  if (!force && exists) return;
  const temporary = `${file}.part-${process.pid}${filename.endsWith(".mp4") ? ".mp4" : ".mp3"}`;
  try {
    await runFfmpeg([...args, temporary]);
    await rename(temporary, file);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

await generateBinary("ambient.mp3", [
  "-f",
  "lavfi",
  "-i",
  "sine=frequency=110:duration=8:sample_rate=44100",
  "-f",
  "lavfi",
  "-i",
  "sine=frequency=164.81:duration=8:sample_rate=44100",
  "-filter_complex",
  "[0:a][1:a]amix=inputs=2,lowpass=f=900,volume=0.16,afade=t=in:st=0:d=1,afade=t=out:st=7:d=1[a]",
  "-map",
  "[a]",
  "-c:a",
  "libmp3lame",
  "-b:a",
  "64k"
]);

await generateBinary("fallback.mp4", [
  "-f",
  "lavfi",
  "-i",
  "color=c=0x151515:s=1280x720:d=2:r=24",
  "-vf",
  "drawbox=x=310:y=140:w=660:h=440:color=0xc6a15b@0.16:t=fill,drawbox=x=390:y=210:w=500:h=300:color=0xf4efe5@0.08:t=3",
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart"
]);

process.stdout.write("Generated reusable local fallback assets\n");
