#!/usr/bin/env node
// Builds a Second Knock episode's timeline from its script + narration durations.
//
//   node scripts/episode.mjs --episode episodes/ep01-the-door.json --durations vo/durations.json --out build/
//
// Writes:
//   build/<slug>.config.json  — everything scenes/story.html needs (shots, captions, cards, knocks, scare)
//   build/<slug>.mix.sh       — an ffmpeg command that lays the VO lines, knocks, drone and stings
//                               onto one track: ./<slug>.mix.sh <vo-dir> <out.m4a>
//
// durations.json maps line id -> seconds, e.g. {"01": 6.8, "02": 5.44}. In CI it comes from
// ffprobe on the downloaded VO files; anywhere else you can pass it by hand.

import { readFileSync, writeFileSync, mkdirSync, chmodSync } from "node:fs";
import { resolve, join } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith("--")) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);

const ep = JSON.parse(readFileSync(resolve(args.episode), "utf8"));
const durations = JSON.parse(readFileSync(resolve(args.durations), "utf8"));
const outDir = resolve(args.out ?? "build");
mkdirSync(outDir, { recursive: true });

const LEAD = 0.4;        // silence before the first line
const GAP = 0.45;        // breath between lines
const KNOCK_GAP = 0.7;   // between the two knocks
const TAIL = 1.2;        // hold on the end card after the last line

let cursor = LEAD;
const placed = [];
const knocks = [];
for (const line of ep.lines) {
  const d = durations[line.id];
  if (!d) throw new Error(`no duration for line ${line.id}`);
  const start = cursor;
  const end = start + d;
  const entry = { ...line, start, end };
  placed.push(entry);
  cursor = end + GAP;
  if (line.knocksAfter) {
    const k0 = end + 0.35;
    for (let i = 0; i < line.knocksAfter; i++) knocks.push(+(k0 + i * KNOCK_GAP).toFixed(3));
    entry.knockStart = k0;
    cursor = k0 + (line.knocksAfter - 1) * KNOCK_GAP + 0.85;
  }
}
const duration = +(placed.at(-1).end + TAIL).toFixed(3);

// ---- shots: merge consecutive lines that share a shot --------------------
// A cut lands just before the line that changes shot. When the previous line ends
// in knocks, the cut comes before the knocks so we see the door shake.
const shots = [];
for (let i = 0; i < placed.length; i++) {
  const line = placed[i];
  const prev = placed[i - 1];
  if (!prev || prev.shot !== line.shot) {
    let cut = Math.max(0, line.start - 0.25);
    if (prev?.knockStart) cut = prev.knockStart - 0.3;
    if (shots.length) shots.at(-1).end = cut;
    shots.push({ type: line.shot, start: i === 0 ? 0 : cut, end: duration });
  }
}

// ---- per-shot events (bubbles, typing, stings, scare, cards) -------------
const bubbles = [], typing = [], stings = [], cards = [];
let scare = null;
for (const l of placed) {
  if (l.bubble) bubbles.push({ t: +(l.start + (l.bubbleAt ?? 0)).toFixed(3), text: l.bubble, red: !!l.sting });
  if (l.typing) typing.push({ start: l.start + 0.6, end: l.end + GAP + 0.2 });
  if (l.sting) stings.push(+l.start.toFixed(3));
  if (l.scareAt != null) scare = +(l.start + l.scareAt).toFixed(3);
  if (l.card) cards.push({ start: l.start, end: l.start + 3.2, text: l.card });
}
if (scare != null) stings.push(scare);

// ---- captions: 1-4 word chunks, timed by character weight ----------------
// Text after a "|" is spoken by the thing at the door and renders in red.
const captions = [];
for (const l of placed) {
  const [plain, whisper] = l.text.split("|");
  const parts = [];
  for (const [txt, red] of [[plain, false], [whisper ?? "", true]]) {
    const words = txt.trim().split(/\s+/).filter(Boolean);
    let chunk = [];
    const flush = () => { if (chunk.length) parts.push({ text: chunk.join(" "), red }); chunk = []; };
    for (const w of words) {
      chunk.push(w);
      const len = chunk.join(" ").length;
      if (/[.?!,]$/.test(w) || chunk.length >= 4 || len >= 16) flush();
    }
    flush();
  }
  // fold a lone trailing word ("knocks.", "ceiling.") back into the chunk before it
  for (let i = parts.length - 1; i > 0; i--) {
    const p = parts[i], q = parts[i - 1];
    if (!p.text.includes(" ") && p.red === q.red && !/[.?!,]$/.test(q.text) && (q.text + " " + p.text).length <= 30) {
      q.text += " " + p.text;
      parts.splice(i, 1);
    }
  }
  const weight = (p) => p.text.length + 6;
  const total = parts.reduce((a, p) => a + weight(p), 0);
  let t = l.start;
  const span = l.end - l.start;
  for (const p of parts) {
    const d = (weight(p) / total) * span;
    captions.push({ start: +t.toFixed(3), end: +(t + d).toFixed(3), text: p.text, red: p.red });
    t += d;
  }
}

const config = {
  slug: ep.slug,
  series: ep.series,
  part: ep.part,
  title: ep.title,
  caption: ep.caption,
  // paths are relative to this config file (build/), which is how render.mjs resolves them
  scene: "../scenes/story.html",
  audio: `${ep.slug}.m4a`,
  palette: ep.palette,
  duration,
  shots, captions, cards, bubbles, typing, knocks, stings, scare,
  vo: placed.map((l) => ({ id: l.id, start: +l.start.toFixed(3) })),
};
const cfgPath = join(outDir, `${ep.slug}.config.json`);
writeFileSync(cfgPath, JSON.stringify(config, null, 2));

// ---- audio mix -----------------------------------------------------------
const ms = (s) => Math.round(s * 1000);
const inputs = [];
const chains = [];
let n = 0;
for (const v of config.vo) {
  inputs.push(`-i "$VO/${v.id}.mp3"`);
  chains.push(`[${n}:a]aformat=sample_rates=44100:channel_layouts=stereo,adelay=${ms(v.start)}|${ms(v.start)},volume=1.0[a${n}]`);
  n++;
}
const synth = (expr, dur, at, vol, label) => {
  inputs.push(`-f lavfi -t ${dur} -i "aevalsrc='${expr}':s=44100:c=stereo"`);
  chains.push(`[${n}:a]adelay=${ms(at)}|${ms(at)},volume=${vol}[${label}${n}]`);
  n++;
};
// knock: low wooden thump + a short noisy crack
for (const k of knocks) synth("0.9*sin(2*PI*85*t)*exp(-t*26)+0.5*(random(0)*2-1)*exp(-t*90)", 0.4, k, 1.1, "k");
// stings: detuned screech over a sub hit
for (const s of stings) synth("0.22*sin(2*PI*1320*t+9*sin(2*PI*6.5*t))*exp(-t*2.2)+0.22*sin(2*PI*1397*t)*exp(-t*2.6)+0.8*sin(2*PI*48*t)*exp(-t*3)", 2.0, s, 0.9, "s");
// room tone: two detuned low sines + brown noise, the whole length
inputs.push(`-f lavfi -t ${duration} -i "aevalsrc='0.05*sin(2*PI*55*t)+0.04*sin(2*PI*55.6*t)+0.025*sin(2*PI*110.4*t)':s=44100:c=stereo"`);
chains.push(`[${n}:a]volume=1.0[d${n}]`); n++;
inputs.push(`-f lavfi -t ${duration} -i "anoisesrc=c=brown:a=0.035:r=44100"`);
chains.push(`[${n}:a]aformat=channel_layouts=stereo,lowpass=f=400,volume=1.0[d${n}]`); n++;

const labels = chains.map((c) => c.match(/\[([a-z]+\d+)\]$/)[1]);
const filter = [...chains, `${labels.map((l) => `[${l}]`).join("")}amix=inputs=${labels.length}:normalize=0:duration=longest,alimiter=limit=0.9,atrim=0:${duration}[out]`].join(";");

const sh = `#!/usr/bin/env bash
# Usage: ${ep.slug}.mix.sh <dir with 01.mp3..${config.vo.at(-1).id}.mp3> <out.m4a>
set -euo pipefail
VO="$1"; OUT="$2"
ffmpeg -hide_banner -loglevel error -y \\
  ${inputs.join(" \\\n  ")} \\
  -filter_complex "${filter}" \\
  -map "[out]" -c:a aac -b:a 192k "$OUT"
echo "mixed -> $OUT"
`;
const shPath = join(outDir, `${ep.slug}.mix.sh`);
writeFileSync(shPath, sh);
chmodSync(shPath, 0o755);

console.log(`${ep.slug}: ${duration}s, ${shots.length} shots, ${captions.length} captions, ${knocks.length} knocks`);
console.log(`→ ${cfgPath}\n→ ${shPath}`);
