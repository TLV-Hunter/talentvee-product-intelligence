import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { cloudSync, cloudSyncChunk } from "../../../db/schema";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 8 * 1024 * 1024;
const CHUNK_CHARACTERS = 400_000;

async function identity() {
  const user = await getChatGPTUser();
  if (!user?.email) return null;
  return { email: user.email.toLowerCase() };
}

function unauthorized() {
  return NextResponse.json({ ok: false, error: "AUTH_REQUIRED" }, { status: 401 });
}

export async function GET() {
  const user = await identity();
  if (!user) return unauthorized();
  const record = await getDb().select().from(cloudSync).where(eq(cloudSync.userEmail, user.email)).get();
  if (!record) return NextResponse.json({ ok: true, found: false });
  const chunks = await getDb().select().from(cloudSyncChunk)
    .where(and(eq(cloudSyncChunk.userEmail, user.email), eq(cloudSyncChunk.revision, record.revision)))
    .orderBy(asc(cloudSyncChunk.chunkIndex)).all();
  if (!chunks.length || chunks.length !== record.chunkCount) {
    return NextResponse.json({ ok: false, error: "CLOUD_BACKUP_INCOMPLETE" }, { status: 503 });
  }
  let payload: unknown;
  try { payload = JSON.parse(chunks.map((chunk) => chunk.payloadChunk).join("")); }
  catch { return NextResponse.json({ ok: false, error: "CLOUD_BACKUP_CORRUPT" }, { status: 503 }); }
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
  const dataBytes = new TextEncoder().encode(encoded).byteLength;
  const revision = crypto.randomUUID();
  const payloadChunks = Array.from({ length: Math.ceil(encoded.length / CHUNK_CHARACTERS) }, (_, index) => ({
    userEmail: user.email,
    revision,
    chunkIndex: index,
    payloadChunk: encoded.slice(index * CHUNK_CHARACTERS, (index + 1) * CHUNK_CHARACTERS),
  }));
  const db = getDb();
  const previous = await db.select().from(cloudSync).where(eq(cloudSync.userEmail, user.email)).get();
  await db.insert(cloudSyncChunk).values(payloadChunks);
  await db.insert(cloudSync).values({
    userEmail: user.email,
    objectKey: `d1:${revision}`,
    updatedAt,
    productCount,
    dataBytes,
    watchlistJson: JSON.stringify(watchlist),
    schemaVersion: 2,
    revision,
    chunkCount: payloadChunks.length,
    payloadFormat: "json-chunks-v1",
  }).onConflictDoUpdate({ target: cloudSync.userEmail, set: {
    objectKey: `d1:${revision}`,
    updatedAt,
    productCount,
    dataBytes,
    watchlistJson: JSON.stringify(watchlist),
    schemaVersion: 2,
    revision,
    chunkCount: payloadChunks.length,
    payloadFormat: "json-chunks-v1",
  } });
  if (previous?.revision && previous.revision !== revision) {
    await db.delete(cloudSyncChunk).where(and(eq(cloudSyncChunk.userEmail, user.email), eq(cloudSyncChunk.revision, previous.revision)));
  }
  return NextResponse.json({ ok: true, updatedAt, productCount, dataBytes, chunkCount: payloadChunks.length, storage: "D1_ONLY" });
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
