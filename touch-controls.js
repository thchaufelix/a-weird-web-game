/**
 * Sterile Room — shared mobile touch controls
 * Virtual joystick (WASD/arrows) + interact button (E/Space, hold-capable).
 *
 * Keyboard and touch share the game `keys` object via OR-merge:
 * touch never clears a key the keyboard is still holding.
 */
(function (global) {
  "use strict";

  var MOVE_KEYS = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"];
  var DEAD = 0.28;

  function wantsTouchUI() {
    try {
      // Real touch / coarse pointer first
      if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) return true;
      if (navigator.maxTouchPoints > 0) return true;
      // Narrow layout (phone / small window) — show on-screen controls
      if (window.matchMedia && window.matchMedia("(max-width: 900px)").matches) return true;
    } catch (e) {}
    return false;
  }

  function isFineDesktop() {
    try {
      return !!(
        window.matchMedia &&
        window.matchMedia("(pointer: fine)").matches &&
        window.matchMedia("(min-width: 901px)").matches &&
        !(navigator.maxTouchPoints > 0)
      );
    } catch (e) {
      return false;
    }
  }

  function injectStyles() {
    if (document.getElementById("sterile-touch-style")) return;
    var style = document.createElement("style");
    style.id = "sterile-touch-style";
    style.textContent = [
      "html, body { touch-action: none; overscroll-behavior: none; }",
      "#sterile-touch-root {",
      "  position: fixed; inset: 0; pointer-events: none; z-index: 40;",
      "  display: none;",
      "}",
      "#sterile-touch-root.sterile-touch-on { display: block; }",
      /* Fine-pointer wide desktop: keep layout hidden — keyboard only */
      "#sterile-touch-root.sterile-touch-on.sterile-touch-desktop-hidden { display: none !important; }",
      "#sterile-joy-zone {",
      "  position: absolute; left: 0; bottom: 0;",
      "  width: min(46vw, 220px); height: min(38vh, 200px);",
      "  pointer-events: auto;",
      "}",
      "#sterile-joy-base {",
      "  position: absolute; left: 18px; bottom: 18px;",
      "  width: 110px; height: 110px; border-radius: 50%;",
      "  background: rgba(20,22,28,0.45); border: 2px solid rgba(196,165,116,0.35);",
      "  box-shadow: inset 0 0 20px rgba(0,0,0,0.35);",
      "}",
      "#sterile-joy-knob {",
      "  position: absolute; left: 50%; top: 50%;",
      "  width: 48px; height: 48px; margin: -24px 0 0 -24px; border-radius: 50%;",
      "  background: rgba(196,165,116,0.55); border: 2px solid rgba(232,224,212,0.5);",
      "  transition: none;",
      "}",
      "#sterile-btn-zone {",
      "  position: absolute; right: 0; bottom: 0;",
      "  width: min(42vw, 180px); height: min(38vh, 200px);",
      "  pointer-events: auto;",
      "}",
      "#sterile-interact-btn {",
      "  position: absolute; right: 20px; bottom: 28px;",
      "  width: 78px; height: 78px; border-radius: 50%;",
      "  background: rgba(196,165,116,0.28); border: 2px solid rgba(196,165,116,0.7);",
      "  color: #e8e0d4; font-size: 15px; font-family: inherit;",
      "  letter-spacing: 0.12em; pointer-events: auto;",
      "  display: flex; align-items: center; justify-content: center;",
      "  user-select: none; -webkit-user-select: none;",
      "  box-shadow: 0 4px 18px rgba(0,0,0,0.35);",
      "  -webkit-tap-highlight-color: transparent;",
      "}",
      "#sterile-interact-btn.pressed {",
      "  background: rgba(196,165,116,0.55); transform: scale(0.96);",
      "}",
      "@media (max-width: 900px) {",
      "  #wrap { padding: 6px; gap: 4px; }",
      "  #titlebar { font-size: 11px; }",
      "  #stage {",
      "    width: 100%;",
      "    height: min(720px, calc(100dvh - 88px));",
      "    max-height: none;",
      "  }",
      "  #controls-hint { font-size: 10px; padding: 0 8px 4px; line-height: 1.4; }",
      "  #hud { font-size: 12px; }",
      "}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function init(opts) {
    opts = opts || {};
    var keys = opts.keys;
    if (!keys) return null;

    injectStyles();

    // --- Keyboard / touch OR-merge into shared `keys` ---
    var kbMove = Object.create(null);
    var touchMove = Object.create(null);
    var kbE = false;
    var kbSpace = false;
    var touchInteract = false;

    function syncMove() {
      for (var i = 0; i < MOVE_KEYS.length; i++) {
        var k = MOVE_KEYS[i];
        keys[k] = !!(kbMove[k] || touchMove[k]);
      }
    }

    function syncInteract() {
      keys["e"] = !!(kbE || touchInteract);
      keys[" "] = !!(kbSpace || touchInteract);
    }

    function clearTouchMove() {
      for (var i = 0; i < MOVE_KEYS.length; i++) touchMove[MOVE_KEYS[i]] = false;
      syncMove();
    }

    function applyStick(nx, ny) {
      for (var i = 0; i < MOVE_KEYS.length; i++) touchMove[MOVE_KEYS[i]] = false;
      if (nx * nx + ny * ny >= DEAD * DEAD) {
        if (ny < -DEAD) { touchMove["w"] = true; touchMove["arrowup"] = true; }
        if (ny > DEAD) { touchMove["s"] = true; touchMove["arrowdown"] = true; }
        if (nx < -DEAD) { touchMove["a"] = true; touchMove["arrowleft"] = true; }
        if (nx > DEAD) { touchMove["d"] = true; touchMove["arrowright"] = true; }
      }
      syncMove();
    }

    // Track keyboard independently (bubble, after page handlers register).
    // On keyup the page may set keys[k]=false; we re-OR so held touch still wins,
    // and held keyboard is restored after touch clearMove.
    window.addEventListener("keydown", function (e) {
      var k = e.key.toLowerCase();
      if (MOVE_KEYS.indexOf(k) >= 0) {
        kbMove[k] = true;
        syncMove();
      }
      if (k === "e") {
        kbE = true;
        syncInteract();
      }
      if (k === " " || e.key === " ") {
        kbSpace = true;
        syncInteract();
      }
    });
    window.addEventListener("keyup", function (e) {
      var k = e.key.toLowerCase();
      if (MOVE_KEYS.indexOf(k) >= 0) {
        kbMove[k] = false;
        syncMove();
      }
      if (k === "e") {
        kbE = false;
        syncInteract();
      }
      if (k === " " || e.key === " ") {
        kbSpace = false;
        syncInteract();
      }
    });

    var root = document.createElement("div");
    root.id = "sterile-touch-root";
    root.innerHTML =
      '<div id="sterile-joy-zone">' +
        '<div id="sterile-joy-base"><div id="sterile-joy-knob"></div></div>' +
      "</div>" +
      '<div id="sterile-btn-zone">' +
        '<button type="button" id="sterile-interact-btn" tabindex="-1" aria-label="互動">互動</button>' +
      "</div>";
    document.body.appendChild(root);

    var show = wantsTouchUI();
    // Pure fine-pointer desktop: do not show (avoids semi-transparent zones eating clicks / clearMove)
    var hideDesktop = isFineDesktop();
    if (show && !hideDesktop) {
      root.classList.add("sterile-touch-on");
    } else if (show && hideDesktop) {
      root.classList.add("sterile-touch-on");
      root.classList.add("sterile-touch-desktop-hidden");
    }

    var joyZone = root.querySelector("#sterile-joy-zone");
    var joyBase = root.querySelector("#sterile-joy-base");
    var joyKnob = root.querySelector("#sterile-joy-knob");
    var btn = root.querySelector("#sterile-interact-btn");

    var stickId = null;
    var originX = 0, originY = 0;
    var maxR = 36;

    function setKnob(dx, dy) {
      joyKnob.style.transform = "translate(" + dx + "px," + dy + "px)";
    }

    function onJoyStart(e) {
      if (e.cancelable) e.preventDefault();
      var t = e.changedTouches ? e.changedTouches[0] : e;
      stickId = e.changedTouches ? t.identifier : "mouse";
      var rect = joyBase.getBoundingClientRect();
      originX = rect.left + rect.width / 2;
      originY = rect.top + rect.height / 2;
      onJoyMove(e);
    }

    function onJoyMove(e) {
      if (stickId === null) return;
      if (e.cancelable) e.preventDefault();
      var t = null;
      if (e.changedTouches) {
        for (var i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === stickId) {
            t = e.changedTouches[i];
            break;
          }
        }
        if (!t) return;
      } else {
        t = e;
      }
      var dx = t.clientX - originX;
      var dy = t.clientY - originY;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var clamped = Math.min(len, maxR);
      var cx = (dx / len) * clamped;
      var cy = (dy / len) * clamped;
      setKnob(cx, cy);
      applyStick(cx / maxR, cy / maxR);
    }

    function onJoyEnd(e) {
      if (stickId === null) return;
      if (e.changedTouches) {
        var hit = false;
        for (var i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === stickId) hit = true;
        }
        if (!hit) return;
      }
      stickId = null;
      setKnob(0, 0);
      clearTouchMove();
    }

    joyZone.addEventListener("touchstart", onJoyStart, { passive: false });
    joyZone.addEventListener("touchmove", onJoyMove, { passive: false });
    joyZone.addEventListener("touchend", onJoyEnd, { passive: false });
    joyZone.addEventListener("touchcancel", onJoyEnd, { passive: false });

    // Mouse fallback only when on-screen controls are actually visible
    // (narrow window / coarse pointer) — not on hidden fine desktop.
    var allowMouseJoy = show && !hideDesktop;
    var mouseDown = false;
    if (allowMouseJoy) {
      joyZone.addEventListener("mousedown", function (e) {
        mouseDown = true;
        onJoyStart(e);
      });
      window.addEventListener("mousemove", function (e) {
        if (!mouseDown) return;
        onJoyMove(e);
      });
      window.addEventListener("mouseup", function (e) {
        if (!mouseDown) return;
        mouseDown = false;
        onJoyEnd(e);
      });
    }

    var pressing = false;

    function pressDown(e) {
      if (e.cancelable) e.preventDefault();
      if (pressing) return;
      pressing = true;
      btn.classList.add("pressed");
      try { btn.blur(); } catch (err) {}
      touchInteract = true;
      syncInteract();
      if (typeof opts.onInteractDown === "function") opts.onInteractDown();
    }

    function pressUp(e) {
      if (e && e.cancelable) e.preventDefault();
      if (!pressing) return;
      pressing = false;
      btn.classList.remove("pressed");
      touchInteract = false;
      syncInteract();
      if (typeof opts.onInteractUp === "function") opts.onInteractUp();
    }

    btn.addEventListener("touchstart", pressDown, { passive: false });
    btn.addEventListener("touchend", pressUp, { passive: false });
    btn.addEventListener("touchcancel", pressUp, { passive: false });
    if (allowMouseJoy) {
      btn.addEventListener("mousedown", pressDown);
      window.addEventListener("mouseup", function () {
        if (pressing) pressUp();
      });
    }
    // Avoid click synthesizing a second tap after touch; also keep focus off button
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      try { btn.blur(); } catch (err) {}
    });

    document.addEventListener("gesturestart", function (e) {
      if (e.cancelable) e.preventDefault();
    }, { passive: false });

    return {
      root: root,
      show: show && !hideDesktop,
      setLabel: function (text) {
        btn.textContent = text || "互動";
      }
    };
  }

  global.SterileTouch = { init: init, wantsTouchUI: wantsTouchUI };
})(typeof window !== "undefined" ? window : this);
