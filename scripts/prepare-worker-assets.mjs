import { copyFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { projectRoot } from "./reference-assets.mjs";

const assetsRoot = resolve(projectRoot, ".open-next/assets");
const staticIndex = resolve(projectRoot, ".next/server/app/index.html");

await stat(assetsRoot);
await stat(staticIndex);

// Serve the generated static document for `/` instead of asking the Worker to
// stream a six-megabyte RSC page. The streaming path can split a very large SVG
// attribute across its flight-data insertion boundary, which produces invalid
// HTML in the deployed Worker. The document still boots the same React bundle.
await copyFile(staticIndex, join(assetsRoot, "index.html"));

process.stdout.write("Copied the pre-rendered root document into Worker assets\n");
