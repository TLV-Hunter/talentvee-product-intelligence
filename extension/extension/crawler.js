(() => {
  const API_VERSION = '1.2.3';
  const MAX_PAGES_PER_CATEGORY = 500;
  if (window.__talentVeeCrawlerApiInstalled === API_VERSION) return;
  window.__talentVeeCrawlerApiInstalled = API_VERSION;

  const JOB_KEY = '__talentVeeProductCrawler';
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const text = (node) => clean(node?.textContent);
  const visible = (node) => {
    if (!node) return false;
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  };
  const absoluteUrl = (value) => {
    if (!value) return '';
    try { return new URL(value, location.href).href; } catch { return ''; }
  };
  const numberFrom = (value) => {
    const match = clean(value).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
  };
  const percentFrom = (value) => {
    const match = clean(value).match(/(\d+(?:\.\d+)?)\s*%/);
    return match ? Number(match[1]) : null;
  };
  const soldNumberFrom = (value) => {
    const raw = clean(value).replace(/,/g, '').toLowerCase();
    const match = raw.match(/(\d+(?:\.\d+)?)\s*(ล้าน|หมื่น|พัน|k|m)?/i);
    if (!match) return null;
    const multiplier = match[2] === 'ล้าน' || match[2] === 'm' ? 1000000
      : match[2] === 'หมื่น' ? 10000
        : match[2] === 'พัน' || match[2] === 'k' ? 1000 : 1;
    return Math.round(Number(match[1]) * multiplier);
  };
  const unique = (values) => [...new Set(values.filter(Boolean))];
  const cards = () => [...document.querySelectorAll('.product-offer-item')];
  const cardSignature = () => cards().slice(0, 5).map((card) => {
    const href = card.querySelector('a[href*="/offer/product_offer/"]')?.getAttribute('href') || '';
    return (href.match(/product_offer\/(\d+)/) || [])[1] || text(card.querySelector('.ItemCard__name'));
  }).join('|');
  const until = async (test, timeoutMs = 15000, intervalMs = 200) => {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const result = test();
      if (result) return result;
      await sleep(intervalMs);
    }
    return null;
  };

  async function waitForStableCards(delayMs = 0) {
    let previous = '';
    let stableChecks = 0;
    const stable = await until(() => {
      const signature = cardSignature();
      const loading = document.querySelector(
        '.ant-spin-spinning, [aria-busy="true"], [class*="loading"][class*="active" i]'
      );
      if (signature && signature === previous && !loading) stableChecks += 1;
      else stableChecks = 0;
      previous = signature;
      return stableChecks >= 2;
    }, 24000, 450);
    if (!stable) return false;
    if (delayMs > 0) await sleep(delayMs);
    return true;
  }

  function categoryCandidates() {
    const selectors = [
      '.ant-tabs-tab',
      '[role="tab"]',
      '[class*="category-tab" i]',
      '[class*="category-item" i]',
      '[class*="tab-item" i]',
      '.ant-tabs-dropdown-menu-item',
      '.ant-tabs-dropdown [role="menuitem"]'
    ];
    const candidates = [];
    const seen = new Set();
    for (const node of document.querySelectorAll(selectors.join(','))) {
      const clickNode = node.closest('[role="tab"], .ant-tabs-tab, button, a') || node;
      const label = text(node);
      if (!clickNode?.isConnected || !label || label.length > 45) continue;
      const style = getComputedStyle(clickNode);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      if (/^(ค้นหา|search|ก่อนหน้า|ถัดไป|previous|next)$/i.test(label)) continue;
      const key = label.toLocaleLowerCase('th');
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push({ label, node: clickNode });
    }
    return candidates;
  }

  function rememberCategories(target) {
    for (const item of categoryCandidates()) target.add(item.label);
  }

  async function discoverAllCategories() {
    const labels = new Set();
    rememberCategories(labels);
    const scrollers = [...document.querySelectorAll([
      '.ant-tabs-nav-wrap',
      '.ant-tabs-nav-list',
      '[role="tablist"]',
      '[class*="category"][class*="scroll" i]',
      '[class*="tabs"][class*="scroll" i]'
    ].join(','))].filter((node) => node.scrollWidth > node.clientWidth + 4);

    for (const node of scrollers) {
      const original = node.scrollLeft;
      const step = Math.max(180, Math.round(node.clientWidth * 0.75));
      for (let left = 0; left <= node.scrollWidth; left += step) {
        node.scrollLeft = left;
        node.dispatchEvent(new Event('scroll', { bubbles: true }));
        await sleep(120);
        rememberCategories(labels);
      }
      node.scrollLeft = original;
    }

    const more = [...document.querySelectorAll([
      '.ant-tabs-nav-more',
      '[class*="tabs-nav-operations" i] button',
      'button[aria-label*="more" i]',
      'button[aria-label*="เพิ่มเติม" i]'
    ].join(','))].find(visible);
    if (more) {
      more.click();
      await sleep(250);
      rememberCategories(labels);
      more.click();
    }

    return [...labels];
  }

  function activeCategory() {
    const node = document.querySelector(
      '.ant-tabs-tab-active, [role="tab"][aria-selected="true"], [class*="category"][class*="active" i]'
    );
    return text(node) || 'หมวดปัจจุบัน';
  }

  async function selectCategory(label, job) {
    if (label === 'หมวดปัจจุบัน') return waitForStableCards(job.options.delayMs);
    for (let attempt = 1; attempt <= job.options.retryLimit; attempt += 1) {
      let candidate = categoryCandidates().find((item) => item.label === label);
      if (!candidate) {
        const more = [...document.querySelectorAll('.ant-tabs-nav-more, [class*="tabs-nav-operations" i] button')].find(visible);
        more?.click();
        await sleep(200);
        candidate = categoryCandidates().find((item) => item.label === label);
      }
      if (!candidate) return false;
      const before = cardSignature();
      candidate.node.click();
      const changed = await until(() => {
        const active = activeCategory();
        const signature = cardSignature();
        return active === label || (signature && signature !== before);
      }, 18000, 300);
      if (changed && await waitForStableCards(job.options.delayMs)) return true;
      job.retryCount += 1;
      job.step = `ลองเปิดหมวด ${label} ใหม่ · ${attempt}/${job.options.retryLimit}`;
      await sleep(1200 * attempt);
    }
    job.errorLog.push({ at: new Date().toISOString(), action: 'CATEGORY', label, message: 'โหลดหมวดไม่สำเร็จหลัง retry' });
    return false;
  }

  function nextButton() {
    const selectors = [
      '.PaginationNoTotal__wrap .page-next',
      '.page-next',
      'button[aria-label*="next" i]',
      'button[aria-label*="ถัด" i]',
      '[class*="pagination" i] [class*="next" i]'
    ];
    for (const selector of selectors) {
      const node = [...document.querySelectorAll(selector)].find(visible);
      if (node) return node;
    }
    return null;
  }

  function disabled(node) {
    return !node || node.disabled || node.getAttribute('aria-disabled') === 'true'
      || /disabled/i.test(node.className || '') || /disabled/i.test(node.parentElement?.className || '');
  }

  async function goNextPage(job) {
    const firstButton = nextButton();
    if (disabled(firstButton)) return false;
    for (let attempt = 1; attempt <= job.options.retryLimit; attempt += 1) {
      const button = nextButton();
      if (disabled(button)) return false;
      const before = cardSignature();
      button.click();
      const changed = await until(() => cards().length > 0 && cardSignature() !== before, 22000, 350);
      if (changed && await waitForStableCards(job.options.delayMs)) return true;
      job.retryCount += 1;
      job.step = `หน้าโหลดช้า · ลองใหม่ ${attempt}/${job.options.retryLimit}`;
      await sleep(1500 * attempt);
      if (cards().length > 0 && cardSignature() !== before && await waitForStableCards(job.options.delayMs)) return true;
    }
    job.errorLog.push({
      at: new Date().toISOString(),
      action: 'NEXT_PAGE',
      category: job.category,
      page: job.page,
      message: 'เปลี่ยนหน้าถัดไปไม่สำเร็จหลัง retry'
    });
    job.warnings.push(`${job.category} หน้า ${job.page}: ไปหน้าถัดไปไม่สำเร็จหลังลอง ${job.options.retryLimit} ครั้ง`);
    return false;
  }

  function readCard(card, category, page, rank) {
    const cardText = text(card);
    const link = card.querySelector('a[href*="/offer/product_offer/"]') || card.querySelector('a[href]');
    const rawHref = link?.getAttribute('href') || '';
    const id = (rawHref.match(/product_offer\/(\d+)/) || [])[1] || '';
    const nameNode = card.querySelector('.ItemCard__name, [class*="ItemCard__name"]');
    const imageNode = card.querySelector('.ItemCard__image img, img');
    const name = text(nameNode) || clean(imageNode?.getAttribute('alt'));

    const priceWrap = card.querySelector('.ItemCardPrice__wrap, [class*="ItemCardPrice"]');
    const currency = text(priceWrap?.querySelector('.symbol--left')) || '฿';
    const priceRaw = text(priceWrap?.querySelector('.price'));
    const priceText = priceRaw ? `${currency}${priceRaw}` : (cardText.match(/฿\s*[\d,.]+/) || [])[0] || '';

    const soldNode = card.querySelector('.ItemCardSold__wrap span, .ItemCardSold__wrap, [class*="sold" i]');
    const soldMatch = cardText.match(/(?:ขายได้|ขายแล้ว|sold)\s*[\d,.]+\s*(?:ล้าน|หมื่น|พัน|k|m)?\+?\s*(?:ชิ้น)?/i);
    const soldText = text(soldNode) || clean(soldMatch?.[0]);

    const commissionNode = card.querySelector('.commRate, [class*="commRate"], [class*="commission" i]');
    const commissionText = text(commissionNode) || clean(cardText.match(/(?:อัตราค่าคอม(?:มิชชัน|มิชชั่น)?|commission(?:\s*rate)?)\s*[:：]?\s*\d+(?:\.\d+)?\s*%/i)?.[0]);

    const badgeParts = [];
    for (const badge of card.querySelectorAll('.ItemCard__labels img, [class*="label" i] img, [class*="badge" i] img')) {
      const src = badge.getAttribute('src') || '';
      const code = (src.match(/label_([a-z_]+)_inner/i) || [])[1];
      badgeParts.push(code ? code.replace(/_/g, ' ') : '');
      badgeParts.push(clean(badge.getAttribute('alt')));
      badgeParts.push(clean(badge.getAttribute('title')));
    }
    const badges = unique(badgeParts).join(' | ');
    const badgeEvidence = `${badges} ${cardText}`;

    return {
      id,
      name: name || `สินค้า ${rank}`,
      currency,
      price: numberFrom(priceText),
      priceText: clean(priceText),
      soldText,
      soldCount: soldNumberFrom(soldText),
      displayedCommissionRate: percentFrom(commissionText),
      commissionSourceText: commissionText,
      extraCommissionAvailable: /(?:xtra|extra)(?:[\s_-]*comm)?/i.test(badgeEvidence),
      freeSampleAvailable: /(?:free[\s_-]*sample|รีวิวฟรี|รับสินค้ารีวิวฟรี)/i.test(badgeEvidence),
      newBadgeAvailable: /(?:^|\b)new(?:\b|$)|สินค้าใหม่|มาใหม่/i.test(badgeEvidence),
      badges,
      discountRate: percentFrom(cardText.match(/\d+(?:\.\d+)?\s*%\s*ลด/i)?.[0]),
      image: absoluteUrl(imageNode?.currentSrc || imageNode?.getAttribute('src') || imageNode?.getAttribute('data-src')),
      productUrl: rawHref ? absoluteUrl(rawHref.split('?')[0]) : '',
      affiliateUrl: null,
      categories: [category],
      categoryRanks: { [category]: rank },
      pageInCategory: page,
      positionInPage: ((rank - 1) % 20) + 1,
      source: 'ACCOUNT_DOM_CRAWLER'
    };
  }

  function mergeItem(job, item) {
    const key = item.id || `${item.name}|${item.priceText}`;
    const existing = job.itemMap.get(key);
    if (!existing) {
      job.itemMap.set(key, item);
      return;
    }
    existing.categories = unique([...existing.categories, ...item.categories]);
    existing.categoryRanks = { ...existing.categoryRanks, ...item.categoryRanks };
    existing.extraCommissionAvailable ||= item.extraCommissionAvailable;
    existing.freeSampleAvailable ||= item.freeSampleAvailable;
    existing.newBadgeAvailable ||= item.newBadgeAvailable;
    existing.badges = unique(`${existing.badges} | ${item.badges}`.split('|').map(clean)).join(' | ');
    if (!existing.image && item.image) existing.image = item.image;
    if (item.soldCount != null && (existing.soldCount == null || item.soldCount > existing.soldCount)) {
      existing.soldCount = item.soldCount;
      existing.soldText = item.soldText;
    }
  }

  function knownProductMap(rawProducts) {
    const result = new Map();
    for (const product of Array.isArray(rawProducts) ? rawProducts : []) {
      if (!product || typeof product !== 'object') continue;
      const checkedAt = Date.parse(product.lastSeenAt || '') || 0;
      if (product.key) result.set(String(product.key), checkedAt);
      if (product.id) result.set(String(product.id), checkedAt);
    }
    return result;
  }

  function snapshot(job, includeItems = false) {
    return {
      status: job.status,
      step: job.step,
      category: job.category,
      categoryIndex: job.categoryIndex,
      categoryTotal: job.categories.length,
      page: job.page,
      pageLimit: job.options.pageLimit,
      scanUntilEnd: job.options.scanUntilEnd,
      scanMode: job.options.scanMode,
      uniqueCount: job.itemMap.size,
      scannedCards: job.scannedCards,
      newCount: job.newCount,
      refreshedCount: job.refreshedCount,
      skippedKnown: job.skippedKnown,
      earlyStops: job.earlyStops,
      categories: job.categories,
      detectedCategories: job.detectedCategories,
      error: job.error,
      warnings: job.warnings,
      retryCount: job.retryCount,
      errorLog: job.errorLog,
      delayMs: job.options.delayMs,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt || null,
      items: includeItems ? [...job.itemMap.values()] : []
    };
  }

  window.talentVeeCrawlerStart = (rawOptions = {}) => {
    const previous = window[JOB_KEY];
    if (previous?.status === 'running') return snapshot(previous);

    const current = activeCategory();
    const allCategories = rawOptions.allCategories !== false;
    const initialDetected = categoryCandidates().map((item) => item.label);
    const categories = allCategories && initialDetected.length ? initialDetected : [current];
    const requestedPageLimit = Number(rawOptions.pageLimit);
    const scanUntilEnd = rawOptions.scanUntilEnd === true || requestedPageLimit === 0;
    const pageLimit = scanUntilEnd
      ? MAX_PAGES_PER_CATEGORY
      : Math.min(MAX_PAGES_PER_CATEGORY, Math.max(1, requestedPageLimit || 50));
    const delayMs = Math.min(6000, Math.max(1500, Number(rawOptions.delayMs) || 3500));
    const retryLimit = Math.min(5, Math.max(1, Number(rawOptions.retryLimit) || 3));
    const scanMode = ['smart', 'new', 'full'].includes(rawOptions.scanMode) ? rawOptions.scanMode : 'smart';
    const staleAfterHours = Math.min(720, Math.max(1, Number(rawOptions.staleAfterHours) || 24));
    const unchangedPageStop = scanMode === 'full'
      ? 0
      : Math.min(50, Math.max(2, Number(rawOptions.unchangedPageStop) || (scanMode === 'new' ? 5 : 10)));
    const job = {
      status: 'running',
      step: 'เตรียมรายการหมวดหมู่…',
      category: '',
      categoryIndex: 0,
      page: 0,
      options: { allCategories, pageLimit, scanUntilEnd, delayMs, retryLimit, scanMode, staleAfterHours, unchangedPageStop },
      categories,
      detectedCategories: initialDetected,
      itemMap: new Map(),
      knownProducts: knownProductMap(rawOptions.knownProducts),
      seenKeys: new Set(),
      scannedCards: 0,
      newCount: 0,
      refreshedCount: 0,
      skippedKnown: 0,
      earlyStops: [],
      warnings: [],
      retryCount: 0,
      errorLog: [],
      error: null,
      startedAt: new Date().toISOString(),
      finishedAt: null
    };
    window[JOB_KEY] = job;

    (async () => {
      try {
        if (allCategories) {
          job.step = 'กำลังเปิดดูแท็บที่ซ่อนและรวบรวมหมวดทั้งหมด…';
          const discovered = await discoverAllCategories();
          job.detectedCategories = discovered;
          job.categories = discovered.length ? discovered : [current];
        }
        const categories = job.categories;
        for (let categoryIndex = 0; categoryIndex < categories.length; categoryIndex += 1) {
          if (job.status !== 'running') break;
          const category = categories[categoryIndex];
          job.category = category;
          job.categoryIndex = categoryIndex + 1;
          job.page = 1;
          let consecutiveUnchangedPages = 0;
          job.step = `เปิดหมวด ${category}`;

          try {
            const selected = await selectCategory(category, job);
            if (!selected) {
              job.warnings.push(`ข้ามหมวด ${category}: โหลดไม่สำเร็จ`);
              continue;
            }
            const loaded = await waitForStableCards(0);
            if (!loaded) {
              job.warnings.push(`ข้ามหมวด ${category}: ไม่พบการ์ดที่โหลดเสร็จ`);
              continue;
            }

            for (let page = 1; page <= pageLimit; page += 1) {
              if (job.status !== 'running') break;
              job.page = page;
              job.step = `อ่าน ${category} · หน้า ${page}`;
              const stable = await waitForStableCards(0);
              if (!stable) {
                job.warnings.push(`${category} หน้า ${page}: การ์ดยังโหลดไม่นิ่ง จึงหยุดหมวดนี้`);
                break;
              }
              const pageCards = cards();
              let acceptedOnPage = 0;
              pageCards.forEach((card, index) => {
                const rank = ((page - 1) * 20) + index + 1;
                const item = readCard(card, category, page, rank);
                const key = item.id || `${item.name}|${item.priceText}`;
                const firstOccurrence = !job.seenKeys.has(key);
                job.seenKeys.add(key);

                if (!firstOccurrence) {
                  if (job.itemMap.has(key)) mergeItem(job, item);
                  return;
                }

                const knownAt = job.knownProducts.get(key);
                const known = knownAt !== undefined;
                const stale = !knownAt || (Date.now() - knownAt) >= job.options.staleAfterHours * 3600000;
                const keep = job.options.scanMode === 'full'
                  || !known
                  || (job.options.scanMode === 'smart' && stale);

                if (keep) {
                  mergeItem(job, item);
                  acceptedOnPage += 1;
                  if (known) job.refreshedCount += 1;
                  else job.newCount += 1;
                } else {
                  job.skippedKnown += 1;
                }
              });
              job.scannedCards += pageCards.length;

              if (job.options.scanMode !== 'full') {
                consecutiveUnchangedPages = acceptedOnPage === 0 ? consecutiveUnchangedPages + 1 : 0;
                if (consecutiveUnchangedPages >= job.options.unchangedPageStop) {
                  job.earlyStops.push({
                    category,
                    page,
                    consecutivePages: consecutiveUnchangedPages,
                    reason: job.options.scanMode === 'new' ? 'NO_NEW_PRODUCTS' : 'NO_NEW_OR_STALE_PRODUCTS'
                  });
                  job.step = `ผ่านของเดิม ${consecutiveUnchangedPages} หน้าติดกัน · จบหมวด ${category}`;
                  break;
                }
              }

              if (page >= pageLimit) {
                if (job.options.scanUntilEnd && !disabled(nextButton())) {
                  job.warnings.push(`${category}: ถึง Safety Limit ${MAX_PAGES_PER_CATEGORY} หน้า แต่ยังพบปุ่มหน้าถัดไป`);
                  job.errorLog.push({
                    at: new Date().toISOString(),
                    action: 'SAFETY_LIMIT',
                    category,
                    page,
                    message: `หยุดที่ Safety Limit ${MAX_PAGES_PER_CATEGORY} หน้า`
                  });
                }
                break;
              }
              job.step = `รอ ${Math.round(job.options.delayMs / 100) / 10} วิ · ไปหน้า ${page + 1} · ${category}`;
              const moved = await goNextPage(job);
              if (!moved) break;
            }
          } catch (error) {
            const message = String(error?.message || error);
            job.warnings.push(`ข้ามหมวด ${category}: ${message}`);
            job.errorLog.push({ at: new Date().toISOString(), action: 'CATEGORY_LOOP', category, message });
          }
        }

        if (job.status === 'running') job.status = 'done';
        job.step = job.status === 'cancelled' ? 'หยุดแล้ว — เก็บผลบางส่วน' : 'สแกนเสร็จแล้ว';
        job.finishedAt = new Date().toISOString();
      } catch (error) {
        job.status = 'error';
        job.error = String(error?.message || error);
        job.step = 'เกิดข้อผิดพลาด';
        job.finishedAt = new Date().toISOString();
      }
    })();

    return snapshot(job);
  };

  window.talentVeeCrawlerRead = () => {
    const job = window[JOB_KEY];
    if (!job) return null;
    return snapshot(job, ['done', 'cancelled', 'error'].includes(job.status));
  };

  window.talentVeeCrawlerStop = () => {
    const job = window[JOB_KEY];
    if (!job) return null;
    if (job.status === 'running') {
      job.status = 'cancelled';
      job.step = 'กำลังหยุด…';
    }
    return snapshot(job, job.status !== 'running');
  };

  window.talentVeeCrawlerClear = () => {
    const job = window[JOB_KEY];
    if (job?.status === 'running') job.status = 'cancelled';
    window[JOB_KEY] = null;
    return true;
  };
})();
