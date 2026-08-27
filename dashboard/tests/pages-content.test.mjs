import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../../", import.meta.url);

async function built(path) {
  return readFile(new URL(path, ROOT), "utf8");
}

test("GitHub Pages build contains truthful commission fields", async () => {
  const app = await built("docs/assets/app.js");
  assert.match(app, /คอมที่แสดง/);
  assert.match(app, /Base Commission/);
  assert.match(app, /Extra Commission/);
  assert.match(app, /Total Commission/);
  assert.match(app, /มี XTRA/);
  assert.match(app, /ยังไม่มีตัวเลขแยก/);
});

test("Product analysis explains evidence and avoids a sales guarantee", async () => {
  const app = await built("docs/assets/app.js");
  assert.match(app, /เหตุผลจากข้อมูล/);
  assert.match(app, /ข้อควรระวัง/);
  assert.match(app, /ไม่ใช่การรับประกันยอดขาย/);
  assert.match(app, /badge-only/);
});

test("Pages CSS includes the readability and analysis components", async () => {
  const css = await built("docs/assets/app.css");
  assert.match(css, /\.product-analysis/);
  assert.match(css, /\.xtra-state/);
  assert.match(css, /font-size:13px/);
  assert.match(css, /min-width:1180px/);
});
