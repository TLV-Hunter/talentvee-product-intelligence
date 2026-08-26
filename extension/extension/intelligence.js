(() => {
  const HOST = 'affiliate.shopee.co.th';
  const DB_KEY = 'talentVeeProductIntelligence';
  const RUN_KEY = 'talentVeeLastProcessedRun';
  const TAB_KEY = 'talentVeeCrawlerTabId';
  const POLL_MS = 650;
  const MAX_HISTORY = 30;
  const APP_VERSION = chrome.runtime.getManifest().version;
  const CONFIG = globalThis.TalentVeeConfig || {};
  const DASHBOARD_URL = CONFIG.dashboardUrl || 'https://tlv-hunter.github.io/talentvee-product-intelligence/';
  const CLOUD_SYNC_ENABLED = CONFIG.cloudSyncEnabled !== false;
  const BACKUP_FORMAT = CONFIG.backupFormat || 'talentvee-full-backup';
  const BACKUP_VERSION = Number(CONFIG.backupVersion) || 1;

  const $ = (id) => document.getElementById(id);
  const ui = {
    section: $('intelligence'),
    badge: $('intelBadge'),
    options: $('intelOptions'),
    allCategories: $('intelAllCategories'),
    pageLimit: $('intelPageLimit'),
    delay: $('intelDelay'),
    start: $('btnIntelStart'),
    stop: $('btnIntelStop'),
    progress: $('intelProgress'),
    progressFill: $('intelProgressFill'),
    progressText: $('intelProgressText'),
    progressSub: $('intelProgressSub'),
    categoryNames: $('intelCategoryNames'),
    dashboard: $('intelDashboard'),
    productCount: $('intelProductCount'),
    categoryCount: $('intelCategoryCount'),
    historyCount: $('intelHistoryCount'),
    lastChecked: $('intelLastChecked'),
    disclaimer: $('intelDisclaimer'),
    search: $('intelSearch'),
    category: $('intelCategory'),
    group: $('intelGroup'),
    sort: $('intelSort'),
    resultCount: $('intelResultCount'),
    items: $('intelItems'),
    csv: $('btnIntelCsv'),
    json: $('btnIntelJson'),
    importMerge: $('btnIntelImportMerge'),
    importReplace: $('btnIntelImportReplace'),
    importFile: $('intelImportFile'),
    backupStatus: $('intelBackupStatus'),
    images: $('btnIntelImages'),
    web: $('btnIntelWeb'),
    autoSync: $('autoSyncMinutes'),
    syncNow: $('btnSyncNow'),
    lastSync: $('lastDashboardSync')
  };

  let tabId = null;
  let pollTimer = null;
  let rows = [];
  let database = emptyDatabase();
  let processing = false;

  function emptyDatabase() {
    return { schemaVersion: 1, products: {}, runs: [], updatedAt: null };
  }

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function scanStamp() {
    const date = new Date();
    const part = (number) => String(number).padStart(2, '0');
    return `${date.getFullYear()}${part(date.getMonth() + 1)}${part(date.getDate())}-${part(date.getHours())}${part(date.getMinutes())}${part(date.getSeconds())}`;
  }

  function csvCell(value) {
    const string = value == null ? '' : String(value);
    return /[",\n\r]/.test(string) ? `"${string.replace(/"/g, '""')}"` : string;
  }

  async function downloadBlob(content, mimeType, filename) {
    const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
    await chrome.runtime.sendMessage({ type: 'claim-download-name', url, filename });
    await chrome.downloads.download({ url, filename, saveAs: false });
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  async function resolveActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let url;
    try { url = new URL(tab?.url || ''); } catch { url = null; }
    if (!tab?.id || url?.hostname !== HOST || !url.pathname.startsWith('/offer/product_offer')) {
      throw new Error('กรุณาเปิดหน้า Product Offer ในแท็บ Shopee ก่อน');
    }
    tabId = tab.id;
    await chrome.storage.local.set({ [TAB_KEY]: tabId });
    return tab;
  }

  async function injectCrawler() {
    if (tabId == null) throw new Error('ไม่พบแท็บ Shopee ที่ใช้สแกน');
    await chrome.scripting.executeScript({ target: { tabId }, files: ['crawler.js'] });
  }

  async function callCrawler(name, args = []) {
    if (tabId == null) throw new Error('ไม่พบแท็บ Shopee ที่ใช้สแกน');
    const invoke = async () => {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId },
        func: (functionName, functionArgs) => {
          const target = window[functionName];
          if (typeof target !== 'function') return { ok: false };
          try { return { ok: true, value: target(...functionArgs) }; }
          catch (error) { return { ok: false, error: String(error?.message || error) }; }
        },
        args: [name, args]
      });
      return result?.result;
    };

    let output = await invoke();
    if (!output?.ok) {
      await injectCrawler();
      output = await invoke();
    }
    if (!output?.ok) throw new Error(output?.error || 'เชื่อมตัวสแกนในหน้า Shopee ไม่สำเร็จ');
    return output.value;
  }

  function setBadge(label, state = '') {
    ui.badge.textContent = label;
    ui.badge.className = `scanner__badge${state ? ` ${state}` : ''}`;
  }

  function setRunning(running) {
    ui.start.hidden = running;
    ui.stop.hidden = !running;
    ui.options.hidden = running;
    ui.progress.hidden = !running;
    if (running) setBadge('SCANNING', 'is-busy');
  }

  function renderProgress(snapshot) {
    const total = Math.max(1, snapshot.categoryTotal || 1);
    const currentCategory = Math.max(1, snapshot.categoryIndex || 1);
    const pageLimit = Math.max(1, snapshot.pageLimit || 50);
    const pageFraction = Math.min(1, Math.max(0, (snapshot.page || 0) / pageLimit));
    const percent = Math.min(98, (((currentCategory - 1) + pageFraction) / total) * 100);
    ui.progressFill.style.width = `${percent.toFixed(1)}%`;
    ui.progressText.textContent = snapshot.step || 'กำลังสแกน…';
    ui.progressSub.textContent = `หมวด ${currentCategory}/${total} · พบไม่ซ้ำ ${snapshot.uniqueCount || 0} · อ่าน ${snapshot.scannedCards || 0} การ์ด · retry ${snapshot.retryCount || 0}`;
    const names = snapshot.detectedCategories?.length ? snapshot.detectedCategories : snapshot.categories;
    if (ui.categoryNames) ui.categoryNames.textContent = names?.length
      ? `พบ ${names.length} หมวด: ${names.join(' · ')}`
      : 'กำลังตรวจรายชื่อหมวดทั้งหมด…';
  }

  function stopPolling() {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  function startPolling() {
    stopPolling();
    pollTimer = setInterval(async () => {
      try {
        const snapshot = await callCrawler('talentVeeCrawlerRead');
        if (!snapshot) throw new Error('งานสแกนหายไป อาจมีการรีเฟรชแท็บ Shopee');
        renderProgress(snapshot);
        if (snapshot.status === 'running') return;
        stopPolling();
        setRunning(false);
        await finishSnapshot(snapshot);
      } catch (error) {
        stopPolling();
        setRunning(false);
        setBadge('ERROR', 'is-error');
        ui.progress.hidden = false;
        ui.progressText.textContent = String(error?.message || error);
        ui.progressSub.textContent = 'เปิดหน้า Product Offer แล้วเริ่มใหม่ได้';
      }
    }, POLL_MS);
  }

  async function startScan() {
    if (processing) return;
    try {
      await resolveActiveTab();
      await injectCrawler();
      await callCrawler('talentVeeCrawlerClear');
      const options = {
        allCategories: ui.allCategories.checked,
        pageLimit: Number(ui.pageLimit.value) || 50,
        delayMs: Number(ui.delay.value) || 3500,
        retryLimit: 3
      };
      const snapshot = await callCrawler('talentVeeCrawlerStart', [options]);
      setRunning(true);
      renderProgress(snapshot);
      startPolling();
    } catch (error) {
      setRunning(false);
      setBadge('เริ่มไม่ได้', 'is-error');
      ui.progress.hidden = false;
      ui.progressText.textContent = String(error?.message || error);
      ui.progressSub.textContent = 'ต้องเปิดหน้า affiliate.shopee.co.th/offer/product_offer';
    }
  }

  async function stopScan() {
    ui.stop.disabled = true;
    try {
      const snapshot = await callCrawler('talentVeeCrawlerStop');
      if (snapshot) renderProgress(snapshot);
      ui.progressText.textContent = 'กำลังหยุดและเก็บข้อมูลที่สแกนได้…';
    } catch (error) {
      ui.progressText.textContent = String(error?.message || error);
    } finally {
      ui.stop.disabled = false;
    }
  }

  function quantile(values, percentile) {
    const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
    if (!sorted.length) return null;
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * percentile) - 1));
    return sorted[index];
  }

  function metricFor(record) {
    const observations = Array.isArray(record.observations) ? record.observations : [];
    const latest = observations.at(-1) || {};
    const previous = observations.at(-2) || null;
    const elapsedHours = previous ? (new Date(latest.checkedAt) - new Date(previous.checkedAt)) / 3600000 : null;
    const canCompare = Boolean(previous && elapsedHours > 0 && latest.soldCount != null && previous.soldCount != null);
    const deltaSold = canCompare ? Math.max(0, latest.soldCount - previous.soldCount) : null;
    const salesPerDay = canCompare ? (deltaSold / elapsedHours) * 24 : null;
    return {
      ...record.latest,
      firstSeenAt: record.firstSeenAt,
      lastSeenAt: record.lastSeenAt,
      observationCount: observations.length,
      hasHistory: canCompare,
      deltaSold,
      salesPerDay,
      previousSoldCount: previous?.soldCount ?? null,
      latestCheckedAt: latest.checkedAt || record.lastSeenAt,
      labels: [],
      opportunityScore: 0
    };
  }

  function classify(productRows) {
    const categoryBuckets = new Map();
    for (const row of productRows) {
      for (const category of row.categories || ['ไม่ทราบหมวด']) {
        if (!categoryBuckets.has(category)) categoryBuckets.set(category, []);
        categoryBuckets.get(category).push(row);
      }
    }

    const thresholds = new Map();
    for (const [category, bucket] of categoryBuckets) {
      thresholds.set(category, {
        best: quantile(bucket.map((row) => row.soldCount), 0.8),
        rising: quantile(bucket.map((row) => row.salesPerDay), 0.6),
        trending: quantile(bucket.map((row) => row.salesPerDay), 0.8)
      });
    }

    const highCommission = quantile(productRows.map((row) => row.displayedCommissionRate), 0.75);
    const maxLogSold = Math.max(1, ...productRows.map((row) => Math.log10((row.soldCount || 0) + 1)));
    const maxVelocity = Math.max(1, ...productRows.map((row) => row.salesPerDay || 0));
    const now = Date.now();

    for (const row of productRows) {
      const rowThresholds = (row.categories || []).map((category) => thresholds.get(category)).filter(Boolean);
      const bestSeller = row.soldCount > 0 && rowThresholds.some((threshold) => threshold.best != null && row.soldCount >= threshold.best);
      const rising = row.hasHistory && row.deltaSold > 0 && rowThresholds.some((threshold) => threshold.rising != null && row.salesPerDay >= threshold.rising);
      const trending = row.hasHistory && row.deltaSold > 0 && rowThresholds.some((threshold) => threshold.trending != null && row.salesPerDay >= threshold.trending);
      const firstSeenRecently = now - new Date(row.firstSeenAt).getTime() <= 3 * 86400000;
      const highComm = highCommission != null && row.displayedCommissionRate != null && row.displayedCommissionRate >= highCommission;

      if (bestSeller) row.labels.push('BEST_SELLER');
      if (rising) row.labels.push('RISING');
      if (trending) row.labels.push('TRENDING');
      if (row.newBadgeAvailable) row.labels.push('NEW_CONFIRMED');
      else if (firstSeenRecently) row.labels.push('FIRST_SEEN');
      if (highComm) row.labels.push('HIGH_COMMISSION');
      if (row.extraCommissionAvailable) row.labels.push('EXTRA_COMM');

      const soldScore = Math.log10((row.soldCount || 0) + 1) / maxLogSold;
      const commissionScore = Math.min(1, (row.displayedCommissionRate || 0) / 80);
      const velocityScore = Math.min(1, (row.salesPerDay || 0) / maxVelocity);
      row.opportunityScore = Math.round((soldScore * 40) + (commissionScore * 30) + (velocityScore * 25) + (row.extraCommissionAvailable ? 5 : 0));
    }
    return productRows;
  }

  async function loadDatabase() {
    const stored = await chrome.storage.local.get(DB_KEY);
    const value = stored[DB_KEY];
    database = value && typeof value === 'object' ? value : emptyDatabase();
    if (!database.products) database.products = {};
    if (!Array.isArray(database.runs)) database.runs = [];
    rows = classify(Object.values(database.products).map(metricFor));
    renderDashboard();
  }

  async function saveSnapshot(snapshot) {
    const checkedAt = snapshot.finishedAt || new Date().toISOString();
    const items = Array.isArray(snapshot.items) ? snapshot.items : [];
    const stored = await chrome.storage.local.get(DB_KEY);
    database = stored[DB_KEY] && typeof stored[DB_KEY] === 'object' ? stored[DB_KEY] : emptyDatabase();
    if (!database.products) database.products = {};
    if (!Array.isArray(database.runs)) database.runs = [];

    for (const item of items) {
      const key = item.id || `${item.name}|${item.priceText}`;
      const record = database.products[key] || {
        id: item.id || key,
        firstSeenAt: checkedAt,
        lastSeenAt: checkedAt,
        latest: {},
        observations: []
      };
      record.lastSeenAt = checkedAt;
      record.latest = { ...item };
      record.observations = Array.isArray(record.observations) ? record.observations : [];
      if (record.observations.at(-1)?.checkedAt !== checkedAt) {
        record.observations.push({
          checkedAt,
          soldCount: item.soldCount,
          soldText: item.soldText,
          price: item.price,
          displayedCommissionRate: item.displayedCommissionRate,
          categories: item.categories,
          categoryRanks: item.categoryRanks
        });
        record.observations = record.observations.slice(-MAX_HISTORY);
      }
      database.products[key] = record;
    }

    database.runs.push({
      startedAt: snapshot.startedAt,
      finishedAt: checkedAt,
      status: snapshot.status,
      uniqueCount: items.length,
      scannedCards: snapshot.scannedCards,
      categories: snapshot.categories,
      detectedCategories: snapshot.detectedCategories,
      warnings: snapshot.warnings
    });
    database.runs = database.runs.slice(-60);
    database.lastCategoryCoverage = {
      detected: snapshot.detectedCategories || snapshot.categories || [],
      scanned: snapshot.categories || [],
      warningCount: snapshot.warnings?.length || 0,
      checkedAt
    };
    database.updatedAt = checkedAt;
    await chrome.storage.local.set({ [DB_KEY]: database, [RUN_KEY]: snapshot.startedAt });
    rows = classify(Object.values(database.products).map(metricFor));
  }

  async function finishSnapshot(snapshot) {
    if (processing) return;
    processing = true;
    try {
      const stored = await chrome.storage.local.get(RUN_KEY);
      if (snapshot.startedAt && stored[RUN_KEY] !== snapshot.startedAt && snapshot.items?.length) {
        await saveSnapshot(snapshot);
      } else {
        await loadDatabase();
      }
      ui.progressFill.style.width = '100%';
      ui.progress.hidden = false;
      ui.progressText.textContent = snapshot.status === 'cancelled' ? 'หยุดแล้ว และบันทึกผลบางส่วน' : snapshot.status === 'error' ? 'งานจบพร้อมข้อผิดพลาดบางส่วน' : 'สแกนและจัดอันดับเสร็จแล้ว';
      ui.progressSub.textContent = `ไม่ซ้ำ ${snapshot.items?.length || 0} รายการ · ${snapshot.categories?.length || 0} หมวด${snapshot.warnings?.length ? ` · คำเตือน ${snapshot.warnings.length}` : ''}`;
      setBadge(snapshot.status === 'done' ? 'READY' : 'PARTIAL', snapshot.status === 'done' ? 'is-ok' : 'is-error');
      renderDashboard();
      if (CLOUD_SYNC_ENABLED) {
        const syncResult = await chrome.runtime.sendMessage({ type: 'sync-now', source: 'scan-complete' }).catch(() => null);
        if (syncResult?.ok) renderSyncStatus({ lastSyncAt: syncResult.at });
      } else if (ui.lastSync) {
        ui.lastSync.textContent = 'บันทึกใน Connector แล้ว · เปิดเว็บเพื่อส่งข้อมูล';
      }
    } finally {
      processing = false;
    }
  }

  function populateCategories() {
    const current = ui.category.value;
    const categories = [...new Set(rows.flatMap((row) => row.categories || []))].sort((a, b) => a.localeCompare(b, 'th'));
    ui.category.replaceChildren();
    const all = document.createElement('option');
    all.value = 'ALL';
    all.textContent = 'ทุกหมวด';
    ui.category.appendChild(all);
    for (const category of categories) {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      ui.category.appendChild(option);
    }
    ui.category.value = categories.includes(current) ? current : 'ALL';
    return categories;
  }

  const labelNames = {
    BEST_SELLER: 'ขายดี',
    RISING: 'กำลังโต',
    TRENDING: 'มาแรง',
    NEW_CONFIRMED: 'สินค้าใหม่',
    FIRST_SEEN: 'เพิ่งพบ',
    HIGH_COMMISSION: 'คอมสูง',
    EXTRA_COMM: 'XTRA COMM'
  };

  function filteredRows() {
    const query = clean(ui.search.value).toLocaleLowerCase('th');
    const category = ui.category.value;
    const group = ui.group.value;
    const filtered = rows.filter((row) => {
      if (query && !`${row.name} ${row.id}`.toLocaleLowerCase('th').includes(query)) return false;
      if (category !== 'ALL' && !(row.categories || []).includes(category)) return false;
      if (group === 'NEW' && !row.labels.some((label) => label === 'NEW_CONFIRMED' || label === 'FIRST_SEEN')) return false;
      if (group !== 'ALL' && group !== 'NEW' && !row.labels.includes(group)) return false;
      return true;
    });

    const comparators = {
      opportunity: (a, b) => b.opportunityScore - a.opportunityScore,
      sold: (a, b) => (b.soldCount || 0) - (a.soldCount || 0),
      velocity: (a, b) => (b.salesPerDay || 0) - (a.salesPerDay || 0),
      commission: (a, b) => (b.displayedCommissionRate || 0) - (a.displayedCommissionRate || 0),
      firstSeen: (a, b) => new Date(b.firstSeenAt) - new Date(a.firstSeenAt)
    };
    return filtered.sort(comparators[ui.sort.value] || comparators.opportunity);
  }

  function renderItems() {
    const selected = filteredRows();
    ui.resultCount.textContent = `${selected.length.toLocaleString('th-TH')} รายการ`;
    ui.items.replaceChildren();
    const fragment = document.createDocumentFragment();

    for (const row of selected.slice(0, 300)) {
      const card = document.createElement('article');
      card.className = 'scan-item intel-item';

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
        row.soldText || (row.soldCount != null ? `ขาย ${row.soldCount}` : ''),
        row.displayedCommissionRate != null ? `คอม ${row.displayedCommissionRate}%` : '',
        row.hasHistory ? `เพิ่ม ${row.deltaSold || 0} · ${Math.round(row.salesPerDay || 0)}/วัน` : ''
      ].filter(Boolean);
      for (const value of values) {
        const chip = document.createElement('b');
        chip.textContent = value;
        meta.appendChild(chip);
      }

      const labels = document.createElement('div');
      labels.className = 'intel-labels';
      for (const label of row.labels) {
        const badge = document.createElement('span');
        badge.textContent = labelNames[label] || label;
        if (label === 'EXTRA_COMM') badge.className = 'is-extra';
        if (['RISING', 'TRENDING'].includes(label)) badge.className = 'is-history';
        labels.appendChild(badge);
      }
      body.append(name, meta, labels);

      const score = document.createElement('div');
      score.className = 'intel-score';
      score.title = 'คะแนนโอกาสจากยอดขาย ค่าคอม ความเร็วการขาย และ XTRA COMM';
      score.textContent = String(row.opportunityScore);
      card.append(body, score);
      fragment.appendChild(card);
    }
    ui.items.appendChild(fragment);
  }

  function renderDashboard() {
    if (!rows.length) {
      ui.dashboard.hidden = true;
      return;
    }
    ui.dashboard.hidden = false;
    const categories = populateCategories();
    const historyCount = rows.filter((row) => row.hasHistory).length;
    ui.productCount.textContent = rows.length.toLocaleString('th-TH');
    ui.categoryCount.textContent = categories.length.toLocaleString('th-TH');
    ui.historyCount.textContent = historyCount.toLocaleString('th-TH');
    ui.lastChecked.textContent = database.updatedAt ? new Date(database.updatedAt).toLocaleString('th-TH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
    ui.disclaimer.textContent = historyCount
      ? 'กำลังโต/มาแรงคำนวณจากยอดขายที่เปลี่ยนระหว่างรอบสแกน ส่วน “เพิ่งพบ” หมายถึงเพิ่งพบในฐานข้อมูลนี้ ไม่ยืนยันวันเปิดขาย'
      : 'รอบแรกจัดกลุ่มขายดีและค่าคอมสูงได้ทันที ส่วนกำลังโต/มาแรงต้องสแกนซ้ำภายหลังอย่างน้อยอีก 1 รอบ';
    renderItems();
  }

  function buildCsv() {
    const columns = [
      ['id', 'รหัสสินค้า'], ['name', 'ชื่อสินค้า'], ['categoriesText', 'หมวดหมู่'],
      ['price', 'ราคา'], ['priceText', 'ราคาแสดง'], ['soldCount', 'ยอดขายตัวเลข'], ['soldText', 'ยอดขายแสดง'],
      ['displayedCommissionRate', 'ค่าคอมที่หน้าแสดง (%)'], ['extraCommissionAvailable', 'XTRA COMM'],
      ['freeSampleAvailable', 'รับสินค้ารีวิวฟรี'], ['opportunityScore', 'คะแนนโอกาส'],
      ['labelsText', 'กลุ่มวิเคราะห์'], ['deltaSold', 'ยอดขายเพิ่มจากรอบก่อน'], ['salesPerDay', 'ความเร็วขายต่อวัน'],
      ['observationCount', 'จำนวนรอบข้อมูล'], ['firstSeenAt', 'พบครั้งแรก'], ['lastSeenAt', 'พบล่าสุด'],
      ['image', 'URL รูป'], ['productUrl', 'หน้าสินค้า'], ['source', 'แหล่งข้อมูล']
    ];
    const output = rows.map((row) => ({
      ...row,
      categoriesText: (row.categories || []).join(' | '),
      labelsText: row.labels.map((label) => labelNames[label] || label).join(' | '),
      salesPerDay: row.salesPerDay == null ? null : Number(row.salesPerDay.toFixed(2))
    }));
    const header = columns.map(([, label]) => csvCell(label)).join(',');
    const body = output.map((row) => columns.map(([key]) => csvCell(row[key])).join(','));
    return '\uFEFF' + [header, ...body].join('\r\n');
  }

  async function exportCsv() {
    if (!rows.length) return;
    await downloadBlob(buildCsv(), 'text/csv;charset=utf-8', `TalentVee-Shopee-Intelligence-${scanStamp()}.csv`);
  }

  async function exportJson() {
    if (!rows.length) return;
    await exportFullBackup('manual');
  }

  async function sha256Hex(value) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  async function buildFullBackup(databaseValue = database) {
    const stored = await chrome.storage.local.get([
      'talentVeeWatchlist',
      'talentVeeAutoSyncMinutes',
      'lastProductScan'
    ]);
    const data = {
      productIntelligence: databaseValue,
      watchlist: Array.isArray(stored.talentVeeWatchlist) ? stored.talentVeeWatchlist.map(String) : [],
      preferences: {
        autoSyncMinutes: Number(stored.talentVeeAutoSyncMinutes) || 0
      },
      lastProductScan: stored.lastProductScan || null
    };
    return {
      format: BACKUP_FORMAT,
      backupVersion: BACKUP_VERSION,
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      source: 'chrome-extension',
      data,
      checksum: {
        algorithm: 'SHA-256',
        value: await sha256Hex(JSON.stringify(data))
      }
    };
  }

  async function exportFullBackup(reason = 'manual') {
    const payload = await buildFullBackup();
    const suffix = reason === 'pre-import' ? 'Before-Import' : 'Full-Backup';
    await downloadBlob(JSON.stringify(payload, null, 2), 'application/json;charset=utf-8', `TalentVee-${suffix}-${scanStamp()}.json`);
    if (ui.backupStatus) ui.backupStatus.textContent = `สำรองครบแล้ว ${Object.keys(database.products || {}).length.toLocaleString('th-TH')} สินค้า · SHA-256`;
    return payload;
  }

  function validDatabase(value) {
    return Boolean(value && typeof value === 'object' && value.products && typeof value.products === 'object' && !Array.isArray(value.products));
  }

  async function extractBackup(payload) {
    if (!payload || typeof payload !== 'object') throw new Error('รูปแบบไฟล์ไม่ถูกต้อง');
    if (payload.format === BACKUP_FORMAT) {
      if (Number(payload.backupVersion) > BACKUP_VERSION) throw new Error('ไฟล์ Backup มาจากรุ่นใหม่กว่าที่ Extension นี้รองรับ');
      if (!payload.data || !validDatabase(payload.data.productIntelligence)) throw new Error('ไม่พบฐานข้อมูลสินค้าใน Full Backup');
      if (payload.checksum?.value) {
        const actual = await sha256Hex(JSON.stringify(payload.data));
        if (actual !== payload.checksum.value) throw new Error('Checksum ไม่ตรงกัน ไฟล์อาจเสียหายหรือถูกแก้ไข');
      }
      return {
        database: payload.data.productIntelligence,
        watchlist: Array.isArray(payload.data.watchlist) ? payload.data.watchlist.map(String) : [],
        preferences: payload.data.preferences || {},
        lastProductScan: payload.data.lastProductScan || null,
        legacy: false
      };
    }
    if (validDatabase(payload.database)) {
      return { database: payload.database, watchlist: [], preferences: {}, lastProductScan: null, legacy: true };
    }
    throw new Error('ไม่พบฐานข้อมูลสินค้าในไฟล์นี้');
  }

  function timeValue(value) {
    const stamp = new Date(value || 0).getTime();
    return Number.isFinite(stamp) ? stamp : 0;
  }

  function mergeDatabase(existingValue, incomingValue) {
    const existing = validDatabase(existingValue) ? existingValue : emptyDatabase();
    const incoming = validDatabase(incomingValue) ? incomingValue : emptyDatabase();
    const output = JSON.parse(JSON.stringify(existing));
    output.products = output.products || {};
    let imported = 0;
    let merged = 0;
    let skipped = 0;

    for (const [key, rawRecord] of Object.entries(incoming.products || {})) {
      if (!rawRecord || typeof rawRecord !== 'object') {
        skipped += 1;
        continue;
      }
      const record = JSON.parse(JSON.stringify(rawRecord));
      const current = output.products[key];
      if (!current) {
        output.products[key] = record;
        imported += 1;
        continue;
      }

      const observations = [...(Array.isArray(current.observations) ? current.observations : []), ...(Array.isArray(record.observations) ? record.observations : [])];
      const unique = new Map();
      for (const observation of observations) {
        if (!observation || typeof observation !== 'object') continue;
        const observationKey = `${observation.checkedAt || ''}|${observation.soldCount ?? ''}|${observation.price ?? ''}|${observation.displayedCommissionRate ?? ''}`;
        unique.set(observationKey, observation);
      }
      const incomingIsNewer = timeValue(record.lastSeenAt) >= timeValue(current.lastSeenAt);
      output.products[key] = {
        ...(incomingIsNewer ? current : record),
        ...(incomingIsNewer ? record : current),
        id: record.id || current.id || key,
        firstSeenAt: timeValue(record.firstSeenAt) && (!timeValue(current.firstSeenAt) || timeValue(record.firstSeenAt) < timeValue(current.firstSeenAt)) ? record.firstSeenAt : current.firstSeenAt,
        lastSeenAt: incomingIsNewer ? record.lastSeenAt : current.lastSeenAt,
        latest: incomingIsNewer ? (record.latest || current.latest) : (current.latest || record.latest),
        observations: [...unique.values()].sort((a, b) => timeValue(a.checkedAt) - timeValue(b.checkedAt)).slice(-MAX_HISTORY)
      };
      merged += 1;
    }

    const runMap = new Map();
    for (const run of [...(Array.isArray(existing.runs) ? existing.runs : []), ...(Array.isArray(incoming.runs) ? incoming.runs : [])]) {
      if (!run || typeof run !== 'object') continue;
      runMap.set(`${run.startedAt || ''}|${run.finishedAt || ''}`, run);
    }
    output.runs = [...runMap.values()].sort((a, b) => timeValue(a.finishedAt || a.startedAt) - timeValue(b.finishedAt || b.startedAt)).slice(-60);
    output.updatedAt = timeValue(incoming.updatedAt) >= timeValue(existing.updatedAt) ? incoming.updatedAt : existing.updatedAt;
    output.schemaVersion = Math.max(Number(existing.schemaVersion) || 1, Number(incoming.schemaVersion) || 1);
    if (timeValue(incoming.lastCategoryCoverage?.checkedAt) >= timeValue(existing.lastCategoryCoverage?.checkedAt)) {
      output.lastCategoryCoverage = incoming.lastCategoryCoverage;
    }
    return { database: output, imported, merged, skipped, failed: 0 };
  }

  function chooseImport(mode) {
    ui.importFile.dataset.mode = mode;
    ui.importFile.value = '';
    ui.importFile.click();
  }

  async function importBackupFile(file, mode) {
    if (!file) return;
    if (ui.backupStatus) ui.backupStatus.textContent = 'กำลังตรวจไฟล์ Backup…';
    try {
      const payload = JSON.parse(await file.text());
      const incoming = await extractBackup(payload);
      const incomingCount = Object.keys(incoming.database.products || {}).length;
      const currentCount = Object.keys(database.products || {}).length;
      const actionText = mode === 'replace' ? 'แทนที่ฐานข้อมูลปัจจุบัน' : 'รวมกับฐานข้อมูลปัจจุบัน';
      if (!window.confirm(`ตรวจพบ ${incomingCount.toLocaleString('th-TH')} สินค้า\nต้องการ${actionText}หรือไม่?`)) {
        if (ui.backupStatus) ui.backupStatus.textContent = 'ยกเลิกการนำเข้าแล้ว';
        return;
      }

      let report;
      let nextDatabase;
      const currentStored = await chrome.storage.local.get(['talentVeeWatchlist', 'lastProductScan']);
      if (mode === 'replace') {
        if (currentCount) await exportFullBackup('pre-import');
        nextDatabase = incoming.database;
        report = { imported: incomingCount, merged: 0, skipped: 0, failed: 0 };
      } else {
        const result = mergeDatabase(database, incoming.database);
        nextDatabase = result.database;
        report = result;
      }

      const currentWatchlist = Array.isArray(currentStored.talentVeeWatchlist) ? currentStored.talentVeeWatchlist.map(String) : [];
      const nextWatchlist = mode === 'replace' ? incoming.watchlist : [...new Set([...currentWatchlist, ...incoming.watchlist])];
      const changes = {
        [DB_KEY]: nextDatabase,
        talentVeeWatchlist: nextWatchlist
      };
      if (incoming.lastProductScan && (mode === 'replace' || !currentStored.lastProductScan)) changes.lastProductScan = incoming.lastProductScan;
      await chrome.storage.local.set(changes);
      if (mode === 'replace' && Number.isFinite(Number(incoming.preferences.autoSyncMinutes))) {
        await chrome.runtime.sendMessage({ type: 'set-auto-sync', minutes: Number(incoming.preferences.autoSyncMinutes) || 0 });
      }
      await loadDatabase();
      if (ui.backupStatus) {
        ui.backupStatus.textContent = `สำเร็จ · Imported ${report.imported} · Merged ${report.merged} · Skipped ${report.skipped} · Failed ${report.failed}${incoming.legacy ? ' · Legacy JSON' : ''}`;
      }
    } catch (error) {
      if (ui.backupStatus) ui.backupStatus.textContent = `นำเข้าไม่สำเร็จ: ${String(error?.message || error)}`;
    }
  }

  async function openDashboard() {
    await chrome.tabs.create({ url: DASHBOARD_URL });
  }

  function renderSyncStatus(status) {
    if (!ui.lastSync) return;
    if (!CLOUD_SYNC_ENABLED) {
      ui.lastSync.textContent = 'Local-first · ส่งข้อมูลทันทีเมื่อเปิดเว็บ';
      return;
    }
    if (status?.lastSyncAt) {
      ui.lastSync.textContent = `ส่งล่าสุด ${new Date(status.lastSyncAt).toLocaleString('th-TH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
      return;
    }
    if (status?.lastStatus?.status === 'ERROR') {
      ui.lastSync.textContent = 'ส่งล่าสุดไม่สำเร็จ — เปิดเว็บและเข้าสู่ระบบก่อน';
      return;
    }
    ui.lastSync.textContent = 'ส่งล่าสุด — ยังไม่เคยส่ง';
  }

  async function loadSyncSettings() {
    if (!CLOUD_SYNC_ENABLED) {
      renderSyncStatus(null);
      return;
    }
    const status = await chrome.runtime.sendMessage({ type: 'get-sync-status' }).catch(() => null);
    if (!status) return;
    if (ui.autoSync) ui.autoSync.value = String(status.minutes || 0);
    renderSyncStatus(status);
  }

  async function updateAutoSync() {
    if (!CLOUD_SYNC_ENABLED) return;
    const minutes = Number(ui.autoSync?.value) || 0;
    await chrome.runtime.sendMessage({ type: 'set-auto-sync', minutes });
    if (ui.lastSync) ui.lastSync.textContent = minutes ? `ตั้งส่งอัตโนมัติทุก ${minutes} นาที` : 'ปิดการส่งอัตโนมัติแล้ว';
  }

  async function syncNow() {
    if (!ui.syncNow) return;
    if (!CLOUD_SYNC_ENABLED) {
      await openDashboard();
      ui.lastSync.textContent = 'เปิดเว็บแล้ว · เว็บจะดึงข้อมูลจาก Connector';
      return;
    }
    const original = ui.syncNow.textContent;
    ui.syncNow.disabled = true;
    ui.syncNow.textContent = 'กำลังส่ง…';
    const result = await chrome.runtime.sendMessage({ type: 'sync-now', source: 'sidepanel' }).catch((error) => ({ ok: false, error: String(error) }));
    if (result?.ok) {
      renderSyncStatus({ lastSyncAt: result.at });
      ui.syncNow.textContent = `ส่งแล้ว ${result.productCount || 0} ชิ้น`;
    } else {
      ui.lastSync.textContent = result?.status === 'NO_DATA' ? 'ยังไม่มีข้อมูล — สแกนสินค้าก่อน' : 'ส่งไม่สำเร็จ — เปิดเว็บและเข้าสู่ระบบก่อน';
      ui.syncNow.textContent = 'ลองส่งใหม่';
    }
    setTimeout(() => {
      ui.syncNow.disabled = false;
      ui.syncNow.textContent = original;
    }, 1800);
  }

  function imageExtension(url) {
    const match = String(url).match(/\.(png|jpe?g|webp|gif|avif)(?:[?#]|$)/i);
    return match ? match[1].toLowerCase().replace('jpeg', 'jpg') : 'webp';
  }

  async function downloadFilteredImages() {
    const products = filteredRows().filter((row) => row.image).slice(0, 300);
    if (!products.length) return;
    ui.images.disabled = true;
    const original = ui.images.textContent;
    const folder = `TalentVee-Shopee-Intelligence-Images-${scanStamp()}`;
    let completed = 0;
    for (const product of products) {
      const filename = `${folder}/${String(product.id || `product-${completed + 1}`).replace(/[^a-z0-9_-]/gi, '')}.${imageExtension(product.image)}`;
      await chrome.runtime.sendMessage({ type: 'claim-download-name', url: product.image, filename });
      await chrome.downloads.download({ url: product.image, filename, saveAs: false }).catch(() => null);
      completed += 1;
      ui.images.textContent = `กำลังโหลด ${completed}/${products.length}`;
    }
    ui.images.textContent = `โหลดแล้ว ${completed} รูป`;
    setTimeout(() => {
      ui.images.disabled = false;
      ui.images.textContent = original;
    }, 1800);
  }

  async function resumeRunningJob() {
    const stored = await chrome.storage.local.get(TAB_KEY);
    if (!Number.isInteger(stored[TAB_KEY])) return;
    tabId = stored[TAB_KEY];
    try {
      await injectCrawler();
      const snapshot = await callCrawler('talentVeeCrawlerRead');
      if (!snapshot) return;
      if (snapshot.status === 'running') {
        setRunning(true);
        renderProgress(snapshot);
        startPolling();
      } else {
        await finishSnapshot(snapshot);
      }
    } catch {
      // แท็บเดิมปิดหรือรีเฟรชแล้ว ผู้ใช้เริ่มงานใหม่ได้โดยไม่กระทบฐานข้อมูลเดิม
    }
  }

  ui.start.addEventListener('click', startScan);
  ui.stop.addEventListener('click', stopScan);
  ui.search.addEventListener('input', renderItems);
  ui.category.addEventListener('change', renderItems);
  ui.group.addEventListener('change', renderItems);
  ui.sort.addEventListener('change', renderItems);
  ui.csv.addEventListener('click', exportCsv);
  ui.json.addEventListener('click', exportJson);
  ui.importMerge?.addEventListener('click', () => chooseImport('merge'));
  ui.importReplace?.addEventListener('click', () => chooseImport('replace'));
  ui.importFile?.addEventListener('change', () => importBackupFile(ui.importFile.files?.[0], ui.importFile.dataset.mode || 'merge'));
  ui.images.addEventListener('click', downloadFilteredImages);
  ui.web.addEventListener('click', openDashboard);
  ui.autoSync?.addEventListener('change', updateAutoSync);
  ui.syncNow?.addEventListener('click', syncNow);

  loadDatabase().then(resumeRunningJob);
  void loadSyncSettings();
})();
