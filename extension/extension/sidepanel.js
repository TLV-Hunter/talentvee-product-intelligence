const AFFILIATE_HOME = 'https://affiliate.shopee.co.th/';
const PRODUCT_OFFERS = 'https://affiliate.shopee.co.th/offer/product_offer';
const AFFILIATE_HOST = 'affiliate.shopee.co.th';
const POLL_MS = 1800;

const ui = {
  version: document.getElementById('versionText'),
  footerVersion: document.getElementById('footerVersion'),
  card: document.getElementById('statusCard'),
  title: document.getElementById('statusTitle'),
  detail: document.getElementById('statusDetail'),
  stepOpen: document.getElementById('stepOpen'),
  stepLogin: document.getElementById('stepLogin'),
  stepReady: document.getElementById('stepReady'),
  connection: document.getElementById('connection'),
  host: document.getElementById('connectedHost'),
  page: document.getElementById('connectedPage'),
  checkedAt: document.getElementById('checkedAt'),
  open: document.getElementById('btnOpen'),
  check: document.getElementById('btnCheck'),
  offers: document.getElementById('btnOffers'),
  intelligence: document.getElementById('intelligence'),
  scanner: document.getElementById('scanner'),
  scan: document.getElementById('btnScan'),
  scanBadge: document.getElementById('scanBadge'),
  scanResult: document.getElementById('scanResult'),
  scanStatus: document.getElementById('scanStatus'),
  scanPageType: document.getElementById('scanPageType'),
  scanCount: document.getElementById('scanCount'),
  scanImageCount: document.getElementById('scanImageCount'),
  scanNote: document.getElementById('scanNote'),
  scanItems: document.getElementById('scanItems'),
  scanCopy: document.getElementById('btnScanCopy'),
  scanCsv: document.getElementById('btnScanCsv'),
  scanJson: document.getElementById('btnScanJson'),
  scanImages: document.getElementById('btnScanImages'),
  diagnostic: document.getElementById('diagnosticText'),
  copy: document.getElementById('btnCopy')
};

let lastResult = { status: 'CHECKING' };
let lastScan = null;
let checkBusy = false;
let scanBusy = false;

const currentVersion = chrome.runtime.getManifest().version;
ui.version.textContent = `v${currentVersion}`;
ui.footerVersion.textContent = `v${currentVersion}`;

function markSteps(open, login, ready) {
  const states = [
    [ui.stepOpen, open],
    [ui.stepLogin, login],
    [ui.stepReady, ready]
  ];
  for (const [node, state] of states) {
    node.classList.toggle('is-active', state === 'active');
    node.classList.toggle('is-done', state === 'done');
  }
}

function display(result) {
  lastResult = result;
  ui.card.dataset.state = result.uiState;
  ui.title.textContent = result.title;
  ui.detail.textContent = result.detail;
  ui.open.textContent = result.openLabel;
  ui.offers.hidden = result.status !== 'CONNECTED';
  ui.connection.hidden = result.status !== 'CONNECTED';
  ui.intelligence.hidden = result.status !== 'CONNECTED';
  ui.scanner.hidden = result.status !== 'CONNECTED';
  ui.diagnostic.textContent = JSON.stringify(result.diagnostic, null, 2);

  if (result.status === 'OUTSIDE') markSteps('active', '', '');
  if (result.status === 'LOGIN_REQUIRED') markSteps('done', 'active', '');
  if (result.status === 'CHECKING') markSteps('done', 'active', '');
  if (result.status === 'CONNECTED') markSteps('done', 'done', 'done');

  if (result.status === 'CONNECTED') {
    ui.host.textContent = result.diagnostic.host || '—';
    ui.page.textContent = result.diagnostic.path || '—';
    ui.checkedAt.textContent = new Date(result.diagnostic.checkedAt).toLocaleTimeString('th-TH');
  }
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

function publicProbe() {
  const bodyText = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
  const path = location.pathname;
  const title = document.title || '';
  const passwordInput = Boolean(document.querySelector('input[type="password"]'));
  const loginForm = Boolean(document.querySelector(
    'form[action*="login" i], form[action*="signin" i], [class*="login" i] input, [class*="signin" i] input'
  ));
  const loginWords = /(เข้าสู่ระบบ|ลงชื่อเข้าใช้|log\s*in|sign\s*in)/i.test(bodyText.slice(0, 5000));
  const authPath = /(login|signin|auth)/i.test(path);

  const appSelectors = [
    '.product-offer-item',
    '.AffiliateItemCard__getlinkBtn',
    '.ItemCard__name',
    'a[href*="/offer/product_offer"]',
    '[class*="ProductOffer"]',
    '[class*="affiliate" i]'
  ];
  const selectorHits = appSelectors.filter((selector) => {
    try { return Boolean(document.querySelector(selector)); } catch { return false; }
  });
  const appWords = /(Product Offer|ข้อเสนอสินค้า|คอมมิชชั่น|commission|Get Link|สร้างลิงก์)/i.test(bodyText);
  const shellWords = /(Shopee Affiliate|Affiliate Program|โปรแกรมแอฟฟิลิเอต)/i.test(bodyText);
  const loginRequired = passwordInput || loginForm || authPath || (loginWords && !appWords);
  const connected = !loginRequired && (selectorHits.length > 0 || appWords || (shellWords && bodyText.length > 300));

  return {
    connected,
    loginRequired,
    readyState: document.readyState,
    title,
    path,
    bodyLength: bodyText.length,
    passwordInput,
    loginForm,
    loginWords,
    appWords,
    shellWords,
    selectorHits
  };
}

async function checkSession({ manual = false } = {}) {
  if (checkBusy) return;
  checkBusy = true;
  ui.check.disabled = true;

  if (manual) {
    display({
      status: 'CHECKING', uiState: 'checking', title: 'กำลังตรวจสอบ…',
      detail: 'กำลังอ่านสถานะจากแท็บที่เปิดอยู่', openLabel: 'เปิด Shopee Affiliate',
      diagnostic: { checkedAt: new Date().toISOString() }
    });
  }

  try {
    const tab = await activeTab();
    let url;
    try { url = new URL(tab?.url || ''); } catch { url = null; }

    if (!tab || !url || url.hostname !== AFFILIATE_HOST) {
      display({
        status: 'OUTSIDE', uiState: 'outside', title: 'ยังไม่ได้เปิด Shopee Affiliate',
        detail: 'กดปุ่มด้านล่างเพื่อเปิดหน้าเข้าสู่ระบบในแท็บใหม่',
        openLabel: 'เปิด Shopee Affiliate',
        diagnostic: {
          status: 'OUTSIDE',
          activeUrl: tab?.url || null,
          checkedAt: new Date().toISOString()
        }
      });
      return;
    }

    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: publicProbe
    });
    const probe = injection?.result || {};
    const diagnostic = {
      status: probe.connected ? 'CONNECTED' : probe.loginRequired ? 'LOGIN_REQUIRED' : 'CHECKING',
      host: url.hostname,
      path: url.pathname,
      checkedAt: new Date().toISOString(),
      page: probe
    };

    if (probe.connected) {
      display({
        status: 'CONNECTED', uiState: 'connected', title: 'เชื่อมบัญชีแล้ว',
        detail: 'ตรวจพบหน้า Shopee Affiliate จาก session ที่ล็อกอินอยู่ใน Chrome',
        openLabel: 'เปิด Shopee Affiliate อีกแท็บ', diagnostic
      });
      await chrome.storage.local.set({ lastConnectedAt: diagnostic.checkedAt, lastConnectedPath: url.pathname });
      return;
    }

    if (probe.loginRequired) {
      display({
        status: 'LOGIN_REQUIRED', uiState: 'login', title: 'กรุณาเข้าสู่ระบบ',
        detail: 'ล็อกอินบนหน้า Shopee ด้วยตัวเอง แล้วกลับมากดตรวจสถานะอีกครั้ง',
        openLabel: 'เปิดหน้าเข้าสู่ระบบ', diagnostic
      });
      return;
    }

    display({
      status: 'CHECKING', uiState: 'checking', title: 'กำลังรอหน้าโหลด',
      detail: 'ยังยืนยัน session ไม่ได้ รอให้หน้าโหลดครบแล้วกดตรวจอีกครั้ง',
      openLabel: 'เปิด Shopee Affiliate', diagnostic
    });
  } catch (error) {
    display({
      status: 'CHECKING', uiState: 'checking', title: 'ยังตรวจสถานะไม่ได้',
      detail: 'รีเฟรชหน้า Shopee Affiliate แล้วลองอีกครั้ง',
      openLabel: 'เปิด Shopee Affiliate',
      diagnostic: {
        status: 'PROBE_ERROR',
        error: String(error?.message || error),
        checkedAt: new Date().toISOString()
      }
    });
  } finally {
    checkBusy = false;
    ui.check.disabled = false;
  }
}

async function openAffiliate() {
  const target = lastResult.status === 'CONNECTED' ? PRODUCT_OFFERS : AFFILIATE_HOME;
  await chrome.tabs.create({ url: target, active: true });
  setTimeout(() => checkSession({ manual: true }), 1200);
}

async function openOffers() {
  const tab = await activeTab();
  if (tab?.id) await chrome.tabs.update(tab.id, { url: PRODUCT_OFFERS, active: true });
  else await chrome.tabs.create({ url: PRODUCT_OFFERS, active: true });
  setTimeout(() => checkSession({ manual: true }), 1400);
}

async function copyDiagnostics() {
  try {
    await navigator.clipboard.writeText(JSON.stringify(lastResult.diagnostic, null, 2));
    const original = ui.copy.textContent;
    ui.copy.textContent = 'คัดลอกแล้ว ✓';
    setTimeout(() => { ui.copy.textContent = original; }, 1200);
  } catch {
    ui.copy.textContent = 'คัดลอกไม่สำเร็จ';
  }
}

function scanFileStamp() {
  const date = new Date();
  const part = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}${part(date.getMonth() + 1)}${part(date.getDate())}-${part(date.getHours())}${part(date.getMinutes())}${part(date.getSeconds())}`;
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function scanRows(scan) {
  if (scan.items?.length) return scan.items;
  if (!scan.detail) return [];
  return [{
    id: scan.detail.itemId,
    name: scan.detail.name,
    priceText: scan.detail.priceText,
    soldText: '',
    displayedCommissionRate: null,
    baseCommissionRate: scan.detail.baseCommissionRate,
    extraCommissionRate: scan.detail.extraCommissionRate,
    totalCommissionRate: scan.detail.totalCommissionRate,
    extraCommissionAvailable: scan.detail.extraCommissionEvidence?.length > 0,
    image: scan.detail.images?.[0] || '',
    productUrl: scan.url,
    pinEligibility: scan.detail.pinEligibility,
    skuCoverage: scan.detail.skuCoverage?.join(' | ') || '',
    source: scan.detail.source
  }];
}

function buildScanCsv(scan) {
  const columns = [
    ['id', 'รหัสสินค้า'],
    ['name', 'ชื่อสินค้า'],
    ['priceText', 'ราคา'],
    ['soldText', 'ยอดขาย'],
    ['displayedCommissionRate', 'ค่าคอมที่หน้าแสดง (%)'],
    ['baseCommissionRate', 'Base Commission (%)'],
    ['extraCommissionRate', 'Extra Commission (%)'],
    ['totalCommissionRate', 'ค่าคอมรวม (%)'],
    ['extraCommissionAvailable', 'มีป้าย Extra Comm'],
    ['image', 'URL รูป'],
    ['productUrl', 'หน้าสินค้า'],
    ['pinEligibility', 'สิทธิ์ปัก Shopee Video'],
    ['skuCoverage', 'SKU ที่ครอบคลุม'],
    ['source', 'แหล่งข้อมูล']
  ];
  const header = columns.map(([, label]) => csvCell(label)).join(',');
  const rows = scanRows(scan).map((row) => columns.map(([key]) => csvCell(row[key])).join(','));
  return '\uFEFF' + [header, ...rows].join('\r\n');
}

function renderScan(scan) {
  lastScan = scan;
  ui.scanResult.hidden = false;
  ui.scanStatus.textContent = scan.status || '—';
  ui.scanPageType.textContent = scan.pageType || '—';
  ui.scanCount.textContent = String(scan.itemCount ?? scanRows(scan).length);
  ui.scanImageCount.textContent = String(scan.imageCount ?? scan.images?.length ?? 0);
  ui.scanBadge.textContent = scan.status === 'AUTHENTICATED' ? 'อ่านได้' : 'ไม่พบฟิลด์';
  ui.scanBadge.className = `scanner__badge ${scan.status === 'AUTHENTICATED' ? 'is-ok' : 'is-error'}`;

  const unavailable = Object.entries(scan.fieldStatus || {})
    .filter(([, status]) => status !== 'AVAILABLE')
    .map(([field]) => field);
  ui.scanNote.textContent = scan.status === 'AUTHENTICATED'
    ? `อ่านจากบัญชีที่ล็อกอินแล้ว · ฟิลด์ที่หน้านี้ไม่แสดง: ${unavailable.join(', ') || 'ไม่มี'}`
    : 'หน้านี้ยังไม่พบข้อมูลสินค้า/ค่าคอมที่อ่านได้ กรุณาเปิดหน้ารวม Product Offer หรือหน้ารายละเอียดสินค้า';

  ui.scanItems.replaceChildren();
  const rows = scanRows(scan).slice(0, 100);
  for (const row of rows) {
    const card = document.createElement('article');
    card.className = 'scan-item';

    if (row.image) {
      const image = document.createElement('img');
      image.src = row.image;
      image.alt = '';
      image.loading = 'lazy';
      card.appendChild(image);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'scan-item__placeholder';
      placeholder.textContent = 'IMG';
      card.appendChild(placeholder);
    }

    const body = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'scan-item__name';
    name.textContent = row.name || '(ไม่มีชื่อ)';

    const meta = document.createElement('div');
    meta.className = 'scan-item__meta';
    const values = [
      row.priceText,
      row.displayedCommissionRate != null ? `คอมหน้าเว็บ ${row.displayedCommissionRate}%` : '',
      row.baseCommissionRate != null ? `Base ${row.baseCommissionRate}%` : '',
      row.extraCommissionRate != null ? `Extra ${row.extraCommissionRate}%` : '',
      row.totalCommissionRate != null ? `รวม ${row.totalCommissionRate}%` : '',
      row.extraCommissionAvailable ? 'EXTRA COMM' : ''
    ].filter(Boolean);
    for (const value of values) {
      const chip = document.createElement('b');
      chip.textContent = value;
      meta.appendChild(chip);
    }
    body.append(name, meta);
    card.appendChild(body);
    ui.scanItems.appendChild(card);
  }
}

async function scanCurrentPage() {
  if (scanBusy) return;
  scanBusy = true;
  ui.scan.disabled = true;
  ui.scan.textContent = 'กำลังสแกน…';
  ui.scanBadge.textContent = 'SCANNING';
  ui.scanBadge.className = 'scanner__badge is-busy';

  try {
    const tab = await activeTab();
    const url = new URL(tab?.url || '');
    if (!tab || url.hostname !== AFFILIATE_HOST) throw new Error('กรุณาเปิดแท็บ Shopee Affiliate ก่อน');

    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['scanner.js']
    });
    const scan = result?.result;
    if (!scan || typeof scan !== 'object') throw new Error('หน้าเว็บไม่คืนผลการสแกน');
    renderScan(scan);
    await chrome.storage.local.set({ lastProductScan: scan });
  } catch (error) {
    renderScan({
      status: 'FIELD_NOT_AVAILABLE',
      pageType: 'ERROR',
      itemCount: 0,
      imageCount: 0,
      items: [],
      images: [],
      fieldStatus: {},
      diagnostic: { error: String(error?.message || error), checkedAt: new Date().toISOString() }
    });
    ui.scanNote.textContent = String(error?.message || error);
  } finally {
    scanBusy = false;
    ui.scan.disabled = false;
    ui.scan.textContent = 'สแกนหน้า Product Offer';
  }
}

async function copyScanJson() {
  if (!lastScan) return;
  await navigator.clipboard.writeText(JSON.stringify(lastScan, null, 2));
  const original = ui.scanCopy.textContent;
  ui.scanCopy.textContent = 'คัดลอกแล้ว ✓';
  setTimeout(() => { ui.scanCopy.textContent = original; }, 1200);
}

async function downloadBlob(content, mimeType, filename) {
  const blobUrl = URL.createObjectURL(new Blob([content], { type: mimeType }));
  await chrome.runtime.sendMessage({ type: 'claim-download-name', url: blobUrl, filename });
  await chrome.downloads.download({ url: blobUrl, filename, saveAs: false });
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
}

async function exportScanCsv() {
  if (!lastScan) return;
  await downloadBlob(buildScanCsv(lastScan), 'text/csv;charset=utf-8', `TalentVee-Shopee-Scan-${scanFileStamp()}.csv`);
}

async function exportScanJson() {
  if (!lastScan) return;
  await downloadBlob(JSON.stringify(lastScan, null, 2), 'application/json;charset=utf-8', `TalentVee-Shopee-Scan-${scanFileStamp()}.json`);
}

function imageExtension(url) {
  const match = String(url).match(/\.(png|jpe?g|webp|gif|avif)(?:[?#]|$)/i);
  return match ? match[1].toLowerCase().replace('jpeg', 'jpg') : 'webp';
}

async function downloadScanImages() {
  if (!lastScan?.images?.length) return;
  ui.scanImages.disabled = true;
  const folder = `TalentVee-Shopee-Images-${scanFileStamp()}`;
  let index = 0;
  for (const imageUrl of lastScan.images.slice(0, 100)) {
    index += 1;
    const itemId = lastScan.detail?.itemId || lastScan.items?.[index - 1]?.id || 'product';
    const filename = `${folder}/${itemId}-${String(index).padStart(2, '0')}.${imageExtension(imageUrl)}`;
    await chrome.runtime.sendMessage({ type: 'claim-download-name', url: imageUrl, filename });
    await chrome.downloads.download({ url: imageUrl, filename, saveAs: false }).catch(() => null);
    ui.scanImages.textContent = `กำลังโหลด ${index}/${Math.min(lastScan.images.length, 100)}`;
  }
  ui.scanImages.textContent = `โหลดแล้ว ${index} รูป`;
  setTimeout(() => {
    ui.scanImages.disabled = false;
    ui.scanImages.textContent = 'โหลดรูปทั้งหมด';
  }, 2000);
}

ui.open.addEventListener('click', openAffiliate);
ui.check.addEventListener('click', () => checkSession({ manual: true }));
ui.offers.addEventListener('click', openOffers);
ui.copy.addEventListener('click', copyDiagnostics);
ui.scan.addEventListener('click', scanCurrentPage);
ui.scanCopy.addEventListener('click', copyScanJson);
ui.scanCsv.addEventListener('click', exportScanCsv);
ui.scanJson.addEventListener('click', exportScanJson);
ui.scanImages.addEventListener('click', downloadScanImages);

checkSession({ manual: true });
setInterval(() => checkSession(), POLL_MS);

chrome.storage.local.get('lastProductScan').then(({ lastProductScan }) => {
  if (lastProductScan) renderScan(lastProductScan);
});
