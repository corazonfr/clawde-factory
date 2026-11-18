#!/usr/bin/env node
// Records an episode's narration with ElevenLabs, one mp3 per line, and measures each.
//
//   ELEVENLABS_API_KEY=... node scripts/vo.mjs --episode episodes/ep01-the-door.json --out vo/
//
// Writes vo/<id>.mp3 for every line plus vo/durations.json ({"01": 6.8, ...}),
// which scripts/episode.mjs uses to lay out the timeline. Lines that already have
// an mp3 are skipped, so a re-run only pays for what's missing.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith("--")) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);

const ep = JSON.parse(readFileSync(resolve(args.episode), "utf8"));
const outDir = resolve(args.out ?? "vo");
mkdirSync(outDir, { recursive: true });

const key = process.env.ELEVENLABS_API_KEY;
const { voice_id, model_id } = ep.voice;

const durations = {};
for (const line of ep.lines) {
  const file = join(outDir, `${line.id}.mp3`);
  if (!existsSync(file)) {
    if (!key) { console.error("missing ELEVENLABS_API_KEY"); process.exit(1); }
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json", accept: "audio/mpeg" },
      body: JSON.stringify({ text: line.say, model_id }),
    });
    if (!res.ok) {
      console.error(`line ${line.id}: ElevenLabs ${res.status} ${await res.text()}`);
      process.exit(1);
    }
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    console.log(`recorded ${line.id}`);
  }
  durations[line.id] = +Number(
    execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim()
  ).toFixed(3);
}
writeFileSync(join(outDir, "durations.json"), JSON.stringify(durations, null, 2));
console.log(durations);
