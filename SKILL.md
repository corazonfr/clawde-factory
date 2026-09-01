---
name: clawde-factory
description: Produce and publish a daily Clawde animation short to TikTok. Use this skill whenever the user asks to make today's clawde video, render a clawde animation to mp4, add or edit a scene template, queue or post a clip to TikTok, or check what the channel has already posted. Trigger it even when the user just says "make today's video", "render this animation", "post it", or mentions clawde, the factory, or the daily short — this skill owns the whole pipeline from concept to published clip, and rendering must go through scripts/render.mjs rather than any ad-hoc screen recording.
---

# Clawde Factory

Turns a scene template into a 1080x1920 mp4 and publishes it. The deterministic
work (frame rendering, encoding, uploading) lives in scripts. Your job is the
creative half: pick the concept, write the hook, choose the scene, keep the
channel from getting repetitive.

## The one rule

**Never screen-record an animation in real time.** Real-time capture drops frames
the moment the machine hiccups and the output stutters. Every render steps the
animation frame by frame through a deterministic `renderFrame(t)` call. If a scene
can't be stepped, it isn't finished — fix the scene, don't fix the recorder.

## Pipeline

```
concept (you)  →  config.json  →  render.mjs  →  out/YYYY-MM-DD.mp4  →  post.mjs  →  live
```

### 1. Pick the concept

Read `references/channel.md` first — it holds the character bible, the hook
formulas, and the posting log. **Check the log before writing anything.** If the
last three posts used the same scene or the same hook shape, pick a different one.
Repetition is the failure mode that kills this channel, not bad renders.

Output a `config.json` in the working directory:

```json
{
  "date": "2026-08-31",
  "scene": "scenes/bounce.html",
  "hook": "clawde found out about the audit",
  "caption": "he did not take it well #clawde #animation",
  "palette": { "bg": "#0f0e17", "fg": "#ff8906", "accent": "#e53170" },
  "audio": "assets/vo.mp3",
  "duration": 8
}
```

`audio` is optional. If the concept wants narration, generate it with ElevenLabs
first and point `audio` at the mp3 — the renderer muxes it in and trims the video
to the audio length.

### 2. Render

```bash
node scripts/render.mjs --config config.json --out out/
```

Puppeteer loads the scene, reads `window.CLAWDE.duration` and `.fps`, calls
`renderFrame(t)` for every frame, screenshots each one, then ffmpeg encodes to
H.264 mp4 — the format TikTok wants. A 8s/30fps clip is 240 frames and takes
roughly a minute.

Requires `puppeteer` and `ffmpeg` on PATH. On a GitHub Actions ubuntu runner both
are already there.

### 3. Upload, then post

```bash
URL=$(node scripts/upload.mjs --file out/2026-08-31-1400.mp4)
node scripts/post.mjs --url "$URL" --config config.json
```

PostPeer fetches the video from a URL rather than accepting a file upload, so the
mp4 goes to the public R2 bucket first. Both steps read their credentials from env
vars — see `references/setup.md`.

Posting goes through PostPeer's audited TikTok integration, so clips publish
publicly. Never automate the TikTok app itself — that's a ToS violation that gets
accounts banned.

### 4. Log it

Append the date, scene, and hook to the posting log at the bottom of
`references/channel.md`. This is what stops next week's run from repeating itself.
Skipping this step quietly breaks the whole anti-repetition system.

## Adding a scene

Scenes are single HTML files in `scenes/`. Read `references/scene-contract.md`
for the required shape. The short version: expose a global `window.CLAWDE` with
`duration`, `fps`, and `renderFrame(t)`, where `t` is seconds elapsed. No
`requestAnimationFrame` loops, no `setInterval`, no CSS animations — the renderer
controls time, the scene just draws whatever `t` says.

Converting an animation out of Claude Design means rewriting its timing loop into
`renderFrame(t)`. That's usually a small change and it's worth doing properly.

## Running it daily

`assets/daily.yml` is a GitHub Actions workflow that runs the whole pipeline on a
cron. Copy it to `.github/workflows/` in the channel repo. It runs whether or not
the user's machine is on.

Default cadence is every 12 hours. The every-5-hours line is commented out in the
workflow — do not uncomment it until `scenes/` has at least 15 templates.

Runs are serialized by a concurrency group. Two overlapping runs would pick the
same scene and race each other pushing the log. Don't remove that block.

The concept step runs through the Claude Code action with a subscription OAuth
token, so it draws on the user's Claude plan rather than a separate API account.
`scripts/concept.mjs` is kept as an API-key alternative for anyone who'd rather
keep automation off their subscription quota.
