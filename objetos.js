/* Objetos animados del acordeon — diseñados en Claude Design.
   Cada uno dibuja en un <canvas> propio con fondo transparente y corre por
   tiempo con requestAnimationFrame, asi que sigue la tasa de refresco real
   de la pantalla. Se resuelven en vivo: nada de video, nada de fps fijo.
   Fuentes originales en scripts/animaciones/. */
window.DTAnim = window.DTAnim || {};

DTAnim.web = function (_cv, _opts) {
  _opts = _opts || {};
  "use strict";
  var Q = new URLSearchParams(_opts.q || "");
  var W = 720, H = 450, DUR = 3, FRAMES = 36;              // 12 fps
  var SCALE = Math.max(1, Math.min(4, parseFloat(Q.get("scale") || "1") || 1));
  var TS = 2 * SCALE;
  var TAU = Math.PI * 2, D2R = Math.PI / 180;
  var ACC = "#52BFFE", VIO = "#8B7CF6";
  var cv = _cv;
  cv.width = W * SCALE; cv.height = H * SCALE;
  var ctx = cv.getContext("2d");

  var cl = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var mix = function (a, b, k) { return a + (b - a) * k; };
  var eOut = function (p) { return 1 - Math.pow(1 - p, 3); };
  var eBack = function (p) { var c = 1.28, q = p - 1; return 1 + (c + 1) * q * q * q + c * q * q; };
  var eInOut = function (p) { return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
  var eSmooth = function (p) { return p * p * (3 - 2 * p); };
  function bump(t, t0, t1, t2, t3, fo, fi) {
    if (t <= t0 || t >= t3) return 0;
    if (t < t1) return fo((t - t0) / (t1 - t0));
    if (t < t2) return 1;
    return 1 - fi((t - t2) / (t3 - t2));
  }
  function rot(x, y, z, rx, ry, rz) {
    var c = Math.cos(rz), s = Math.sin(rz), t;
    t = x * c - y * s; y = x * s + y * c; x = t;
    c = Math.cos(ry); s = Math.sin(ry);
    t = x * c + z * s; z = -x * s + z * c; x = t;
    c = Math.cos(rx); s = Math.sin(rx);
    t = y * c - z * s; z = y * s + z * c; y = t;
    return [x, y, z];
  }
  function proj(x, y, z) { var s = F / (F + z); return [CX + x * s, CY + y * s, s]; }
  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  var EXP = .72;
  function tri(c, img, sx0, sy0, sx1, sy1, sx2, sy2, dx0, dy0, dx1, dy1, dx2, dy2) {
    var S1x = sx1 - sx0, S1y = sy1 - sy0, S2x = sx2 - sx0, S2y = sy2 - sy0;
    var det = S1x * S2y - S2x * S1y; if (!det) return;
    var D1x = dx1 - dx0, D1y = dy1 - dy0, D2x = dx2 - dx0, D2y = dy2 - dy0;
    var a = (D1x * S2y - D2x * S1y) / det, b = (D1y * S2y - D2y * S1y) / det;
    var cc = (D2x * S1x - D1x * S2x) / det, d = (D2y * S1x - D1y * S2x) / det;
    var e = dx0 - a * sx0 - cc * sy0, f = dy0 - b * sx0 - d * sy0;
    var gx = (dx0 + dx1 + dx2) / 3, gy = (dy0 + dy1 + dy2) / 3;
    function ex(px, py) { if (!EXP) return [px, py]; var vx = px - gx, vy = py - gy, l = Math.hypot(vx, vy) || 1; return [px + vx / l * EXP, py + vy / l * EXP]; }
    var p0 = ex(dx0, dy0), p1 = ex(dx1, dy1), p2 = ex(dx2, dy2);
    c.save();
    c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]); c.closePath(); c.clip();
    c.transform(a, b, cc, d, e, f);
    c.drawImage(img, 0, 0);
    c.restore();
  }
  /* dibuja una textura sobre el cuadrilátero proyectado (TL,TR,BR,BL) */
  function quad(img, p, alpha) {
    ctx.save(); if (alpha < 1) ctx.globalAlpha = alpha;
    tri(ctx, img, 0, 0, img.width, 0, img.width, img.height, p[0][0], p[0][1], p[1][0], p[1][1], p[2][0], p[2][1]);
    tri(ctx, img, 0, 0, img.width, img.height, 0, img.height, p[0][0], p[0][1], p[2][0], p[2][1], p[3][0], p[3][1]);
    ctx.restore();
  }
  /* mapea la textura sobre la superficie subdividiendo en malla: elimina la costura
     diagonal del mapeo afín de 2 triángulos bajo perspectiva */
  function quadUV(img, mapUV, alpha, N) {
    N = N || 4;
    var pts = [], ix, iy;
    for (iy = 0; iy <= N; iy++) for (ix = 0; ix <= N; ix++) pts.push(mapUV(ix / N, iy / N));
    var iw = img.width, ih = img.height;
    ctx.save(); if (alpha < 1) ctx.globalAlpha = alpha;
    var c0 = mapUV(0, 0), c1 = mapUV(1, 0), c2 = mapUV(1, 1), c3 = mapUV(0, 1);
    tri(ctx, img, 0, 0, iw, 0, iw, ih, c0[0], c0[1], c1[0], c1[1], c2[0], c2[1]);
    tri(ctx, img, 0, 0, iw, ih, 0, ih, c0[0], c0[1], c2[0], c2[1], c3[0], c3[1]);
    EXP = 0;
    for (iy = 0; iy < N; iy++) for (ix = 0; ix < N; ix++) {
      var a = iy * (N + 1) + ix, b = a + 1, c = a + N + 1, d = c + 1;
      var u0 = ix / N * iw, u1 = (ix + 1) / N * iw, v0 = iy / N * ih, v1 = (iy + 1) / N * ih;
      tri(ctx, img, u0, v0, u1, v0, u1, v1, pts[a][0], pts[a][1], pts[b][0], pts[b][1], pts[d][0], pts[d][1]);
      tri(ctx, img, u0, v0, u1, v1, u0, v1, pts[a][0], pts[a][1], pts[d][0], pts[d][1], pts[c][0], pts[c][1]);
    }
    EXP = .72;
    ctx.restore();
  }
  function silhouette(pts, color, blur, ox, oy) {
    var OFF = 4000;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0][0] - OFF, pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] - OFF, pts[i][1]);
    ctx.closePath();
    ctx.shadowColor = color; ctx.shadowBlur = blur;
    ctx.shadowOffsetX = OFF + ox; ctx.shadowOffsetY = oy;
    ctx.fillStyle = "#000"; ctx.fill();
    ctx.restore();
  }
  function texture(key, w, h) {
    var c = POOL[key];
    var pw = Math.max(2, Math.round(w * TS)), ph = Math.max(2, Math.round(h * TS));
    if (!c) { c = POOL[key] = document.createElement("canvas"); }
    if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; }
    var g = c.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
    g.setTransform(TS, 0, 0, TS, 0, 0);
    return g;
  }
  var POOL = {};
  var F = 700, CX = 360, CY = 225;
  var WW = 392, WH = 252;                                   // ventana (unidades mundo)

  /* bloques de contenido: destino en el plano de la ventana + origen en profundidad */
  var BLOCKS = [
    { k: "hero",  w: 316, h: 42, x: 0,    y: -46, ox: 0,    oy: -70, oz: 320,  i: 0, kind: "hero" },
    { k: "c1",    w: 98,  h: 74, x: -108, y: 26,  ox: -210, oy: 40,  oz: 150,  i: 1, kind: "card" },
    { k: "c2",    w: 98,  h: 74, x: 0,    y: 26,  ox: 0,    oy: 190, oz: 240,  i: 2, kind: "card" },
    { k: "c3",    w: 98,  h: 74, x: 108,  y: 26,  ox: 215,  oy: 30,  oz: -190, i: 3, kind: "card" },
    { k: "f1",    w: 132, h: 12, x: -76,  y: 88,  ox: -90,  oy: 80,  oz: -230, i: 4, kind: "bar" },
    { k: "f2",    w: 56,  h: 12, x: 62,   y: 88,  ox: 110,  oy: 70,  oz: -260, i: 5, kind: "bar" }
  ];

  function frameTex(lit) {
    var g = texture("frame", WW, WH), w = WW, h = WH, R = 16;
    rr(g, 0, 0, w, h, R); g.save(); g.clip();
    var b = g.createLinearGradient(0, 0, w * .8, h);
    b.addColorStop(0, "#252B34"); b.addColorStop(.4, "#171A20"); b.addColorStop(1, "#0A0C10");
    g.fillStyle = b; g.fillRect(0, 0, w, h);
    // área de contenido hundida
    g.fillStyle = "#08090C"; g.fillRect(0, 36, w, h - 36);
    var sh = g.createLinearGradient(0, 36, 0, 70);
    sh.addColorStop(0, "rgba(0,0,0,.55)"); sh.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = sh; g.fillRect(0, 36, w, 34);
    // barra de chrome
    var cb = g.createLinearGradient(0, 0, 0, 36);
    cb.addColorStop(0, "rgba(255,255,255,.10)"); cb.addColorStop(1, "rgba(255,255,255,.02)");
    g.fillStyle = cb; g.fillRect(0, 0, w, 36);
    g.fillStyle = "rgba(255,255,255,.09)"; g.fillRect(0, 35, w, 1);
    // semáforo
    var dots = [ACC, "rgba(255,255,255,.22)", "rgba(255,255,255,.14)"];
    for (var i = 0; i < 3; i++) {
      g.beginPath(); g.arc(20 + i * 15, 18, 4.6, 0, TAU);
      g.fillStyle = dots[i]; g.fill();
    }
    // barra de dirección
    rr(g, 74, 10, w - 130, 16, 8); g.fillStyle = "rgba(255,255,255,.055)"; g.fill();
    rr(g, 84, 16, 74, 4, 2); g.fillStyle = "rgba(255,255,255,.16)"; g.fill();
    // brillo especular
    g.save(); g.translate(w * .34, h / 2); g.rotate(-.44); g.translate(-w * .34, -h / 2);
    var sp = g.createLinearGradient(w * .34 - 150, 0, w * .34 + 150, 0);
    sp.addColorStop(0, "rgba(255,255,255,0)");
    sp.addColorStop(.5, "rgba(255,255,255," + (.085 * lit).toFixed(3) + ")");
    sp.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = sp; g.fillRect(w * .34 - 160, -h, 320, h * 3); g.restore();
    g.restore();
    rr(g, .8, .8, w - 1.6, h - 1.6, R - 1);
    g.lineWidth = 1.3; g.strokeStyle = "rgba(255,255,255,.09)"; g.stroke();
    var rgd = g.createLinearGradient(0, 0, w * .8, h);
    rgd.addColorStop(0, "rgba(160,226,255,.75)"); rgd.addColorStop(.4, "rgba(82,191,254,.30)"); rgd.addColorStop(1, "rgba(82,191,254,0)");
    rr(g, 1.2, 1.2, w - 2.4, h - 2.4, R - 1);
    g.lineWidth = 2; g.strokeStyle = rgd; g.stroke();
    return g.canvas;
  }

  function blockTex(b, glow) {
    var g = texture(b.k, b.w, b.h), w = b.w, h = b.h, R = b.kind === "bar" ? h / 2 : 9;
    rr(g, 0, 0, w, h, R); g.save(); g.clip();
    if (b.kind === "hero") {
      var hg = g.createLinearGradient(0, 0, w, h);
      hg.addColorStop(0, "#7ED2FF"); hg.addColorStop(.5, "#52BFFE"); hg.addColorStop(1, "#2A8FD0");
      g.fillStyle = hg; g.fillRect(0, 0, w, h);
      var hl = g.createLinearGradient(0, 0, 0, h);
      hl.addColorStop(0, "rgba(255,255,255,.34)"); hl.addColorStop(.5, "rgba(255,255,255,0)");
      g.fillStyle = hl; g.fillRect(0, 0, w, h);
    } else if (b.kind === "card") {
      var cg = g.createLinearGradient(0, 0, w, h);
      cg.addColorStop(0, "#242A33"); cg.addColorStop(1, "#12151A");
      g.fillStyle = cg; g.fillRect(0, 0, w, h);
      rr(g, 12, 14, w - 24, 22, 5); g.fillStyle = "rgba(255,255,255,.07)"; g.fill();
      rr(g, 12, 46, w - 34, 6, 3); g.fillStyle = "rgba(255,255,255,.20)"; g.fill();
      rr(g, 12, 58, w - 52, 5, 2.5); g.fillStyle = "rgba(255,255,255,.10)"; g.fill();
      rr(g, 12, 14, 4, 22, 2); g.fillStyle = ACC; g.globalAlpha = .8; g.fill(); g.globalAlpha = 1;
    } else {
      g.fillStyle = "rgba(255,255,255,.16)"; g.fillRect(0, 0, w, h);
    }
    g.restore();
    rr(g, .6, .6, w - 1.2, h - 1.2, R);
    g.lineWidth = 1.1;
    g.strokeStyle = b.kind === "hero" ? "rgba(255,255,255,.35)" : "rgba(255,255,255,.10)";
    g.stroke();
    if (glow > .01 && b.kind !== "bar") {
      rr(g, 1, 1, w - 2, h - 2, R);
      g.lineWidth = 1.6; g.strokeStyle = "rgba(140,216,255," + (.5 * glow).toFixed(3) + ")"; g.stroke();
    }
    return g.canvas;
  }

  var FY = 0, RX = 0, RY = 0, RZ = 0;
  function surface(cxl, cyl, czl, w, h) {
    return function (u, v) {
      var r = rot(cxl + (u - .5) * w, cyl + (v - .5) * h, czl, RX, RY, RZ);
      return proj(r[0], r[1] + FY, r[2]);
    };
  }
  function corners(m) { return [m(0, 0), m(1, 0), m(1, 1), m(0, 1)]; }

  function render(t) {
    t = ((t % DUR) + DUR) % DUR;
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var fl = Math.sin(TAU * t / DUR);
    RY = (-22 + 2.2 * fl) * D2R; RX = (9 + 1.2 * Math.sin(TAU * t / DUR + 1.1)) * D2R; RZ = -1.6 * D2R;
    FY = 3 * fl;

    var fm = surface(0, 0, 0, WW, WH), fp = corners(fm);
    silhouette(fp, "rgba(0,0,0,.30)", 26, 10, 20);
    silhouette(fp, "rgba(82,191,254,.10)", 26, 0, 0);
    quadUV(frameTex(cl(.6 + .5 * fl, 0, 1.2)), fm, 1, 9);

    var items = [];
    for (var i = 0; i < BLOCKS.length; i++) {
      var b = BLOCKS[i], s = b.i * .085;
      var k = bump(t, .16 + s, .82 + s, 1.74 + s * .4, 2.42 + s * .5, eBack, eInOut);
      var a = cl(k * 2.2, 0, 1);
      var q = 1 - k;
      var lx = b.x + b.ox * q, ly = b.y + b.oy * q, lz = -3 + b.oz * q;
      var m = surface(lx, ly, lz, b.w, b.h);
      items.push({ b: b, k: k, a: a, m: m, p: corners(m), z: lz });
    }
    items.sort(function (m, n) { return n.z - m.z; });
    for (var j = 0; j < items.length; j++) {
      var it = items[j];
      if (it.a <= .01) continue;
      if (it.k < .99) silhouette(it.p, "rgba(0,0,0," + (.32 * it.a).toFixed(3) + ")", 18, 6, 12);
      quadUV(blockTex(it.b, 1 - it.k), it.m, it.a, cl(Math.round(Math.max(it.b.w, it.b.h) / 34), 2, 8));
    }
  }
  function drawFrame(f) {
    f = ((Math.round(f) % FRAMES) + FRAMES) % FRAMES;
    render(f * DUR / FRAMES);
    cv.setAttribute("data-frame", String(f));
  }
  window.drawFrame = drawFrame;
  window.renderTime = render;
  window.ANIM = { frames: FRAMES, fps: FRAMES / DUR, duration: DUR, width: W, height: H };
  cv.addEventListener("data-om-seek-to-time-frame", function (e) {
    var d = e.detail || {}; if (d.frame != null) drawFrame(d.frame); else render(d.time || 0);
  });
  // Arranque y frenado: la animacion corre por tiempo con rAF, asi que
  // sigue la tasa de refresco real de la pantalla (60, 120 Hz, la que sea).
  var _raf = null, _t0 = null;
  function _loop(ts) {
    if (_t0 === null) _t0 = ts;
    render(((ts - _t0) / 1000) % DUR);
    _raf = requestAnimationFrame(_loop);
  }
  function start() { if (_raf === null) { _t0 = null; _raf = requestAnimationFrame(_loop); } }
  function stop()  { if (_raf !== null) { cancelAnimationFrame(_raf); _raf = null; } }
  drawFrame(_opts.reposo || 0);              // estado quieto al iniciar
  return { start: start, stop: stop, drawFrame: drawFrame, anim: window.ANIM };

};

DTAnim.sys = function (_cv, _opts) {
  _opts = _opts || {};
  "use strict";
  var Q = new URLSearchParams(_opts.q || "");
  var W = 720, H = 450, DUR = 3, FRAMES = 36;              // 12 fps
  var SCALE = Math.max(1, Math.min(4, parseFloat(Q.get("scale") || "1") || 1));
  var TS = 2 * SCALE;                                      // supersample de textura
  var F = 640, CX = 316, CY = 190;                          // cámara
  var CW = 272, CH = CW * 146 / 240;                                   // tarjeta (unidades mundo)

  var cv = _cv;
  cv.width = W * SCALE; cv.height = H * SCALE;
  var ctx = cv.getContext("2d");

  /* ---------- easing / bumps (todo cierra en 0 → loop perfecto) ---------- */
  var cl = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var eOut = function (p) { return 1 - Math.pow(1 - p, 3); };
  var eBack = function (p) { var c = 1.28, q = p - 1; return 1 + (c + 1) * q * q * q + c * q * q; };
  var eInOut = function (p) { return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
  function bump(t, t0, t1, t2, t3, fo, fi) {
    if (t <= t0 || t >= t3) return 0;
    if (t < t1) return fo((t - t0) / (t1 - t0));
    if (t < t2) return 1;
    return 1 - fi((t - t2) / (t3 - t2));
  }
  var mix = function (a, b, k) { return a + (b - a) * k; };

  /* ---------- 3D ---------- */
  function rot(x, y, z, rx, ry, rz) {
    var c = Math.cos(rz), s = Math.sin(rz), t;
    t = x * c - y * s; y = x * s + y * c; x = t;
    c = Math.cos(ry); s = Math.sin(ry);
    t = x * c + z * s; z = -x * s + z * c; x = t;
    c = Math.cos(rx); s = Math.sin(rx);
    t = y * c - z * s; z = y * s + z * c; y = t;
    return [x, y, z];
  }
  function proj(x, y, z) { var s = F / (F + z); return [CX + x * s, CY + y * s, s]; }

  /* ---------- helpers de dibujo ---------- */
  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  /* mapeo afín exacto de un triángulo de textura a pantalla */
  var EXP = .72;
  function tri(c, img, sx0, sy0, sx1, sy1, sx2, sy2, dx0, dy0, dx1, dy1, dx2, dy2) {
    var S1x = sx1 - sx0, S1y = sy1 - sy0, S2x = sx2 - sx0, S2y = sy2 - sy0;
    var det = S1x * S2y - S2x * S1y; if (!det) return;
    var D1x = dx1 - dx0, D1y = dy1 - dy0, D2x = dx2 - dx0, D2y = dy2 - dy0;
    var a = (D1x * S2y - D2x * S1y) / det;
    var b = (D1y * S2y - D2y * S1y) / det;
    var cc = (D2x * S1x - D1x * S2x) / det;
    var d = (D2y * S1x - D1y * S2x) / det;
    var e = dx0 - a * sx0 - cc * sy0;
    var f = dy0 - b * sx0 - d * sy0;
    // expandir el triángulo ~0.4px para evitar costuras
    var gx = (dx0 + dx1 + dx2) / 3, gy = (dy0 + dy1 + dy2) / 3;
    function ex(px, py) { if (!EXP) return [px, py]; var vx = px - gx, vy = py - gy, l = Math.hypot(vx, vy) || 1; return [px + vx / l * EXP, py + vy / l * EXP]; }
    var p0 = ex(dx0, dy0), p1 = ex(dx1, dy1), p2 = ex(dx2, dy2);
    c.save();
    c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]); c.closePath(); c.clip();
    c.transform(a, b, cc, d, e, f);
    c.drawImage(img, 0, 0);
    c.restore();
  }
  /* mapea la textura sobre la superficie subdividiendo en malla: elimina la costura
     diagonal del mapeo afín de 2 triángulos bajo perspectiva */
  function quadUV(img, mapUV, N) {
    var pts = [], ix, iy;
    for (iy = 0; iy <= N; iy++) for (ix = 0; ix <= N; ix++) pts.push(mapUV(ix / N, iy / N));
    var iw = img.width, ih = img.height;
    var c0 = mapUV(0, 0), c1 = mapUV(1, 0), c2 = mapUV(1, 1), c3 = mapUV(0, 1);
    tri(ctx, img, 0, 0, iw, 0, iw, ih, c0[0], c0[1], c1[0], c1[1], c2[0], c2[1]);
    tri(ctx, img, 0, 0, iw, ih, 0, ih, c0[0], c0[1], c2[0], c2[1], c3[0], c3[1]);
    EXP = 0;
    for (iy = 0; iy < N; iy++) for (ix = 0; ix < N; ix++) {
      var a = iy * (N + 1) + ix, b = a + 1, c = a + N + 1, d = c + 1;
      var u0 = ix / N * iw, u1 = (ix + 1) / N * iw, v0 = iy / N * ih, v1 = (iy + 1) / N * ih;
      tri(ctx, img, u0, v0, u1, v0, u1, v1, pts[a][0], pts[a][1], pts[b][0], pts[b][1], pts[d][0], pts[d][1]);
      tri(ctx, img, u0, v0, u1, v1, u0, v1, pts[a][0], pts[a][1], pts[d][0], pts[d][1], pts[c][0], pts[c][1]);
    }
    EXP = .72;
  }
  /* silueta borrosa (sombra / bloom) sin ctx.filter */
  function silhouette(pts, color, blur, ox, oy) {
    var OFF = 4000;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0][0] - OFF, pts[0][1]);
    for (var i = 1; i < 4; i++) ctx.lineTo(pts[i][0] - OFF, pts[i][1]);
    ctx.closePath();
    ctx.shadowColor = color; ctx.shadowBlur = blur;
    ctx.shadowOffsetX = OFF + ox; ctx.shadowOffsetY = oy;
    ctx.fillStyle = "#000"; ctx.fill();
    ctx.restore();
  }

  /* ---------- textura de tarjeta ---------- */
  var texPool = [0, 1, 2].map(function () {
    var c = document.createElement("canvas");
    c.width = Math.round(CW * TS); c.height = Math.round(CH * TS);
    return c;
  });
  var ACC = "#52BFFE", VIO = "#8B7CF6";

  function paintCard(cnv, o) {
    var c = cnv.getContext("2d");
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cnv.width, cnv.height);
    var K = CW / 240;                        // contenido dibujado en espacio 240×146
    c.setTransform(TS * K, 0, 0, TS * K, 0, 0);
    var w = 240, h = 146, R = 14;

    rr(c, 0, 0, w, h, R); c.save(); c.clip();

    // cuerpo grafito
    var g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#282E38"); g.addColorStop(.42, "#181B22"); g.addColorStop(1, "#0B0D11");
    c.fillStyle = g; c.fillRect(0, 0, w, h);

    // sheen superior izquierdo
    var g2 = c.createRadialGradient(w * .16, -h * .22, 8, w * .16, -h * .22, w * .9);
    g2.addColorStop(0, "rgba(255,255,255,.19)"); g2.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g2; c.fillRect(0, 0, w, h);

    // reflejo especular (sigue la rotación)
    var sp = o.spec, px = o.specPos * w;
    if (sp > .01) {
      c.save();
      c.translate(px, h / 2); c.rotate(-0.46); c.translate(-px, -h / 2);
      var g3 = c.createLinearGradient(px - 108, 0, px + 108, 0);
      g3.addColorStop(0, "rgba(255,255,255,0)");
      g3.addColorStop(.42, "rgba(255,255,255," + (.06 * sp).toFixed(3) + ")");
      g3.addColorStop(.56, "rgba(255,255,255," + (.21 * sp).toFixed(3) + ")");
      g3.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = g3; c.fillRect(px - 120, -h, 240, h * 3);
      c.restore();
    }

    // ---- contenido: barras que sugieren texto, nada legible ----
    var pad = 14, ax = 13, aw = 6;
    c.save();
    c.shadowColor = "rgba(82,191,254," + (.55 * o.glow).toFixed(3) + ")";
    c.shadowBlur = 16 * o.glow;
    rr(c, ax, pad, aw, h - pad * 2, aw / 2);
    c.fillStyle = o.accent; c.globalAlpha = .55 + .45 * o.glow; c.fill();
    c.restore();

    var x0 = 31;
    function bar(x, y, bw, bh, al) { rr(c, x, y, bw, bh, bh / 2); c.fillStyle = "rgba(255,255,255," + al + ")"; c.fill(); }
    bar(x0, 18, o.v === 1 ? 114 : o.v === 0 ? 92 : 102, 9, .38);
    bar(x0, 35, o.v === 2 ? 54 : 70, 7, .15);
    bar(x0, 61, o.v === 1 ? 158 : 132, 6.5, .13);
    bar(x0, 75, o.v === 0 ? 92 : 112, 6.5, .095);
    bar(x0, 86.5, o.v === 1 ? 74 : 58, 6, .07);

    // barra de progreso
    var tw = w - x0 - 19;
    rr(c, x0, 96, tw, 4.5, 2.25); c.fillStyle = "rgba(255,255,255,.075)"; c.fill();
    rr(c, x0, 96, tw * (o.v === 0 ? .34 : o.v === 1 ? .72 : .52), 4.5, 2.25);
    c.fillStyle = o.accent; c.globalAlpha = .8; c.fill(); c.globalAlpha = 1;

    // avatares
    for (var i = 0; i < (o.v === 1 ? 3 : 2); i++) {
      c.beginPath(); c.arc(x0 + 7 + i * 15, 121, 7.5, 0, 6.2832);
      c.fillStyle = "#262A33"; c.fill();
      c.lineWidth = 1.2; c.strokeStyle = "rgba(255,255,255,.14)"; c.stroke();
    }
    // chip
    var chip = o.v === 1 ? VIO : o.accent;
    rr(c, w - 68, 113, 49, 16, 8);
    c.fillStyle = chip; c.globalAlpha = .16; c.fill(); c.globalAlpha = 1;
    c.lineWidth = 1.1; c.strokeStyle = chip; c.globalAlpha = .5; c.stroke(); c.globalAlpha = 1;
    rr(c, w - 59, 118.5, 27, 5, 2.5); c.fillStyle = chip; c.globalAlpha = .75; c.fill(); c.globalAlpha = 1;

    // profundidad
    if (o.dim > .001) { c.fillStyle = "rgba(6,8,11," + o.dim.toFixed(3) + ")"; c.fillRect(0, 0, w, h); }
    c.restore();

    // borde interno + luz de borde celeste
    rr(c, .8, .8, w - 1.6, h - 1.6, R - 1);
    c.lineWidth = 1.3; c.strokeStyle = "rgba(255,255,255,.08)"; c.stroke();
    // filo superior iluminado
    var eg = c.createLinearGradient(0, 0, 0, h);
    eg.addColorStop(0, "rgba(255,255,255,.34)"); eg.addColorStop(.14, "rgba(255,255,255,.03)"); eg.addColorStop(1, "rgba(255,255,255,0)");
    rr(c, 1, 1, w - 2, h - 2, R - 1);
    c.lineWidth = 1.1; c.strokeStyle = eg; c.stroke();

    var rg = c.createLinearGradient(0, 0, w * .85, h);
    var ri = o.rim;
    rg.addColorStop(0, "rgba(150,222,255," + (.85 * ri).toFixed(3) + ")");
    rg.addColorStop(.35, "rgba(82,191,254," + (.38 * ri).toFixed(3) + ")");
    rg.addColorStop(1, "rgba(82,191,254,0)");
    rr(c, 1.1, 1.1, w - 2.2, h - 2.2, R - 1);
    c.lineWidth = 2.2; c.strokeStyle = rg; c.stroke();
  }

  /* ---------- coreografía ---------- */
  var BASE = [
    { X: -52, Y: -64, Z: 175, ry: -24, rx: 10, rz: -3 },    // A  atrás/arriba
    { X: 0, Y: 0, Z: 0, ry: -20, rx: 9, rz: -2.5 },         // B  medio (héroe)
    { X: 52, Y: 64, Z: -175, ry: -16, rx: 8, rz: -2 }       // C  adelante/abajo
  ];
  var TARGET = [
    { X: -32, Y: -28, Z: 75, ry: -16, rx: 11, rz: -1 },     // A → baja al hueco
    { X: 142, Y: -8, Z: -70, ry: -4, rx: 6, rz: 2.5 },      // B → sale del stack
    { X: 24, Y: 30, Z: -75, ry: -26, rx: 6, rz: -5 }        // C → sube al hueco
  ];
  var D2R = Math.PI / 180, TAU = Math.PI * 2;

  function state(t) {
    // B: anticipación → salida con peso → hold → regreso
    var antic = bump(t, .04, .16, .21, .32, eOut, eOut);
    var kB = bump(t, .26, 1.02, 1.66, 2.62, eBack, eInOut);
    var kA = bump(t, .44, 1.20, 1.60, 2.52, eOut, eInOut);
    var kC = bump(t, .42, 1.24, 1.60, 2.56, eBack, eInOut);
    var ks = [kA, kB, kC];
    var out = [];
    for (var i = 0; i < 3; i++) {
      var b = BASE[i], g = TARGET[i], k = ks[i];
      var arc = Math.sin(Math.PI * k);
      var ph = i * 2.1, fl = Math.sin(TAU * t / DUR + ph);
      var s = {
        X: mix(b.X, g.X, k) + arc * (i === 2 ? -26 : i === 0 ? 24 : 10) + fl * 2.5,
        Y: mix(b.Y, g.Y, k) + arc * (i === 1 ? -14 : 0) + fl * 3.2,
        Z: mix(b.Z, g.Z, k) + (i === 1 ? antic * 30 : 0) + arc * (i === 2 ? -24 : 0),
        ry: (mix(b.ry, g.ry, k) + fl * 1.4) * D2R,
        rx: (mix(b.rx, g.rx, k) + Math.sin(TAU * t / DUR + ph + 1) * .9) * D2R,
        rz: (mix(b.rz, g.rz, k) + arc * (i === 2 ? 3 : -1.5)) * D2R,
        v: i, hero: i === 1 ? kB : 0,
        glow: .34 + .5 * Math.max(0, Math.sin(TAU * t / DUR + i * 2.0)) + (i === 1 ? .22 * k : 0),
        accent: ACC
      };
      out.push(s);
    }
    return out;
  }

  var L = (function () { var v = [-.42, -.62, -.66], l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; })();

  function drawCard(s, idx) {
    var pts = [], loc = [[-CW / 2, -CH / 2], [CW / 2, -CH / 2], [CW / 2, CH / 2], [-CW / 2, CH / 2]];
    for (var i = 0; i < 4; i++) {
      var r = rot(loc[i][0], loc[i][1], 0, s.rx, s.ry, s.rz);
      pts.push(proj(r[0] + s.X, r[1] + s.Y, r[2] + s.Z));
    }
    var n = rot(0, 0, -1, s.rx, s.ry, s.rz);
    var ld = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
    var sc = pts[0][2];
    var depth = cl((s.Z + 200) / 400, 0, 1);              // 0 = cerca, 1 = lejos

    // sombra suave
    silhouette(pts, "rgba(0,0,0," + (0.34 - 0.16 * depth).toFixed(3) + ")",
      (14 + 14 * (1 - depth) + 10 * s.hero) * sc, (8 + 7 * s.hero) * sc, (15 + 12 * s.hero) * sc);
    // bloom celeste
    silhouette(pts, "rgba(82,191,254," + (0.035 + 0.07 * (1 - depth) + 0.06 * s.hero).toFixed(3) + ")", (20 + 12 * s.hero) * sc, 0, 0);

    var cnv = texPool[idx];
    paintCard(cnv, {
      v: s.v, accent: s.accent, glow: cl(s.glow + 0.25 * s.hero, 0, 1),
      dim: 0.50 * depth,
      rim: cl(0.35 + 0.85 * ld, 0, 1.15),
      spec: cl(0.45 + 0.75 * ld, 0, 1.2),
      specPos: cl(0.5 - (s.ry / D2R) * 0.024, 0.08, 0.95)
    });

    quadUV(cnv, function (u, v) {
      var q = rot((u - .5) * CW, (v - .5) * CH, 0, s.rx, s.ry, s.rz);
      return proj(q[0] + s.X, q[1] + s.Y, q[2] + s.Z);
    }, 7);
  }

  function render(t) {
    t = ((t % DUR) + DUR) % DUR;
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var st = state(t), order = [0, 1, 2].sort(function (a, b) { return st[b].Z - st[a].Z; });
    for (var i = 0; i < 3; i++) drawCard(st[order[i]], order[i]);
  }

  function drawFrame(f) {
    f = ((Math.round(f) % FRAMES) + FRAMES) % FRAMES;
    render(f * DUR / FRAMES);
    cv.setAttribute("data-frame", String(f));
  }

  // API para captura determinística
  window.drawFrame = drawFrame;
  window.renderTime = render;
  window.ANIM = { frames: FRAMES, fps: FRAMES / DUR, duration: DUR, width: W, height: H };
  cv.addEventListener("data-om-seek-to-time-frame", function (e) {
    var d = e.detail || {}; if (d.frame != null) drawFrame(d.frame); else render(d.time || 0);
  });

  // Arranque y frenado: la animacion corre por tiempo con rAF, asi que
  // sigue la tasa de refresco real de la pantalla (60, 120 Hz, la que sea).
  var _raf = null, _t0 = null;
  function _loop(ts) {
    if (_t0 === null) _t0 = ts;
    render(((ts - _t0) / 1000) % DUR);
    _raf = requestAnimationFrame(_loop);
  }
  function start() { if (_raf === null) { _t0 = null; _raf = requestAnimationFrame(_loop); } }
  function stop()  { if (_raf !== null) { cancelAnimationFrame(_raf); _raf = null; } }
  drawFrame(_opts.reposo || 0);              // estado quieto al iniciar
  return { start: start, stop: stop, drawFrame: drawFrame, anim: window.ANIM };
};

DTAnim.app = function (_cv, _opts) {
  _opts = _opts || {};
  "use strict";
  var Q = new URLSearchParams(_opts.q || "");
  var W = 720, H = 450, DUR = 3, FRAMES = 36;              // 12 fps
  var SCALE = Math.max(1, Math.min(4, parseFloat(Q.get("scale") || "1") || 1));
  var TS = 2 * SCALE;
  var TAU = Math.PI * 2, D2R = Math.PI / 180;
  var ACC = "#52BFFE", VIO = "#8B7CF6";
  var cv = _cv;
  cv.width = W * SCALE; cv.height = H * SCALE;
  var ctx = cv.getContext("2d");

  var cl = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var mix = function (a, b, k) { return a + (b - a) * k; };
  var eOut = function (p) { return 1 - Math.pow(1 - p, 3); };
  var eBack = function (p) { var c = 1.28, q = p - 1; return 1 + (c + 1) * q * q * q + c * q * q; };
  var eInOut = function (p) { return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
  var eSmooth = function (p) { return p * p * (3 - 2 * p); };
  function bump(t, t0, t1, t2, t3, fo, fi) {
    if (t <= t0 || t >= t3) return 0;
    if (t < t1) return fo((t - t0) / (t1 - t0));
    if (t < t2) return 1;
    return 1 - fi((t - t2) / (t3 - t2));
  }
  function rot(x, y, z, rx, ry, rz) {
    var c = Math.cos(rz), s = Math.sin(rz), t;
    t = x * c - y * s; y = x * s + y * c; x = t;
    c = Math.cos(ry); s = Math.sin(ry);
    t = x * c + z * s; z = -x * s + z * c; x = t;
    c = Math.cos(rx); s = Math.sin(rx);
    t = y * c - z * s; z = y * s + z * c; y = t;
    return [x, y, z];
  }
  function proj(x, y, z) { var s = F / (F + z); return [CX + x * s, CY + y * s, s]; }
  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  var EXP = .72;
  function tri(c, img, sx0, sy0, sx1, sy1, sx2, sy2, dx0, dy0, dx1, dy1, dx2, dy2) {
    var S1x = sx1 - sx0, S1y = sy1 - sy0, S2x = sx2 - sx0, S2y = sy2 - sy0;
    var det = S1x * S2y - S2x * S1y; if (!det) return;
    var D1x = dx1 - dx0, D1y = dy1 - dy0, D2x = dx2 - dx0, D2y = dy2 - dy0;
    var a = (D1x * S2y - D2x * S1y) / det, b = (D1y * S2y - D2y * S1y) / det;
    var cc = (D2x * S1x - D1x * S2x) / det, d = (D2y * S1x - D1y * S2x) / det;
    var e = dx0 - a * sx0 - cc * sy0, f = dy0 - b * sx0 - d * sy0;
    var gx = (dx0 + dx1 + dx2) / 3, gy = (dy0 + dy1 + dy2) / 3;
    function ex(px, py) { if (!EXP) return [px, py]; var vx = px - gx, vy = py - gy, l = Math.hypot(vx, vy) || 1; return [px + vx / l * EXP, py + vy / l * EXP]; }
    var p0 = ex(dx0, dy0), p1 = ex(dx1, dy1), p2 = ex(dx2, dy2);
    c.save();
    c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]); c.closePath(); c.clip();
    c.transform(a, b, cc, d, e, f);
    c.drawImage(img, 0, 0);
    c.restore();
  }
  /* dibuja una textura sobre el cuadrilátero proyectado (TL,TR,BR,BL) */
  function quad(img, p, alpha) {
    ctx.save(); if (alpha < 1) ctx.globalAlpha = alpha;
    tri(ctx, img, 0, 0, img.width, 0, img.width, img.height, p[0][0], p[0][1], p[1][0], p[1][1], p[2][0], p[2][1]);
    tri(ctx, img, 0, 0, img.width, img.height, 0, img.height, p[0][0], p[0][1], p[2][0], p[2][1], p[3][0], p[3][1]);
    ctx.restore();
  }
  /* mapea la textura sobre la superficie subdividiendo en malla: elimina la costura
     diagonal del mapeo afín de 2 triángulos bajo perspectiva */
  function quadUV(img, mapUV, alpha, N) {
    N = N || 4;
    var pts = [], ix, iy;
    for (iy = 0; iy <= N; iy++) for (ix = 0; ix <= N; ix++) pts.push(mapUV(ix / N, iy / N));
    var iw = img.width, ih = img.height;
    ctx.save(); if (alpha < 1) ctx.globalAlpha = alpha;
    var c0 = mapUV(0, 0), c1 = mapUV(1, 0), c2 = mapUV(1, 1), c3 = mapUV(0, 1);
    tri(ctx, img, 0, 0, iw, 0, iw, ih, c0[0], c0[1], c1[0], c1[1], c2[0], c2[1]);
    tri(ctx, img, 0, 0, iw, ih, 0, ih, c0[0], c0[1], c2[0], c2[1], c3[0], c3[1]);
    EXP = 0;
    for (iy = 0; iy < N; iy++) for (ix = 0; ix < N; ix++) {
      var a = iy * (N + 1) + ix, b = a + 1, c = a + N + 1, d = c + 1;
      var u0 = ix / N * iw, u1 = (ix + 1) / N * iw, v0 = iy / N * ih, v1 = (iy + 1) / N * ih;
      tri(ctx, img, u0, v0, u1, v0, u1, v1, pts[a][0], pts[a][1], pts[b][0], pts[b][1], pts[d][0], pts[d][1]);
      tri(ctx, img, u0, v0, u1, v1, u0, v1, pts[a][0], pts[a][1], pts[d][0], pts[d][1], pts[c][0], pts[c][1]);
    }
    EXP = .72;
    ctx.restore();
  }
  function silhouette(pts, color, blur, ox, oy) {
    var OFF = 4000;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0][0] - OFF, pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] - OFF, pts[i][1]);
    ctx.closePath();
    ctx.shadowColor = color; ctx.shadowBlur = blur;
    ctx.shadowOffsetX = OFF + ox; ctx.shadowOffsetY = oy;
    ctx.fillStyle = "#000"; ctx.fill();
    ctx.restore();
  }
  function texture(key, w, h) {
    var c = POOL[key];
    var pw = Math.max(2, Math.round(w * TS)), ph = Math.max(2, Math.round(h * TS));
    if (!c) { c = POOL[key] = document.createElement("canvas"); }
    if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; }
    var g = c.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
    g.setTransform(TS, 0, 0, TS, 0, 0);
    return g;
  }
  var POOL = {};
  var F = 720, CX = 360, CY = 225;
  var PW = 172, PH = 344;                                   // teléfono (unidades mundo)

  var UI = [
    { k: "u0", w: 53,  h: 7,  x: -40, y: -126, i: 0, kind: "bar" },
    { k: "u1", w: 130, h: 40, x: 0,   y: -82,  i: 1, kind: "hero" },
    { k: "u2", w: 130, h: 30, x: 0,   y: -31,  i: 2, kind: "row" },
    { k: "u3", w: 130, h: 30, x: 0,   y: 5,    i: 3, kind: "row" },
    { k: "u4", w: 98,  h: 23, x: -14, y: 46,   i: 4, kind: "pill" },
    { k: "u5", w: 130, h: 26, x: 0,   y: 122,  i: 5, kind: "tabs" }
  ];

  function phoneTex(lit) {
    var g = texture("phone", PW, PH), w = PW, h = PH, R = 30;
    rr(g, 0, 0, w, h, R); g.save(); g.clip();
    var b = g.createLinearGradient(0, 0, w, h * .6);
    b.addColorStop(0, "#39414E"); b.addColorStop(.35, "#20242C"); b.addColorStop(1, "#0C0E12");
    g.fillStyle = b; g.fillRect(0, 0, w, h);
    // pantalla hundida
    rr(g, 8, 9, w - 16, h - 18, R - 8);
    g.fillStyle = "#07080B"; g.fill();
    g.save(); g.clip();
    var iv = g.createLinearGradient(0, 9, 0, 60);
    iv.addColorStop(0, "rgba(0,0,0,.7)"); iv.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = iv; g.fillRect(0, 9, w, 60);
    g.restore();
    // notch
    rr(g, w / 2 - 26, 15, 52, 11, 5.5); g.fillStyle = "#050608"; g.fill();
    rr(g, w / 2 + 10, 18, 6, 5, 2.5); g.fillStyle = "rgba(82,191,254,.35)"; g.fill();
    // reflejo diagonal sobre el vidrio
    g.save(); rr(g, 8, 9, w - 16, h - 18, R - 8); g.clip();
    g.translate(w * .3, h / 2); g.rotate(-.5); g.translate(-w * .3, -h / 2);
    var sp = g.createLinearGradient(w * .3 - 120, 0, w * .3 + 120, 0);
    sp.addColorStop(0, "rgba(255,255,255,0)");
    sp.addColorStop(.46, "rgba(255,255,255," + (.05 * lit).toFixed(3) + ")");
    sp.addColorStop(.58, "rgba(255,255,255," + (.15 * lit).toFixed(3) + ")");
    sp.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = sp; g.fillRect(w * .3 - 130, -h, 260, h * 3); g.restore();
    g.restore();
    // canto metálico
    rr(g, .9, .9, w - 1.8, h - 1.8, R - 1);
    g.lineWidth = 1.6; g.strokeStyle = "rgba(255,255,255,.16)"; g.stroke();
    var rgd = g.createLinearGradient(0, 0, w, h);
    rgd.addColorStop(0, "rgba(170,229,255,.85)"); rgd.addColorStop(.35, "rgba(82,191,254,.28)"); rgd.addColorStop(1, "rgba(82,191,254,0)");
    rr(g, 1.6, 1.6, w - 3.2, h - 3.2, R - 1.4);
    g.lineWidth = 2.2; g.strokeStyle = rgd; g.stroke();
    return g.canvas;
  }

  function uiTex(u, glow) {
    var g = texture(u.k, u.w, u.h), w = u.w, h = u.h;
    var R = u.kind === "bar" ? h / 2 : u.kind === "pill" ? h / 2 : 10;
    rr(g, 0, 0, w, h, R); g.save(); g.clip();
    if (u.kind === "hero") {
      var hg = g.createLinearGradient(0, 0, w, h);
      hg.addColorStop(0, "#7ED2FF"); hg.addColorStop(.55, "#52BFFE"); hg.addColorStop(1, "#2C93D4");
      g.fillStyle = hg; g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(255,255,255,.20)"; g.fillRect(0, 0, w, h * .4);
      rr(g, 12, 12, 78, 7, 3.5); g.fillStyle = "rgba(255,255,255,.75)"; g.fill();
      rr(g, 12, 26, 52, 6, 3); g.fillStyle = "rgba(255,255,255,.45)"; g.fill();
    } else if (u.kind === "row") {
      var cg = g.createLinearGradient(0, 0, w, h);
      cg.addColorStop(0, "#232830"); cg.addColorStop(1, "#14171C");
      g.fillStyle = cg; g.fillRect(0, 0, w, h);
      g.beginPath(); g.arc(19, h / 2, 9, 0, TAU); g.fillStyle = "#2C323C"; g.fill();
      g.lineWidth = 1; g.strokeStyle = "rgba(255,255,255,.12)"; g.stroke();
      rr(g, 36, 10, 64, 6, 3); g.fillStyle = "rgba(255,255,255,.28)"; g.fill();
      rr(g, 36, 21, 40, 5, 2.5); g.fillStyle = "rgba(255,255,255,.12)"; g.fill();
      rr(g, w - 22, 14, 10, 6, 3); g.fillStyle = "rgba(82,191,254,.55)"; g.fill();
    } else if (u.kind === "pill") {
      g.fillStyle = "rgba(139,124,246,.16)"; g.fillRect(0, 0, w, h);
      rr(g, 14, h / 2 - 3, 46, 6, 3); g.fillStyle = VIO; g.globalAlpha = .85; g.fill(); g.globalAlpha = 1;
    } else if (u.kind === "tabs") {
      g.fillStyle = "rgba(255,255,255,.05)"; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 4; i++) {
        g.beginPath(); g.arc(20 + i * 30, h / 2, 5.5, 0, TAU);
        g.fillStyle = i === 0 ? ACC : "rgba(255,255,255,.20)"; g.fill();
      }
    } else {
      g.fillStyle = "rgba(255,255,255,.30)"; g.fillRect(0, 0, w, h);
    }
    g.restore();
    if (u.kind !== "bar") {
      rr(g, .6, .6, w - 1.2, h - 1.2, R);
      g.lineWidth = 1; g.strokeStyle = u.kind === "hero" ? "rgba(255,255,255,.35)" : "rgba(255,255,255,.09)"; g.stroke();
    }
    if (glow > .01) {
      rr(g, 1, 1, w - 2, h - 2, R);
      g.lineWidth = 1.6; g.strokeStyle = "rgba(140,216,255," + (.55 * glow).toFixed(3) + ")"; g.stroke();
    }
    return g.canvas;
  }

  var RX = 0, RY = 0, RZ = 0, YOFF = 0;
  function surface(cxl, cyl, czl, w, h) {
    return function (u, v) {
      var r = rot(cxl + (u - .5) * w, cyl + (v - .5) * h, czl, RX, RY, RZ);
      return proj(r[0], r[1] + YOFF, r[2]);
    };
  }
  function corners(m) { return [m(0, 0), m(1, 0), m(1, 1), m(0, 1)]; }

  function render(t) {
    t = ((t % DUR) + DUR) % DUR;
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var sw = .5 - .5 * Math.cos(TAU * t / DUR);             // 0→1→0, cierra el ciclo
    RY = (-26 + 40 * eSmooth(sw)) * D2R;
    RX = (5 + 2.5 * Math.sin(TAU * t / DUR)) * D2R;
    RZ = (-1.5 + 2 * Math.sin(TAU * t / DUR + .7)) * D2R;
    YOFF = 5 * Math.sin(TAU * t / DUR + .4);

    var n = rot(0, 0, -1, RX, RY, RZ);
    var lit = cl(.35 + 1.1 * Math.max(0, -n[0] * .45 - n[1] * .55 - n[2] * .7), 0, 1.3);

    var pm = surface(0, 0, 0, PW, PH), pp = corners(pm);
    silhouette(pp, "rgba(0,0,0,.34)", 24, 10, 20);
    silhouette(pp, "rgba(82,191,254,.11)", 24, 0, 0);
    quadUV(phoneTex(lit), pm, 1, 9);

    for (var i = 0; i < UI.length; i++) {
      var u = UI[i], s = u.i * .105;
      var k = bump(t, .22 + s, .86 + s, 1.72 + s * .35, 2.34 + s * .45, eBack, eInOut);
      if (k <= .002) continue;
      var a = cl(k * 2.4, 0, 1), q = 1 - k;
      var m = surface(u.x, u.y + 34 * q, -4 - 46 * q, u.w * mix(.86, 1, k), u.h * mix(.86, 1, k));
      quadUV(uiTex(u, q), m, a, cl(Math.round(Math.max(u.w, u.h) / 34), 2, 8));
    }
  }
  function drawFrame(f) {
    f = ((Math.round(f) % FRAMES) + FRAMES) % FRAMES;
    render(f * DUR / FRAMES);
    cv.setAttribute("data-frame", String(f));
  }
  window.drawFrame = drawFrame;
  window.renderTime = render;
  window.ANIM = { frames: FRAMES, fps: FRAMES / DUR, duration: DUR, width: W, height: H };
  cv.addEventListener("data-om-seek-to-time-frame", function (e) {
    var d = e.detail || {}; if (d.frame != null) drawFrame(d.frame); else render(d.time || 0);
  });
  // Arranque y frenado: la animacion corre por tiempo con rAF, asi que
  // sigue la tasa de refresco real de la pantalla (60, 120 Hz, la que sea).
  var _raf = null, _t0 = null;
  function _loop(ts) {
    if (_t0 === null) _t0 = ts;
    render(((ts - _t0) / 1000) % DUR);
    _raf = requestAnimationFrame(_loop);
  }
  function start() { if (_raf === null) { _t0 = null; _raf = requestAnimationFrame(_loop); } }
  function stop()  { if (_raf !== null) { cancelAnimationFrame(_raf); _raf = null; } }
  drawFrame(_opts.reposo || 0);              // estado quieto al iniciar
  return { start: start, stop: stop, drawFrame: drawFrame, anim: window.ANIM };

};

DTAnim.ia = function (_cv, _opts) {
  _opts = _opts || {};
  "use strict";
  var Q = new URLSearchParams(_opts.q || "");
  var W = 720, H = 450, DUR = 3, FRAMES = 36;              // 12 fps
  var SCALE = Math.max(1, Math.min(4, parseFloat(Q.get("scale") || "1") || 1));
  var TS = 2 * SCALE;
  var TAU = Math.PI * 2, D2R = Math.PI / 180;
  var ACC = "#52BFFE", VIO = "#8B7CF6";
  var cv = _cv;
  cv.width = W * SCALE; cv.height = H * SCALE;
  var ctx = cv.getContext("2d");

  var cl = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var mix = function (a, b, k) { return a + (b - a) * k; };
  var eOut = function (p) { return 1 - Math.pow(1 - p, 3); };
  var eBack = function (p) { var c = 1.28, q = p - 1; return 1 + (c + 1) * q * q * q + c * q * q; };
  var eInOut = function (p) { return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
  var eSmooth = function (p) { return p * p * (3 - 2 * p); };
  function bump(t, t0, t1, t2, t3, fo, fi) {
    if (t <= t0 || t >= t3) return 0;
    if (t < t1) return fo((t - t0) / (t1 - t0));
    if (t < t2) return 1;
    return 1 - fi((t - t2) / (t3 - t2));
  }
  function rot(x, y, z, rx, ry, rz) {
    var c = Math.cos(rz), s = Math.sin(rz), t;
    t = x * c - y * s; y = x * s + y * c; x = t;
    c = Math.cos(ry); s = Math.sin(ry);
    t = x * c + z * s; z = -x * s + z * c; x = t;
    c = Math.cos(rx); s = Math.sin(rx);
    t = y * c - z * s; z = y * s + z * c; y = t;
    return [x, y, z];
  }
  function proj(x, y, z) { var s = F / (F + z); return [CX + x * s, CY + y * s, s]; }
  var F = 720, CX = 360, CY = 225;
  var CORE_R = 52;
  var RINGS = [
    { R: 186, rx: 66, ry: 0,   rz: 14,  n: 3, r: 21, a0: 0 },
    { R: 138, rx: 48, ry: 22,  rz: -34, n: 3, r: 16, a0: Math.PI / 3 }
  ];
  var NODES = [];
  (function () {
    for (var i = 0; i < RINGS.length; i++) {
      var g = RINGS[i];
      for (var j = 0; j < g.n; j++) {
        NODES.push({ ring: g, a0: g.a0 + j * TAU / g.n, r: g.r, ph: (i * 3 + j) * 1.02 });
      }
    }
  })();

  function sphereDark(x, y, r, litK) {
    var g = ctx.createRadialGradient(x - r * .36, y - r * .42, r * .06, x, y, r * 1.06);
    g.addColorStop(0, "#4A5361"); g.addColorStop(.28, "#262C36");
    g.addColorStop(.7, "#12151A"); g.addColorStop(1, "#06070A");
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = g; ctx.fill();
    // luz de borde celeste (rebote desde el núcleo)
    var rl = ctx.createRadialGradient(x + r * .42, y + r * .34, r * .2, x + r * .1, y + r * .1, r * 1.1);
    rl.addColorStop(0, "rgba(82,191,254," + (.55 * litK).toFixed(3) + ")");
    rl.addColorStop(.55, "rgba(82,191,254," + (.16 * litK).toFixed(3) + ")");
    rl.addColorStop(1, "rgba(82,191,254,0)");
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    ctx.fillStyle = rl; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
    // especular
    var sg = ctx.createRadialGradient(x - r * .34, y - r * .42, 0, x - r * .34, y - r * .42, r * .42);
    sg.addColorStop(0, "rgba(255,255,255,.55)"); sg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = sg; ctx.fill();
  }

  function core(x, y, r, pulse) {
    // halo
    var hr = r * (1.75 + .35 * pulse);
    var hg = ctx.createRadialGradient(x, y, r * .88, x, y, hr);
    hg.addColorStop(0, "rgba(82,191,254," + (.34 + .26 * pulse).toFixed(3) + ")");
    hg.addColorStop(.4, "rgba(82,191,254," + (.10 + .09 * pulse).toFixed(3) + ")");
    hg.addColorStop(1, "rgba(82,191,254,0)");
    ctx.beginPath(); ctx.arc(x, y, hr, 0, TAU); ctx.fillStyle = hg; ctx.fill();
    // cuerpo
    var g = ctx.createRadialGradient(x - r * .34, y - r * .40, r * .05, x, y, r * 1.04);
    g.addColorStop(0, "#EAF8FF"); g.addColorStop(.2, "#9EDCFF");
    g.addColorStop(.52, "#52BFFE"); g.addColorStop(.82, "#1E7BB8"); g.addColorStop(1, "#0C3D63");
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    // facetas
    ctx.globalAlpha = .07 + .05 * pulse;
    ctx.beginPath();
    ctx.moveTo(x - r * .9, y - r * .1); ctx.lineTo(x - r * .1, y - r * .95);
    ctx.lineTo(x + r * .55, y - r * .2); ctx.lineTo(x - r * .2, y + r * .5); ctx.closePath();
    ctx.fillStyle = "#FFFFFF"; ctx.fill();
    ctx.globalAlpha = .09;
    ctx.beginPath();
    ctx.moveTo(x + r * .1, y + r * .2); ctx.lineTo(x + r * .95, y + r * .1);
    ctx.lineTo(x + r * .4, y + r * .95); ctx.closePath();
    ctx.fillStyle = "#04283F"; ctx.fill();
    ctx.globalAlpha = 1;
    // núcleos internos
    var i1 = ctx.createRadialGradient(x - r * .1, y - r * .06, 0, x - r * .1, y - r * .06, r * .34);
    i1.addColorStop(0, "rgba(255,255,255," + (.9).toFixed(2) + ")"); i1.addColorStop(1, "rgba(255,255,255,0)");
    ctx.beginPath(); ctx.arc(x - r * .1, y - r * .06, r * .34, 0, TAU); ctx.fillStyle = i1; ctx.fill();
    var i2 = ctx.createRadialGradient(x + r * .3, y + r * .3, 0, x + r * .3, y + r * .3, r * .26);
    i2.addColorStop(0, "rgba(255,255,255," + (.45 + .4 * pulse).toFixed(3) + ")"); i2.addColorStop(1, "rgba(255,255,255,0)");
    ctx.beginPath(); ctx.arc(x + r * .3, y + r * .3, r * .26, 0, TAU); ctx.fillStyle = i2; ctx.fill();
    ctx.restore();
    var eg = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    eg.addColorStop(0, "rgba(255,255,255,.55)"); eg.addColorStop(.5, "rgba(255,255,255,.05)"); eg.addColorStop(1, "rgba(140,220,255,.35)");
    ctx.beginPath(); ctx.arc(x, y, r - .6, 0, TAU);
    ctx.lineWidth = 1.4; ctx.strokeStyle = eg; ctx.stroke();
  }

  function link(a, b, u, sc) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineWidth = 1.1 * sc;
    ctx.strokeStyle = "rgba(82,191,254,.16)";
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    if (u > 0) {
      var L = .22, s0 = cl(u - L, 0, 1), s1 = cl(u + L * .35, 0, 1);
      var x0 = mix(a[0], b[0], s0), y0 = mix(a[1], b[1], s0);
      var x1 = mix(a[0], b[0], s1), y1 = mix(a[1], b[1], s1);
      var pg = ctx.createLinearGradient(x0, y0, x1, y1);
      pg.addColorStop(0, "rgba(82,191,254,0)");
      pg.addColorStop(.72, "rgba(140,219,255,.95)");
      pg.addColorStop(1, "rgba(230,248,255,0)");
      ctx.lineWidth = 2.4 * sc;
      ctx.strokeStyle = pg;
      ctx.shadowColor = "rgba(82,191,254,.85)"; ctx.shadowBlur = 10 * sc;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    ctx.restore();
  }

  function render(t) {
    t = ((t % DUR) + DUR) % DUR;
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var spin = TAU * t / DUR;
    var cy = CY + 4 * Math.sin(spin);
    var list = [], pulseSum = 0;

    for (var i = 0; i < NODES.length; i++) {
      var nd = NODES[i], g = nd.ring, a = nd.a0 + spin;
      var p = rot(Math.cos(a) * g.R, 0, Math.sin(a) * g.R, g.rx * D2R, g.ry * D2R, g.rz * D2R);
      var s = proj(p[0], p[1], p[2]);
      var beat = .5 + .5 * Math.sin(spin * 2 + nd.ph);      // latido desfasado, 2 ciclos
      var u = (t / DUR + nd.ph * .16) % 1;
      var trav = u < .5 ? u * 2 : (1 - u) * 2;              // va y vuelve
      var dir = u < .5 ? 1 : 0;
      pulseSum += Math.pow(trav, 6);
      list.push({ x: s[0], y: s[1] + (cy - CY), sc: s[2], z: p[2], r: nd.r * s[2] * (1 + .07 * beat), beat: beat, trav: trav, dir: dir });
    }
    list.sort(function (m, n) { return n.z - m.z; });

    var cxp = CX, cyp = cy;
    function paint(nd) {
      var a = [nd.x, nd.y], b = [cxp, cyp];
      link(nd.dir ? a : b, nd.dir ? b : a, nd.trav, nd.sc);
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 16 * nd.sc; ctx.shadowOffsetY = 8 * nd.sc;
      ctx.beginPath(); ctx.arc(nd.x, nd.y, nd.r, 0, TAU); ctx.fillStyle = "#000"; ctx.fill();
      ctx.restore();
      sphereDark(nd.x, nd.y, nd.r, .4 + .6 * nd.beat);
    }
    for (var j = 0; j < list.length; j++) if (list[j].z > 0) paint(list[j]);
    core(cxp, cyp, CORE_R * (1 + .035 * Math.sin(spin * 2)), cl(pulseSum, 0, 1));
    for (var k = 0; k < list.length; k++) if (list[k].z <= 0) paint(list[k]);
  }
  function drawFrame(f) {
    f = ((Math.round(f) % FRAMES) + FRAMES) % FRAMES;
    render(f * DUR / FRAMES);
    cv.setAttribute("data-frame", String(f));
  }
  window.drawFrame = drawFrame;
  window.renderTime = render;
  window.ANIM = { frames: FRAMES, fps: FRAMES / DUR, duration: DUR, width: W, height: H };
  cv.addEventListener("data-om-seek-to-time-frame", function (e) {
    var d = e.detail || {}; if (d.frame != null) drawFrame(d.frame); else render(d.time || 0);
  });
  // Arranque y frenado: la animacion corre por tiempo con rAF, asi que
  // sigue la tasa de refresco real de la pantalla (60, 120 Hz, la que sea).
  var _raf = null, _t0 = null;
  function _loop(ts) {
    if (_t0 === null) _t0 = ts;
    render(((ts - _t0) / 1000) % DUR);
    _raf = requestAnimationFrame(_loop);
  }
  function start() { if (_raf === null) { _t0 = null; _raf = requestAnimationFrame(_loop); } }
  function stop()  { if (_raf !== null) { cancelAnimationFrame(_raf); _raf = null; } }
  drawFrame(_opts.reposo || 0);              // estado quieto al iniciar
  return { start: start, stop: stop, drawFrame: drawFrame, anim: window.ANIM };

};
