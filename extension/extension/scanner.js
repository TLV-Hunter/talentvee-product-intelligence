(() => {
  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const numberFrom = (value) => {
    const match = clean(value).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
  };
  const percentFrom = (value) => {
    const match = clean(value).match(/(\d+(?:\.\d+)?)\s*%/);
    return match ? Number(match[1]) : null;
  };
  const absoluteUrl = (value) => {
    if (!value) return '';
    try { return new URL(value, location.href).href; } catch { return ''; }
  };
  const unique = (values) => [...new Set(values.filter(Boolean))];
  const checkedAt = new Date().toISOString();
  const pageUrl = location.href;
  const path = location.pathname;
  const itemIdMatch = path.match(/\/offer\/product_offer\/(\d+)/);

  const selectorStats = {};
  const selectCards = () => {
    const selectors = [
      '.product-offer-item',
      '[class*="product-offer-item"]',
      '[class*="AffiliateItemCard"]'
    ];
    for (const selector of selectors) {
      const nodes = [...document.querySelectorAll(selector)];
      selectorStats[selector] = nodes.length;
      if (nodes.length) return nodes;
    }

    const links = [...document.querySelectorAll('a[href*="/offer/product_offer/"]')];
    selectorStats['fallback-product-links'] = links.length;
    const seen = new Set();
    const nodes = [];
    for (const link of links) {
      const card = link.closest('article, li, [class*="card" i], div');
      if (card && !seen.has(card)) {
        seen.add(card);
        nodes.push(card);
      }
    }
    return nodes;
  };

  const readCard = (card, index) => {
    const cardText = clean(card.innerText || card.textContent);
    const link = card.querySelector('a[href*="/offer/product_offer/"]') || card.querySelector('a[href]');
    const rawHref = link?.getAttribute('href') || '';
    const productUrl = rawHref ? absoluteUrl(rawHref.split('?')[0]) : '';
    const id = (rawHref.match(/product_offer\/(\d+)/) || [])[1] || '';

    const nameNode = card.querySelector('.ItemCard__name, [class*="ItemCard__name"], [class*="product-name" i]');
    const imageNode = card.querySelector('.ItemCard__image img, img');
    const name = clean(nameNode?.textContent || imageNode?.getAttribute('alt') || link?.textContent || '') || `สินค้า ${index + 1}`;

    const priceNode = card.querySelector('.ItemCardPrice__wrap, [class*="ItemCardPrice"], [class*="price" i]');
    const priceMatch = clean(priceNode?.textContent || cardText).match(/฿\s*[\d,.]+/);
    const priceText = priceMatch ? clean(priceMatch[0]) : '';

    const soldNode = card.querySelector('.ItemCardSold__wrap, [class*="sold" i]');
    const soldMatch = clean(soldNode?.textContent || cardText).match(/(?:ขายแล้ว?|sold)\s*[^|]+?(?=อัตรา|คอม|EXTRA|$)/i);
    const soldText = clean(soldNode?.textContent || soldMatch?.[0] || '');

    const commissionNode = card.querySelector('.commRate, [class*="commRate"], [class*="commission" i]');
    const commissionMatch = cardText.match(/(?:อัตราค่าคอม(?:มิชชัน|มิชชั่น)?|commission(?:\s*rate)?)\s*[:：]?\s*(\d+(?:\.\d+)?)\s*%/i);
    const commissionText = clean(commissionNode?.textContent || commissionMatch?.[0] || '');
    const displayedCommissionRate = percentFrom(commissionText || commissionMatch?.[0]);

    const badgeNodes = [...card.querySelectorAll('.ItemCard__labels img, [class*="label" i], [class*="badge" i]')];
    const badgeText = unique(badgeNodes.flatMap((node) => [
      clean(node.textContent),
      clean(node.getAttribute?.('alt')),
      clean(node.getAttribute?.('title')),
      clean(node.getAttribute?.('src'))
    ])).join(' | ');
    const extraCommissionAvailable = /(?:xtra|extra)(?:[\s_-]*comm)?/i.test(`${badgeText} ${cardText}`);

    const image = absoluteUrl(imageNode?.currentSrc || imageNode?.getAttribute('src') || imageNode?.getAttribute('data-src'));

    return {
      id,
      name,
      price: numberFrom(priceText),
      priceText,
      soldText,
      displayedCommissionRate,
      commissionSourceText: commissionText,
      baseCommissionRate: null,
      extraCommissionRate: null,
      totalCommissionRate: null,
      extraCommissionAvailable,
      badges: badgeText,
      image,
      productUrl,
      affiliateUrl: null,
      pinEligibility: null,
      skuCoverage: null,
      source: 'ACCOUNT_DOM_LIST'
    };
  };

  const cards = selectCards();
  const items = cards.map(readCard).filter((item) => item.id || item.name);

  const visibleText = clean(document.body?.innerText);
  const allImages = unique([...document.images].map((image) => absoluteUrl(image.currentSrc || image.src)))
    .filter((url) => !/logo|avatar|icon/i.test(url));

  const evidenceFor = (pattern) => {
    const candidates = [...document.querySelectorAll('body *')].filter((node) => {
      const text = clean(node.textContent);
      if (!text || text.length > 360 || !pattern.test(text)) return false;
      return ![...node.children].some((child) => pattern.test(clean(child.textContent)));
    });
    return unique(candidates.slice(0, 12).map((node) => clean(node.parentElement?.textContent || node.textContent)).filter((text) => text.length <= 360));
  };

  const baseEvidence = evidenceFor(/Base Commission|ค่าคอม(?:มิชชัน|มิชชั่น)?(?:พื้นฐาน|ปกติ)|คอม(?:มิชชัน|มิชชั่น)?ร้านค้า/i);
  const extraEvidence = evidenceFor(/Extra Comm(?:ission)?|ค่าคอม(?:มิชชัน|มิชชั่น)?(?:พิเศษ|เพิ่ม)/i);
  const totalEvidence = evidenceFor(/Total Commission|ค่าคอม(?:มิชชัน|มิชชั่น)?รวม|อัตราค่าคอม(?:มิชชัน|มิชชั่น)?รวม/i);

  const detail = itemIdMatch ? {
    itemId: itemIdMatch[1],
    name: clean(document.querySelector('h1, .ItemCard__name, [class*="product-name" i]')?.textContent || document.title),
    priceText: (visibleText.match(/฿\s*[\d,.]+/) || [])[0] || '',
    baseCommissionRate: percentFrom(baseEvidence[0]),
    extraCommissionRate: percentFrom(extraEvidence[0]),
    totalCommissionRate: percentFrom(totalEvidence[0]),
    baseCommissionEvidence: baseEvidence,
    extraCommissionEvidence: extraEvidence,
    totalCommissionEvidence: totalEvidence,
    skuCoverage: unique([...document.querySelectorAll('[class*="variant" i], [class*="model" i], [role="option"]')]
      .map((node) => clean(node.textContent)).filter((text) => text && text.length <= 120)).slice(0, 50),
    images: allImages.slice(0, 50),
    pinEligibility: null,
    source: 'ACCOUNT_DOM_DETAIL'
  } : null;

  const pageType = itemIdMatch ? 'DETAIL' : items.length ? 'LIST' : 'OTHER';
  const dataFound = items.length > 0 || Boolean(detail && (
    detail.baseCommissionEvidence.length || detail.extraCommissionEvidence.length || detail.totalCommissionEvidence.length
  ));

  const images = unique([
    ...items.map((item) => item.image),
    ...(detail?.images || [])
  ]);

  return {
    status: dataFound ? 'AUTHENTICATED' : 'FIELD_NOT_AVAILABLE',
    source: 'ACCOUNT_DOM',
    pageType,
    url: pageUrl,
    path,
    checkedAt,
    itemCount: items.length,
    imageCount: images.length,
    items,
    detail,
    images,
    fieldStatus: {
      displayedCommission: items.some((item) => item.displayedCommissionRate != null) ? 'AVAILABLE' : 'FIELD_NOT_AVAILABLE',
      baseCommission: detail?.baseCommissionRate != null ? 'AVAILABLE' : 'FIELD_NOT_AVAILABLE',
      extraCommission: detail?.extraCommissionRate != null ? 'AVAILABLE' : 'FIELD_NOT_AVAILABLE',
      totalCommission: detail?.totalCommissionRate != null ? 'AVAILABLE' : 'FIELD_NOT_AVAILABLE',
      pinEligibility: 'FIELD_NOT_AVAILABLE',
      skuCoverage: detail?.skuCoverage?.length ? 'AVAILABLE' : 'FIELD_NOT_AVAILABLE'
    },
    diagnostic: {
      selectorStats,
      title: document.title,
      bodyTextLength: visibleText.length,
      commissionTextSamples: unique([
        ...baseEvidence,
        ...extraEvidence,
        ...totalEvidence,
        ...items.map((item) => item.commissionSourceText)
      ]).slice(0, 30)
    }
  };
})();
