#!/usr/bin/env node
// Uploads the rendered mp4 to Cloudflare R2 and prints its public URL.
// R2 speaks the S3 API, so the standard AWS SDK works against it.

import { readFileSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith("--")) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);

const file = resolve(args.file ?? "");
if (!existsSync(file)) {
  console.error(`video not found: ${file}`);
  process.exit(1);
}

const need = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_URL"];
const missing = need.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`missing env: ${missing.join(", ")}`);
  process.exit(1);
}

const key = `clips/${basename(file)}`;

const s3 = new S3Client({
  region: "auto",
   endpoint: `https://${process.env.R2_ACCOUNT_ID.trim()}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID.trim(),
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY.trim(),
  },
});

await s3.send(
  new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: readFileSync(file),
    ContentType: "video/mp4",
  })
);

// PostPeer fetches this URL itself, so it has to be publicly readable.
const url = `${process.env.R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
console.log(url);
