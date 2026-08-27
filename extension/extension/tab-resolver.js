(() => {
  const HOST = 'affiliate.shopee.co.th';
  const PRODUCT_OFFERS = `https://${HOST}/offer/product_offer`;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function productOfferUrl(tab) {
    try {
      const url = new URL(tab?.url || '');
      return url.hostname === HOST && url.pathname.startsWith('/offer/product_offer');
    } catch {
      return false;
    }
  }

  function affiliateUrl(tab) {
    try { return new URL(tab?.url || '').hostname === HOST; }
    catch { return false; }
  }

  async function waitForProductOffer(tabId, timeoutMs = 30000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const tab = await chrome.tabs.get(tabId).catch(() => null);
      if (!tab) throw new Error('[TAB_CLOSED] แท็บ Shopee ถูกปิดก่อนเริ่มสแกน');
      if (productOfferUrl(tab) && tab.status === 'complete') return tab;
      if (affiliateUrl(tab) && /(?:login|signin|auth)/i.test(new URL(tab.url).pathname)) {
        throw new Error('[LOGIN_REQUIRED] กรุณาเข้าสู่ระบบ Shopee Affiliate ก่อน');
      }
      await sleep(350);
    }
    throw new Error('[PAGE_TIMEOUT] หน้า Product Offer โหลดไม่เสร็จภายใน 30 วินาที');
  }

  async function resolveProductOfferTab() {
    const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (productOfferUrl(active)) return waitForProductOffer(active.id);

    const currentWindowTabs = await chrome.tabs.query({ currentWindow: true });
    const existingOffer = currentWindowTabs.find(productOfferUrl);
    if (existingOffer?.id) {
      await chrome.tabs.update(existingOffer.id, { active: true });
      return waitForProductOffer(existingOffer.id);
    }

    const affiliateTab = affiliateUrl(active) ? active : currentWindowTabs.find(affiliateUrl);
    if (affiliateTab?.id) {
      await chrome.tabs.update(affiliateTab.id, { url: PRODUCT_OFFERS, active: true });
      return waitForProductOffer(affiliateTab.id);
    }

    const created = await chrome.tabs.create({ url: PRODUCT_OFFERS, active: true });
    if (!created?.id) throw new Error('[TAB_CREATE_FAILED] เปิดแท็บ Product Offer ไม่สำเร็จ');
    return waitForProductOffer(created.id);
  }

  globalThis.TalentVeeTabResolver = Object.freeze({
    productOfferUrl,
    affiliateUrl,
    waitForProductOffer,
    resolveProductOfferTab
  });
})();
