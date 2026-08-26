"use client";

import { useEffect, useRef, useState } from "react";

type ConnectorMeta = {
  sentAt?: string | null;
  databaseUpdatedAt?: string | null;
  productCount?: number;
  autoSyncMinutes?: number;
  extensionVersion?: string;
};

const REQUEST = "TALENTVEE_DASHBOARD_REQUEST";
const RESPONSE = "TALENTVEE_DASHBOARD_DATA";
const SETTINGS = "TALENTVEE_DASHBOARD_SETTINGS";
const STATUS = "TALENTVEE_DASHBOARD_STATUS";

function stamp(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("th-TH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function ConnectorControls() {
  const [state, setState] = useState<"checking" | "ready" | "requesting" | "missing" | "empty">("checking");
  const [meta, setMeta] = useState<ConnectorMeta>({});
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== window || event.data?.source !== "talentvee-extension") return;
      if (event.data?.type === RESPONSE) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        const nextMeta = (event.data.meta || {}) as ConnectorMeta;
        setMeta(nextMeta);
        if (typeof nextMeta.autoSyncMinutes === "number") setIntervalMinutes(nextMeta.autoSyncMinutes);
        setState(event.data.payload ? "ready" : "empty");
      }
      if (event.data?.type === STATUS && event.data?.status?.ok) {
        setIntervalMinutes(Number(event.data.status.minutes) || 0);
      }
    };
    window.addEventListener("message", receive);
    window.postMessage({ type: REQUEST, source: "talentvee-dashboard", reason: "controls-mounted" }, window.location.origin);
    timeoutRef.current = setTimeout(() => setState("missing"), 2200);
    return () => {
      window.removeEventListener("message", receive);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function pullNow() {
    setState("requesting");
    window.postMessage({ type: REQUEST, source: "talentvee-dashboard", reason: "manual" }, window.location.origin);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setState("missing"), 2200);
  }

  function changeInterval(value: number) {
    setIntervalMinutes(value);
    window.postMessage({ type: SETTINGS, source: "talentvee-dashboard", minutes: value }, window.location.origin);
  }

  const statusText = state === "ready"
    ? `เชื่อมต่อแล้ว · ${meta.productCount?.toLocaleString("th-TH") || 0} สินค้า`
    : state === "empty"
      ? "เชื่อมต่อแล้ว แต่ยังไม่มีข้อมูลสินค้า"
      : state === "requesting"
        ? "กำลังดึงข้อมูลจาก Connector…"
        : state === "missing"
          ? "ยังไม่พบ Connector รุ่นล่าสุดใน Chrome"
          : "กำลังตรวจ Connector…";

  return (
    <section className={`connector-command ${state}`} aria-label="เชื่อมข้อมูล Shopee Affiliate">
      <div className="connector-summary">
        <span className="connector-dot" />
        <div>
          <p>SHOPEE CONNECTOR {meta.extensionVersion ? `v${meta.extensionVersion}` : ""}</p>
          <strong>{statusText}</strong>
          <small>ข้อมูลสินค้าอัปเดต {stamp(meta.databaseUpdatedAt)} · รับเข้าเว็บ {stamp(meta.sentAt)}</small>
        </div>
      </div>
      <div className="connector-actions">
        <button type="button" onClick={pullNow}>{state === "requesting" ? "กำลังดึง…" : "ดึงข้อมูลจาก Connector"}</button>
        <a href="https://affiliate.shopee.co.th/offer/product_offer" target="_blank" rel="noreferrer">เปิด Shopee Affiliate ↗</a>
        <label>
          <span>ส่งอัตโนมัติ</span>
          <select value={intervalMinutes} onChange={(event) => changeInterval(Number(event.target.value))}>
            <option value="0">ปิด</option>
            <option value="15">ทุก 15 นาที</option>
            <option value="30">ทุก 30 นาที</option>
            <option value="60">ทุก 1 ชั่วโมง</option>
            <option value="180">ทุก 3 ชั่วโมง</option>
            <option value="360">ทุก 6 ชั่วโมง</option>
          </select>
        </label>
      </div>
    </section>
  );
}
