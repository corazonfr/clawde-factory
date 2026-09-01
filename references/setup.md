# Setup

One-time setup. Roughly 30 minutes, most of it waiting on npm.

Order matters: test locally before wiring the cron, and do the first live post as
`SELF_ONLY` before letting it publish publicly.

---

## 1. Local first — prove a render works

Install Node 20+ and ffmpeg on Windows:

```
winget install OpenJS.NodeJS.LTS
winget install Gyan.FFmpeg
```

Close and reopen the terminal so PATH updates, then check:

```
node -v
ffmpeg -version
```

Put the skill folder somewhere sane (e.g. `C:\dev\clawde-factory`), then:

```
npm install
```

Make a `config.json` in the folder root:

```json
{
  "date": "2026-08-31",
  "slug": "2026-08-31-test",
  "scene": "scenes/bounce.html",
  "hook": "test render, ignore",
  "caption": "test",
  "palette": { "bg": "#0f0e17", "fg": "#ff8906", "accent": "#e53170" },
  "duration": 6
}
```

```
node scripts/render.mjs --config config.json --out out/
```

An mp4 should land in `out/`. **Open it before continuing.** If it plays and the
motion is smooth, the hard part is done. If it's black, ffmpeg dropped the
`yuv420p` flag; if it stutters, the scene is animating itself instead of using
`renderFrame(t)` (see `references/scene-contract.md`).

---

## 2. Cloudflare R2 bucket

PostPeer pulls the video from a public URL, so the mp4 needs a home.

In the Cloudflare dashboard:

1. **R2** in the sidebar, then **Create bucket**. Name it `clawde-clips`.
2. Open the bucket, **Settings**, find **Public access** / **R2.dev subdomain**,
   and enable it. Copy the `https://pub-xxxxx.r2.dev` URL it gives you — that's
   `R2_PUBLIC_URL`.
3. Back on the R2 overview, **Manage API tokens**, then **Create API token**.
   Permission: **Object Read & Write**, scoped to this bucket. Create it.
4. Copy the **Access Key ID** and **Secret Access Key** now — the secret is shown
   once and never again.
5. Your **Account ID** is on the R2 overview page, right-hand side.

Public access means anyone with the URL can watch the clip. That's fine here —
the clips are going on TikTok anyway — but don't reuse this bucket for anything
private.

---

## 3. PostPeer key + account ID

1. PostPeer dashboard, **Access Keys** page. Copy the key. That's
   `POSTPEER_API_KEY`.
2. `TIKTOK_ACCOUNT_ID` is the integration id for the connected TikTok account,
   from the dashboard's integrations list or:

```
curl "https://api.postpeer.dev/v1/connect/integrations?platform=tiktok" -H "x-access-key: YOUR_KEY"
```

Verify the key works before going further:

```
curl https://api.postpeer.dev/v1/health/auth -H "x-access-key: YOUR_KEY"
```

Every published post costs 1 credit. Signup includes 20 free.

---

## 4. First post, deliberately private

Add `"privacyLevel": "SELF_ONLY"` to `config.json`, then locally:

```
node scripts/upload.mjs --file out/2026-08-31-test.mp4
```

That prints a URL. Open it in a browser — if it doesn't play, public access on the
bucket isn't actually on, and posting will fail in a confusing way later.

Then:

```
node scripts/post.mjs --url "PASTE_THE_URL" --config config.json
```

Check TikTok. The post should exist and be visible only to you. Delete it.

Doing this first means the first *public* post is the first one you actually meant
to publish, instead of a blue circle with placeholder text on the timeline.

---

## 5. GitHub repo + cron

0. Install the Claude GitHub App on the repo. In Claude Code, run
   `/install-github-app` and follow the prompts — it installs the app and can
   save the auth secret for you. Then run `claude setup-token` and keep the
   output for the secrets table below.
1. New repo (private is fine — 2,000 free Actions minutes/month covers a 12h
   cadence with room to spare).
2. Push the whole folder. Copy `assets/daily.yml` to
   `.github/workflows/daily.yml`.
3. **Settings → Secrets and variables → Actions**, add:

| Secret | Value |
|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` | run `claude setup-token` locally, copy the output |
| `POSTPEER_API_KEY` | PostPeer access key |
| `TIKTOK_ACCOUNT_ID` | PostPeer integration id |
| `R2_ACCOUNT_ID` | Cloudflare account id |
| `R2_ACCESS_KEY_ID` | R2 token access key |
| `R2_SECRET_ACCESS_KEY` | R2 token secret |
| `R2_BUCKET` | `clawde-clips` |
| `R2_PUBLIC_URL` | `https://pub-xxxxx.r2.dev` |

4. **Settings → Actions → General**, scroll to **Workflow permissions**, select
   **Read and write permissions**. Without this the log-commit step fails on every
   run.
5. **Actions** tab → **clawde daily** → **Run workflow**. Watch it once end to end
   before trusting the schedule.

Remove `privacyLevel` from the concept output only after a manual run has posted
correctly.

---

## Things that will go wrong

- **Black video.** ffmpeg missing `-pix_fmt yuv420p`. Already in `render.mjs`;
  don't remove it.
- **Post rejected on privacy.** TikTok only accepts a privacy level currently
  allowed for the account. Switching the account to private removes
  `PUBLIC_TO_EVERYONE` from the allowed list.
- **First frames wrong font.** The scene assigned `window.CLAWDE` before
  `document.fonts.ready` resolved.
- **Cron didn't fire.** GitHub disables scheduled workflows on repos with no
  activity for 60 days. A single commit re-arms it.
- **Two posts at once.** The concurrency group in the workflow prevents it —
  don't delete that block.
