import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const cloudSync = sqliteTable("cloud_sync", {
  userEmail: text("user_email").primaryKey(),
  objectKey: text("object_key").notNull(),
  updatedAt: text("updated_at").notNull(),
  productCount: integer("product_count").notNull().default(0),
  dataBytes: integer("data_bytes").notNull().default(0),
  watchlistJson: text("watchlist_json").notNull().default("[]"),
  schemaVersion: integer("schema_version").notNull().default(1),
  revision: text("revision").notNull().default(""),
  chunkCount: integer("chunk_count").notNull().default(0),
  payloadFormat: text("payload_format").notNull().default("json-chunks-v1"),
});

export const cloudSyncChunk = sqliteTable("cloud_sync_chunk", {
  userEmail: text("user_email").notNull(),
  revision: text("revision").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  payloadChunk: text("payload_chunk").notNull(),
}, (table) => [
  primaryKey({ columns: [table.userEmail, table.revision, table.chunkIndex] }),
]);
