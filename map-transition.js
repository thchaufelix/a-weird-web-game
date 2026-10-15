/**
 * Sterile Room — shared old-district map scene transition.
 * Swap MAP_IMAGE to change the artwork without touching call sites.
 */
(function (global) {
  "use strict";

  /**
   * Single map-art constant — change this path/URL to swap artwork.
   * Default: old-district-map.svg (text-safe wrapper of the map painting).
   * Original JPEG lives at old-district-map.jpg locally, and as
   * old-district-map.jpg.b64 in the repo (base64 sidecar).
   */
  var MAP_IMAGE = "old-district-map.svg";

  /**
   * Marker positions as fractions of the map image (0–1).
   * office / breakfast / clinic / pier / home match the printed labels;
   * gangway / deck sit near the pier / ferry for L1 ship scenes.
   */
  var MARKERS = {
    office:    { x: 0.20, y: 0.24, label: "舊區辦事處" },
    breakfast: { x: 0.50, y: 0.48, label: "騎樓早餐店" },
    clinic:    { x: 0.80, y: 0.22, label: "診所" },
    pier:      { x: 0.18, y: 0.56, label: "舊區碼頭" },
    gangway:   { x: 0.30, y: 0.54, label: "登船舷梯" },
    deck:      { x: 0.38, y: 0.46, label: "二層露天甲板" },
    home:      { x: 0.50, y: 0.86, label: "梁子安／阿傑／許曼家" }
  };

  var DEFAULT_MS = 1200;
  var root = null;
  var active = false;
  var doneFn = null;
  var timer = null;
  var keyHandler = null;

  function ensureDom() {
    if (root) return root;
    if (!document.getElementById("sterile-map-style")) {
      var style = document.createElement("style");
      style.id = "sterile-map-style";
      style.textContent = [
        "#sterile-map-root {",
        "  position: absolute; inset: 0; z-index: 35;",
        "  display: none; align-items: center; justify-content: center;",
        "  background: rgba(4,4,8,0.88); pointer-events: auto;",
        "  opacity: 0; transition: opacity 0.22s ease;",
        "}",
        "#sterile-map-root.open { display: flex; opacity: 1; }",
        "#sterile-map-panel {",
        "  position: relative; width: min(92%, 720px); max-height: 88%;",
        "  display: flex; flex-direction: column; align-items: center; gap: 10px;",
        "}",
        "#sterile-map-caption {",
        "  font-size: 13px; letter-spacing: 0.14em; color: #c4a574;",
        "  text-shadow: 0 1px 4px rgba(0,0,0,0.8);",
        "}",
        "#sterile-map-frame {",
        "  position: relative; width: 100%; aspect-ratio: 16 / 9;",
        "  max-height: calc(88vh - 70px);",
        "  border: 1px solid #3a3832; box-shadow: 0 12px 40px rgba(0,0,0,0.55);",
        "  background: #1a1814; overflow: hidden;",
        "}",
        "#sterile-map-img {",
        "  display: block; width: 100%; height: 100%;",
        "  object-fit: fill; user-select: none; -webkit-user-drag: none;",
        "}",
        "#sterile-map-overlay {",
        "  position: absolute; left: 0; top: 0; width: 100%; height: 100%;",
        "  pointer-events: none;",
        "}",
        "#sterile-map-hint {",
        "  font-size: 12px; color: #7a756c; letter-spacing: 0.08em;",
        "}",
        "@keyframes sterile-map-pulse {",
        "  0%, 100% { transform: scale(1); opacity: 0.95; }",
        "  50% { transform: scale(1.55); opacity: 0.4; }",
        "}",
        ".sterile-map-pulse {",
        "  fill: rgba(196,165,116,0.12); stroke: #c4a574; stroke-width: 2.5;",
        "  transform-box: fill-box; transform-origin: center;",
        "  animation: sterile-map-pulse 0.9s ease-in-out infinite;",
        "}",
        ".sterile-map-dot { fill: #c4a574; stroke: #e8e0d4; stroke-width: 2; }",
        ".sterile-map-dot-from { fill: #8a857a; stroke: #c4c0b4; stroke-width: 2; }",
        ".sterile-map-arrow { stroke: #c4a574; stroke-width: 3; fill: none;",
        "  stroke-linecap: round; stroke-linejoin: round; }",
        ".sterile-map-label {",
        "  fill: #efe9df; font-size: 11px; font-family: inherit;",
        "  paint-order: stroke; stroke: rgba(0,0,0,0.75); stroke-width: 3px;",
        "}"
      ].join("\n");
      document.head.appendChild(style);
    }

    root = document.createElement("div");
    root.id = "sterile-map-root";
    root.innerHTML = [
      '<div id="sterile-map-panel">',
      '  <div id="sterile-map-caption"></div>',
      '  <div id="sterile-map-frame">',
      '    <img id="sterile-map-img" alt="舊區總圖" />',
      '    <svg id="sterile-map-overlay" viewBox="0 0 100 100" preserveAspectRatio="none"></svg>',
      '  </div>',
      '  <div id="sterile-map-hint">點擊／E／Space 繼續</div>',
      "</div>"
    ].join("");
    // Prefer attaching inside #stage so it covers the game view; fallback to body.
    var stage = document.getElementById("stage");
    (stage || document.body).appendChild(root);

    root.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      finish();
    });
    root.addEventListener("touchend", function (e) {
      e.preventDefault();
      e.stopPropagation();
      finish();
    }, { passive: false });

    return root;
  }

  function marker(id) {
    return MARKERS[id] || null;
  }

  function drawOverlay(fromId, toId) {
    var svg = document.getElementById("sterile-map-overlay");
    var a = marker(fromId);
    var b = marker(toId);
    if (!svg || !a || !b) {
      if (svg) svg.innerHTML = "";
      return;
    }
    var ax = a.x * 100, ay = a.y * 100;
    var bx = b.x * 100, by = b.y * 100;
    var dx = bx - ax, dy = by - ay;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / len, uy = dy / len;
    // Arrow head near destination
    var hx = bx - ux * 3.2, hy = by - uy * 3.2;
    var px = -uy, py = ux;
    var head =
      "M " + bx + " " + by +
      " L " + (hx + px * 2.2) + " " + (hy + py * 2.2) +
      " L " + (hx - px * 2.2) + " " + (hy - py * 2.2) + " Z";

    function labelPos(m, side) {
      var lx = m.x * 100;
      var ly = m.y * 100 - 6;
      if (ly < 4) ly = m.y * 100 + 8;
      return { x: lx, y: ly, anchor: side || "middle" };
    }
    var la = labelPos(a);
    var lb = labelPos(b);

    svg.innerHTML = [
      '<line class="sterile-map-arrow" x1="' + ax + '" y1="' + ay +
        '" x2="' + (bx - ux * 2) + '" y2="' + (by - uy * 2) + '" />',
      '<path class="sterile-map-arrow" fill="#c4a574" stroke="none" d="' + head + '" />',
      '<circle class="sterile-map-pulse" cx="' + ax + '" cy="' + ay + '" r="12" />',
      '<circle class="sterile-map-dot-from" cx="' + ax + '" cy="' + ay + '" r="5" />',
      '<circle class="sterile-map-pulse" cx="' + bx + '" cy="' + by + '" r="12" />',
      '<circle class="sterile-map-dot" cx="' + bx + '" cy="' + by + '" r="6" />',
      '<text class="sterile-map-label" x="' + la.x + '" y="' + la.y +
        '" text-anchor="middle">' + a.label + "</text>",
      '<text class="sterile-map-label" x="' + lb.x + '" y="' + lb.y +
        '" text-anchor="middle">' + b.label + "</text>"
    ].join("");
  }

  function finish() {
    if (!active) return;
    active = false;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (keyHandler) {
      window.removeEventListener("keydown", keyHandler, true);
      keyHandler = null;
    }
    if (root) {
      root.classList.remove("open");
      // Keep display:flex until opacity fades, then hide
      setTimeout(function () {
        if (root && !active) root.style.display = "none";
      }, 240);
    }
    var cb = doneFn;
    doneFn = null;
    if (cb) cb();
  }

  function show(opts) {
    opts = opts || {};
    var fromId = opts.from;
    var toId = opts.to;
    var ms = opts.duration != null ? opts.duration : DEFAULT_MS;
    ensureDom();
    // If already open, finish previous first without double-calling awkwardly
    if (active) {
      if (timer) { clearTimeout(timer); timer = null; }
      if (keyHandler) {
        window.removeEventListener("keydown", keyHandler, true);
        keyHandler = null;
      }
    }
    active = true;
    doneFn = typeof opts.onDone === "function" ? opts.onDone : null;

    var img = document.getElementById("sterile-map-img");
    var caption = document.getElementById("sterile-map-caption");
    var a = marker(fromId);
    var b = marker(toId);
    img.src = MAP_IMAGE;
    caption.textContent =
      (a ? a.label : fromId || "?") + "  →  " + (b ? b.label : toId || "?");

    function afterLayout() {
      drawOverlay(fromId, toId);
    }
    if (img.complete && img.naturalWidth) afterLayout();
    else img.onload = afterLayout;
    afterLayout();

    root.style.display = "flex";
    // Force reflow then fade in
    void root.offsetWidth;
    root.classList.add("open");

    keyHandler = function (e) {
      if (!active) return;
      var k = e.key.toLowerCase();
      if (e.key === " " || k === "e" || k === "enter") {
        e.preventDefault();
        e.stopPropagation();
        finish();
      }
    };
    window.addEventListener("keydown", keyHandler, true);

    if (ms > 0) {
      timer = setTimeout(finish, ms);
    }
  }

  function isActive() {
    return active;
  }

  // Let touch interact button dismiss the map when open
  function tryDismiss() {
    if (active) {
      finish();
      return true;
    }
    return false;
  }

  global.SterileMapTransition = {
    MAP_IMAGE: MAP_IMAGE,
    MARKERS: MARKERS,
    show: show,
    isActive: isActive,
    tryDismiss: tryDismiss
  };
})(window);
