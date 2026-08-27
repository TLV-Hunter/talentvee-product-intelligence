import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const ROOT = new URL('../', import.meta.url);

async function source(path) {
  return readFile(new URL(path, ROOT), 'utf8');
}

async function loadResolver({ active, tabs = [], getTab, createTab }) {
  const updates = [];
  const creates = [];
  const chrome = {
    tabs: {
      query: async (query) => query.active ? [active] : tabs,
      get: async (id) => getTab?.(id) ?? tabs.find((tab) => tab.id === id) ?? active,
      update: async (id, changes) => {
        updates.push({ id, changes });
        return { ...(tabs.find((tab) => tab.id === id) ?? active), id, ...changes, status: 'complete' };
      },
      create: async (changes) => {
        creates.push(changes);
        return createTab?.(changes) ?? { id: 99, ...changes, status: 'complete' };
      }
    }
  };
  const context = vm.createContext({ chrome, URL, Promise, setTimeout, clearTimeout });
  context.globalThis = context;
  vm.runInContext(await source('extension/tab-resolver.js'), context);
  return { resolver: context.TalentVeeTabResolver, updates, creates };
}

test('Manifest, UI, and installer use v1.2.3 consistently', async () => {
  const manifest = JSON.parse(await source('extension/manifest.json'));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, '1.2.3');

  for (const path of ['extension/sidepanel.html', 'START-HERE.txt', 'README.md', 'INSTALL-TALENTVEE.cmd', 'MIGRATION-CONFIG.md']) {
    assert.match(await source(path), /v1\.2\.3/);
  }
  assert.match(await source('INSTALL-TALENTVEE.ps1'), /tab-resolver\.js/);
  assert.match(await source('extension/sidepanel.html'), /src="tab-resolver\.js"/);
});

test('Tab resolver keeps an active Product Offer tab', async () => {
  const active = { id: 1, url: 'https://affiliate.shopee.co.th/offer/product_offer', status: 'complete' };
  const { resolver, updates, creates } = await loadResolver({ active, tabs: [active] });
  const result = await resolver.resolveProductOfferTab();
  assert.equal(result.id, 1);
  assert.equal(updates.length, 0);
  assert.equal(creates.length, 0);
});

test('Tab resolver activates an existing Product Offer tab', async () => {
  const active = { id: 1, url: 'https://example.com/', status: 'complete' };
  const offer = { id: 2, url: 'https://affiliate.shopee.co.th/offer/product_offer', status: 'complete' };
  const { resolver, updates } = await loadResolver({ active, tabs: [active, offer], getTab: () => offer });
  const result = await resolver.resolveProductOfferTab();
  assert.equal(result.id, 2);
  assert.equal(updates[0].id, 2);
  assert.equal(updates[0].changes.active, true);
});

test('Tab resolver navigates an Affiliate tab to Product Offer', async () => {
  const active = { id: 3, url: 'https://affiliate.shopee.co.th/dashboard', status: 'complete' };
  const navigated = { id: 3, url: 'https://affiliate.shopee.co.th/offer/product_offer', status: 'complete' };
  const { resolver, updates } = await loadResolver({ active, tabs: [active], getTab: () => navigated });
  const result = await resolver.resolveProductOfferTab();
  assert.equal(result.id, 3);
  assert.equal(updates[0].changes.url, 'https://affiliate.shopee.co.th/offer/product_offer');
});

test('Tab resolver creates Product Offer when no Affiliate tab exists', async () => {
  const active = { id: 4, url: 'https://example.com/', status: 'complete' };
  const created = { id: 9, url: 'https://affiliate.shopee.co.th/offer/product_offer', status: 'complete' };
  const { resolver, creates } = await loadResolver({ active, tabs: [active], getTab: () => created, createTab: () => created });
  const result = await resolver.resolveProductOfferTab();
  assert.equal(result.id, 9);
  assert.equal(creates[0].url, 'https://affiliate.shopee.co.th/offer/product_offer');
});

test('Crawler keeps Safety 500 and Smart Incremental guards', async () => {
  const crawler = await source('extension/crawler.js');
  assert.match(crawler, /MAX_PAGES_PER_CATEGORY\s*=\s*500/);
  assert.match(crawler, /Math\.min\(MAX_PAGES_PER_CATEGORY/);
  assert.match(crawler, /scanMode === 'smart'/);
  assert.match(crawler, /staleAfterHours/);
  assert.match(crawler, /NO_NEW_OR_STALE_PRODUCTS/);
  assert.doesNotMatch(crawler, /Math\.min\(50,\s*Math\.max\(1,\s*Number\(rawOptions\.pageLimit/);
});

test.skip('Real XTRA badge regression awaits the diagnostic JSON fixture', () => {});
