"use client";

import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ConnectorControls from "./connector-controls";

type Observation = {
  checkedAt?: string;
  soldCount?: number | null;
  price?: number | null;
  displayedCommissionRate?: number | null;
  baseCommissionRate?: number | null;
  extraCommissionRate?: number | null;
  totalCommissionRate?: number | null;
};
type Product = {
  id: string;
  name: string;
  categories: string[];
  price: number | null;
  priceText?: string;
  soldCount: number | null;
  soldText?: string;
  displayedCommissionRate: number | null;
  baseCommissionRate?: number | null;
  extraCommissionRate?: number | null;
  totalCommissionRate?: number | null;
  extraCommissionAvailable?: boolean;
  freeSampleAvailable?: boolean;
  newBadgeAvailable?: boolean;
  labels: string[];
  opportunityScore: number;
  deltaSold: number | null;
  salesPerDay: number | null;
  observationCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  image?: string;
  productUrl?: string;
  observations: Observation[];
};
type ViewKey =
  | "overview"
  | "ranking"
  | "rising"
  | "new"
  | "categories"
  | "watchlist"
  | "import";
type SortKey = "opportunity" | "sold" | "velocity" | "commission" | "newest";
type CloudState = "checking" | "ready" | "syncing" | "local" | "error";
type ParsedData = {
  products: Product[];
  updatedAt: string | null;
  watchlist?: string[];
};

const STORAGE_KEY = "talentvee-product-intelligence-v1",
  WATCHLIST_KEY = "talentvee-watchlist-v1",
  BACKUP_FORMAT = "talentvee-full-backup",
  BACKUP_VERSION = 1;
const STATIC_PAGES =
  typeof __TALENTVEE_STATIC__ !== "undefined" && __TALENTVEE_STATIC__;
const now = new Date();
const hoursAgo = (hours: number) =>
  new Date(now.getTime() - hours * 3600000).toISOString();
const sampleProducts: Product[] = [
  {
    id: "sample-gps",
    name: "อุปกรณ์ติดตาม GPS รองรับ iOS",
    categories: ["มือถือและอุปกรณ์"],
    price: 299,
    soldCount: 40000,
    displayedCommissionRate: 20,
    opportunityScore: 93,
    deltaSold: 740,
    salesPerDay: 740,
    observationCount: 3,
    firstSeenAt: hoursAgo(72),
    lastSeenAt: hoursAgo(1),
    labels: ["BEST_SELLER", "TRENDING"],
    image:
      "https://down-aka-th.img.susercontent.com/cn-11134207-7ras8-m22d1qd6nxfv4f.webp",
    observations: [
      { checkedAt: hoursAgo(49), soldCount: 38520 },
      { checkedAt: hoursAgo(25), soldCount: 39260 },
      { checkedAt: hoursAgo(1), soldCount: 40000 },
    ],
  },
  {
    id: "sample-cat-toy",
    name: "ไม้ล่อแมวระบบอัตโนมัติ",
    categories: ["สัตว์เลี้ยง"],
    price: 55,
    soldCount: 8000,
    displayedCommissionRate: 47,
    extraCommissionAvailable: true,
    opportunityScore: 91,
    deltaSold: 320,
    salesPerDay: 320,
    observationCount: 3,
    firstSeenAt: hoursAgo(48),
    lastSeenAt: hoursAgo(1),
    labels: [
      "BEST_SELLER",
      "RISING",
      "HIGH_COMMISSION",
      "EXTRA_COMM",
      "FIRST_SEEN",
    ],
    image:
      "https://down-aka-th.img.susercontent.com/th-11134207-81ztd-mo3ghhr9c9hi4b.webp",
    observations: [
      { checkedAt: hoursAgo(49), soldCount: 7360 },
      { checkedAt: hoursAgo(25), soldCount: 7680 },
      { checkedAt: hoursAgo(1), soldCount: 8000 },
    ],
  },
  {
    id: "sample-jacket",
    name: "เสื้อแจ็คเก็ตเดินป่าทรงหลวม",
    categories: ["แฟชั่นผู้ชาย"],
    price: 1483,
    soldCount: 3000,
    displayedCommissionRate: 14,
    opportunityScore: 82,
    deltaSold: 90,
    salesPerDay: 90,
    observationCount: 3,
    firstSeenAt: hoursAgo(120),
    lastSeenAt: hoursAgo(1),
    labels: ["BEST_SELLER"],
    image:
      "https://down-aka-th.img.susercontent.com/sg-11134201-7rat1-madmwvze1852b2.webp",
    observations: [
      { checkedAt: hoursAgo(49), soldCount: 2820 },
      { checkedAt: hoursAgo(25), soldCount: 2910 },
      { checkedAt: hoursAgo(1), soldCount: 3000 },
    ],
  },
  {
    id: "sample-scratcher",
    name: "พรมลับเล็บแมววัสดุธรรมชาติ",
    categories: ["สัตว์เลี้ยง"],
    price: 31,
    soldCount: 2000,
    displayedCommissionRate: 42,
    extraCommissionAvailable: true,
    opportunityScore: 88,
    deltaSold: 210,
    salesPerDay: 210,
    observationCount: 3,
    firstSeenAt: hoursAgo(60),
    lastSeenAt: hoursAgo(1),
    labels: [
      "RISING",
      "TRENDING",
      "HIGH_COMMISSION",
      "EXTRA_COMM",
      "FIRST_SEEN",
    ],
    image:
      "https://down-aka-th.img.susercontent.com/cn-11134207-820l4-mj5az4mij4lf76.webp",
    observations: [
      { checkedAt: hoursAgo(49), soldCount: 1580 },
      { checkedAt: hoursAgo(25), soldCount: 1790 },
      { checkedAt: hoursAgo(1), soldCount: 2000 },
    ],
  },
  {
    id: "sample-washer",
    name: "เครื่องฉีดน้ำแรงดันสูง",
    categories: ["เครื่องใช้ในบ้าน"],
    price: 2590,
    soldCount: 2000,
    displayedCommissionRate: 22,
    opportunityScore: 76,
    deltaSold: 52,
    salesPerDay: 52,
    observationCount: 2,
    firstSeenAt: hoursAgo(180),
    lastSeenAt: hoursAgo(1),
    labels: ["BEST_SELLER"],
    image:
      "https://down-aka-th.img.susercontent.com/th-11134207-7r98z-lpov09alxgxcec.webp",
    observations: [
      { checkedAt: hoursAgo(25), soldCount: 1948 },
      { checkedAt: hoursAgo(1), soldCount: 2000 },
    ],
  },
  {
    id: "sample-pump",
    name: "ปั๊มลมไฟฟ้าไร้สายแบบพกพา",
    categories: ["ยานยนต์"],
    price: 200,
    soldCount: 360,
    displayedCommissionRate: 62,
    extraCommissionAvailable: true,
    opportunityScore: 86,
    deltaSold: 86,
    salesPerDay: 86,
    observationCount: 3,
    firstSeenAt: hoursAgo(42),
    lastSeenAt: hoursAgo(1),
    labels: [
      "RISING",
      "TRENDING",
      "HIGH_COMMISSION",
      "EXTRA_COMM",
      "FIRST_SEEN",
    ],
    image:
      "https://down-aka-th.img.susercontent.com/th-11134207-7r98x-m02v1jqfwz4o5f.webp",
    observations: [
      { checkedAt: hoursAgo(49), soldCount: 188 },
      { checkedAt: hoursAgo(25), soldCount: 274 },
      { checkedAt: hoursAgo(1), soldCount: 360 },
    ],
  },
  {
    id: "sample-litter",
    name: "ทรายแมวผสมออร์แกนิก",
    categories: ["สัตว์เลี้ยง"],
    price: 216,
    soldCount: 300,
    displayedCommissionRate: 42,
    opportunityScore: 80,
    deltaSold: 42,
    salesPerDay: 42,
    observationCount: 2,
    firstSeenAt: hoursAgo(84),
    lastSeenAt: hoursAgo(1),
    labels: ["RISING", "HIGH_COMMISSION"],
    image:
      "https://down-aka-th.img.susercontent.com/cn-11134207-820l4-milf64oo84cg40.webp",
    observations: [
      { checkedAt: hoursAgo(25), soldCount: 258 },
      { checkedAt: hoursAgo(1), soldCount: 300 },
    ],
  },
  {
    id: "sample-chew",
    name: "ซอฟต์ชิวบำรุงขนสัตว์เลี้ยง",
    categories: ["สัตว์เลี้ยง"],
    price: 89,
    soldCount: 267,
    displayedCommissionRate: 32,
    opportunityScore: 78,
    deltaSold: 38,
    salesPerDay: 38,
    observationCount: 2,
    firstSeenAt: hoursAgo(31),
    lastSeenAt: hoursAgo(1),
    labels: ["RISING", "FIRST_SEEN"],
    image:
      "https://down-aka-th.img.susercontent.com/cn-11134207-820l4-mrqyulcawnb6bc.webp",
    observations: [
      { checkedAt: hoursAgo(25), soldCount: 229 },
      { checkedAt: hoursAgo(1), soldCount: 267 },
    ],
  },
  {
    id: "sample-fountain",
    name: "น้ำพุสัตว์เลี้ยงอัจฉริยะ",
    categories: ["สัตว์เลี้ยง"],
    price: 252,
    soldCount: 59,
    displayedCommissionRate: 27,
    opportunityScore: 72,
    deltaSold: 11,
    salesPerDay: 11,
    observationCount: 2,
    firstSeenAt: hoursAgo(20),
    lastSeenAt: hoursAgo(1),
    labels: ["FIRST_SEEN"],
    image:
      "https://down-aka-th.img.susercontent.com/cn-11134207-820l4-mmu5y1jcm4g597.webp",
    observations: [
      { checkedAt: hoursAgo(20), soldCount: 48 },
      { checkedAt: hoursAgo(1), soldCount: 59 },
    ],
  },
  {
    id: "sample-coating",
    name: "น้ำยาเคลือบเบาะและป้องกัน UV",
    categories: ["ยานยนต์"],
    price: 199,
    soldCount: 59,
    displayedCommissionRate: 72,
    extraCommissionAvailable: true,
    newBadgeAvailable: true,
    opportunityScore: 85,
    deltaSold: 19,
    salesPerDay: 19,
    observationCount: 2,
    firstSeenAt: hoursAgo(18),
    lastSeenAt: hoursAgo(1),
    labels: ["NEW_CONFIRMED", "HIGH_COMMISSION", "EXTRA_COMM"],
    image:
      "https://down-aka-th.img.susercontent.com/th-11134207-81ztq-mjxzg4ago9vl44.webp",
    observations: [
      { checkedAt: hoursAgo(18), soldCount: 40 },
      { checkedAt: hoursAgo(1), soldCount: 59 },
    ],
  },
  {
    id: "sample-cutter",
    name: "กรรไกรตัดเล็บแมวพร้อมไฟ",
    categories: ["สัตว์เลี้ยง"],
    price: 129,
    soldCount: 180,
    displayedCommissionRate: 36,
    opportunityScore: 74,
    deltaSold: 24,
    salesPerDay: 24,
    observationCount: 2,
    firstSeenAt: hoursAgo(26),
    lastSeenAt: hoursAgo(2),
    labels: ["FIRST_SEEN"],
    observations: [
      { checkedAt: hoursAgo(26), soldCount: 156 },
      { checkedAt: hoursAgo(2), soldCount: 180 },
    ],
  },
  {
    id: "sample-bed",
    name: "ที่นอนสัตว์เลี้ยงทรงโดนัท",
    categories: ["สัตว์เลี้ยง"],
    price: 139,
    soldCount: 460,
    displayedCommissionRate: 42,
    opportunityScore: 79,
    deltaSold: 31,
    salesPerDay: 31,
    observationCount: 2,
    firstSeenAt: hoursAgo(96),
    lastSeenAt: hoursAgo(2),
    labels: ["HIGH_COMMISSION"],
    observations: [
      { checkedAt: hoursAgo(26), soldCount: 429 },
      { checkedAt: hoursAgo(2), soldCount: 460 },
    ],
  },
];
const nav: { key: ViewKey; label: string; icon: string }[] = [
  { key: "overview", label: "ภาพรวม", icon: "⌂" },
  { key: "ranking", label: "อันดับสินค้า", icon: "#" },
  { key: "rising", label: "สินค้าโตไว", icon: "↗" },
  { key: "new", label: "สินค้าใหม่", icon: "✦" },
  { key: "categories", label: "วิเคราะห์หมวด", icon: "◫" },
  { key: "watchlist", label: "สินค้าน่าจับตา", icon: "◎" },
  { key: "import", label: "นำเข้าข้อมูล", icon: "⇧" },
];
const labelNames: Record<string, string> = {
  BEST_SELLER: "ขายดี",
  RISING: "กำลังโต",
  TRENDING: "มาแรง",
  NEW_CONFIRMED: "สินค้าใหม่",
  FIRST_SEEN: "เพิ่งพบ",
  HIGH_COMMISSION: "คอมสูง",
  EXTRA_COMM: "XTRA COMM",
};
const sortLabels: Record<SortKey, string> = {
  opportunity: "คะแนนโอกาส",
  sold: "ขายดี",
  velocity: "โตไว",
  commission: "ค่าคอมสูง",
  newest: "เพิ่งพบ",
};
function numberValue(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function normalizeRow(
  raw: Record<string, unknown>,
  record?: Record<string, unknown>,
): Product {
  const latest = (
    record?.latest && typeof record.latest === "object" ? record.latest : {}
  ) as Record<string, unknown>;
  const base = { ...latest, ...raw };
  const observations = (
    Array.isArray(record?.observations)
      ? record.observations
      : Array.isArray(base.observations)
        ? base.observations
        : []
  ) as Observation[];
  const newest = observations.at(-1),
    previous = observations.at(-2);
  const elapsedHours =
    newest?.checkedAt && previous?.checkedAt
      ? (new Date(newest.checkedAt).getTime() -
          new Date(previous.checkedAt).getTime()) /
        3600000
      : 0;
  const newestSold = numberValue(newest?.soldCount),
    previousSold = numberValue(previous?.soldCount);
  const calculatedDelta =
    elapsedHours > 0 && newestSold !== null && previousSold !== null
      ? Math.max(0, newestSold - previousSold)
      : null;
  const deltaSold = numberValue(base.deltaSold) ?? calculatedDelta;
  const salesPerDay =
    numberValue(base.salesPerDay) ??
    (deltaSold !== null && elapsedHours > 0
      ? (deltaSold / elapsedHours) * 24
      : null);
  const id = String(base.id || record?.id || `product-${Date.now()}`);
  return {
    id,
    name: String(base.name || "(ไม่มีชื่อสินค้า)"),
    categories: Array.isArray(base.categories)
      ? base.categories.map(String)
      : ["ไม่ทราบหมวด"],
    price: numberValue(base.price ?? newest?.price),
    priceText: base.priceText ? String(base.priceText) : undefined,
    soldCount: numberValue(base.soldCount ?? newest?.soldCount),
    soldText: base.soldText ? String(base.soldText) : undefined,
    displayedCommissionRate: numberValue(
      base.displayedCommissionRate ?? newest?.displayedCommissionRate,
    ),
    baseCommissionRate: numberValue(
      base.baseCommissionRate ?? newest?.baseCommissionRate,
    ),
    extraCommissionRate: numberValue(
      base.extraCommissionRate ?? newest?.extraCommissionRate,
    ),
    totalCommissionRate: numberValue(
      base.totalCommissionRate ?? newest?.totalCommissionRate,
    ),
    extraCommissionAvailable: Boolean(base.extraCommissionAvailable),
    freeSampleAvailable: Boolean(base.freeSampleAvailable),
    newBadgeAvailable: Boolean(base.newBadgeAvailable),
    labels: Array.isArray(base.labels) ? base.labels.map(String) : [],
    opportunityScore: numberValue(base.opportunityScore) ?? 0,
    deltaSold,
    salesPerDay,
    observationCount: numberValue(base.observationCount) ?? observations.length,
    firstSeenAt: String(
      base.firstSeenAt || record?.firstSeenAt || new Date().toISOString(),
    ),
    lastSeenAt: String(
      base.lastSeenAt || record?.lastSeenAt || new Date().toISOString(),
    ),
    image: base.image ? String(base.image) : undefined,
    productUrl: base.productUrl ? String(base.productUrl) : undefined,
    observations,
  };
}
function parsePayload(payload: unknown): ParsedData {
  if (!payload || typeof payload !== "object")
    throw new Error("รูปแบบไฟล์ไม่ถูกต้อง");
  const root = payload as Record<string, unknown>,
    backupData =
      root.format === BACKUP_FORMAT &&
      root.data &&
      typeof root.data === "object"
        ? (root.data as Record<string, unknown>)
        : null,
    source =
      backupData?.productIntelligence &&
      typeof backupData.productIntelligence === "object"
        ? {
            database: backupData.productIntelligence,
            exportedAt: root.exportedAt,
          }
        : root,
    database =
      source.database && typeof source.database === "object"
        ? (source.database as Record<string, unknown>)
        : null,
    productMap =
      database?.products && typeof database.products === "object"
        ? (database.products as Record<string, Record<string, unknown>>)
        : {};
  let rows: Product[] = [];
  if (Array.isArray(source.intelligence))
    rows = source.intelligence.map((item) => {
      const raw = item as Record<string, unknown>;
      return normalizeRow(raw, productMap[String(raw.id || "")]);
    });
  else if (Object.keys(productMap).length)
    rows = Object.values(productMap).map((record) => normalizeRow({}, record));
  else if (Array.isArray(source.products))
    rows = source.products.map((item) =>
      normalizeRow(item as Record<string, unknown>),
    );
  else if (Array.isArray(source.items))
    rows = source.items.map((item) =>
      normalizeRow(item as Record<string, unknown>),
    );
  if (!rows.length)
    throw new Error(
      "ไม่พบข้อมูลสินค้าในไฟล์นี้ กรุณาส่งออก Full Backup จาก Extension",
    );
  const watchlistSource = Array.isArray(backupData?.watchlist)
    ? backupData?.watchlist
    : Array.isArray(root.watchlist)
      ? root.watchlist
      : undefined;
  return {
    products: rows,
    updatedAt: String(
      database?.updatedAt ||
        source.updatedAt ||
        source.exportedAt ||
        new Date().toISOString(),
    ),
    watchlist: watchlistSource?.map(String),
  };
}
const formatNumber = (value: number | null, digits = 0) =>
  value === null
    ? "—"
    : value.toLocaleString("th-TH", { maximumFractionDigits: digits });
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("th-TH", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
}
function scoreLabel(score: number) {
  if (score >= 80) return "ควรปักตะกร้า";
  if (score >= 65) return "น่าทดลอง";
  if (score >= 50) return "เฝ้าดู";
  return "ยังไม่แนะนำ";
}
function productEvidence(product: Product) {
  const reasons: string[] = [];
  const cautions: string[] = [];
  if (product.soldCount !== null)
    reasons.push(`ยอดขายสะสมที่ตรวจพบ ${formatNumber(product.soldCount)} ชิ้น`);
  if (product.salesPerDay !== null)
    reasons.push(
      `ยอดขายเพิ่มเฉลี่ย ${formatNumber(product.salesPerDay, 1)} ชิ้น/วัน`,
    );
  if (product.displayedCommissionRate !== null)
    reasons.push(
      `ค่าคอมที่หน้าแสดง ${formatNumber(product.displayedCommissionRate, 1)}%`,
    );
  if (product.extraCommissionAvailable)
    reasons.push("พบป้าย XTRA แต่ยังไม่สรุปอัตราเพิ่มหากไม่มีตัวเลขแยก");
  if (product.observationCount < 2)
    cautions.push("มีข้อมูลไม่ถึง 2 รอบ จึงยังยืนยันแนวโน้มไม่ได้");
  if (product.displayedCommissionRate === null)
    cautions.push("ยังไม่มีค่าคอมที่หน้าแสดง");
  if (product.extraCommissionAvailable && product.extraCommissionRate == null)
    cautions.push("มี XTRA แบบ badge-only จึงไม่แสดงเปอร์เซ็นต์ Extra");
  return { reasons, cautions };
}
function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
async function verifyBackup(payload: unknown) {
  if (!payload || typeof payload !== "object") return;
  const source = payload as Record<string, unknown>;
  if (source.format !== BACKUP_FORMAT) return;
  if (Number(source.backupVersion) > BACKUP_VERSION)
    throw new Error("ไฟล์ Backup มาจากรุ่นใหม่กว่าที่เว็บนี้รองรับ");
  if (!source.data || typeof source.data !== "object")
    throw new Error("Full Backup ไม่มีข้อมูล");
  const checksum =
    source.checksum && typeof source.checksum === "object"
      ? (source.checksum as Record<string, unknown>).value
      : null;
  if (checksum && (await sha256Hex(JSON.stringify(source.data))) !== checksum)
    throw new Error("Checksum ไม่ตรงกัน ไฟล์อาจเสียหายหรือถูกแก้ไข");
}
function productDatabase(items: Product[], stamp: string) {
  const records: Record<string, unknown> = {};
  for (const product of items) {
    const { observations, ...latest } = product;
    records[product.id] = {
      id: product.id,
      firstSeenAt: product.firstSeenAt,
      lastSeenAt: product.lastSeenAt,
      latest,
      observations,
    };
  }
  return { schemaVersion: 1, products: records, runs: [], updatedAt: stamp };
}
function saveJsonFile(payload: unknown, filename: string) {
  const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json;charset=utf-8",
      }),
    ),
    link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>(sampleProducts),
    [isSample, setIsSample] = useState(true),
    [updatedAt, setUpdatedAt] = useState<string | null>(null),
    [activeView, setActiveView] = useState<ViewKey>("overview"),
    [sort, setSort] = useState<SortKey>("opportunity"),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("ALL"),
    [period, setPeriod] = useState("ALL"),
    [selected, setSelected] = useState<Product | null>(null),
    [watchlist, setWatchlist] = useState<string[]>([]),
    [cloudState, setCloudState] = useState<CloudState>("checking"),
    [importState, setImportState] = useState<{
      type: "idle" | "ok" | "error";
      message: string;
    }>({ type: "idle", message: "" });
  const fileInput = useRef<HTMLInputElement>(null);
  const latestStamp = useRef(0);
  function commitParsed(parsed: ParsedData, force = false) {
    const stamp = new Date(parsed.updatedAt || 0).getTime() || Date.now();
    if (!force && stamp < latestStamp.current) return false;
    latestStamp.current = stamp;
    setProducts(parsed.products);
    setUpdatedAt(parsed.updatedAt);
    setIsSample(false);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        products: parsed.products,
        updatedAt: parsed.updatedAt,
      }),
    );
    return true;
  }
  async function saveCloud(
    parsed: { products: Product[]; updatedAt: string | null },
    list: string[],
  ) {
    if (STATIC_PAGES) {
      setCloudState("local");
      setImportState({
        type: "ok",
        message: `บันทึกในเบราว์เซอร์แล้ว ${parsed.products.length.toLocaleString("th-TH")} รายการ · ดาวน์โหลด Full Backup เพื่อย้ายเครื่อง`,
      });
      return;
    }
    setCloudState("syncing");
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...parsed, watchlist: list }),
      });
      if (!response.ok) throw new Error("cloud sync failed");
      setCloudState("ready");
      setImportState({
        type: "ok",
        message: `สำรองขึ้น Cloud แล้ว ${parsed.products.length.toLocaleString("th-TH")} รายการ`,
      });
    } catch {
      setCloudState("error");
      setImportState({
        type: "error",
        message: "สำรองในเครื่องแล้ว แต่ Cloud Sync ยังไม่สำเร็จ",
      });
    }
  }
  async function restoreCloud(force = false) {
    if (STATIC_PAGES) {
      setCloudState("local");
      return;
    }
    setCloudState("checking");
    try {
      const response = await fetch("/api/sync", { cache: "no-store" });
      if (!response.ok) throw new Error("cloud restore failed");
      const result = (await response.json()) as {
        found?: boolean;
        payload?: unknown;
        watchlist?: unknown[];
      };
      if (!result.found || !result.payload) {
        setCloudState("local");
        return;
      }
      const parsed = parsePayload(result.payload);
      if (commitParsed(parsed, force)) {
        const watched = Array.isArray(result.watchlist)
          ? result.watchlist.map(String)
          : [];
        setWatchlist(watched);
        localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watched));
        setImportState({
          type: "ok",
          message: `กู้ข้อมูลจาก Cloud สำเร็จ ${parsed.products.length.toLocaleString("th-TH")} รายการ`,
        });
      }
      setCloudState("ready");
    } catch {
      setCloudState("error");
    }
  }
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY),
        watched = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]");
      if (Array.isArray(watched)) setWatchlist(watched.map(String));
      if (saved) {
        const parsed = JSON.parse(saved) as {
          products: Product[];
          updatedAt: string | null;
        };
        if (Array.isArray(parsed.products) && parsed.products.length)
          commitParsed(parsed, true);
      }
    } catch {}
    restoreCloud();
  }, []);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.source !== window ||
        event.data?.type !== "TALENTVEE_DASHBOARD_DATA"
      )
        return;
      try {
        const parsed = parsePayload(event.data.payload);
        if (commitParsed(parsed)) {
          const savedWatch = JSON.parse(
              localStorage.getItem(WATCHLIST_KEY) || "[]",
            ),
            watched =
              parsed.watchlist ||
              (Array.isArray(savedWatch) ? savedWatch.map(String) : []);
          if (parsed.watchlist) {
            setWatchlist(watched);
            localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watched));
          }
          void saveCloud(parsed, watched);
          setImportState({
            type: "ok",
            message: `ซิงก์จาก Extension อัตโนมัติ ${parsed.products.length.toLocaleString("th-TH")} รายการ`,
          });
        }
      } catch {}
    };
    window.addEventListener("message", receive);
    const request = () =>
      window.postMessage(
        { type: "TALENTVEE_DASHBOARD_REQUEST", source: "talentvee-dashboard" },
        window.location.origin,
      );
    request();
    const retry = window.setTimeout(request, 700);
    return () => {
      window.removeEventListener("message", receive);
      window.clearTimeout(retry);
    };
  }, []);
  const categories = useMemo(
    () =>
      [...new Set(products.flatMap((item) => item.categories || []))].sort(
        (a, b) => a.localeCompare(b, "th"),
      ),
    [products],
  );
  const filtered = useMemo(() => {
    const cutoff =
      period === "ALL" ? 0 : Date.now() - Number(period) * 86400000;
    const rows = products.filter((item) => {
      if (
        query &&
        !`${item.name} ${item.id}`
          .toLocaleLowerCase("th")
          .includes(query.toLocaleLowerCase("th"))
      )
        return false;
      if (category !== "ALL" && !item.categories.includes(category))
        return false;
      if (cutoff && new Date(item.lastSeenAt).getTime() < cutoff) return false;
      if (
        activeView === "rising" &&
        !(
          item.labels.includes("RISING") ||
          item.labels.includes("TRENDING") ||
          (item.salesPerDay || 0) > 0
        )
      )
        return false;
      if (
        activeView === "new" &&
        !(
          item.labels.includes("NEW_CONFIRMED") ||
          item.labels.includes("FIRST_SEEN")
        )
      )
        return false;
      if (activeView === "watchlist" && !watchlist.includes(item.id))
        return false;
      return true;
    });
    const compare: Record<SortKey, (a: Product, b: Product) => number> = {
      opportunity: (a, b) => b.opportunityScore - a.opportunityScore,
      sold: (a, b) => (b.soldCount || 0) - (a.soldCount || 0),
      velocity: (a, b) => (b.salesPerDay || 0) - (a.salesPerDay || 0),
      commission: (a, b) =>
        (b.displayedCommissionRate || 0) - (a.displayedCommissionRate || 0),
      newest: (a, b) =>
        new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime(),
    };
    return rows.sort(compare[sort]);
  }, [products, query, category, period, activeView, watchlist, sort]);
  const stats = useMemo(() => {
    const withHistory = products.filter(
        (item) => item.observationCount > 1,
      ).length,
      fast = products.filter(
        (item) =>
          item.labels.includes("RISING") || item.labels.includes("TRENDING"),
      ).length,
      commissions = products
        .map((item) => item.displayedCommissionRate)
        .filter((item): item is number => item !== null),
      recent = products.filter(
        (item) =>
          item.labels.includes("FIRST_SEEN") ||
          item.labels.includes("NEW_CONFIRMED"),
      ).length;
    return {
      withHistory,
      fast,
      averageCommission: commissions.length
        ? commissions.reduce((a, b) => a + b, 0) / commissions.length
        : null,
      recent,
    };
  }, [products]);
  const categoryStats = useMemo(
    () =>
      categories
        .map((name) => {
          const items = products.filter((item) =>
              item.categories.includes(name),
            ),
            avgScore =
              items.reduce((sum, item) => sum + item.opportunityScore, 0) /
              Math.max(items.length, 1),
            velocity = items.reduce(
              (sum, item) => sum + (item.salesPerDay || 0),
              0,
            ),
            commission = items
              .map((item) => item.displayedCommissionRate)
              .filter((item): item is number => item !== null);
          return {
            name,
            count: items.length,
            avgScore,
            velocity,
            avgCommission: commission.length
              ? commission.reduce((a, b) => a + b, 0) / commission.length
              : 0,
          };
        })
        .sort((a, b) => b.avgScore - a.avgScore),
    [categories, products],
  );
  const chartData = useMemo(() => {
    const labels = ["-6", "-5", "-4", "-3", "-2", "-1", "วันนี้"],
      values = labels.map((_, index) => {
        const dayStart = Date.now() - (6 - index) * 86400000;
        return products.reduce((sum, item) => {
          if (item.observations.length < 2) return sum;
          const target = item.observations.find(
            (entry) =>
              Math.abs(new Date(entry.checkedAt || 0).getTime() - dayStart) <
              18 * 3600000,
          );
          return sum + (target?.soldCount || 0);
        }, 0);
      });
    return values.some(Boolean)
      ? { labels, values }
      : {
          labels: [
            "19 ส.ค.",
            "20 ส.ค.",
            "21 ส.ค.",
            "22 ส.ค.",
            "23 ส.ค.",
            "24 ส.ค.",
            "25 ส.ค.",
          ],
          values: [28, 40, 37, 58, 51, 76, 91],
        };
  }, [products]);
  const chartPath = useMemo(() => {
    const max = Math.max(...chartData.values, 1);
    return chartData.values
      .map(
        (value, index) =>
          `${index ? "L" : "M"}${index * (720 / (chartData.values.length - 1))} ${190 - (value / max) * 150}`,
      )
      .join(" ");
  }, [chartData]);
  function toggleWatch(id: string) {
    setWatchlist((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
      window.postMessage(
        {
          type: "TALENTVEE_DASHBOARD_WATCHLIST",
          source: "talentvee-dashboard",
          watchlist: next,
        },
        window.location.origin,
      );
      if (!STATIC_PAGES)
        void fetch("/api/sync", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ watchlist: next }),
        }).catch(() => null);
      return next;
    });
  }
  function importFile(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const payload = JSON.parse(String(reader.result));
        await verifyBackup(payload);
        const parsed = parsePayload(payload),
          nextWatchlist = parsed.watchlist || watchlist;
        commitParsed(parsed, true);
        if (parsed.watchlist) {
          setWatchlist(nextWatchlist);
          localStorage.setItem(WATCHLIST_KEY, JSON.stringify(nextWatchlist));
          window.postMessage(
            {
              type: "TALENTVEE_DASHBOARD_WATCHLIST",
              source: "talentvee-dashboard",
              watchlist: nextWatchlist,
            },
            window.location.origin,
          );
        }
        setActiveView("overview");
        void saveCloud(parsed, nextWatchlist);
        setImportState({
          type: "ok",
          message: STATIC_PAGES
            ? `นำเข้าสำเร็จ ${parsed.products.length.toLocaleString("th-TH")} รายการ · บันทึกในเบราว์เซอร์แล้ว`
            : `นำเข้าสำเร็จ ${parsed.products.length.toLocaleString("th-TH")} รายการ · ตรวจไฟล์แล้ว · กำลังสำรองขึ้น Cloud`,
        });
      } catch (error) {
        setImportState({
          type: "error",
          message: error instanceof Error ? error.message : "อ่านไฟล์ไม่สำเร็จ",
        });
      }
    };
    reader.onerror = () =>
      setImportState({ type: "error", message: "อ่านไฟล์ไม่สำเร็จ" });
    reader.readAsText(file);
  }
  function resetData() {
    localStorage.removeItem(STORAGE_KEY);
    setProducts(sampleProducts);
    setIsSample(true);
    setUpdatedAt(null);
    setImportState({ type: "idle", message: "" });
  }
  async function exportFullBackup() {
    if (isSample) return;
    const stamp = updatedAt || new Date().toISOString(),
      data = {
        productIntelligence: productDatabase(products, stamp),
        watchlist,
        preferences: {},
        lastProductScan: null,
      },
      payload = {
        format: BACKUP_FORMAT,
        backupVersion: BACKUP_VERSION,
        appVersion: "web-1.1.0",
        exportedAt: new Date().toISOString(),
        source: "web-dashboard",
        data,
        checksum: {
          algorithm: "SHA-256",
          value: await sha256Hex(JSON.stringify(data)),
        },
      };
    saveJsonFile(
      payload,
      `TalentVee-Full-Backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
    );
    setImportState({
      type: "ok",
      message: `สร้าง Full Backup แล้ว ${products.length.toLocaleString("th-TH")} รายการ · SHA-256`,
    });
  }
  function exportCsv() {
    const columns: [keyof Product, string][] = [
      ["id", "รหัสสินค้า"],
      ["name", "ชื่อสินค้า"],
      ["price", "ราคา"],
      ["soldCount", "ยอดขาย"],
      ["displayedCommissionRate", "ค่าคอมที่แสดง (%)"],
      ["baseCommissionRate", "Base Commission (%)"],
      ["extraCommissionRate", "Extra Commission (%)"],
      ["totalCommissionRate", "Total Commission (%)"],
      ["extraCommissionAvailable", "มีป้าย XTRA"],
      ["salesPerDay", "ขายต่อวัน"],
      ["opportunityScore", "คะแนนโอกาส"],
      ["firstSeenAt", "พบครั้งแรก"],
      ["lastSeenAt", "พบล่าสุด"],
      ["productUrl", "URL สินค้า"],
    ];
    const lines = [
        columns.map(([, label]) => csvCell(label)).join(","),
        ...filtered.map((item) =>
          columns.map(([key]) => csvCell(item[key])).join(","),
        ),
      ],
      blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
        type: "text/csv;charset=utf-8",
      }),
      url = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = url;
    link.download = `TalentVee-Ranking-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
  const viewTitle: Record<ViewKey, string> = {
      overview: "ภาพรวมตลาดสินค้า",
      ranking: "อันดับสินค้าทั้งหมด",
      rising: "สินค้าโตไวและมาแรง",
      new: "สินค้าใหม่และเพิ่งพบ",
      categories: "วิเคราะห์รายหมวด",
      watchlist: "สินค้าน่าจับตา",
      import: "นำเข้าข้อมูลจาก Extension",
    },
    pageRows = filtered.slice(0, activeView === "overview" ? 10 : 100);
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">TV</div>
          <div>
            <strong>TalentVee</strong>
            <span>Product Intelligence</span>
          </div>
        </div>
        <nav aria-label="เมนูหลัก">
          {nav.map((item) => (
            <button
              className={`nav-item ${activeView === item.key ? "active" : ""}`}
              key={item.key}
              onClick={() => setActiveView(item.key)}
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
              {item.key === "watchlist" && watchlist.length > 0 ? (
                <b className="nav-count">{watchlist.length}</b>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="live-dot" /> LOCAL-FIRST DATA
          <strong>
            {isSample ? "ข้อมูลสาธิต" : "Shopee Affiliate Import"}
          </strong>
          <small>ข้อมูลสินค้าเก็บในเบราว์เซอร์ของคุณ</small>
        </div>
      </aside>
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">PRODUCT COMMAND CENTER</p>
            <h1>{viewTitle[activeView]}</h1>
          </div>
          <div className="top-actions">
            <span
              className={`cloud-badge ${STATIC_PAGES ? "local" : cloudState}`}
            >
              <i />
              {STATIC_PAGES
                ? "GitHub Local"
                : cloudState === "ready"
                  ? "Cloud พร้อม"
                  : cloudState === "syncing"
                    ? "กำลังสำรอง"
                    : cloudState === "checking"
                      ? "กำลังตรวจ Cloud"
                      : cloudState === "local"
                        ? "ยังไม่มี Backup"
                        : "Cloud ขัดข้อง"}
            </span>
            <label className="search">
              <span>⌕</span>
              <input
                aria-label="ค้นหาสินค้า"
                placeholder="ค้นหาสินค้า หรือรหัส"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <button
              className="sync-button"
              onClick={() => {
                setActiveView("import");
                fileInput.current?.click();
              }}
            >
              <span>⇧</span> นำเข้าข้อมูล
            </button>
          </div>
        </header>
        <div className={`data-banner ${isSample ? "sample" : "live"}`}>
          <span>
            {isSample
              ? "DEMO"
              : STATIC_PAGES
                ? "GITHUB LOCAL"
                : cloudState === "ready"
                  ? "CLOUD SYNCED"
                  : "LOCAL"}
          </span>
          <div>
            <strong>
              {isSample
                ? "กำลังแสดงข้อมูลตัวอย่าง"
                : STATIC_PAGES
                  ? "ข้อมูลจริงพร้อมวิเคราะห์บน GitHub Pages"
                  : cloudState === "ready"
                    ? "ข้อมูลได้รับการสำรองและพร้อมใช้ข้ามเครื่อง"
                    : "กำลังวิเคราะห์ข้อมูลที่นำเข้าแล้ว"}
            </strong>
            <small>
              {isSample
                ? "เปิด Extension เพื่อซิงก์ข้อมูลจริง หรือเลือกไฟล์ Full Backup"
                : STATIC_PAGES
                  ? "ข้อมูลเก็บในเบราว์เซอร์นี้ ดาวน์โหลด Full Backup ก่อนย้ายเครื่อง"
                  : "ข้อมูลสินค้าเก็บใน Cloud ส่วนตัวและมีสำเนาในเบราว์เซอร์เพื่อใช้งานต่อเนื่อง"}
            </small>
          </div>
          <button
            onClick={() => {
              setActiveView("import");
              fileInput.current?.click();
            }}
          >
            {isSample ? "นำเข้าข้อมูลจริง" : "อัปเดตไฟล์"}
          </button>
        </div>
        <ConnectorControls />
        {!isSample && (
          <section className="portable-backup-bar">
            <div>
              <strong>Full Backup พร้อมย้ายเครื่องหรือย้ายอีเมล</strong>
              <small>
                รวมฐานสินค้า ประวัติ และ Watchlist พร้อม SHA-256 checksum
              </small>
            </div>
            <button type="button" onClick={() => void exportFullBackup()}>
              ดาวน์โหลด Full Backup
            </button>
          </section>
        )}
        {activeView !== "import" && (
          <div className="filterbar">
            <button
              className={`filter ${period === "7" ? "active" : ""}`}
              onClick={() => setPeriod("7")}
            >
              7 วันล่าสุด
            </button>
            <button
              className={`filter ${period === "30" ? "active" : ""}`}
              onClick={() => setPeriod("30")}
            >
              30 วัน
            </button>
            <button
              className={`filter ${period === "ALL" ? "active" : ""}`}
              onClick={() => setPeriod("ALL")}
            >
              ทั้งหมด
            </button>
            <select
              className="filter select-filter"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="ALL">ทุกหมวดหมู่</option>
              {categories.map((item) => (
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>
            <span className="last-sync">
              อัปเดตล่าสุด{" "}
              {updatedAt ? formatDate(updatedAt) : "ข้อมูลตัวอย่าง"}
            </span>
          </div>
        )}
        {activeView === "import" ? (
          <section className="import-layout">
            <article
              className="panel import-card"
              onDragOver={(event: DragEvent) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                importFile(event.dataTransfer.files[0]);
              }}
            >
              <div className="upload-icon">⇧</div>
              <p className="panel-kicker">EXTENSION DATA</p>
              <h2>วางไฟล์ Intelligence JSON ที่นี่</h2>
              <p>
                ปกติ Extension v0.5 จะซิงก์ให้ทันที ส่วนไฟล์ JSON
                ใช้สำหรับย้ายข้อมูลเก่าหรือสำรองฉุกเฉิน
              </p>
              <input
                ref={fileInput}
                hidden
                type="file"
                accept=".json,application/json"
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  importFile(event.target.files?.[0])
                }
              />
              <button
                className="primary-action"
                onClick={() => fileInput.current?.click()}
              >
                เลือกไฟล์ JSON
              </button>
              {importState.type !== "idle" && (
                <div className={`import-message ${importState.type}`}>
                  {importState.message}
                </div>
              )}
            </article>
            <article className="panel guide-card">
              <p className="panel-kicker">CLOUD BACKUP</p>
              <h2>เปลี่ยนเครื่องก็ใช้ข้อมูลเดิมได้</h2>
              <div className={`cloud-status ${cloudState}`}>
                <i />
                <div>
                  <strong>
                    {cloudState === "ready"
                      ? "Cloud Backup พร้อมใช้งาน"
                      : cloudState === "syncing"
                        ? "กำลังบันทึกข้อมูล"
                        : cloudState === "checking"
                          ? "กำลังตรวจสอบข้อมูล"
                          : "ยังไม่มีข้อมูลสำรองบน Cloud"}
                  </strong>
                  <small>
                    {updatedAt
                      ? `ข้อมูลล่าสุด ${formatDate(updatedAt)}`
                      : "เปิด Extension แล้วสแกนข้อมูลครั้งแรก"}
                  </small>
                </div>
              </div>
              <div className="cloud-actions">
                <button
                  onClick={() =>
                    void saveCloud(
                      {
                        products,
                        updatedAt: updatedAt || new Date().toISOString(),
                      },
                      watchlist,
                    )
                  }
                  disabled={isSample || cloudState === "syncing"}
                >
                  สำรองขึ้น Cloud ตอนนี้
                </button>
                <button
                  onClick={() => void restoreCloud(true)}
                  disabled={cloudState === "syncing"}
                >
                  กู้ข้อมูลจาก Cloud
                </button>
              </div>
              <ol>
                <li>
                  <b>1</b>
                  <div>
                    <strong>สแกนจากเครื่องใดก็ได้</strong>
                    <small>
                      Extension ส่งเฉพาะข้อมูลสินค้า ไม่ส่งรหัสผ่านหรือคุกกี้
                    </small>
                  </div>
                </li>
                <li>
                  <b>2</b>
                  <div>
                    <strong>สำรองอัตโนมัติ</strong>
                    <small>ข้อมูลสินค้าและประวัติถูกเก็บในพื้นที่ส่วนตัว</small>
                  </div>
                </li>
                <li>
                  <b>3</b>
                  <div>
                    <strong>เปิดเว็บบนเครื่องใหม่</strong>
                    <small>เข้าสู่บัญชีเดิมแล้วระบบกู้ข้อมูลให้อัตโนมัติ</small>
                  </div>
                </li>
              </ol>
              <div className="privacy-note">
                🔒 ไม่เก็บรหัสผ่าน, OTP หรือคุกกี้ Shopee
                ข้อมูลผูกกับบัญชีที่ได้รับอนุญาตให้เปิด Dashboard นี้เท่านั้น
              </div>
              {!isSample && (
                <button className="text-button danger" onClick={resetData}>
                  แสดงข้อมูลตัวอย่างในเครื่องนี้
                </button>
              )}
            </article>
          </section>
        ) : activeView === "categories" ? (
          <>
            <section className="metric-grid">
              <Metric
                title="หมวดที่พบ"
                value={String(categories.length)}
                note={`${products.length.toLocaleString("th-TH")} สินค้าทั้งหมด`}
                accent
              />
              <Metric
                title="หมวดโอกาสสูงสุด"
                value={categoryStats[0]?.name || "—"}
                note={`คะแนนเฉลี่ย ${formatNumber(categoryStats[0]?.avgScore || null, 1)}`}
                text
              />
              <Metric
                title="มีข้อมูลประวัติ"
                value={String(stats.withHistory)}
                note="ใช้คำนวณความเร็วขาย"
              />
              <Metric
                title="รายการเฝ้าดู"
                value={String(watchlist.length)}
                note="ซิงก์ข้ามเครื่อง"
              />
            </section>
            <section className="category-grid">
              {categoryStats.map((item, index) => (
                <article
                  className="panel category-card"
                  key={item.name}
                  onClick={() => {
                    setCategory(item.name);
                    setActiveView("ranking");
                  }}
                >
                  <div className="category-rank">#{index + 1}</div>
                  <h2>{item.name}</h2>
                  <div className="category-score">
                    <strong>{Math.round(item.avgScore)}</strong>
                    <span>คะแนนเฉลี่ย</span>
                  </div>
                  <dl>
                    <div>
                      <dt>สินค้า</dt>
                      <dd>{item.count}</dd>
                    </div>
                    <div>
                      <dt>ความเร็วรวม</dt>
                      <dd>{formatNumber(item.velocity)}/วัน</dd>
                    </div>
                    <div>
                      <dt>คอมเฉลี่ย</dt>
                      <dd>{formatNumber(item.avgCommission, 1)}%</dd>
                    </div>
                  </dl>
                  <div className="category-bar">
                    <i style={{ width: `${Math.min(100, item.avgScore)}%` }} />
                  </div>
                </article>
              ))}
            </section>
          </>
        ) : (
          <>
            <section className="metric-grid">
              <Metric
                title="สินค้าที่ติดตาม"
                value={products.length.toLocaleString("th-TH")}
                note={`${categories.length} หมวดหมู่`}
                accent
              />
              <Metric
                title="สินค้าโตไว"
                value={stats.fast.toLocaleString("th-TH")}
                note="↗ อิงการเปลี่ยนยอดขาย"
                positive
              />
              <Metric
                title="ค่าคอมเฉลี่ย"
                value={`${formatNumber(stats.averageCommission, 1)}${stats.averageCommission !== null ? "%" : ""}`}
                note="เฉพาะรายการที่มีข้อมูล"
              />
              <Metric
                title="สินค้าใหม่ / เพิ่งพบ"
                value={stats.recent.toLocaleString("th-TH")}
                note="แยกป้ายยืนยันกับวันที่พบ"
              />
            </section>
            {activeView === "overview" && (
              <section className="analysis-grid">
                <article className="panel trend-panel">
                  <div className="panel-head">
                    <div>
                      <span className="panel-kicker">MARKET MOMENTUM</span>
                      <h2>แนวโน้มยอดขายที่สังเกตได้</h2>
                    </div>
                    <button onClick={() => setActiveView("rising")}>
                      ดูสินค้าโตไว →
                    </button>
                  </div>
                  <div className="chart-wrap">
                    <svg
                      className="trend-chart"
                      viewBox="0 0 720 210"
                      role="img"
                      aria-label="กราฟแนวโน้ม"
                    >
                      <path
                        className="grid-line"
                        d="M0 40H720M0 90H720M0 140H720M0 190H720"
                      />
                      <path
                        className="chart-area"
                        d={`${chartPath} L720 205 L0 205Z`}
                      />
                      <path className="chart-line" d={chartPath} />
                      {chartData.values.map((value, index) => (
                        <circle
                          key={index}
                          cx={index * (720 / (chartData.values.length - 1))}
                          cy={
                            190 -
                            (value / Math.max(...chartData.values, 1)) * 150
                          }
                          r="4"
                        />
                      ))}
                    </svg>
                    <div className="chart-x">
                      {chartData.labels.map((label) => (
                        <span key={label}>{label}</span>
                      ))}
                    </div>
                  </div>
                  <p className="chart-note">
                    กราฟใช้จุดสังเกตจากรอบสแกน
                    หากยังไม่มีประวัติจะใช้ข้อมูลตัวอย่างเพื่ออธิบายรูปแบบ
                  </p>
                </article>
                <article className="panel opportunity-panel">
                  <div className="panel-head">
                    <div>
                      <span className="panel-kicker">OPPORTUNITY MIX</span>
                      <h2>สัญญาณที่น่าจับตา</h2>
                    </div>
                  </div>
                  <div className="opportunity-ring">
                    <div>
                      <strong>
                        {Math.max(
                          ...products.map((item) => item.opportunityScore),
                          0,
                        )}
                      </strong>
                      <span>คะแนนสูงสุด</span>
                    </div>
                  </div>
                  <ul className="signal-list">
                    <li>
                      <span className="signal-dot orange" />
                      <div>
                        <strong>ยอดขายเร่งตัว</strong>
                        <small>มีประวัติและยอดเพิ่ม</small>
                      </div>
                      <b>
                        {
                          products.filter((p) => (p.salesPerDay || 0) > 0)
                            .length
                        }
                      </b>
                    </li>
                    <li>
                      <span className="signal-dot violet" />
                      <div>
                        <strong>คอมสูง + ขายดี</strong>
                        <small>พร้อมทำคอนเทนต์</small>
                      </div>
                      <b>
                        {
                          products.filter(
                            (p) =>
                              p.labels.includes("HIGH_COMMISSION") &&
                              p.labels.includes("BEST_SELLER"),
                          ).length
                        }
                      </b>
                    </li>
                    <li>
                      <span className="signal-dot green" />
                      <div>
                        <strong>เพิ่งพบและโตเร็ว</strong>
                        <small>สัญญาณระยะต้น</small>
                      </div>
                      <b>
                        {
                          products.filter(
                            (p) =>
                              p.labels.includes("FIRST_SEEN") &&
                              (p.salesPerDay || 0) > 0,
                          ).length
                        }
                      </b>
                    </li>
                  </ul>
                </article>
              </section>
            )}
            <Ranking
              activeView={activeView}
              sort={sort}
              setSort={setSort}
              rows={pageRows}
              watchlist={watchlist}
              toggleWatch={toggleWatch}
              setSelected={setSelected}
              exportCsv={exportCsv}
            />
          </>
        )}
      </section>
      {selected && (
        <div className="drawer-backdrop" onClick={() => setSelected(null)}>
          <aside
            className="detail-drawer"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="drawer-close" onClick={() => setSelected(null)}>
              ×
            </button>
            {selected.image ? (
              <img className="detail-image" src={selected.image} alt="" />
            ) : (
              <div className="detail-image fallback">TV</div>
            )}
            <p className="panel-kicker">PRODUCT DETAIL</p>
            <h2>{selected.name}</h2>
            <div className="detail-labels">
              {selected.labels.map((label) => (
                <span key={label}>{labelNames[label] || label}</span>
              ))}
            </div>
            <div className="detail-metrics">
              <MetricMini
                title="คะแนนโอกาส"
                value={String(selected.opportunityScore)}
              />
              <MetricMini
                title="ยอดขาย"
                value={formatNumber(selected.soldCount)}
              />
              <MetricMini
                title="คอมที่แสดง"
                value={`${formatNumber(selected.displayedCommissionRate, 1)}${selected.displayedCommissionRate !== null ? "%" : ""}`}
              />
              <MetricMini
                title="ขายเพิ่ม/วัน"
                value={formatNumber(selected.salesPerDay, 1)}
              />
            </div>
            <ProductAnalysis product={selected} />
            <section className="history-card">
              <div>
                <strong>ประวัติยอดขาย</strong>
                <span>{selected.observationCount} จุดข้อมูล</span>
              </div>
              <div className="history-bars">
                {selected.observations.length ? (
                  selected.observations.slice(-12).map((observation, index) => {
                    const max = Math.max(
                      ...selected.observations.map(
                        (item) => item.soldCount || 0,
                      ),
                      1,
                    );
                    return (
                      <i
                        key={index}
                        style={{
                          height: `${Math.max(8, ((observation.soldCount || 0) / max) * 100)}%`,
                        }}
                        title={`${formatDate(observation.checkedAt || "")} · ${formatNumber(observation.soldCount ?? null)}`}
                      />
                    );
                  })
                ) : (
                  <p>ต้องสแกนอย่างน้อย 2 รอบเพื่อเห็นแนวโน้ม</p>
                )}
              </div>
            </section>
            <dl className="detail-list">
              <div>
                <dt>หมวดหมู่</dt>
                <dd>{selected.categories.join(" › ")}</dd>
              </div>
              <div>
                <dt>พบครั้งแรก</dt>
                <dd>{formatDate(selected.firstSeenAt)}</dd>
              </div>
              <div>
                <dt>พบล่าสุด</dt>
                <dd>{formatDate(selected.lastSeenAt)}</dd>
              </div>
              <div>
                <dt>คอมที่หน้าแสดง</dt>
                <dd>
                  {formatNumber(selected.displayedCommissionRate, 1)}
                  {selected.displayedCommissionRate !== null ? "%" : ""}
                </dd>
              </div>
              <div>
                <dt>Base Commission</dt>
                <dd>
                  {formatNumber(selected.baseCommissionRate ?? null, 1)}
                  {selected.baseCommissionRate != null ? "%" : ""}
                </dd>
              </div>
              <div>
                <dt>Extra Commission</dt>
                <dd>
                  {selected.extraCommissionRate != null
                    ? `${formatNumber(selected.extraCommissionRate, 1)}%`
                    : selected.extraCommissionAvailable
                      ? "มี XTRA · ยังไม่มีตัวเลขแยก"
                      : "—"}
                </dd>
              </div>
              <div>
                <dt>Total Commission</dt>
                <dd>
                  {formatNumber(selected.totalCommissionRate ?? null, 1)}
                  {selected.totalCommissionRate != null ? "%" : ""}
                </dd>
              </div>
              <div>
                <dt>ข้อมูลพิเศษ</dt>
                <dd>
                  {[
                    selected.extraCommissionAvailable ? "XTRA COMM" : "",
                    selected.freeSampleAvailable ? "สินค้าตัวอย่างฟรี" : "",
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </dd>
              </div>
            </dl>
            <div className="drawer-actions">
              <button
                className={`primary-action ${watchlist.includes(selected.id) ? "secondary" : ""}`}
                onClick={() => toggleWatch(selected.id)}
              >
                {watchlist.includes(selected.id)
                  ? "นำออกจาก Watchlist"
                  : "☆ เพิ่มใน Watchlist"}
              </button>
              {selected.productUrl && (
                <a href={selected.productUrl} target="_blank" rel="noreferrer">
                  เปิดหน้าสินค้า ↗
                </a>
              )}
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

function Metric({
  title,
  value,
  note,
  accent = false,
  positive = false,
  text = false,
}: {
  title: string;
  value: string;
  note: string;
  accent?: boolean;
  positive?: boolean;
  text?: boolean;
}) {
  return (
    <article className={`metric-card ${accent ? "accent" : ""}`}>
      <span>{title}</span>
      <strong className={text ? "metric-text" : ""}>{value}</strong>
      <small className={positive ? "positive" : ""}>{note}</small>
    </article>
  );
}
function MetricMini({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}
function ProductAnalysis({ product }: { product: Product }) {
  const { reasons, cautions } = productEvidence(product);
  return (
    <section className="product-analysis" aria-label="การวิเคราะห์สินค้า">
      <div className="analysis-score-line">
        <div>
          <span>DATA ANALYSIS</span>
          <strong>{scoreLabel(product.opportunityScore)}</strong>
        </div>
        <b>{product.opportunityScore}/100</b>
      </div>
      <div className="analysis-copy">
        <div>
          <strong>เหตุผลจากข้อมูล</strong>
          <ul>
            {(reasons.length
              ? reasons
              : ["ยังมีข้อมูลไม่พอสำหรับอธิบายคะแนน"]
            ).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
        {cautions.length > 0 && (
          <div className="analysis-cautions">
            <strong>ข้อควรระวัง</strong>
            <ul>
              {cautions.map((caution) => (
                <li key={caution}>{caution}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <small>คะแนนเปรียบเทียบจากข้อมูลที่สแกน ไม่ใช่การรับประกันยอดขาย</small>
    </section>
  );
}
function Ranking({
  activeView,
  sort,
  setSort,
  rows,
  watchlist,
  toggleWatch,
  setSelected,
  exportCsv,
}: {
  activeView: ViewKey;
  sort: SortKey;
  setSort: (key: SortKey) => void;
  rows: Product[];
  watchlist: string[];
  toggleWatch: (id: string) => void;
  setSelected: (item: Product) => void;
  exportCsv: () => void;
}) {
  return (
    <section className="panel ranking-panel">
      <div className="panel-head ranking-head">
        <div>
          <span className="panel-kicker">
            {activeView === "overview" ? "TOP 10 PRODUCTS" : "PRODUCT RANKING"}
          </span>
          <h2>
            {activeView === "watchlist"
              ? `รายการเฝ้าดู ${watchlist.length} สินค้า`
              : activeView === "new"
                ? "สินค้าใหม่ที่ยืนยันและสินค้าเพิ่งพบ"
                : activeView === "rising"
                  ? "จัดอันดับตามความเร็วการขาย"
                  : "อันดับสินค้าน่าทำคอนเทนต์"}
          </h2>
        </div>
        <div className="ranking-actions">
          <div className="tabs">
            {(Object.keys(sortLabels) as SortKey[]).map((key) => (
              <button
                className={sort === key ? "active" : ""}
                key={key}
                onClick={() => setSort(key)}
              >
                {sortLabels[key]}
              </button>
            ))}
          </div>
          <button className="export-button" onClick={exportCsv}>
            ↓ CSV
          </button>
        </div>
      </div>
      {activeView === "new" && (
        <div className="definition-note">
          <b>สินค้าใหม่</b> = หน้า Shopee แสดงป้ายใหม่จริง · <b>เพิ่งพบ</b> =
          Extension เพิ่งเก็บเข้าฐานข้อมูล ไม่ได้ยืนยันวันเปิดขาย
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>อันดับ</th>
              <th>สินค้า</th>
              <th>หมวดหมู่</th>
              <th>ราคา</th>
              <th>ยอดขาย</th>
              <th>คอมที่แสดง</th>
              <th>XTRA</th>
              <th>ขายเพิ่ม/วัน</th>
              <th>สัญญาณ</th>
              <th>คะแนน</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((product, index) => (
              <tr key={product.id} onClick={() => setSelected(product)}>
                <td>
                  <span
                    className={index < 3 ? `rank rank-${index + 1}` : "rank"}
                  >
                    {index + 1}
                  </span>
                </td>
                <td>
                  <div className="product-cell">
                    {product.image ? (
                      <img src={product.image} alt="" loading="lazy" />
                    ) : (
                      <div className="image-fallback">TV</div>
                    )}
                    <div>
                      <strong>{product.name}</strong>
                      <small>ID {product.id}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="category-chip">
                    {product.categories[0] || "ไม่ทราบหมวด"}
                  </span>
                </td>
                <td>
                  {product.priceText ||
                    `${product.price !== null ? "฿" : ""}${formatNumber(product.price)}`}
                </td>
                <td>{product.soldText || formatNumber(product.soldCount)}</td>
                <td>
                  <b className="commission">
                    {formatNumber(product.displayedCommissionRate, 1)}
                    {product.displayedCommissionRate !== null ? "%" : ""}
                  </b>
                </td>
                <td>
                  {product.extraCommissionAvailable ? (
                    <span className="xtra-state">มี XTRA</span>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>
                  <span
                    className={
                      (product.salesPerDay || 0) > 0 ? "growth" : "muted"
                    }
                  >
                    {product.salesPerDay !== null
                      ? `↗ ${formatNumber(product.salesPerDay, 1)}`
                      : "รอรอบถัดไป"}
                  </span>
                </td>
                <td>
                  <div className="label-stack">
                    {product.labels.slice(0, 2).map((label) => (
                      <span key={label}>{labelNames[label] || label}</span>
                    ))}
                  </div>
                </td>
                <td>
                  <span className="score">{product.opportunityScore}</span>
                </td>
                <td>
                  <button
                    className={`watch-button ${watchlist.includes(product.id) ? "active" : ""}`}
                    aria-label="เพิ่มสินค้าน่าจับตา"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleWatch(product.id);
                    }}
                  >
                    ☆
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <div className="empty-state">
            <strong>ยังไม่มีสินค้าในมุมมองนี้</strong>
            <span>
              {activeView === "watchlist"
                ? "กดดาวที่สินค้าเพื่อเพิ่มเข้ารายการเฝ้าดู"
                : "ลองเปลี่ยนตัวกรองหรืออัปเดตข้อมูลจาก Extension"}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
