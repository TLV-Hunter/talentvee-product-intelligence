import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { cloudSync } from "../../../db/schema";
import { getBucket } from "../../../db/storage";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 25 * 1024 * 1024;

async function identity() {
  const user = await getChatGPTUser();
  if (!user?.email) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(user.email.toLowerCase()));
  const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return { email: user.email.toLowerCase(), objectKey: `users/${hash}/product-intelligence.json` };
}

function unauthorized() {
  return NextResponse.json({ ok: false, error: "AUTH_REQUIRED" }, { status: 401 });
}

export async function GET() {
  const user = await identity();
  if (!user) return unauthorized();
  const record = await getDb().select().from(cloudSync).where(eq(cloudSync.userEmail, user.email)).get();
  if (!record) return NextResponse.json({ ok: true, found: false });
  const object = await getBucket().get(record.objectKey);
  if (!object) return NextResponse.json({ ok: true, found: false });
  const payload = await object.json();
  let watchlist: string[] = [];
  try { watchlist = JSON.parse(record.watchlistJson); } catch { watchlist = []; }
  return NextResponse.json({ ok: true, found: true, payload, watchlist, updatedAt: record.updatedAt, productCount: record.productCount });
}

export async function POST(request: Request) {
  const user = await identity();
  if (!user) return unauthorized();
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_BODY_BYTES) return NextResponse.json({ ok: false, error: "DATA_TOO_LARGE" }, { status: 413 });
  const body = await request.json() as { products?: unknown[]; database?: { products?: Record<string, unknown>; updatedAt?: string | null }; updatedAt?: string | null; watchlist?: unknown[] };
  const normalizedProducts = Array.isArray(body.products) ? body.products : null;
  const databaseProducts = body.database?.products && typeof body.database.products === "object" ? body.database.products : null;
  const productCount = normalizedProducts?.length ?? Object.keys(databaseProducts || {}).length;
  if (!productCount) return NextResponse.json({ ok: false, error: "PRODUCTS_REQUIRED" }, { status: 400 });
  const updatedAt = typeof body.updatedAt === "string"
    ? body.updatedAt
    : typeof body.database?.updatedAt === "string"
      ? body.database.updatedAt
      : new Date().toISOString();
  const watchlist = Array.isArray(body.watchlist) ? body.watchlist.map(String).slice(0, 5000) : [];
  const payload = normalizedProducts ? { products: normalizedProducts, updatedAt } : { database: body.database, updatedAt };
  const encoded = JSON.stringify(payload);
  if (new TextEncoder().encode(encoded).byteLength > MAX_BODY_BYTES) return NextResponse.json({ ok: false, error: "DATA_TOO_LARGE" }, { status: 413 });
  await getBucket().put(user.objectKey, encoded, { httpMetadata: { contentType: "application/json;charset=utf-8" } });
  const dataBytes = new TextEncoder().encode(encoded).byteLength;
  await getDb().insert(cloudSync).values({ userEmail: user.email, objectKey: user.objectKey, updatedAt, productCount, dataBytes, watchlistJson: JSON.stringify(watchlist), schemaVersion: 1 }).onConflictDoUpdate({ target: cloudSync.userEmail, set: { objectKey: user.objectKey, updatedAt, productCount, dataBytes, watchlistJson: JSON.stringify(watchlist), schemaVersion: 1 } });
  return NextResponse.json({ ok: true, updatedAt, productCount, dataBytes });
}

export async function PATCH(request: Request) {
  const user = await identity();
  if (!user) return unauthorized();
  const body = await request.json() as { watchlist?: unknown[] };
  const watchlist = Array.isArray(body.watchlist) ? body.watchlist.map(String).slice(0, 5000) : [];
  const existing = await getDb().select().from(cloudSync).where(eq(cloudSync.userEmail, user.email)).get();
  if (!existing) return NextResponse.json({ ok: false, error: "NO_CLOUD_BACKUP" }, { status: 404 });
  await getDb().update(cloudSync).set({ watchlistJson: JSON.stringify(watchlist) }).where(eq(cloudSync.userEmail, user.email));
  return NextResponse.json({ ok: true, watchlistCount: watchlist.length });
}
