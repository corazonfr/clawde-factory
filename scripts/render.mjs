#!/usr/bin/env node
// Deterministic frame-by-frame renderer for Clawde scenes.
// Steps the animation manually so output never depends on wall-clock timing.

import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith("--")) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);

const configPath = resolve(args.config ?? "config.json");
const outDir = resolve(args.out ?? "out");
const config = JSON.parse(readFileSync(configPath, "utf8"));
const root = dirname(configPath);

const scenePath = resolve(root, config.scene);
if (!existsSync(scenePath)) {
  console.error(`scene not found: ${scenePath}`);
  process.exit(1);
}

const WIDTH = 1080;
const HEIGHT = 1920;
const framesDir = join(outDir, ".frames");
rmSync(framesDir, { recursive: true, force: true });
mkdirSync(framesDir, { recursive: true });

// ---- audio duration wins if narration is present -------------------------
let audioPath = null;
let audioDuration = null;
if (config.audio) {
  audioPath = resolve(root, config.audio);
  if (!existsSync(audioPath)) {
    console.error(`audio not found: ${audioPath}`);
    process.exit(1);
  }
  audioDuration = Number(
    execFileSync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      audioPath,
    ]).toString().trim()
  );
}

// ---- render ---------------------------------------------------------------
const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--force-device-scale-factor=1"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });

  // Hand the scene its config before any of its script runs.
  await page.evaluateOnNewDocument((cfg) => {
    window.CLAWDE_CONFIG = cfg;
  }, config);

  await page.goto(pathToFileURL(scenePath).href, { waitUntil: "networkidle0" });

  await page.waitForFunction(
    () => window.CLAWDE && typeof window.CLAWDE.renderFrame === "function",
    { timeout: 10000 }
  ).catch(() => {
    throw new Error(
      "scene never exposed window.CLAWDE.renderFrame — see references/scene-contract.md"
    );
  });

  const meta = await page.evaluate(() => ({
    duration: window.CLAWDE.duration ?? 8,
    fps: window.CLAWDE.fps ?? 30,
  }));

  const fps = meta.fps;
  const duration = audioDuration ?? config.duration ?? meta.duration;
  const total = Math.round(duration * fps);

  console.log(`rendering ${total} frames @ ${fps}fps (${duration.toFixed(2)}s)`);

  for (let i = 0; i < total; i++) {
    const t = i / fps;
    await page.evaluate((time) => {
      window.CLAWDE.renderFrame(time);
      // Give the compositor one tick so the screenshot sees the new frame.
      return new Promise((r) => requestAnimationFrame(() => r()));
    }, t);

    await page.screenshot({
      path: join(framesDir, String(i).padStart(5, "0") + ".png"),
      captureBeyondViewport: false,
    });

    if (i % 30 === 0) process.stdout.write(`  ${i}/${total}\r`);
  }
  console.log(`  ${total}/${total} frames done`);

  // ---- encode -------------------------------------------------------------
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, `${config.slug ?? config.date ?? "clawde"}.mp4`);

  const ff = [
    "-y",
    "-framerate", String(fps),
    "-i", join(framesDir, "%05d.png"),
  ];
  if (audioPath) ff.push("-i", audioPath, "-c:a", "aac", "-b:a", "192k", "-shortest");
  ff.push(
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", "18",
    "-pix_fmt", "yuv420p",       // required or TikTok/QuickTime show a black video
    "-movflags", "+faststart",
    outFile
  );

  execFileSync("ffmpeg", ff, { stdio: "inherit" });
  rmSync(framesDir, { recursive: true, force: true });

  console.log(`\n→ ${outFile}`);
} finally {
  await browser.close();
}
