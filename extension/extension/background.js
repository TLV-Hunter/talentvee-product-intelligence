importScripts('config.js');

const DASHBOARD_URL = globalThis.TalentVeeConfig.dashboardUrl;
const CLOUD_SYNC_URL = `${DASHBOARD_URL}${globalThis.TalentVeeConfig.syncPath}`;
const CLOUD_SYNC_ENABLED = globalThis.TalentVeeConfig.cloudSyncEnabled !== false;
const DB_KEY = 'talentVeeProductIntelligence';
const AUTO_SYNC_KEY = 'talentVeeAutoSyncMinutes';
const AUTO_SYNC_ALARM = 'talentvee-cloud-sync';

async function configureAutoSync(minutes) {
  const value = CLOUD_SYNC_ENABLED ? Number(minutes) || 0 : 0;
  await chrome.alarms.clear(AUTO_SYNC_ALARM);
  await chrome.storage.local.set({ [AUTO_SYNC_KEY]: value });
  if (value >= 15) {
    await chrome.alarms.create(AUTO_SYNC_ALARM, { delayInMinutes: value, periodInMinutes: value });
  }
  return value;
}

async function syncDatabaseToCloud(source = 'manual') {
  const stored = await chrome.storage.local.get([DB_KEY, 'talentVeeWatchlist']);
  const database = stored[DB_KEY];
  if (!database?.products || !Object.keys(database.products).length) {
    const result = { ok: false, status: 'NO_DATA', at: new Date().toISOString(), source };
    await chrome.storage.local.set({ lastDashboardSyncStatus: result });
    return result;
  }

  if (!CLOUD_SYNC_ENABLED) {
    const result = { ok: true, status: 'LOCAL_READY', at: new Date().toISOString(), source, productCount: Object.keys(database.products).length };
    await chrome.storage.local.set({ lastDashboardSyncStatus: result });
    return result;
  }

  try {
    const response = await fetch(CLOUD_SYNC_URL, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        database,
        updatedAt: database.updatedAt || new Date().toISOString(),
        watchlist: Array.isArray(stored.talentVeeWatchlist) ? stored.talentVeeWatchlist : []
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || `HTTP_${response.status}`);
    const result = { ok: true, status: 'SYNCED', at: new Date().toISOString(), source, productCount: Object.keys(database.products).length };
    await chrome.storage.local.set({ lastDashboardSyncAt: result.at, lastDashboardSyncStatus: result });
    return result;
  } catch (error) {
    const result = { ok: false, status: 'ERROR', at: new Date().toISOString(), source, error: String(error?.message || error) };
    await chrome.storage.local.set({ lastDashboardSyncStatus: result });
    return result;
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get(AUTO_SYNC_KEY);
  const minutes = CLOUD_SYNC_ENABLED && stored[AUTO_SYNC_KEY] == null ? 30 : Number(stored[AUTO_SYNC_KEY]) || 0;
  await chrome.storage.local.set({
    installedAt: new Date().toISOString(),
    connectorVersion: chrome.runtime.getManifest().version
  });
  await configureAutoSync(minutes);
});

chrome.runtime.onStartup.addListener(async () => {
  const stored = await chrome.storage.local.get(AUTO_SYNC_KEY);
  await configureAutoSync(CLOUD_SYNC_ENABLED && stored[AUTO_SYNC_KEY] == null ? 30 : Number(stored[AUTO_SYNC_KEY]) || 0);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === AUTO_SYNC_ALARM) void syncDatabaseToCloud('schedule');
});

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('[Shopee Connector] side panel:', error));

const downloadClaims = new Map();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'claim-download-name' && message.url && message.filename) {
    downloadClaims.set(message.url, message.filename);
    sendResponse({ ok: true });
    return false;
  }
  if (message?.type === 'set-auto-sync') {
    configureAutoSync(message.minutes).then((minutes) => sendResponse({ ok: true, minutes }));
    return true;
  }
  if (message?.type === 'sync-now') {
    syncDatabaseToCloud(message.source || 'manual').then(sendResponse);
    return true;
  }
  if (message?.type === 'get-sync-status') {
    chrome.storage.local.get([AUTO_SYNC_KEY, 'lastDashboardSyncAt', 'lastDashboardSyncStatus'])
      .then((stored) => sendResponse({
        ok: true,
        minutes: Number(stored[AUTO_SYNC_KEY]) || 0,
        lastSyncAt: stored.lastDashboardSyncAt || null,
        lastStatus: stored.lastDashboardSyncStatus || null
      }));
    return true;
  }
  return false;
});

chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  const filename = downloadClaims.get(item.url);
  if (!filename) return false;
  downloadClaims.delete(item.url);
  suggest({ filename, conflictAction: 'uniquify' });
  return true;
});
