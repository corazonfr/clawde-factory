// usage: node scripts/stills.mjs <compId> <outPrefix> <frame,frame,...> [scale]
// Renders test stills. GL=angle (GPU, default) or GL=swangle (CPU SwiftShader, for machines without a GPU).
// Remotion bundles fill the temp folder: run with TEMP/TMP on a big drive (e.g. D:/remotion-tmp).
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [id, prefix, frames, scale = "0.5"] = process.argv.slice(2);
const chromiumOptions = { gl: process.env.GL || "angle" };
const serveUrl = await bundle({ entryPoint: path.resolve(process.env.ENTRY || "src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id, chromiumOptions, inputProps: JSON.parse(process.env.PROPS || "{}") });
const onBrowserLog = (l) => { if (l.type === "error" || l.type === "warning") console.log(`[${l.type}]`, l.text.slice(0, 300)); };
for (const f of frames.split(",").map(Number)) {
  const t0 = Date.now();
  await renderStill({ composition, serveUrl, frame: f, inputProps: JSON.parse(process.env.PROPS || "{}"), output: `${prefix}${f}.jpg`, imageFormat: "jpeg", jpegQuality: 88, scale: Number(scale), chromiumOptions, timeoutInMilliseconds: 300000, onBrowserLog });
  console.log("still", f, ((Date.now() - t0) / 1000).toFixed(1) + "s");
}
