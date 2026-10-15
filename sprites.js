/**
 * Sterile Room — shared 8-dir character sprites (idle + walk).
 * Sheets: assets/sprites/{id}-idle-8dir.png / {id}-walk-8dir.png
 * Dir cols: N, NE, E, SE, S, SW, W, NW
 */
(function (global) {
  "use strict";

  var CELL = 32;
  var DIRS = 8;
  var WALK_FRAMES = 4;
  var BASE = "assets/sprites/";
  var DRAW_SCALE = 2;
  var WALK_FPS = 9;
  var MOVE_EPS = 0.55;

  var IDS = [
    "liang-zi-an",
    "a-jie",
    "xu-man",
    "zhou-lang",
    "a-cheng",
    "e-jie",
    "dr-zhang",
    "alienated-crew",
  ];

  var NAME_TO_ID = {
    "梁子安": "liang-zi-an",
    "阿傑": "a-jie",
    "阿傑…": "a-jie",
    "許曼": "xu-man",
    "周朗": "zhou-lang",
    "阿成": "a-cheng",
    "娥姐": "e-jie",
    "張醫生": "dr-zhang",
    "異化者": "alienated-crew",
    "異化船員": "alienated-crew",
  };

  var FALLBACK_COLORS = {
    "liang-zi-an": "#c4a574",
    "a-jie": "#6a8a70",
    "xu-man": "#8a6a80",
    "zhou-lang": "#6a7a90",
    "a-cheng": "#8a7a60",
    "e-jie": "#8a7a60",
    "dr-zhang": "#6a8a9a",
    "alienated-crew": "#5a4038",
  };

  var sheets = Object.create(null);
  var entities = Object.create(null);
  var ready = false;
  var readyPromise = null;

  function loadImageUrl(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        resolve(img);
      };
      img.onerror = function () {
        resolve(null);
      };
      img.src = src;
    });
  }

  function loadImage(src) {
    // Prefer real PNG (local / if binary committed); fall back to .b64 sidecar (Pages).
    return loadImageUrl(src).then(function (img) {
      if (img) return img;
      return fetch(src + ".b64")
        .then(function (r) {
          if (!r.ok) throw new Error("no b64");
          return r.text();
        })
        .then(function (b64) {
          return loadImageUrl("data:image/png;base64," + String(b64).trim());
        })
        .catch(function () {
          return null;
        });
    });
  }

  function ensureLoaded() {
    if (readyPromise) return readyPromise;
    readyPromise = Promise.all(
      IDS.map(function (id) {
        return Promise.all([
          loadImage(BASE + id + "-idle-8dir.png"),
          loadImage(BASE + id + "-walk-8dir.png"),
        ]).then(function (pair) {
          sheets[id] = { idle: pair[0], walk: pair[1] };
        });
      })
    ).then(function () {
      ready = true;
      return true;
    });
    return readyPromise;
  }

  function idFromName(name) {
    if (!name) return null;
    if (NAME_TO_ID[name]) return NAME_TO_ID[name];
    // strip trailing ellipsis / punctuation variants
    var base = String(name).replace(/[…\.]+$/g, "").trim();
    if (NAME_TO_ID[base]) return NAME_TO_ID[base];
    return null;
  }

  /** dx right, dy down → dir index 0=N … 7=NW */
  function facingFrom(dx, dy) {
    if (dx === 0 && dy === 0) return null;
    var angle = Math.atan2(dx, -dy); // 0 = north
    var oct = Math.round(angle / (Math.PI / 4));
    if (oct < 0) oct += 8;
    return oct & 7;
  }

  function updateEntity(key, x, y) {
    var ent = entities[key];
    if (!ent) {
      ent = entities[key] = {
        x: x,
        y: y,
        facing: 4, // S
        frame: 0,
        animT: 0,
        moving: false,
      };
      return ent;
    }
    var dx = x - ent.x;
    var dy = y - ent.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    ent.x = x;
    ent.y = y;
    var now = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    var dt = ent.lastTs ? Math.min(0.05, (now - ent.lastTs) / 1000) : 0;
    ent.lastTs = now;
    // Scene teleports jump far — don't treat as a walk step
    if (dist > 80) {
      ent.moving = false;
      ent.frame = 0;
      return ent;
    }
    if (dist > MOVE_EPS) {
      ent.moving = true;
      var f = facingFrom(dx, dy);
      if (f !== null) ent.facing = f;
      ent.animT += dt;
      ent.frame = Math.floor(ent.animT * WALK_FPS) % WALK_FRAMES;
    } else {
      ent.moving = false;
      ent.frame = 0;
    }
    return ent;
  }

  /** Optional: advance walk by dt even when using explicit moving flag */
  function tick(key, dt, moving, dx, dy) {
    var ent = entities[key];
    if (!ent) {
      ent = entities[key] = {
        x: 0,
        y: 0,
        facing: 4,
        frame: 0,
        animT: 0,
        moving: false,
      };
    }
    if (dx !== undefined && dy !== undefined) {
      var f = facingFrom(dx, dy);
      if (f !== null) ent.facing = f;
    }
    ent.moving = !!moving;
    if (ent.moving) {
      ent.animT += (dt || 0) * WALK_FPS;
      ent.frame = Math.floor(ent.animT) % WALK_FRAMES;
    } else {
      ent.frame = 0;
    }
    return ent;
  }

  function drawShadow(ctx, x, y, r) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(x, y + 14, r || 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPlaceholder(ctx, x, y, name, color, isPlayer, wounded) {
    drawShadow(ctx, x, y, isPlayer ? 14 : 13);
    ctx.fillStyle = color || "#8a7a60";
    ctx.beginPath();
    ctx.arc(x, y, isPlayer ? 14 : 13, 0, Math.PI * 2);
    ctx.fill();
    if (wounded) {
      ctx.fillStyle = "rgba(200,210,180,0.65)";
      ctx.beginPath();
      ctx.ellipse(x + 10, y + 2, 4, 6, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = isPlayer ? "#1a1814" : "#1a1a1a";
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    if (name) {
      ctx.fillStyle = isPlayer ? "#e8e0d4" : "rgba(200,190,170,0.85)";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(name, x, y - 20);
    }
  }

  function drawSheetFrame(ctx, img, dir, frame, x, y, scale) {
    if (!img) return false;
    var sc = scale || DRAW_SCALE;
    var dw = CELL * sc;
    var dh = CELL * sc;
    var sx = (dir & 7) * CELL;
    var sy = (frame | 0) * CELL;
    // Feet near collision point
    var dx = x - dw / 2;
    var dy = y - dh * 0.72;
    ctx.drawImage(img, sx, sy, CELL, CELL, dx, dy, dw, dh);
    return true;
  }

  /**
   * Draw a character sprite (or color placeholder if missing).
   * opts: { key, name, x, y, color, isPlayer, wounded, spriteId, alpha, scale }
   */
  function draw(ctx, opts) {
    opts = opts || {};
    var name = opts.name || "";
    var x = opts.x;
    var y = opts.y;
    var color = opts.color;
    var isPlayer = !!opts.isPlayer;
    var wounded = !!opts.wounded;
    var key = opts.key || (isPlayer ? "player" : name) || "anon";
    var id = opts.spriteId || idFromName(name);
    var ent = updateEntity(key, x, y);

    if (opts.alpha != null && opts.alpha !== 1) {
      ctx.save();
      ctx.globalAlpha = opts.alpha;
    }

    drawShadow(ctx, x, y, isPlayer ? 15 : 14);

    var drawn = false;
    if (id && sheets[id]) {
      var pack = sheets[id];
      var img = ent.moving && pack.walk ? pack.walk : pack.idle;
      var frame = ent.moving ? ent.frame : 0;
      // idle sheet is single row (frame ignored / sy=0)
      if (!ent.moving) {
        drawn = drawSheetFrame(ctx, pack.idle, ent.facing, 0, x, y, opts.scale);
      } else {
        drawn = drawSheetFrame(ctx, pack.walk || pack.idle, ent.facing, frame, x, y, opts.scale);
      }
    }

    if (!drawn) {
      // Color blob placeholder — keep silhouette readable
      var c = color || (id && FALLBACK_COLORS[id]) || "#8a7a60";
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x, y, isPlayer ? 14 : 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isPlayer ? "#1a1814" : "#1a1a1a";
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    if (wounded) {
      ctx.fillStyle = "rgba(200,210,180,0.65)";
      ctx.beginPath();
      ctx.ellipse(x + 12, y + 2, 4, 6, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(160,170,120,0.7)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    if (name) {
      ctx.fillStyle = isPlayer ? "#e8e0d4" : "rgba(200,190,170,0.85)";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      var labelY = y - (DRAW_SCALE * CELL * 0.55);
      ctx.fillText(name, x, labelY);
    }

    if (opts.alpha != null && opts.alpha !== 1) {
      ctx.restore();
    }
  }

  /** Drop-in for existing drawPerson(x,y,name,color,isPlayer,wounded) */
  function drawPerson(ctx, x, y, name, color, isPlayer, wounded, key) {
    draw(ctx, {
      key: key || (isPlayer ? "player" : String(name || "npc")),
      name: name,
      x: x,
      y: y,
      color: color,
      isPlayer: isPlayer,
      wounded: wounded,
    });
  }

  // Kick off load immediately
  ensureLoaded();

  global.SterileSprites = {
    CELL: CELL,
    IDS: IDS,
    BASE: BASE,
    ensureLoaded: ensureLoaded,
    idFromName: idFromName,
    facingFrom: facingFrom,
    tick: tick,
    draw: draw,
    drawPerson: drawPerson,
    drawPlaceholder: drawPlaceholder,
    isReady: function () {
      return ready;
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
