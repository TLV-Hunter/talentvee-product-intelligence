(() => {
  const DATABASE_KEY = 'talentVeeProductIntelligence';
  const REQUEST = 'TALENTVEE_DASHBOARD_REQUEST';
  const RESPONSE = 'TALENTVEE_DASHBOARD_DATA';
  const SETTINGS = 'TALENTVEE_DASHBOARD_SETTINGS';
  const WATCHLIST = 'TALENTVEE_DASHBOARD_WATCHLIST';
  const STATUS = 'TALENTVEE_DASHBOARD_STATUS';

  async function postDatabase(reason = 'request') {
    const stored = await chrome.storage.local.get([
      DATABASE_KEY,
      'talentVeeAutoSyncMinutes',
      'talentVeeWatchlist',
      'lastDashboardSyncAt',
      'lastDashboardSyncStatus'
    ]);
    const database = stored[DATABASE_KEY];
    window.postMessage({
      type: RESPONSE,
      source: 'talentvee-extension',
      payload: database?.products && Object.keys(database.products).length
        ? { exportedAt: new Date().toISOString(), database, watchlist: Array.isArray(stored.talentVeeWatchlist) ? stored.talentVeeWatchlist : [] }
        : null,
      meta: {
        reason,
        sentAt: new Date().toISOString(),
        databaseUpdatedAt: database?.updatedAt || null,
        productCount: database?.products ? Object.keys(database.products).length : 0,
        autoSyncMinutes: Number(stored.talentVeeAutoSyncMinutes) || 0,
        lastCloudSyncAt: stored.lastDashboardSyncAt || null,
        lastCloudSyncStatus: stored.lastDashboardSyncStatus || null,
        extensionVersion: chrome.runtime.getManifest().version
      }
    }, window.location.origin);
  }

  window.addEventListener('message', async (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    if (event.data?.source !== 'talentvee-dashboard') return;
    if (event.data?.type === REQUEST) {
      await postDatabase(event.data?.reason || 'request');
      return;
    }
    if (event.data?.type === SETTINGS) {
      const minutes = Number(event.data?.minutes) || 0;
      const result = await chrome.runtime.sendMessage({ type: 'set-auto-sync', minutes });
      window.postMessage({ type: STATUS, source: 'talentvee-extension', status: result }, window.location.origin);
      return;
    }
    if (event.data?.type === WATCHLIST) {
      const watchlist = Array.isArray(event.data?.watchlist) ? event.data.watchlist.map(String).slice(0, 5000) : [];
      await chrome.storage.local.set({ talentVeeWatchlist: watchlist });
      window.postMessage({ type: STATUS, source: 'talentvee-extension', status: { ok: true, watchlistCount: watchlist.length } }, window.location.origin);
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[DATABASE_KEY]) void postDatabase('database-changed');
  });
})();
