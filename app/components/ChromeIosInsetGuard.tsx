// Chrome on iOS 26 keeps its WKWebView the full height of the screen and
// draws the toolbars over it, telling WebKit which strip is covered through
// the scroll view's content inset and WKWebView.obscuredContentInsets. Two
// things the page can see come out of that model:
//
// 1. Chrome sometimes re-applies those insets as zero right after the tab's
//    view appears (the moment the page also receives window focus). The
//    content then starts under the still-visible toolbar while scrollY stays
//    0 and innerHeight jumps to the screen height. No page-side scroll can
//    undo that: the missing pixels are a native inset, not a scroll offset.
//    This script only detects and reports it.
// 2. On the next reload of that tab, WebKit's saved scroll position carries
//    the toolbar height, and the restore lands the page that far down before
//    the reader has touched anything. That one the page can correct: when the
//    previous document in this tab was at the top (or was in state 1 and was
//    never scrolled by the reader), a scroll that lands inside the toolbar
//    band before any input is undone once with scrollTo(0, 0).
//
// Inert everywhere except Chrome on iOS (CriOS user agent). Plain ES5, every
// step wrapped in try/catch, so it can never break the page. When the opt-in
// tracer (ScrollDebugScript) is armed, every decision is also written into
// its log as a `mitigation` event; otherwise it sits in window.__criosGuard.
export default function ChromeIosInsetGuard() {
  const script = `
(function () {
  try {
    var ua = String(navigator.userAgent || '');
    if (ua.indexOf('CriOS/') === -1 || !/iPhone|iPad|iPod/.test(ua)) return;

    var KEY = 'crios-inset-guard';
    var perf = window.performance;
    var t0 = perf && perf.now ? perf.now() : Date.now();
    function now() { var n = perf && perf.now ? perf.now() : Date.now(); return Math.round((n - t0) * 10) / 10; }
    function num(v) { return typeof v === 'number' && isFinite(v) ? Math.round(v * 10) / 10 : null; }
    function curY() { try { var y = window.scrollY; if (typeof y !== 'number') y = window.pageYOffset; return num(y); } catch (e) { return null; } }
    function ih() { try { return num(window.innerHeight); } catch (e) { return null; } }
    function ch() { try { return num(document.documentElement.clientHeight); } catch (e) { return null; } }
    // Screen height along the current orientation: the innerHeight Chrome reports
    // when its insets are exactly zero. iOS reports screen.width/height in portrait
    // terms whatever the orientation.
    function fullHeight() {
      try {
        var w = screen.width, h = screen.height, landscape = false;
        try { landscape = !!(screen.orientation && /landscape/.test(String(screen.orientation.type))); } catch (e) {}
        if (!landscape) { try { landscape = Math.abs(Number(window.orientation)) === 90; } catch (e) {} }
        return landscape ? Math.min(w, h) : Math.max(w, h);
      } catch (e) { return null; }
    }
    var navType = 'unknown';
    try {
      var entries = perf.getEntriesByType ? perf.getEntriesByType('navigation') : null;
      if (entries && entries.length && entries[0].type) navType = entries[0].type;
      else if (perf.navigation) navType = ['navigate', 'reload', 'back_forward'][perf.navigation.type] || String(perf.navigation.type);
    } catch (e) {}

    // The records earlier documents in this tab left behind, one per path (see
    // save()), so a Back through another page still finds this page's record.
    var here = '/';
    try { here = String(location.pathname || '/'); } catch (e) {}
    function readMap() {
      try { var raw = sessionStorage.getItem(KEY); var m = raw ? JSON.parse(raw) : null; return m && typeof m === 'object' ? m : {}; } catch (e) { return {}; }
    }
    var prev = null;
    try { var entry = readMap()[here]; if (entry && typeof entry === 'object') prev = entry; } catch (e) {}
    var hasHash = false;
    try { hasHash = !!location.hash; } catch (e) {}
    var ih0 = ih(), ch0 = ch(), full = fullHeight();

    var log = [];
    window.__criosGuard = { prev: prev, navType: navType, log: log };
    function record(kind, fields) {
      var e = { kind: kind, tg: now() };
      try { for (var k in fields) if (Object.prototype.hasOwnProperty.call(fields, k)) e[k] = fields[k]; } catch (err) {}
      log.push(e);
      try {
        var dbg = window.__scrolldbg;
        if (dbg && typeof dbg.note === 'function') dbg.note('mitigation', e);
      } catch (err) {}
      return e;
    }
    function on(target, name, fn) {
      try { target.addEventListener(name, function (ev) { try { fn(ev); } catch (e) {} }, { capture: true, passive: true }); } catch (e) {
        try { target.addEventListener(name, fn, true); } catch (e2) {}
      }
    }

    // ---- reader input and reader-driven scrolling ----
    // A touch scroll is always preceded by touchstart (and pointerdown); trackpad
    // and keyboard scrolling by wheel and keydown; a focus move by focusin. The
    // guard never acts after any of these.
    var input = null;
    var touching = false, lastTouchEnd = -1e9, lastInputAt = -1e9;
    var userScrolled = false;
    function onInput(ev) {
      if (!input) input = { type: ev.type, t: now() };
      lastInputAt = now();
      if (ev.type === 'touchstart') touching = true;
    }
    on(window, 'pointerdown', onInput);
    on(window, 'touchstart', onInput);
    on(window, 'wheel', onInput);
    on(window, 'keydown', onInput);
    on(window, 'focusin', onInput);
    on(window, 'touchend', function () { touching = false; lastTouchEnd = now(); });
    on(window, 'touchcancel', function () { touching = false; lastTouchEnd = now(); });
    on(window, 'scroll', function () {
      if (touching || now() - lastInputAt < 1500 || now() - lastTouchEnd < 1500) userScrolled = true;
    });

    // ---- 1. covered state: innerHeight grows to the screen height with no scroll and no input ----
    // The baseline is the smallest innerHeight seen so far, not the value at t0:
    // before the viewport meta applies WebKit reports a desktop-sized viewport.
    var covered = null, ihMin = null;
    function checkCovered(src) {
      if (covered || input) return;
      var h = ih(), y = curY(), f = fullHeight();
      if (f === null || h === null || y === null) return;
      if (h <= f + 2 && (ihMin === null || h < ihMin)) ihMin = h;
      if (h >= f - 2 && h <= f + 2 && y < 1 && ihMin !== null && h - ihMin >= 40) {
        covered = record('covered', {
          action: 'none', src: src, ihMin: ihMin, ih: h, ch: ch(), full: f, y: y,
          reason: 'scrollY is already 0: the offset is the native content inset, outside the page'
        });
      }
    }
    checkCovered('init');
    on(window, 'resize', function () { checkCovered('resize'); });
    try { if (window.visualViewport) on(window.visualViewport, 'resize', function () { checkCovered('vv.resize'); }); } catch (e) {}
    try {
      var coverPoll = setInterval(function () {
        try {
          if (covered || input || now() > 8000) { clearInterval(coverPoll); return; }
          checkCovered('poll');
        } catch (e) {}
      }, 100);
    } catch (e) {}

    // ---- 2. restoration guard ----
    var restoring = navType === 'reload' || navType === 'back_forward';
    var samePage = !!(prev && prev.u === here);
    var prevAtTop = !!(prev && typeof prev.y === 'number' && prev.y <= 8);
    var prevCoveredUnscrolled = !!(prev && prev.cov === 1 && prev.us !== 1);
    var armed = restoring && !hasHash && samePage && (prevAtTop || prevCoveredUnscrolled);
    // The bug lands the page exactly one top-toolbar height down, which is less
    // than the total toolbar height Chrome holds out of the layout viewport
    // (screen height minus clientHeight). Measured at check time, once the
    // viewport meta has applied; a nonsensical band falls back to 240px.
    function toolbarBand() {
      var f = fullHeight(), c = ch();
      if (f === null || c === null || c <= 0 || f - c < 40) return null;
      return num(f - c);
    }
    var lower = 16;
    function upperBound(band) { return band !== null ? band + 24 : 240; }
    var corrections = 0, guardDone = !armed;
    record('arm', {
      armed: armed, navType: navType, samePage: samePage, hash: hasHash,
      prevY: prev ? prev.y : null, prevCovered: prev ? prev.cov : null, prevUserScrolled: prev ? prev.us : null,
      prevIh: prev ? prev.ih : null, band: toolbarBand(), ih0: ih0, ch0: ch0, full: full
    });
    function checkRestore(src) {
      if (guardDone) return;
      if (input) { guardDone = true; record('disarm', { reason: 'input', type: input.type, y: curY() }); return; }
      if (now() > 6000) { guardDone = true; return; }
      var y = curY();
      if (y === null || y <= lower) return;
      var band = toolbarBand(), upper = upperBound(band);
      if (y > upper) {
        guardDone = true;
        record('restore', { action: 'none', reason: 'outside toolbar band', src: src, y: y, band: band, upper: upper });
        return;
      }
      corrections++;
      var before = y;
      window.scrollTo(0, 0);
      var after = curY();
      record('restore', {
        action: 'scrollTo(0,0)', src: src, from: before, after: after, n: corrections, band: band, upper: upper,
        prevY: prev.y, prevCovered: prev.cov, prevUserScrolled: prev.us, navType: navType, ih: ih(), ch: ch()
      });
      // WebKit may try the restore twice (first layout and load completion).
      if (corrections >= 2) guardDone = true;
    }
    on(window, 'scroll', function () { checkRestore('scroll'); });
    try {
      var restorePoll = setInterval(function () {
        try {
          if (guardDone || now() > 6000) { clearInterval(restorePoll); return; }
          checkRestore('tick');
        } catch (e) {}
      }, 32);
    } catch (e) {}

    // ---- the record for the next document of this path in this tab ----
    function save() {
      try {
        var path = String(location.pathname || '/');
        var map = readMap();
        map[path] = {
          u: path, y: curY(), ih: ih(), ch: ch(), full: full,
          cov: covered ? 1 : 0, inp: input ? 1 : 0, us: userScrolled ? 1 : 0, nav: navType, t: Date.now()
        };
        // Keep the 20 most recent paths.
        var keys = [];
        for (var k in map) if (Object.prototype.hasOwnProperty.call(map, k)) keys.push(k);
        if (keys.length > 20) {
          keys.sort(function (a, b) { return (map[b].t || 0) - (map[a].t || 0); });
          for (var i = 20; i < keys.length; i++) delete map[keys[i]];
        }
        sessionStorage.setItem(KEY, JSON.stringify(map));
      } catch (e) {}
    }
    on(window, 'pagehide', save);
    on(window, 'visibilitychange', function () { if (document.visibilityState === 'hidden') save(); });
  } catch (e) {}
})();
`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
