#!/usr/bin/env node
// Publishes a rendered clip to TikTok through PostPeer.
// Docs: https://www.postpeer.dev/docs  (base https://api.postpeer.dev/v1, x-access-key header)

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith("--")) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);

const config = JSON.parse(readFileSync(resolve(args.config ?? "config.json"), "utf8"));
const videoUrl = args.url;
const key = process.env.POSTPEER_API_KEY;
const accountId = process.env.TIKTOK_ACCOUNT_ID;

if (!videoUrl) { console.error("--url (public mp4 URL) is required"); process.exit(1); }
if (!key || !accountId) { console.error("missing POSTPEER_API_KEY or TIKTOK_ACCOUNT_ID"); process.exit(1); }

// TikTok requires the privacy level to come from the account's currently allowed
// options. If the account is switched to private, PUBLIC_TO_EVERYONE disappears
// from that list and the post is rejected — that's the error to expect here.
const privacyLevel = config.privacyLevel ?? "PUBLIC_TO_EVERYONE";

const body = {
  content: config.caption ?? config.hook ?? "",
  mediaItems: [{ type: "video", url: videoUrl }],
  platforms: [
    {
      platform: "tiktok",
      accountId,
      platformSpecificData: { privacyLevel },
    },
  ],
  publishNow: true,
  // Same slug twice = same key, so a re-run of a failed job can't double-post.
  idempotencyKey: `clawde-${config.slug ?? config.date}`,
};

const res = await fetch("https://api.postpeer.dev/v1/posts", {
  method: "POST",
  headers: { "x-access-key": key, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const text = await res.text();
if (!res.ok) {
  console.error(`post failed (${res.status}): ${text}`);
  process.exit(1);
}
console.log(`posted ✓ ${text}`);
