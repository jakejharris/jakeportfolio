// Gated, pre-hydration scroll debugger. Inert unless the URL contains
// `scrolldebug` (`?scrolldebug=on` persists it in localStorage, `?scrolldebug=off`
// clears it). When armed it wraps every programmatic scroll API, listens to the
// scroll- and viewport-related window events, samples layout with rAF, and
// renders a fixed overlay with Copy / Share / Copy last / Share last / Hide /
// Off buttons. Every capture is written to localStorage from the first sample,
// so a run that snapped survives even if the panel never rendered: "Copy last"
// exports the previous run. Plain ES5 so iOS Safari 15+ parses it; everything
// is wrapped in try/catch so it can never break the page.
//
// Measurements: `h1` is the layout document offset of `main h1` (offsetTop
// chain, transforms excluded) and is what a layout shift would move. `h1r` is
// the getBoundingClientRect offset, which includes the entrance animation's
// translateY, and `anim` names any running animation on the h1 or its
// ancestors so the two can be told apart.
export default function ScrollDebugScript() {
  const script = `
(function () {
  try {
    var search = '';
    try { search = String(location.search || ''); } catch (e) {}
    var stored = null;
    try { stored = localStorage.getItem('scrolldebug'); } catch (e) {}
    if (search.indexOf('scrolldebug=off') !== -1) {
      try { localStorage.removeItem('scrolldebug'); } catch (e) {}
      return;
    }
    var armedByUrl = search.indexOf('scrolldebug=on') !== -1;
    if (armedByUrl) {
      try { localStorage.setItem('scrolldebug', '1'); } catch (e) {}
    }
    if (search.indexOf('scrolldebug') === -1 && stored !== '1') return;

    var LS_CUR = 'scrolldebug.cur', LS_PREV = 'scrolldebug.prev', LS_PREV2 = 'scrolldebug.prev2';
    var perf = window.performance;
    var t0 = perf && perf.now ? perf.now() : Date.now();
    var hydAt = null; // set when the first app scroll listener attaches (hydration marker)
    function now() {
      var n = perf && perf.now ? perf.now() : Date.now();
      return Math.round((n - t0) * 10) / 10;
    }
    function safe(fn, fallback) { try { return fn(); } catch (e) { return fallback; } }
    function r1(v) { return Math.round(v * 10) / 10; }
    function curY() {
      return safe(function () {
        var y = window.scrollY;
        if (typeof y !== 'number') y = window.pageYOffset;
        if (typeof y !== 'number') y = document.documentElement.scrollTop;
        return r1(y);
      }, -1);
    }

    // Rotate stored runs before anything else so the previous run is safe.
    var prevRaw = null;
    try {
      var oldPrev = localStorage.getItem(LS_PREV);
      var oldCur = localStorage.getItem(LS_CUR);
      if (oldCur) {
        if (oldPrev) localStorage.setItem(LS_PREV2, oldPrev);
        localStorage.setItem(LS_PREV, oldCur);
        prevRaw = oldCur;
      } else {
        prevRaw = oldPrev;
      }
    } catch (e) {}

    var ua = safe(function () { return navigator.userAgent; }, '');
    var header = { v: 3 };
    header.href = safe(function () { return location.href; }, '');
    header.armedBy = armedByUrl ? 'url' : (search.indexOf('scrolldebug') !== -1 ? 'url-other' : 'storage');
    header.referrer = safe(function () { return document.referrer; }, '');
    header.opener = safe(function () { return !!window.opener; }, false);
    header.historyLength = safe(function () { return history.length; }, null);
    header.windowName = safe(function () { return String(window.name || ''); }, '');
    header.navType = safe(function () {
      var entries = perf.getEntriesByType ? perf.getEntriesByType('navigation') : null;
      if (entries && entries.length && entries[0].type) return entries[0].type;
      var n = perf.navigation;
      if (n) return ['navigate', 'reload', 'back_forward', 'reserved'][n.type] || String(n.type);
      return 'unknown';
    }, 'unknown');
    header.redirectCount = safe(function () {
      var entries = perf.getEntriesByType ? perf.getEntriesByType('navigation') : null;
      if (entries && entries.length) return entries[0].redirectCount;
      return perf.navigation ? perf.navigation.redirectCount : null;
    }, null);
    header.scrollRestoration = safe(function () { return history.scrollRestoration || 'n/a'; }, 'n/a');
    header.ua = ua;
    header.browser = /CriOS/.test(ua) ? 'chrome-ios' : /FxiOS/.test(ua) ? 'firefox-ios' : /EdgiOS/.test(ua) ? 'edge-ios' : /iPhone|iPad|iPod/.test(ua) ? 'safari-ios' : 'other';
    header.gCrWeb = safe(function () { return !!window.__gCrWeb; }, false);
    header.standalone = safe(function () { return !!navigator.standalone; }, false);
    header.visibility = safe(function () { return document.visibilityState; }, '');
    header.hasFocus = safe(function () { return document.hasFocus(); }, null);
    header.wasDiscarded = safe(function () { return !!document.wasDiscarded; }, false);
    header.innerWidth = safe(function () { return window.innerWidth; }, null);
    header.innerHeight = safe(function () { return window.innerHeight; }, null);
    header.clientHeight = safe(function () { return document.documentElement.clientHeight; }, null);
    header.screen = safe(function () { return screen.width + 'x' + screen.height; }, '');
    header.orientation = safe(function () { return (screen.orientation && screen.orientation.type) || String(window.orientation); }, '');
    header.visualViewport = safe(function () {
      var vv = window.visualViewport;
      if (!vv) return null;
      return { width: vv.width, height: vv.height, offsetTop: vv.offsetTop, pageTop: vv.pageTop, scale: vv.scale };
    }, null);
    header.dpr = safe(function () { return window.devicePixelRatio; }, null);
    header.reducedMotion = safe(function () { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }, null);
    header.readyStateAtT0 = safe(function () { return document.readyState; }, '');
    header.scrollYAtT0 = curY();
    header.startedAt = new Date().toISOString();
    header.hasPrev = !!prevRaw;

    var timeline = [];
    var events = [];
    var calls = [];
    var log = { header: header, timeline: timeline, events: events, calls: calls };
    window.__scrolldbg = log;

    // ---- persistence: the current run is always in localStorage ----
    function stringify(obj) { try { return JSON.stringify(obj); } catch (e) { return '{"error":"stringify failed"}'; } }
    function stripStacks(obj) {
      try {
        var copy = JSON.parse(stringify(obj));
        var i;
        for (i = 0; i < copy.calls.length; i++) delete copy.calls[i].stack;
        for (i = 0; i < copy.events.length; i++) delete copy.events[i].stack;
        return copy;
      } catch (e) { return { header: obj.header, error: 'strip failed' }; }
    }
    var persistTimer = null;
    function persistNow() {
      persistTimer = null;
      try { localStorage.setItem(LS_CUR, stringify(log)); return; } catch (e) {}
      try { localStorage.setItem(LS_CUR, stringify(stripStacks(log))); } catch (e2) {}
    }
    function persist() {
      if (persistTimer !== null) return;
      try { persistTimer = setTimeout(persistNow, 150); } catch (e) { persistNow(); }
    }
    function addEvent(e) { events.push(e); persist(); return e; }
    persistNow();

    function captureStack() {
      try {
        var s = new Error().stack || '';
        var lines = s.split('\\n');
        var out = [];
        for (var i = 0; i < lines.length && out.length < 6; i++) {
          var line = lines[i];
          if (!line || line === 'Error') continue;
          if (line.indexOf('captureStack') !== -1 || line.indexOf('sdbgWrapped') !== -1 || line.indexOf('sdbgRecord') !== -1 || line.indexOf('sdbgAEL') !== -1) continue;
          // Drop the origin and chunk path: the file hash and offset identify the frame.
          out.push(line.replace(/^\\s+/, '').replace(/https?:\\/\\/[^\\s\\/]+\\/_next\\/static\\/chunks\\//g, '').replace(/https?:\\/\\/[^\\s\\/]+\\//g, '/'));
        }
        return out.join('\\n');
      } catch (e) { return ''; }
    }

    function desc(el) {
      try {
        if (el === null || el === undefined) return 'null';
        if (el === window) return 'window';
        if (el === document) return 'document';
        if (el === document.documentElement) return 'html';
        if (el === document.body) return 'body';
        if (el === window.history) return 'history';
        if (el === window.visualViewport) return 'visualViewport';
        if (!el.nodeType) return String(el).slice(0, 60);
        var s = String(el.tagName || el.nodeName || 'node').toLowerCase();
        if (el.id) s += '#' + el.id;
        var c = el.className;
        if (c && typeof c === 'string') {
          var cls = c.replace(/\\s+/g, ' ').trim().split(' ').slice(0, 4).join('.');
          if (cls) s += '.' + cls;
        }
        return s.slice(0, 120);
      } catch (e) { return '?'; }
    }

    function short(v) {
      try {
        var s = JSON.stringify(v, function (k, val) {
          if (val && typeof val === 'object' && val.nodeType) return desc(val);
          if (typeof val === 'function') return '[fn]';
          return val;
        });
        if (s === undefined) s = String(v);
        return s.length > 160 ? s.slice(0, 160) + '...' : s;
      } catch (e) { return safe(function () { return String(v); }, '?'); }
    }

    function sdbgRecord(api, target, args, extra) {
      var entry = { t: now(), api: api, target: target, args: short(args), y: curY(), hyd: hydAt === null ? 0 : 1, stack: captureStack() };
      if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) entry[k] = extra[k];
      calls.push(entry);
      persist();
      return entry;
    }

    // wrapFn(obj, name, api, filter, extraFn): filter(this, args) -> boolean (log or not),
    // extraFn(this, args) -> extra fields. Always calls the original with the same this/args.
    function wrapFn(obj, name, api, filter, extraFn) {
      try {
        if (!obj) return;
        var orig = obj[name];
        if (typeof orig !== 'function') return;
        obj[name] = function sdbgWrapped() {
          var args = Array.prototype.slice.call(arguments);
          try {
            if (!filter || filter(this, args)) {
              sdbgRecord(api, desc(this), args, extraFn ? extraFn(this, args) : null);
            }
          } catch (e) {}
          return orig.apply(this, arguments);
        };
        try { obj[name].toString = function () { return orig.toString(); }; } catch (e) {}
      } catch (e) {}
    }

    function isRootEl(el) {
      try { return el === document.documentElement || el === document.body || el === document.scrollingElement; } catch (e) { return false; }
    }

    wrapFn(window, 'scrollTo', 'window.scrollTo');
    wrapFn(window, 'scroll', 'window.scroll');
    wrapFn(window, 'scrollBy', 'window.scrollBy');
    var EP = window.Element && Element.prototype;
    var HP = window.HTMLElement && HTMLElement.prototype;
    wrapFn(EP, 'scrollIntoView', 'Element.scrollIntoView');
    if (EP && EP.scrollIntoViewIfNeeded) wrapFn(EP, 'scrollIntoViewIfNeeded', 'Element.scrollIntoViewIfNeeded');
    // Element-level scroll APIs only matter for the root scroller.
    wrapFn(EP, 'scrollTo', 'Element.scrollTo', isRootEl);
    wrapFn(EP, 'scroll', 'Element.scroll', isRootEl);
    wrapFn(EP, 'scrollBy', 'Element.scrollBy', isRootEl);
    wrapFn(HP, 'focus', 'HTMLElement.focus', null, function (self, args) {
      return { preventScroll: !!(args[0] && args[0].preventScroll) };
    });
    wrapFn(window.history, 'pushState', 'history.pushState');
    wrapFn(window.history, 'replaceState', 'history.replaceState');

    try {
      var d = Object.getOwnPropertyDescriptor(EP, 'scrollTop');
      if (d && d.set && d.configurable) {
        Object.defineProperty(EP, 'scrollTop', {
          configurable: true,
          enumerable: d.enumerable,
          get: d.get,
          set: function (v) {
            try { if (isRootEl(this)) sdbgRecord('scrollTop=', desc(this), [v]); } catch (e) {}
            return d.set.call(this, v);
          }
        });
      }
    } catch (e) {}

    // ---- layout probes ----
    function findNav() {
      try {
        var navs = document.querySelectorAll('nav.navbar-sticky');
        var fallback = null;
        for (var i = 0; i < navs.length; i++) {
          fallback = navs[i];
          if (navs[i].getClientRects().length) return navs[i];
        }
        return fallback;
      } catch (e) { return null; }
    }
    // Document offset from the offsetTop chain: layout position, transforms excluded.
    function layoutTop(el) {
      var y = 0, n = el, guard = 0;
      while (n && guard++ < 64) { y += n.offsetTop || 0; n = n.offsetParent; }
      return r1(y);
    }
    // Running animations on el and up to three ancestors, as name@currentTime/duration.
    function animInfo(el) {
      var out = [], n = el, depth = 0;
      while (n && n !== document.body && depth++ < 4) {
        try {
          var as = n.getAnimations ? n.getAnimations() : [];
          for (var i = 0; i < as.length; i++) {
            var a = as[i];
            var name = a.animationName || a.id || 'anim';
            var ct = a.currentTime;
            var dur = null;
            try { dur = a.effect && a.effect.getTiming ? a.effect.getTiming().duration : null; } catch (e) {}
            out.push(name + '@' + (ct === null || ct === undefined ? '?' : Math.round(ct)) + (typeof dur === 'number' ? '/' + Math.round(dur) : ''));
          }
        } catch (e) {}
        n = n.parentElement;
      }
      return out.join(',');
    }
    // Status of the wordmark face (Sentient): loaded, loading, unloaded, or none.
    function wordmarkFont() {
      try {
        if (!document.fonts) return 'n/a';
        var status = 'none';
        document.fonts.forEach(function (f) {
          try { if (/sentient/i.test(f.family) && !/fallback/i.test(f.family)) status = f.status; } catch (e) {}
        });
        return status;
      } catch (e) { return 'n/a'; }
    }
    function snap(kind) {
      var e = { t: now(), ev: kind, y: curY() };
      try {
        var vv = window.visualViewport;
        if (vv) { e.vvTop = r1(vv.offsetTop); e.vvPageTop = r1(vv.pageTop); e.vvH = Math.round(vv.height); e.vvScale = r1(vv.scale); }
      } catch (err) {}
      e.ih = safe(function () { return window.innerHeight; }, null);
      e.ch = safe(function () { return document.documentElement.clientHeight; }, null);
      e.sh = safe(function () { return document.documentElement.scrollHeight; }, null);
      e.hyd = hydAt === null ? 0 : 1;
      try {
        var n = findNav();
        if (n) {
          var r = n.getBoundingClientRect();
          e.nav = r1(r.top);
          e.navH = Math.round(r.height);
          var cls = String(n.className);
          e.navHidden = cls.indexOf('translate-y-[-100%]') !== -1 ? 1 : 0;
          e.navScrolled = cls.indexOf('scrolled') !== -1 ? 1 : 0;
        }
      } catch (err) {}
      try {
        var main = document.querySelector('main');
        if (main) e.main = layoutTop(main);
        var hero = document.querySelector('main .hero') || document.querySelector('main header');
        if (hero) e.hero = layoutTop(hero);
        var h1 = document.querySelector('main h1');
        if (h1) {
          var hr = h1.getBoundingClientRect();
          e.h1 = layoutTop(h1);
          e.h1r = r1(hr.top + e.y);
          e.h1vp = r1(hr.top);
          e.h1op = safe(function () { return r1(parseFloat(getComputedStyle(h1).opacity)); }, null);
          e.anim = animInfo(h1);
        }
        var kick = document.querySelector('main .section-kicker');
        if (kick) e.kick = layoutTop(kick);
      } catch (err) {}
      e.wm = wordmarkFont();
      e.panel = safe(function () { var p = document.getElementById('scrolldbg'); return p && p.isConnected ? 1 : 0; }, 0);
      return e;
    }

    // Timeline: one line whenever anything that can move the page changes.
    var SIG_KEYS = ['y', 'vvTop', 'vvPageTop', 'vvH', 'vvScale', 'ih', 'ch', 'nav', 'navH', 'navHidden', 'main', 'hero', 'h1', 'kick', 'wm'];
    var lastSigEntry = null;
    function changedKeys(a, b) {
      var out = [];
      for (var i = 0; i < SIG_KEYS.length; i++) {
        var k = SIG_KEYS[i];
        if ((a ? a[k] : undefined) !== b[k]) out.push(k);
      }
      return out;
    }
    function pushTimeline(entry, force) {
      var chg = changedKeys(lastSigEntry, entry);
      if (!force && lastSigEntry !== null && !chg.length) return;
      if (lastSigEntry !== null) entry.chg = chg.join(',');
      lastSigEntry = entry;
      timeline.push(entry);
      persist();
    }
    pushTimeline(snap('init'));

    // The mobile nav hides via a class flip (React state, one rAF after the scroll
    // event), so watch its class attribute and force a timeline line when it changes.
    var navObserved = null;
    function observeNav() {
      try {
        if (!window.MutationObserver) return;
        var n = findNav();
        if (!n || n === navObserved) return;
        navObserved = n;
        var lastHidden = String(n.className).indexOf('translate-y-[-100%]') !== -1 ? 1 : 0;
        new MutationObserver(function () {
          try {
            var hiddenNow = String(n.className).indexOf('translate-y-[-100%]') !== -1 ? 1 : 0;
            if (hiddenNow === lastHidden) return;
            lastHidden = hiddenNow;
            var e = snap('nav.class');
            addEvent(e);
            pushTimeline(e, true);
          } catch (err) {}
        }).observe(n, { attributes: true, attributeFilter: ['class'] });
      } catch (e) {}
    }

    var lastLoggedScrollY = null;
    function onScroll(ev) {
      try {
        var e = snap('scroll');
        e.target = desc(ev.target);
        var early = (perf && perf.now ? perf.now() : Date.now()) - t0 < 3000;
        if (early || lastLoggedScrollY === null || Math.abs(e.y - lastLoggedScrollY) > 2) {
          lastLoggedScrollY = e.y;
          addEvent(e);
        }
        pushTimeline(e);
      } catch (err) {}
    }
    function on(target, name, fn, opts) {
      try { target.addEventListener(name, function (ev) { try { fn(ev); } catch (e) {} }, opts || { capture: true, passive: true }); } catch (e) {
        try { target.addEventListener(name, fn, true); } catch (e2) {}
      }
    }
    on(window, 'scroll', onScroll);
    on(window, 'resize', function () { var e = snap('resize'); e.iw = window.innerWidth; addEvent(e); pushTimeline(e); });
    on(window, 'orientationchange', function () { var e = snap('orientationchange'); e.iw = window.innerWidth; addEvent(e); });
    on(window, 'pageshow', function (ev) { var e = snap('pageshow'); e.persisted = !!ev.persisted; addEvent(e); pushTimeline(e); });
    on(window, 'pagehide', function (ev) { var e = snap('pagehide'); e.persisted = !!ev.persisted; addEvent(e); persistNow(); });
    on(window, 'load', function () { var e = snap('load'); e.readyState = document.readyState; e.gCrWeb = safe(function () { return !!window.__gCrWeb; }, false); addEvent(e); pushTimeline(e); });
    on(window, 'DOMContentLoaded', function () { var e = snap('DOMContentLoaded'); e.readyState = document.readyState; addEvent(e); pushTimeline(e); });
    on(window, 'hashchange', function () { var e = snap('hashchange'); e.hash = location.hash; addEvent(e); });
    on(window, 'popstate', function (ev) { var e = snap('popstate'); e.state = short(ev.state); e.href = location.href; addEvent(e); });
    on(window, 'focusin', function (ev) { var e = snap('focusin'); e.target = desc(ev.target); e.active = desc(document.activeElement); addEvent(e); });
    on(window, 'focus', function (ev) { if (ev.target !== window && ev.target !== document) return; var e = snap('win.focus'); addEvent(e); }, false);
    on(window, 'blur', function (ev) { if (ev.target !== window && ev.target !== document) return; var e = snap('win.blur'); addEvent(e); }, false);
    on(window, 'visibilitychange', function () { var e = snap('visibilitychange'); e.state = document.visibilityState; addEvent(e); if (document.visibilityState === 'hidden') persistNow(); });
    var inputSeen = {};
    var touchCount = 0;
    function onInput(ev) {
      var type = ev.type;
      if (!inputSeen[type]) {
        inputSeen[type] = 1;
        var e = snap('input.first');
        e.type = type; e.target = desc(ev.target);
        addEvent(e);
      } else if (type === 'touchstart' && touchCount++ < 5) {
        var e2 = snap('touchstart');
        e2.target = desc(ev.target);
        addEvent(e2);
      }
    }
    on(window, 'touchstart', onInput);
    on(window, 'pointerdown', onInput);
    on(window, 'wheel', onInput);
    on(window, 'keydown', onInput);
    try {
      if (window.visualViewport) {
        on(window.visualViewport, 'resize', function () { var e = snap('vv.resize'); addEvent(e); pushTimeline(e); });
        on(window.visualViewport, 'scroll', function () { var e = snap('vv.scroll'); pushTimeline(e); addEvent(e); });
      }
    } catch (e) {}
    try {
      if (document.fonts) {
        var faces = function (list) {
          var out = [];
          var push = function (f) { try { out.push(String(f.family).replace(/["']/g, '') + ':' + f.status); } catch (e) {} };
          try { if (typeof list.forEach === 'function') list.forEach(push); else Array.prototype.forEach.call(list, push); } catch (e) {}
          return out.join(' ');
        };
        on(document.fonts, 'loadingdone', function (ev) { var e = snap('fonts.loadingdone'); e.faces = faces(ev.fontfaces || []); addEvent(e); pushTimeline(e); }, false);
        on(document.fonts, 'loadingerror', function (ev) { var e = snap('fonts.loadingerror'); e.faces = faces(ev.fontfaces || []); addEvent(e); }, false);
        document.fonts.ready.then(function () { var e = snap('fonts.ready'); e.faces = faces(document.fonts); addEvent(e); pushTimeline(e); });
      }
    } catch (e) {}

    // Hydration marker: React registers its own scroll listener on document when
    // it starts hydrating; app effects (NavbarScrollProvider first) add theirs on
    // window. hyd flips on the first window listener. Every add is logged with
    // its stack; scroll events and API calls carry hyd=0/1 relative to it.
    var listenerAdds = 0;
    function wrapAEL(target, label) {
      try {
        var orig = target.addEventListener;
        if (typeof orig !== 'function') return;
        target.addEventListener = function sdbgAEL(type) {
          try {
            if (type === 'scroll' && listenerAdds++ < 12) {
              var t = now();
              if (hydAt === null && label === 'window') hydAt = t;
              var e = { t: t, ev: 'listener.add', type: type, target: label, y: curY(), stack: captureStack() };
              addEvent(e);
            }
          } catch (e2) {}
          return orig.apply(this, arguments);
        };
      } catch (e) {}
    }
    wrapAEL(window, 'window');
    wrapAEL(document, 'document');

    // Samplers: a 16ms timer for the first 1.5s (rAF does not run before first
    // paint, a restoration can), rAF to 8s, then 250ms polling to 30s. Catches
    // moves that fire no scroll event and viewport changes (toolbar collapse,
    // keyboard, zoom).
    function elapsed() { return (perf && perf.now ? perf.now() : Date.now()) - t0; }
    try {
      var fast = setInterval(function () {
        try {
          if (elapsed() > 1500) { clearInterval(fast); return; }
          pushTimeline(snap('tick'));
        } catch (e) {}
      }, 16);
    } catch (e) {}
    function sampleRaf() {
      try {
        pushTimeline(snap('raf'));
        if (elapsed() < 8000) requestAnimationFrame(sampleRaf);
      } catch (e) {}
    }
    try { requestAnimationFrame(sampleRaf); } catch (e) {}
    try {
      var poll = setInterval(function () {
        try {
          if (elapsed() > 30000) { clearInterval(poll); return; }
          if (elapsed() < 8000) return;
          pushTimeline(snap('poll'));
        } catch (e) {}
      }, 250);
    } catch (e) {}

    // ---- overlay ----
    var overlay = null, pre = null, statusEl = null, hidden = false;
    function json() { return stringify(log); }
    function setStatus(msg) { try { if (statusEl) statusEl.textContent = msg; } catch (e) {} }
    function copyFallback(text) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
      (overlay || document.body).appendChild(ta);
      ta.select();
      try { ta.setSelectionRange(0, text.length); } catch (e) {}
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      ta.parentNode.removeChild(ta);
      return ok;
    }
    function copyText(text, label) {
      if (!text) { setStatus(label + ': nothing stored'); return; }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { setStatus(label + ': copied ' + text.length + ' chars'); }, function () {
          setStatus(copyFallback(text) ? label + ': copied (fallback)' : label + ': copy failed');
        });
      } else {
        setStatus(copyFallback(text) ? label + ': copied (fallback)' : label + ': copy failed');
      }
    }
    function shareText(text, label, name) {
      if (!text) { setStatus(label + ': nothing stored'); return; }
      if (!navigator.share) { setStatus('share unavailable'); return; }
      var payload = { title: 'scrolldebug ' + name };
      var asFile = false;
      try {
        if (window.File && navigator.canShare) {
          var file = new File([text], 'scrolldebug-' + name + '.json', { type: 'application/json' });
          if (navigator.canShare({ files: [file] })) { payload.files = [file]; asFile = true; }
        }
      } catch (e) {}
      if (!asFile) payload.text = text;
      navigator.share(payload).then(function () { setStatus(label + ': shared' + (asFile ? ' as file' : ' as text')); }, function (err) { setStatus(label + ': share ' + (err && err.name)); });
    }
    function prevText() { try { return localStorage.getItem(LS_PREV) || ''; } catch (e) { return ''; } }
    function copy() { persistNow(); copyText(json(), 'this run'); }
    function share() { persistNow(); shareText(json(), 'this run', 'current'); }
    function copyLast() { copyText(prevText(), 'last run'); }
    function shareLast() { shareText(prevText(), 'last run', 'last'); }
    function hide() {
      hidden = true;
      try { if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); } catch (e) {}
      overlay = null; pre = null; statusEl = null;
    }
    function off() {
      try { localStorage.removeItem('scrolldebug'); } catch (e) {}
      hide();
    }
    function fmtY(v) { return v === null || v === undefined ? '?' : String(v); }
    function summarize(raw) {
      try {
        var run = JSON.parse(raw);
        var h = run.header || {};
        var maxY = 0, hid = 0, i;
        for (i = 0; i < (run.timeline || []).length; i++) { var e = run.timeline[i]; if (e.y > maxY) maxY = e.y; if (e.navHidden) hid = 1; }
        for (i = 0; i < (run.events || []).length; i++) { if (run.events[i].navHidden) hid = 1; }
        return (h.startedAt || '?') + ' ' + (h.href || '?') + ' nav=' + h.navType + ' armed=' + h.armedBy + ' maxY=' + maxY + ' navHidden=' + hid + ' events=' + (run.events || []).length + ' calls=' + (run.calls || []).length;
      } catch (e) { return raw ? '(unreadable, ' + raw.length + ' chars)' : '(none)'; }
    }
    function renderText() {
      var out = [];
      out.push('scrolldebug v3  t0=' + header.startedAt + '  now=' + now() + 'ms  y=' + curY() + '  armed=' + header.armedBy + '  ' + header.browser);
      out.push('href=' + header.href);
      out.push('referrer=' + (header.referrer || '(none)') + '  opener=' + header.opener + '  hist=' + header.historyLength + '  nav=' + header.navType + '  redirects=' + header.redirectCount + '  scrollRestoration=' + header.scrollRestoration + '  vis@t0=' + header.visibility + '  focus@t0=' + header.hasFocus);
      out.push('inner=' + header.innerWidth + 'x' + header.innerHeight + '  ch@t0=' + header.clientHeight + '  screen=' + header.screen + '  dpr=' + header.dpr + '  vv@t0=' + short(header.visualViewport) + '  readyState@t0=' + header.readyStateAtT0 + '  y@t0=' + header.scrollYAtT0 + '  reducedMotion=' + header.reducedMotion);
      out.push('ua=' + header.ua);
      out.push('last run: ' + summarize(prevText()));
      out.push('');
      out.push('-- timeline (' + timeline.length + ')  h1=layout offset, h1r=rect offset incl. transform --');
      for (var i = 0; i < timeline.length; i++) {
        var e = timeline[i];
        out.push('t=' + e.t + 'ms y=' + fmtY(e.y) + ' h1=' + fmtY(e.h1) + ' h1r=' + fmtY(e.h1r) + ' hero=' + fmtY(e.hero) + ' nav=' + fmtY(e.nav) + '/' + fmtY(e.navH) + ' hid=' + fmtY(e.navHidden) + ' vvTop=' + fmtY(e.vvTop) + ' vvH=' + fmtY(e.vvH) + ' ih=' + fmtY(e.ih) + ' ch=' + fmtY(e.ch) + ' sh=' + fmtY(e.sh) + ' hyd=' + e.hyd + ' wm=' + e.wm + (e.anim ? ' anim=' + e.anim : '') + ' [' + e.ev + (e.chg ? ': ' + e.chg : '') + ']');
      }
      out.push('');
      out.push('-- api calls (' + calls.length + ') --');
      for (var j = 0; j < calls.length; j++) {
        var c = calls[j];
        out.push('t=' + c.t + 'ms ' + c.api + ' target=' + c.target + ' args=' + c.args + ' y=' + fmtY(c.y) + ' hyd=' + c.hyd + (c.preventScroll !== undefined ? ' preventScroll=' + c.preventScroll : ''));
        if (c.stack) out.push('   ' + c.stack.replace(/\\n/g, '\\n   '));
      }
      out.push('');
      out.push('-- events (' + events.length + ') --');
      for (var k = 0; k < events.length; k++) {
        var ev = events[k];
        var extra = [];
        for (var key in ev) {
          if (!Object.prototype.hasOwnProperty.call(ev, key)) continue;
          if (key === 't' || key === 'ev' || key === 'stack') continue;
          extra.push(key + '=' + ev[key]);
        }
        out.push('t=' + ev.t + 'ms ' + ev.ev + ' ' + extra.join(' '));
        if (ev.stack) out.push('   ' + ev.stack.replace(/\\n/g, '\\n   '));
      }
      return out.join('\\n');
    }
    function render() {
      try {
        if (hidden) return;
        if (navObserved && !navObserved.isConnected) navObserved = null;
        observeNav();
        if (overlay && !overlay.isConnected && document.body) { document.body.appendChild(overlay); addEvent({ t: now(), ev: 'panel.remount', y: curY() }); }
        if (pre) pre.textContent = renderText();
      } catch (e) {}
    }
    function makeBtn(label, fn) {
      var b = document.createElement('button');
      b.type = 'button';
      b.tabIndex = -1;
      b.textContent = label;
      b.style.cssText = 'font:inherit;font-size:12px;color:#fff;background:#333;border:1px solid #777;padding:4px 10px;border-radius:4px;margin:0;white-space:nowrap;';
      b.addEventListener('click', function (ev) { try { ev.preventDefault(); ev.stopPropagation(); fn(); } catch (e) {} });
      return b;
    }
    function mountOverlay() {
      if (overlay || hidden) return;
      try {
        if (!document.body) return;
        var box = document.createElement('div');
        box.id = 'scrolldbg';
        box.setAttribute('aria-hidden', 'true');
        box.setAttribute('data-nosnippet', '');
        // position:fixed keeps it out of flow: it cannot move any in-flow element.
        box.style.cssText = 'position:fixed;bottom:0;left:0;right:0;max-height:45vh;overflow:auto;overscroll-behavior:contain;z-index:2147483647;background:rgba(0,0,0,.88);color:#9f9;font:10px/1.3 ui-monospace,Menlo,monospace;padding:6px;pointer-events:auto;box-sizing:border-box;margin:0;text-align:left;-webkit-overflow-scrolling:touch;';
        var bar = document.createElement('div');
        bar.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 4px;position:sticky;top:0;background:rgba(0,0,0,.92);padding:2px 0;';
        bar.appendChild(makeBtn('Copy', copy));
        bar.appendChild(makeBtn('Share', share));
        bar.appendChild(makeBtn('Copy last', copyLast));
        bar.appendChild(makeBtn('Share last', shareLast));
        bar.appendChild(makeBtn('Hide', hide));
        bar.appendChild(makeBtn('Off', off));
        statusEl = document.createElement('span');
        statusEl.style.cssText = 'flex-basis:100%;color:#ccc;';
        bar.appendChild(statusEl);
        pre = document.createElement('pre');
        pre.style.cssText = 'margin:0;padding:0;white-space:pre-wrap;word-break:break-all;font:inherit;color:inherit;background:transparent;border:0;';
        box.appendChild(bar);
        box.appendChild(pre);
        document.body.appendChild(box);
        overlay = box;
        addEvent({ t: now(), ev: 'panel.mount', y: curY() });
        render();
        setInterval(render, 300);
        try {
          new MutationObserver(function () { try { if (overlay && !overlay.isConnected) render(); } catch (e) {} }).observe(document.body, { childList: true });
        } catch (e) {}
      } catch (e) {}
    }
    function onReady() { observeNav(); mountOverlay(); }
    try {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onReady);
      } else {
        onReady();
      }
    } catch (e) {}
  } catch (e) {}
})();
`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
