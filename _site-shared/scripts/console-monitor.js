// Console Monitor — run via Chrome MCP evaluate_script
// Injects a listener that captures console errors and warnings into a global array.
// Call once after navigating to a page. Retrieve results later with the getter below.
//
// Usage:
//   1. Run the `install` function via evaluate_script after each navigation
//   2. Interact with the page (click, scroll, etc.)
//   3. Run the `retrieve` function to get captured messages
//   4. Results include: level, message, source URL, line number, timestamp

// --- INSTALL (run first) ---
// eslint-disable-next-line no-unused-vars
const consoleMonitorInstall = () => {
  if (window.__consoleCapture) return { status: 'already_installed', count: window.__consoleCapture.length };

  window.__consoleCapture = [];
  const maxEntries = 200;

  const capture = (level, args) => {
    if (window.__consoleCapture.length >= maxEntries) return;
    const message = args.map(a => {
      try { return typeof a === 'object' ? JSON.stringify(a).slice(0, 500) : String(a); }
      catch { return String(a); }
    }).join(' ');

    window.__consoleCapture.push({
      level,
      message: message.slice(0, 1000),
      timestamp: Date.now(),
      url: window.location.href
    });
  };

  const origError = console.error;
  const origWarn = console.warn;
  console.error = (...args) => { capture('error', args); origError.apply(console, args); };
  console.warn = (...args) => { capture('warn', args); origWarn.apply(console, args); };

  // Also capture unhandled errors and rejections
  window.addEventListener('error', (e) => {
    capture('error', [`Unhandled: ${e.message} at ${e.filename}:${e.lineno}:${e.colno}`]);
  });
  window.addEventListener('unhandledrejection', (e) => {
    capture('error', [`Unhandled rejection: ${e.reason}`]);
  });

  return { status: 'installed' };
};

// --- RETRIEVE (run after interactions) ---
// eslint-disable-next-line no-unused-vars
const consoleMonitorRetrieve = () => {
  const entries = window.__consoleCapture || [];
  return {
    url: window.location.href,
    total: entries.length,
    errors: entries.filter(e => e.level === 'error'),
    warnings: entries.filter(e => e.level === 'warn'),
    summary: {
      errorCount: entries.filter(e => e.level === 'error').length,
      warningCount: entries.filter(e => e.level === 'warn').length
    }
  };
};
