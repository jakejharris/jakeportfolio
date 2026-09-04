// Gated, pre-hydration scroll debugger. Inert unless the URL contains
// `scrolldebug` (`?scrolldebug=on` persists it in localStorage, `?scrolldebug=off`
// clears it). When active it wraps every programmatic scroll API, listens to the
// scroll-related window events, samples scrollY with rAF for 6s, and renders a
// fixed overlay with Copy / Share / Hide buttons. Plain ES5 so iOS Safari 15+
// parses it; everything is wrapped in try/catch so it can never break the page.
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
    if (search.indexOf('scrolldebug=on') !== -1) {
      try { localStorage.setItem('scrolldebug', '1'); } catch (e) {}
    }
    if (search.indexOf('scrolldebug') === -1 && stored !== '1') return;

    var perf = window.performance;
    var t0 = perf && perf.now ? perf.now() : Date.now();
    function now() {
      var n = perf && perf.now ? perf.now() : Date.now();
      return Math.round((n - t0) * 10) / 10;
    }
    function safe(fn, fallback) { try { return fn(); } catch (e) { return fallback; } }
    function curY() {
      return safe(function () {
        var y = window.scrollY;
        if (typeof y !== 'number') y = window.pageYOffset;
        if (typeof y !== 'number') y = document.documentElement.scrollTop;
        return Math.round(y * 10) / 10;
      }, -1);
    }

    var header = {};
    header.href = safe(function () { return location.href; }, '');
    header.referrer = safe(function () { return document.referrer; }, '');
    header.opener = safe(function () { return !!window.opener; }, false);
    header.navType = safe(function () {
      var entries = perf.getEntriesByType ? perf.getEntriesByType('navigation') : null;
      if (entries && entries.length && entries[0].type) return entries[0].type;
      var n = perf.navigation;
      if (n) return ['navigate', 'reload', 'back_forward', 'reserved'][n.type] || String(n.type);
      return 'unknown';
    }, 'unknown');
    header.scrollRestoration = safe(function () { return history.scrollRestoration || 'n/a'; }, 'n/a');
    header.ua = safe(function () { return navigator.userAgent; }, '');
    header.innerWidth = safe(function () { return window.innerWidth; }, null);
    header.innerHeight = safe(function () { return window.innerHeight; }, null);
    header.visualViewport = safe(function () {
      var vv = window.visualViewport;
      if (!vv) return null;
      return { width: vv.width, height: vv.height, offsetTop: vv.offsetTop, pageTop: vv.pageTop, scale: vv.scale };
    }, null);
    header.dpr = safe(function () { return window.devicePixelRatio; }, null);
    header.readyStateAtT0 = safe(function () { return document.readyState; }, '');
    header.scrollYAtT0 = curY();
    header.startedAt = new Date().toISOString();

    var timeline = [];
    var events = [];
    var calls = [];
    var log = { header: header, timeline: timeline, events: events, calls: calls };
    window.__scrolldbg = log;

    function captureStack() {
      try {
        var s = new Error().stack || '';
        var lines = s.split('\\n');
        var out = [];
        for (var i = 0; i < lines.length && out.length < 8; i++) {
          var line = lines[i];
          if (!line || line === 'Error') continue;
          if (line.indexOf('captureStack') !== -1 || line.indexOf('sdbgWrapped') !== -1 || line.indexOf('sdbgRecord') !== -1) continue;
          out.push(line.replace(/^\\s+/, ''));
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
        return s.length > 200 ? s.slice(0, 200) + '...' : s;
      } catch (e) { return safe(function () { return String(v); }, '?'); }
    }

    function sdbgRecord(api, target, args, extra) {
      var entry = { t: now(), api: api, target: target, args: short(args), y: curY(), stack: captureStack() };
      if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) entry[k] = extra[k];
      calls.push(entry);
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

    function snap(kind) {
      var e = { t: now(), ev: kind, y: curY() };
      try {
        var vv = window.visualViewport;
        if (vv) { e.vvTop = Math.round(vv.offsetTop * 10) / 10; e.vvPageTop = Math.round(vv.pageTop * 10) / 10; e.vvH = Math.round(vv.height); }
      } catch (err) {}
      e.ih = safe(function () { return window.innerHeight; }, null);
      e.sh = safe(function () { return document.documentElement.scrollHeight; }, null);
      try {
        var n = findNav();
        if (n) {
          var r = n.getBoundingClientRect();
          e.nav = Math.round(r.top * 10) / 10;
          e.navH = Math.round(r.height);
          e.navClass = String(n.className).replace(/\\s+/g, ' ').trim();
          e.navHidden = e.navClass.indexOf('translate-y-[-100%]') !== -1 ? 1 : 0;
        }
      } catch (err) {}
      try {
        var h1 = document.querySelector('main h1');
        if (h1) {
          var hr = h1.getBoundingClientRect();
          e.h1 = Math.round((hr.top + curY()) * 10) / 10;
          e.h1vp = Math.round(hr.top * 10) / 10;
        }
      } catch (err) {}
      return e;
    }

    var lastTimelineY = null;
    function pushTimeline(entry, force) {
      if (!force && lastTimelineY !== null && entry.y === lastTimelineY) return;
      lastTimelineY = entry.y;
      timeline.push(entry);
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
            events.push(e);
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
          events.push(e);
        }
        pushTimeline(e);
      } catch (err) {}
    }
    function on(target, name, fn) {
      try { target.addEventListener(name, function (ev) { try { fn(ev); } catch (e) {} }, { capture: true, passive: true }); } catch (e) {
        try { target.addEventListener(name, fn, true); } catch (e2) {}
      }
    }
    on(window, 'scroll', onScroll);
    on(window, 'resize', function () { var e = snap('resize'); e.iw = window.innerWidth; events.push(e); });
    on(window, 'pageshow', function (ev) { var e = snap('pageshow'); e.persisted = !!ev.persisted; events.push(e); });
    on(window, 'load', function () { var e = snap('load'); e.readyState = document.readyState; events.push(e); });
    on(window, 'DOMContentLoaded', function () { var e = snap('DOMContentLoaded'); e.readyState = document.readyState; events.push(e); });
    on(window, 'hashchange', function () { var e = snap('hashchange'); e.hash = location.hash; events.push(e); });
    on(window, 'popstate', function (ev) { var e = snap('popstate'); e.state = short(ev.state); e.href = location.href; events.push(e); });
    on(window, 'focusin', function (ev) { var e = snap('focusin'); e.target = desc(ev.target); e.active = desc(document.activeElement); events.push(e); });
    on(window, 'visibilitychange', function () { var e = snap('visibilitychange'); e.state = document.visibilityState; events.push(e); });
    try {
      if (window.visualViewport) {
        on(window.visualViewport, 'resize', function () { events.push(snap('vv.resize')); });
        on(window.visualViewport, 'scroll', function () { var e = snap('vv.scroll'); pushTimeline(e); events.push(e); });
      }
    } catch (e) {}

    // rAF sampler for 6s: catches moves that fire no scroll event.
    var lastSampledY = curY();
    function sample() {
      try {
        var y = curY();
        if (y !== lastSampledY) {
          lastSampledY = y;
          pushTimeline(snap('raf'));
        }
        if ((perf && perf.now ? perf.now() : Date.now()) - t0 < 6000) requestAnimationFrame(sample);
      } catch (e) {}
    }
    try { requestAnimationFrame(sample); } catch (e) {}

    // ---- overlay ----
    var overlay = null, pre = null, statusEl = null, hidden = false;
    function json() { try { return JSON.stringify(log, null, 1); } catch (e) { return '{"error":"stringify failed"}'; }
    }
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
    function copy() {
      var text = json();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { setStatus('copied ' + text.length + ' chars'); }, function () {
          setStatus(copyFallback(text) ? 'copied (fallback)' : 'copy failed');
        });
      } else {
        setStatus(copyFallback(text) ? 'copied (fallback)' : 'copy failed');
      }
    }
    function share() {
      var text = json();
      if (navigator.share) {
        navigator.share({ title: 'scrolldebug', text: text }).then(function () { setStatus('shared'); }, function (err) { setStatus('share: ' + (err && err.name)); });
      } else {
        setStatus('share unavailable');
      }
    }
    function hide() {
      hidden = true;
      try { if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); } catch (e) {}
      overlay = null; pre = null; statusEl = null;
    }
    function fmtY(v) { return v === null || v === undefined ? '?' : String(v); }
    function renderText() {
      var out = [];
      out.push('scrolldebug  t0=' + header.startedAt + '  now=' + now() + 'ms  y=' + curY());
      out.push('href=' + header.href);
      out.push('referrer=' + (header.referrer || '(none)') + '  opener=' + header.opener + '  nav=' + header.navType + '  scrollRestoration=' + header.scrollRestoration);
      out.push('inner=' + header.innerWidth + 'x' + header.innerHeight + '  dpr=' + header.dpr + '  vv=' + short(header.visualViewport) + '  readyState@t0=' + header.readyStateAtT0 + '  y@t0=' + header.scrollYAtT0);
      out.push('ua=' + header.ua);
      out.push('');
      out.push('-- scroll timeline (' + timeline.length + ') --');
      for (var i = 0; i < timeline.length; i++) {
        var e = timeline[i];
        out.push('t=' + e.t + 'ms y=' + fmtY(e.y) + ' h1=' + fmtY(e.h1) + ' nav=' + fmtY(e.nav) + ' navHidden=' + fmtY(e.navHidden) + ' vvTop=' + fmtY(e.vvTop) + ' ih=' + fmtY(e.ih) + ' sh=' + fmtY(e.sh) + ' [' + e.ev + ']');
      }
      out.push('');
      out.push('-- api calls (' + calls.length + ') --');
      for (var j = 0; j < calls.length; j++) {
        var c = calls[j];
        out.push('t=' + c.t + 'ms ' + c.api + ' target=' + c.target + ' args=' + c.args + ' y=' + fmtY(c.y) + (c.preventScroll !== undefined ? ' preventScroll=' + c.preventScroll : ''));
        if (c.stack) out.push('   ' + c.stack.replace(/\\n/g, '\\n   '));
      }
      out.push('');
      out.push('-- events (' + events.length + ') --');
      for (var k = 0; k < events.length; k++) {
        var ev = events[k];
        var extra = [];
        for (var key in ev) {
          if (!Object.prototype.hasOwnProperty.call(ev, key)) continue;
          if (key === 't' || key === 'ev' || key === 'navClass') continue;
          extra.push(key + '=' + ev[key]);
        }
        out.push('t=' + ev.t + 'ms ' + ev.ev + ' ' + extra.join(' '));
      }
      return out.join('\\n');
    }
    function render() {
      try {
        if (hidden) return;
        if (navObserved && !navObserved.isConnected) navObserved = null;
        observeNav();
        if (overlay && !overlay.isConnected && document.body) document.body.appendChild(overlay);
        if (pre) pre.textContent = renderText();
      } catch (e) {}
    }
    function makeBtn(label, fn) {
      var b = document.createElement('button');
      b.type = 'button';
      b.tabIndex = -1;
      b.textContent = label;
      b.style.cssText = 'font:inherit;font-size:12px;color:#fff;background:#333;border:1px solid #777;padding:4px 12px;border-radius:4px;margin:0;';
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
        box.style.cssText = 'position:fixed;bottom:0;left:0;right:0;max-height:45vh;overflow:auto;overscroll-behavior:contain;z-index:2147483647;background:rgba(0,0,0,.88);color:#9f9;font:10px/1.3 ui-monospace,Menlo,monospace;padding:6px;pointer-events:auto;box-sizing:border-box;margin:0;text-align:left;-webkit-overflow-scrolling:touch;';
        var bar = document.createElement('div');
        bar.style.cssText = 'display:flex;gap:6px;align-items:center;margin:0 0 4px;position:sticky;top:0;background:rgba(0,0,0,.92);padding:2px 0;';
        bar.appendChild(makeBtn('Copy', copy));
        bar.appendChild(makeBtn('Share', share));
        bar.appendChild(makeBtn('Hide', hide));
        statusEl = document.createElement('span');
        statusEl.style.cssText = 'margin-left:auto;color:#ccc;';
        bar.appendChild(statusEl);
        pre = document.createElement('pre');
        pre.style.cssText = 'margin:0;padding:0;white-space:pre-wrap;word-break:break-all;font:inherit;color:inherit;background:transparent;border:0;';
        box.appendChild(bar);
        box.appendChild(pre);
        document.body.appendChild(box);
        overlay = box;
        render();
        setInterval(render, 300);
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
