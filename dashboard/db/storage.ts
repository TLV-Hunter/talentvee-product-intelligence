import { env } from "cloudflare:workers";

export function getBucket(): R2Bucket {
  if (!env.BUCKET) {
    throw new Error("Cloud storage binding `BUCKET` is unavailable.");
  }
  return env.BUCKET;
}
