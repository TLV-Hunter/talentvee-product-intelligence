import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const cloudSync = sqliteTable("cloud_sync", {
  userEmail: text("user_email").primaryKey(),
  objectKey: text("object_key").notNull(),
  updatedAt: text("updated_at").notNull(),
  productCount: integer("product_count").notNull().default(0),
  dataBytes: integer("data_bytes").notNull().default(0),
  watchlistJson: text("watchlist_json").notNull().default("[]"),
  schemaVersion: integer("schema_version").notNull().default(1),
});
