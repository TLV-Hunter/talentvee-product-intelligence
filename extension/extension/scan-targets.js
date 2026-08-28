(() => {
  const TARGET_LIMIT = 100;
  const TARGET_MODES = Object.freeze(['all', 'new100', 'best100', 'trending100']);

  function productKey(row) {
    return String(row?.id || row?.key || '');
  }

  function finiteNumber(value) {
    if (value == null || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function selectKnownTargetKeys(rows, targetMode, limit = TARGET_LIMIT) {
    const safeLimit = Math.min(TARGET_LIMIT, Math.max(1, Number(limit) || TARGET_LIMIT));
    const candidates = Array.isArray(rows) ? [...rows] : [];

    if (targetMode === 'best100') {
      return candidates
        .filter((row) => productKey(row) && finiteNumber(row.soldCount) !== null)
        .sort((a, b) => (finiteNumber(b.soldCount) || 0) - (finiteNumber(a.soldCount) || 0))
        .slice(0, safeLimit)
        .map(productKey);
    }

    if (targetMode === 'trending100') {
      return candidates
        .filter((row) => productKey(row)
          && row.hasHistory
          && Array.isArray(row.labels)
          && row.labels.includes('TRENDING')
          && (finiteNumber(row.salesPerDay) || 0) > 0)
        .sort((a, b) => (finiteNumber(b.salesPerDay) || 0) - (finiteNumber(a.salesPerDay) || 0))
        .slice(0, safeLimit)
        .map(productKey);
    }

    return [];
  }

  function buildTargetOptions(rows, rawTargetMode) {
    const targetMode = TARGET_MODES.includes(rawTargetMode) ? rawTargetMode : 'all';
    const targetProductKeys = selectKnownTargetKeys(rows, targetMode);

    if (targetMode === 'best100' && !targetProductKeys.length) {
      throw new Error('[TOP100_EMPTY] ยังไม่มีข้อมูลยอดขาย กรุณาสแกน Smart หรือ Full Scan ก่อน');
    }
    if (targetMode === 'trending100' && !targetProductKeys.length) {
      throw new Error('[TRENDING_HISTORY_REQUIRED] โหมดมาแรง Top 100 ต้องมีประวัติยอดขายอย่างน้อย 2 รอบ');
    }

    return {
      targetMode,
      targetLimit: TARGET_LIMIT,
      targetProductKeys
    };
  }

  globalThis.TalentVeeScanTargets = Object.freeze({
    TARGET_LIMIT,
    TARGET_MODES,
    selectKnownTargetKeys,
    buildTargetOptions
  });
})();
