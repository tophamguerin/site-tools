// Network Categorizer — run via Chrome MCP evaluate_script
// Analyzes loaded resources by type, size, and origin.
// Run AFTER the page has fully loaded for complete results.
//
// Usage: Run the function body via evaluate_script. Returns categorized resource data.

// eslint-disable-next-line no-unused-vars
const networkCategorize = () => {
  const entries = performance.getEntriesByType('resource');
  const pageOrigin = window.location.origin;

  const resources = entries.map(entry => {
    const url = entry.name;
    const isThirdParty = !url.startsWith(pageOrigin);

    // Determine type from initiatorType and URL extension
    let type = entry.initiatorType || 'other';
    const ext = url.split('?')[0].split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg', 'ico'].includes(ext)) type = 'image';
    else if (['js', 'mjs'].includes(ext) || type === 'script') type = 'script';
    else if (['css'].includes(ext) || type === 'css') type = 'stylesheet';
    else if (['woff', 'woff2', 'ttf', 'otf', 'eot'].includes(ext)) type = 'font';
    else if (['json'].includes(ext) || type === 'xmlhttprequest' || type === 'fetch') type = 'api';
    else if (['mp4', 'webm', 'ogg'].includes(ext)) type = 'video';

    return {
      url: url.slice(0, 200),
      type,
      transferSize: entry.transferSize || 0,
      decodedSize: entry.decodedBodySize || 0,
      duration: Math.round(entry.duration),
      isThirdParty,
      protocol: entry.nextHopProtocol || null
    };
  });

  // Categorize
  const byType = {};
  resources.forEach(r => {
    if (!byType[r.type]) byType[r.type] = { count: 0, totalTransfer: 0, totalDecoded: 0 };
    byType[r.type].count++;
    byType[r.type].totalTransfer += r.transferSize;
    byType[r.type].totalDecoded += r.decodedSize;
  });

  // Find heavy assets (>200KB transferred)
  const heavyAssets = resources
    .filter(r => r.transferSize > 200 * 1024)
    .sort((a, b) => b.transferSize - a.transferSize)
    .slice(0, 10);

  // Find slow requests (>1s)
  const slowRequests = resources
    .filter(r => r.duration > 1000)
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 10);

  // Third-party breakdown
  const thirdParty = resources.filter(r => r.isThirdParty);
  const thirdPartyDomains = {};
  thirdParty.forEach(r => {
    try {
      const domain = new URL(r.url).hostname;
      if (!thirdPartyDomains[domain]) thirdPartyDomains[domain] = { count: 0, totalTransfer: 0 };
      thirdPartyDomains[domain].count++;
      thirdPartyDomains[domain].totalTransfer += r.transferSize;
    } catch { /* skip malformed URLs */ }
  });

  // Navigation timing
  const navTiming = performance.getEntriesByType('navigation')[0];
  const timing = navTiming ? {
    ttfb: Math.round(navTiming.responseStart - navTiming.requestStart),
    domContentLoaded: Math.round(navTiming.domContentLoadedEventEnd - navTiming.startTime),
    loadComplete: Math.round(navTiming.loadEventEnd - navTiming.startTime),
    domInteractive: Math.round(navTiming.domInteractive - navTiming.startTime)
  } : null;

  const totalTransfer = resources.reduce((sum, r) => sum + r.transferSize, 0);

  return {
    url: window.location.href,
    timing,
    summary: {
      totalRequests: resources.length,
      totalTransferKB: Math.round(totalTransfer / 1024),
      totalTransferMB: (totalTransfer / (1024 * 1024)).toFixed(2),
      firstPartyRequests: resources.filter(r => !r.isThirdParty).length,
      thirdPartyRequests: thirdParty.length,
      heavyAssetCount: heavyAssets.length,
      slowRequestCount: slowRequests.length
    },
    byType,
    heavyAssets: heavyAssets.map(r => ({
      url: r.url,
      type: r.type,
      transferKB: Math.round(r.transferSize / 1024),
      isThirdParty: r.isThirdParty
    })),
    slowRequests: slowRequests.map(r => ({
      url: r.url,
      type: r.type,
      durationMs: r.duration,
      isThirdParty: r.isThirdParty
    })),
    thirdPartyDomains: Object.entries(thirdPartyDomains)
      .sort((a, b) => b[1].totalTransfer - a[1].totalTransfer)
      .map(([domain, data]) => ({
        domain,
        requests: data.count,
        transferKB: Math.round(data.totalTransfer / 1024)
      }))
  };
};
