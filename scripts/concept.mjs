#!/usr/bin/env node
// Writes today's config.json to stdout. One API call — the only part of the
// daily run that needs a brain. Everything downstream is dumb machinery.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.argv[2] ?? ".");
const channel = existsSync(resolve(root, "references/channel.md"))
  ? readFileSync(resolve(root, "references/channel.md"), "utf8")
  : "";
const scenes = readdirSync(resolve(root, "scenes")).filter((f) => f.endsWith(".html"));
const now = new Date();
const today = now.toISOString().slice(0, 10);
// slug keeps multiple runs per day from overwriting each other
const slug = today + "-" + now.toISOString().slice(11, 16).replace(":", "");

const prompt = `You plan one short vertical animation per day for a character channel.

CHANNEL NOTES AND POSTING LOG:
${channel}

AVAILABLE SCENE TEMPLATES: ${scenes.join(", ")}

Plan this run's video (${slug}).

Hard rules:
- Do not reuse a scene used in the last 6 logged posts.
- Do not reuse the same hook shape as the most recent logged post.
- Hook must be under 60 characters. It appears as large text on screen.
- Caption gets 2-4 hashtags, no engagement bait.
- Palette must be readable: high contrast between bg and fg.

Respond with ONLY a JSON object, no markdown fences, no preamble:
{"date":"${today}","slug":"${slug}","scene":"scenes/FILE.html","hook":"...","caption":"...","palette":{"bg":"#...","fg":"#...","accent":"#..."},"duration":8,"hookShape":"..."}`;

const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-api-key": process.env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  }),
});

if (!res.ok) {
  console.error(`concept call failed (${res.status}): ${await res.text()}`);
  process.exit(1);
}

const data = await res.json();
const text = data.content
  .filter((b) => b.type === "text")
  .map((b) => b.text)
  .join("")
  .replace(/```json|```/g, "")
  .trim();

let concept;
try {
  concept = JSON.parse(text);
} catch {
  console.error("model did not return clean JSON:\n" + text);
  process.exit(1);
}

if (!scenes.includes(concept.scene?.replace(/^scenes\//, ""))) {
  console.error(`picked a scene that doesn't exist: ${concept.scene}`);
  process.exit(1);
}

process.stdout.write(JSON.stringify(concept, null, 2));
