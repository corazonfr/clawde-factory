# Handoff: making cartoon story shorts on your PC

Paste everything in the box below into Claude Code on your PC, from inside the cloned repo.
The repo holds everything the cloud session made: the skill, the studio, the finished Pisa short and every script.
Nothing from the cloud chat itself carries over, so this prompt is the memory.

---

```text
You are taking over a project from a cloud Claude Code session. Read this whole message before doing anything.

## Setup (do this first, check each step)
1. Repo: github.com/corazonfr/clawde-factory, branch `claude/install-ruflo-github-0r0rvb`.
   If it is not cloned yet: `git clone https://github.com/corazonfr/clawde-factory && cd clawde-factory && git checkout claude/install-ruflo-github-0r0rvb`.
2. Needs: Node 20+, ffmpeg + ffprobe on PATH, Python 3.10+ with `pip install numpy scipy faster-whisper`.
3. `cd studio && npm install`.
4. The skill is already in the repo at `.claude/skills/cartoon-3d-short/` (Claude Code loads it automatically from the
   project). Read its SKILL.md fully before starting a video. Its `references/frames/` and `references/sheets/` folders
   are NOT in git (private style-study frames, never publish or commit them). If I want them, re-download the skill from
   https://github.com/mromidev/claude-animated-shorts and copy only those two folders in; they are gitignored.
5. Ruflo (claude-flow) is installed in the repo (CLAUDE.md, .claude/, .claude-flow/). It is optional for video work.
   To enable its MCP server: `claude mcp add claude-flow -- npx -y ruflo@3.80.0 mcp start`.
6. Voice needs the ElevenLabs MCP connector (it was a claude.ai connector in the cloud). Check it is available with a
   tool search for "ElevenLabs". If it isn't, tell me so I can connect it, or I can paste an ElevenLabs API key into an
   env var myself (never ask me to paste keys into chat).

## What exists
- `studio/`: Remotion 4 + three.js project. `src/Root.tsx` registers `BridgeShort` and `PisaShort` (1080x1920, 30 fps).
  `src/videos/pisa/` is the latest, most complete example: story.ts (shots, cameras, word cues), world.ts, cast.ts,
  props2d.ts, toon.ts, Pisa.tsx (post chain). Copy it as the starting point for a new story, not the bridge.
- `studio/scripts/stills.mjs`: test stills. `studio/scripts/render_and_publish.sh`: chunked render + join + mux.
- `stories/tower-saved-by-a-war/`: SCRIPT.md, voice/ (voice.wav, words.json, align.py, tighten.py),
  audio/ (pisa_audio.py builds mix.wav from words.json), render/chunks/, and the final mp4.

## How a story is made (follow the skill's pipeline; summary)
1. Pick one surprising TRUE story with a visible physical cause and effect, plus an everyday analogy that explains it.
   Facts with sources at the top of SCRIPT.md. Jokes must be real facts.
2. Script, ~3.7 words/s, 55-70 s: hook (absurd fact in one line) → setting (year, place, pride) → 3-4 escalating
   beats → the snap → deadpan "Luckily... / Unluckily..." → one physics idea via the analogy → consequence → callback
   twist ending. Never narrate what the viewer already sees. Show me the script and WAIT for "Approved".
   After approval just do it, don't ask more questions.
3. Voice: ElevenLabs, voice "George - Warm, Captivating Storyteller" (voice_id JBFqnCBsd6RMkjVDRZzb, I chose him over
   the first narrator), model eleven_multilingual_v2, generations_count 1 (each take costs credits, never retry by
   re-calling). One steady tone, English only, no captions in the video.
   Then: cap long pauses / speed up with `voice/tighten.py` to fit 70 s, and get word timings with faster-whisper
   small.en (word_timestamps=True; pass a numpy 16 kHz array, not a file path, if `av` errors). Hand-fix
   words.json: whisper drops short words ("Slowly.") and puts word edges in silence; check against the audio level.
4. Copy studio/src/videos/pisa/ to a new folder, register a new composition in Root.tsx, rewrite story.ts: shots
   timed to words.json, every visual reaction lands 0-3 frames BEFORE its word.
5. Look checks with stills at --scale 0.5 before any long render. Check framing of every shot: characters in frame,
   props not covering faces, nothing huge and cut off at the frame edge, flat holds need a slow push-in.
6. Sound: copy stories/tower-saved-by-a-war/audio/pisa_audio.py and change the event list. Synthesized SFX + original
   music ducked under the voice; master -15 LUFS, true peak <= -1 dBTP, 48 kHz, exact video length.
   Lock picture timing BEFORE making sound.
7. Render, then mux the mix with `-map 0:v:0 -map 1:a:0` (Remotion writes a silent audio track).

## Tricks learned the hard way
- Swap the narrator later without re-rendering: generate the new take, whisper it, then
  `python3 stories/<name>/voice/align.py new_raw.wav new_words.json words.json voice.wav` fits it onto the old word
  timing (phrase-by-phrase rubberband stretch). Then re-run the audio script. Verify by re-transcribing.
- Render flags that matter: `--timeout=600000` (world building is slow), inputProps `{"post":{"msaa":2}}`.
  MSAA 0 renders BLANK frames (sky colour only). Never use 0.
- This PC has a GPU (the cloud didn't): use `--gl=angle` instead of `--gl=swangle`. The cloud CPU render took
  ~80 min per 300 frames; a GPU should be many times faster. Lowering resolution did NOT speed up the CPU render.
- Full-quality final per the skill is 1440x2560 (`--scale 1.3333`); the Pisa short was rendered at 1080x1920 because
  of the slow CPU. On a GPU, render the 2K version.
- Long renders: render in frame chunks (`--frames=a-b`), check each chunk's frame count with
  `ffprobe -count_frames -show_entries stream=nb_read_frames -of default=nw=1:nk=1` (the csv format adds a trailing
  comma that broke my check), then concat and re-encode. render_and_publish.sh does all of this and is restartable.
- GitHub rejects files over 100 MB: re-encode the final at crf 19 (~55 MB for 70 s) instead of stream-copying crf-16 chunks.
- Remotion bundles fill the temp folder (GBs each run). Set TEMP/TMP to a big drive and clear old
  `remotion-webpack-bundle-*` folders when nothing is rendering (ask me first).
- Film grain off (it quadruples file size). Ink outline must be its own pass before the lens blur.

## Rules for this repo
- Work on branch `claude/install-ruflo-github-0r0rvb`, commit + push after each step. No PR unless I ask.
- No `Co-Authored-By` trailer in commits (CLAUDE.md rule). Never commit .env, keys, raw.wav or stems.
- Never publish or commit the skill's references/frames or references/sheets.

Start by checking the setup steps and telling me what's missing, then ask me for a story idea (or suggest three true
stories that fit the formula).
```
