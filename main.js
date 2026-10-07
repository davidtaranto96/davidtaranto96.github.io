/* ============================================================
   DT SYSTEM · WEB PERSONAL v2 — main.js
   Sin dependencias. Comentado en español.
   ============================================================ */
(() => {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let lang = localStorage.getItem("dt-lang") || "es";   // idioma actual (ES default)

  /* ---------- 1. TEMA (light/dark) ----------
     El default ya se aplicó con el script inline del <head> (evita flash).
     Al togglear: View Transitions API con reveal circular desde el botón;
     fallback: cross-fade de 0.55s agregando .theme-fade a <html>. */
  const root = document.documentElement;
  function applyTheme(next) { root.dataset.theme = next; localStorage.setItem("dt-theme", next); }

  $("#themeToggle")?.addEventListener("click", (e) => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    const btn = e.currentTarget.getBoundingClientRect();
    const x = btn.left + btn.width / 2;
    const y = btn.top + btn.height / 2;

    if (document.startViewTransition && !reduced) {
      // Guardamos el origen del reveal en variables (--theme-toggle-x/y)
      root.style.setProperty("--theme-toggle-x", x + "px");
      root.style.setProperty("--theme-toggle-y", y + "px");
      const vt = document.startViewTransition(() => applyTheme(next));
      // .catch: si se toglea dos veces rápido, la transición anterior se
      // aborta y su promesa rechaza — lo ignoramos sin ruido en consola.
      vt.ready.then(() => {
        // Radio: distancia del botón a la esquina más lejana del viewport
        const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        try {
          root.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
            { duration: 550, easing: "cubic-bezier(0.4,0,0.2,1)", pseudoElement: "::view-transition-new(root)" }
          );
        } catch { vt.skipTransition(); }
      }).catch(() => {});
      // Red de seguridad: como el CSS anula la animación default de la VT,
      // si animate() del pseudo-elemento falla o el navegador congela la
      // transición (pasa en algunos mobiles), la captura VIEJA quedaría
      // pegada en pantalla. Pasados 900ms la salteamos sí o sí.
      setTimeout(() => { try { vt.skipTransition(); } catch { /* ya terminó */ } }, 900);
    } else if (!reduced) {
      // Fallback: cross-fade de colores
      root.classList.add("theme-fade");
      applyTheme(next);
      setTimeout(() => root.classList.remove("theme-fade"), 600);
    } else {
      // Con reduced-motion, .theme-fade (0,1,1) le gana por especificidad
      // a la regla universal del @media y dispara un cross-fade de 550ms
      // sobre todo el DOM: justo lo que el usuario pidio no tener.
      applyTheme(next);
    }
  });

  /* ---------- 2. BEAM sincronizado al reloj ----------
     El loop dura 4000ms. Con delay negativo -(Date.now()%4000) el beam
     arranca "donde le toca" según la hora: nunca se resetea entre cargas. */
  const beam = $(".bar-beam");
  if (beam) beam.style.animationDelay = `-${(Date.now() % 4000) / 1000}s`;

  /* ---------- 3. Announcement bar dismissible ---------- */
  const bar = $("#bar");
  if (bar) {
    if (localStorage.getItem("dt-bar-dismissed") === "1") bar.hidden = true;
    $(".bar-x", bar)?.addEventListener("click", () => {
      bar.hidden = true;
      localStorage.setItem("dt-bar-dismissed", "1");
    });
  }

  /* ---------- 4. TYPEWRITER del hero ----------
     Tipea (85ms/letra), pausa 2.4s, borra (45ms/letra), siguiente palabra. */
  const tw = $("#tw");
  // Lista de palabras según idioma (data-words / data-words-en)
  const getWords = () => (((lang === "en" ? tw.dataset.wordsEn : tw.dataset.words) || tw.dataset.words) || "").split("|");
  if (tw) {
    if (reduced) {
      tw.textContent = getWords()[0]; // estático si el usuario pide menos movimiento
    } else {
      let wi = 0, ci = 0, deleting = false;
      (function tick() {
        const words = getWords();
        const word = words[wi % words.length];
        ci = Math.min(ci, word.length) + (deleting ? -1 : 1);
        tw.textContent = word.slice(0, ci);
        let wait = deleting ? 45 : 85;
        if (!deleting && ci >= word.length) { wait = 2400; deleting = true; }
        else if (deleting && ci <= 0) { ci = 0; deleting = false; wi = (wi + 1) % words.length; wait = 350; }
        setTimeout(tick, wait);
      })();
    }
  }

  /* ---------- 5. PARALLAX de los screenshots flotantes ----------
     data-depth 2..4 → desplazamiento máx ~18px. Batched con rAF. */
  const floats = $$(".float");
  if (floats.length && !reduced && matchMedia("(hover: hover)").matches) {
    let mx = 0, my = 0, raf = null;
    addEventListener("mousemove", (e) => {
      mx = e.clientX / innerWidth - 0.5;   // -0.5 .. 0.5
      my = e.clientY / innerHeight - 0.5;
      if (!raf) raf = requestAnimationFrame(() => {
        raf = null;
        for (const f of floats) {
          const d = +f.dataset.depth || 2;          // 2..4
          f.style.setProperty("--px", (-mx * d * 9).toFixed(1) + "px"); // 4*9*0.5 = 18px máx
          f.style.setProperty("--py", (-my * d * 9).toFixed(1) + "px");
        }
      });
    }, { passive: true });
  }

  /* ---------- 6. SPOTLIGHT de cursor (rAF) ---------- */
  const spot = $(".fx-spot");
  if (spot && !reduced && matchMedia("(hover: hover)").matches) {
    let sx = 0, sy = 0, sraf = null;
    addEventListener("mousemove", (e) => {
      sx = e.clientX; sy = e.clientY;
      if (!sraf) sraf = requestAnimationFrame(() => {
        sraf = null;
        spot.style.setProperty("--mx", sx + "px");
        spot.style.setProperty("--my", sy + "px");
      });
    }, { passive: true });
  }

  /* ---------- 7. Video del laptop: pausar fuera del viewport ---------- */
  const vid = $("#lapVideo");
  if (vid && "IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (en.isIntersecting) vid.play().catch(() => {}); else vid.pause();
      }
    }, { threshold: 0.35 }).observe(vid);
  }

  /* ---------- 8. Chips de password copiables ---------- */
  $$(".pw").forEach((chip) => {
    chip.addEventListener("click", async (e) => {
      e.preventDefault(); e.stopPropagation();
      try {
        await navigator.clipboard.writeText(chip.dataset.pw || "");
        const prev = chip.textContent;
        chip.classList.add("copied");
        chip.textContent = "Copied ✓";
        setTimeout(() => { chip.classList.remove("copied"); chip.textContent = prev; }, 1500);
      } catch { /* clipboard bloqueado: no hacemos nada */ }
    });
  });

  /* ---------- 9. FORMULARIO IA → WhatsApp con briefing prellenado ----------
     Sin backend: arma el mensaje con los campos y abre wa.me?text=.
     Validación nativa (required) + estado loading en el botón. */
  const aiForm = $("#aiForm");
  if (aiForm) {
    // Chips de tipo de proyecto (selección única, solo entre data-val)
    $$(".af-chip[data-val]", aiForm).forEach((ch) =>
      ch.addEventListener("click", () => {
        $$(".af-chip[data-val]", aiForm).forEach((c) => c.classList.remove("on"));
        ch.classList.add("on");
      })
    );
    // Canal de envío (WhatsApp/Email) + hint acorde
    const afHint = $("#afHint");
    $$(".af-chip[data-via]", aiForm).forEach((ch) =>
      ch.addEventListener("click", () => {
        $$(".af-chip[data-via]", aiForm).forEach((c) => c.classList.remove("on"));
        ch.classList.add("on");
        const mail = ch.dataset.via === "mail";
        if (afHint) afHint.textContent = lang === "en"
          ? (mail ? "Opens your email app with the briefing ready to send." : "Opens WhatsApp with your briefing ready to send.")
          : (mail ? "Se abre tu correo con el briefing listo para enviar." : "Se abre en WhatsApp con tu briefing listo para enviar.");
      })
    );
    // Auto-grow del textarea (fallback donde no hay field-sizing)
    const ta = $("textarea", aiForm);
    ta?.addEventListener("input", () => {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
    });
    aiForm.addEventListener("submit", (e) => {
      e.preventDefault();
      aiForm.classList.add("tried");
      if (!aiForm.checkValidity()) { aiForm.reportValidity(); return; }
      const btn = $(".af-send", aiForm);
      if (btn.classList.contains("is-loading")) return;
      const nombre = aiForm.nombre.value.trim();
      const negocio = aiForm.negocio.value.trim();
      const correo = aiForm.correo.value.trim();
      const telefono = aiForm.telefono.value.trim();
      const tipo = $(".af-chip.on[data-val]", aiForm)?.dataset.val || "";
      const idea = aiForm.idea.value.trim();
      const via = $(".af-chip.on[data-via]", aiForm)?.dataset.via || "wa";
      // Briefing multilínea (para email); en wa.me también respeta los saltos
      const L = lang === "en"
        ? { hi: `Hi! I'm ${nombre}`, biz: "Business", mail: "Email", tel: "Phone", need: "I need", idea: "My idea", subj: `Project inquiry \u2014 ${nombre}` }
        : { hi: `\u00a1Hola! Soy ${nombre}`, biz: "Negocio", mail: "Correo", tel: "Tel\u00e9fono", need: "Necesito", idea: "Mi idea", subj: `Consulta de proyecto \u2014 ${nombre}` };
      const msg = [
        L.hi,
        negocio && `${L.biz}: ${negocio}`,
        correo && `${L.mail}: ${correo}`,
        telefono && `${L.tel}: ${telefono}`,
        `${L.need}: ${tipo}`,
        `${L.idea}: ${idea}`
      ].filter(Boolean).join("\n");
      // Sin espera artificial: no hay backend que esperar, el spinner
      // simulaba trabajo inexistente y le costaba 600ms a la conversion.
      // La clase sigue puesta un rato porque es el guard anti doble-submit
      // (se chequea arriba), pero ya no bloquea el envio.
      btn.classList.add("is-loading");
      setTimeout(() => btn.classList.remove("is-loading"), 1200);
      if (via === "mail") {
        location.href = `mailto:david_taranto@outlook.es?subject=${encodeURIComponent(L.subj)}&body=${encodeURIComponent(msg)}`;
      } else {
        open(`https://wa.me/5493875454070?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
      }
    });
  }

  /* ---------- 10. Acordeón del footer (solo mobile) ----------
     Una columna abierta a la vez; max-height animado por CSS. */
  $$(".f-col h4").forEach((h) => {
    h.addEventListener("click", () => {
      if (!matchMedia("(max-width: 720px)").matches) return;
      const col = h.parentElement;
      const wasOpen = col.classList.contains("open");
      $$(".f-col.open").forEach((c) => c.classList.remove("open"));
      if (!wasOpen) col.classList.add("open");
    });
  });

  /* ---------- 11. Menú mobile: cerrar al navegar ---------- */
  const menu = $("#menu");
  $$(".menu-pop a", menu || document).forEach((a) =>
    a.addEventListener("click", () => menu?.removeAttribute("open"))
  );
  addEventListener("click", (e) => {
    if (menu?.open && !menu.contains(e.target)) menu.removeAttribute("open");
  });

  /* ---------- 12. Count-up de stats del bento ----------
     Cuentan de 0 al valor (~1s, easeOutCubic) al entrar al viewport.
     Con reduced-motion muestran el valor final directo. */
  const counters = $$("[data-count]");
  if (counters.length && "IntersectionObserver" in window) {
    const cio = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (!en.isIntersecting) return;
        cio.unobserve(en.target);
        const el = en.target, target = +el.dataset.count, suf = el.dataset.suffix || "";
        if (reduced) { el.textContent = target + suf; return; }
        const t0 = performance.now();
        (function step(t) {
          const p = Math.min((t - t0) / 1000, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased) + suf;
          if (p < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.4 });
    counters.forEach((c) => {
      if (!reduced) c.textContent = "0" + (c.dataset.suffix || "");
      cio.observe(c);
    });
  }

  /* ---------- 13. Títulos palabra por palabra (Stökt) ----------
     Partimos cada .h2 en <span class="w">; al entrar al viewport (una
     sola vez) se agrega .in → fade + subida con stagger de 40ms (CSS). */
  const splitH2 = (hEl) => {
    hEl.innerHTML = hEl.textContent.trim().split(/\s+/)
      .map((w, i) => `<span class="w" style="--w:${i}">${w}</span>`).join(" ");
  };
  if (!reduced) {
    const heads = $$(".h2");
    heads.forEach(splitH2);
    const hio = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("in"); hio.unobserve(en.target); }
      });
    }, { threshold: 0.25 });
    heads.forEach((h) => hio.observe(h));
  }

  /* ---------- 14. Border beams sincronizados al reloj ----------
     Mismo truco que el announcement bar: delay negativo según Date.now()
     para que el destello nunca se resetee entre cargas. */
  $$(".beam-card").forEach((el) =>
    el.style.setProperty("--bb-delay", `-${(Date.now() % 4500) / 1000}s`)
  );

  /* ---------- 15. GLOBO PUNTEADO (canvas, estilo Stökt) ----------
     Sin librerías: mapa del mundo como bitmask ASCII (48×24 celdas de
     7.5°), cada celda de tierra genera 4 subpuntos → se proyectan con
     proyección ortográfica (rotación Y continua + tilt X fijo) y se
     dibujan solo los del hemisferio visible, con alpha según profundidad.
     Marker celeste pulsante en Salta (-24.8, -65.4). */
  const globeC = $("#globeCanvas");
  if (globeC) {
    const gctx = globeC.getContext("2d");
    const D2R = Math.PI / 180;
    const ll = (lat, lon) => ({
      x: Math.cos(lat * D2R) * Math.sin(lon * D2R),
      y: Math.sin(lat * D2R),
      z: Math.cos(lat * D2R) * Math.cos(lon * D2R)
    });
    // Costas REALES (Natural Earth 110m) horneadas en assets/land-data.js:
    // anillos de costa como polilíneas + puntos interiores pre-calculados.
    const coastLines = [], land = [];
    if (window.LAND_DATA) {
      for (const ring of window.LAND_DATA.coast) {
        const line = [];
        for (let i = 0; i < ring.length; i += 2) line.push(ll(ring[i + 1], ring[i]));
        coastLines.push(line);
      }
      const d = window.LAND_DATA.dots;
      for (let i = 0; i < d.length; i += 2) land.push(ll(d[i + 1], d[i]));
    }
    // Graticule como POLILÍNEAS (cada 10°, muestreadas cada 3°) — mucho más
    // parecido a Stökt que los puntitos: paralelos y meridianos continuos.
    const parallels = [], meridians = [];
    for (let lat = -80; lat <= 80; lat += 8) {
      const line = [];
      for (let lon = -180; lon <= 180; lon += 3) line.push(ll(lat, lon));
      parallels.push(line);
    }
    for (let lon = -180; lon < 180; lon += 8) {
      const line = [];
      for (let lat = -90; lat <= 90; lat += 3) line.push(ll(lat, lon));
      meridians.push(line);
    }
    const salta = ll(-24.7859, -65.4117);   // Salta Capital, exacto
    const TILT = -0.42;                 // centra la vista en ~lat -24 (Salta)
    const ROT0 = 65.4 * D2R;            // arranca con Salta de frente
    const SPEED = 0.0028;               // velocidad de crucero
    let rot = ROT0, speed = SPEED, targetSpeed = SPEED;
    let visible = true, dpr = Math.min(devicePixelRatio || 1, 2);
    // Hover: el globo desacelera a ~12% (lerp, sin frenazo seco)
    globeC.addEventListener("mouseenter", () => { targetSpeed = SPEED * 0.12; });
    globeC.addEventListener("mouseleave", () => { targetSpeed = SPEED; });

    // Proyecta un punto: rotación Y + tilt X. Devuelve [sx, sy, prof]
    function proj(p, cx, cy, R, cosR, sinR, cosT, sinT) {
      const x1 = p.x * cosR + p.z * sinR;
      const z1 = -p.x * sinR + p.z * cosR;
      const y2 = p.y * cosT - z1 * sinT;
      const z2 = p.y * sinT + z1 * cosT;
      return [cx + x1 * R, cy - y2 * R, z2];
    }

    function drawGlobe(now) {
      const w = globeC.clientWidth || 400;
      if (globeC.width !== Math.round(w * dpr)) { globeC.width = Math.round(w * dpr); globeC.height = Math.round(w * dpr); }
      gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gctx.clearRect(0, 0, w, w);
      // La sección bento está invertida: en página clara el card es oscuro
      const darkCard = root.dataset.theme !== "dark";
      const ink = darkCard ? "242,242,242" : "23,24,27";
      const cx = w / 2, cy = w / 2, R = w / 2 - 6;
      const cosR = Math.cos(rot), sinR = Math.sin(rot);
      const cosT = Math.cos(TILT), sinT = Math.sin(TILT);
      // Contorno
      gctx.strokeStyle = `rgba(${ink},0.28)`;
      gctx.lineWidth = 1;
      gctx.beginPath(); gctx.arc(cx, cy, R, 0, 7); gctx.stroke();
      // Graticule: líneas continuas del hemisferio visible (se corta el
      // trazo cuando el punto pasa al hemisferio oculto)
      gctx.strokeStyle = `rgba(${ink},0.10)`;
      gctx.lineWidth = 0.7;
      for (const line of [...parallels, ...meridians]) {
        gctx.beginPath();
        let pen = false;
        for (const p of line) {
          const [sx, sy, z] = proj(p, cx, cy, R, cosR, sinR, cosT, sinT);
          if (z > -0.02) { pen ? gctx.lineTo(sx, sy) : gctx.moveTo(sx, sy); pen = true; }
          else pen = false;
        }
        gctx.stroke();
      }
      // Tierra: textura punteada tenue (el mar queda liso, como Stökt)
      gctx.fillStyle = `rgba(${ink},0.38)`;
      for (const p of land) {
        const [sx, sy, z] = proj(p, cx, cy, R, cosR, sinR, cosT, sinT);
        if (z <= 0) continue;
        const s = 1 + z * 0.7;
        gctx.fillRect(sx, sy, s, s);
      }
      // COSTAS: polilíneas reales nítidas — el contorno de países/continentes
      gctx.strokeStyle = `rgba(${ink},0.95)`;
      gctx.lineWidth = 1.1;
      gctx.lineJoin = "round";
      for (const line of coastLines) {
        gctx.beginPath();
        let pen = false;
        for (const p of line) {
          const [sx, sy, z] = proj(p, cx, cy, R, cosR, sinR, cosT, sinT);
          if (z > -0.02) { pen ? gctx.lineTo(sx, sy) : gctx.moveTo(sx, sy); pen = true; }
          else pen = false;
        }
        gctx.stroke();
      }
      // Marker de Salta: celeste con halo pulsante
      const [mx2, my2, mz] = proj(salta, cx, cy, R, cosR, sinR, cosT, sinT);
      if (mz > 0) {
        const pulse = 0.5 + 0.5 * Math.sin(now / 350);
        gctx.strokeStyle = `rgba(82,191,254,${(0.5 * (1 - pulse)).toFixed(2)})`;
        gctx.lineWidth = 1.5;
        gctx.beginPath(); gctx.arc(mx2, my2, 7 + 9 * pulse, 0, 7); gctx.stroke();
        gctx.fillStyle = `rgba(82,191,254,${(0.3 * pulse).toFixed(2)})`;
        gctx.beginPath(); gctx.arc(mx2, my2, 11, 0, 7); gctx.fill();
        gctx.fillStyle = "#52BFFE";
        gctx.beginPath(); gctx.arc(mx2, my2, 4.2, 0, 7); gctx.fill();
        // Etiqueta "SALTA" junto al marker, para ubicarla sin dudas
        gctx.font = "600 10px 'Geist Mono', monospace";
        gctx.fillStyle = `rgba(${ink},0.9)`;
        gctx.fillText("SALTA", mx2 + 12, my2 + 3);
      }
    }

    if (reduced) {
      requestAnimationFrame((t) => drawGlobe(t));
    } else {
      // Giro completo y continuo; el hover lo frena suavemente (lerp)
      (function loop(t) {
        if (visible) {
          speed += (targetSpeed - speed) * 0.06;
          rot += speed;
          drawGlobe(t || 0);
        }
        requestAnimationFrame(loop);
      })(0);
      if ("IntersectionObserver" in window)
        new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0.05 })
          .observe(globeC);
    }
  }

  /* ---------- 16. i18n: ES (default, inline en el HTML) / EN ----------
     Cada elemento traducible lleva data-i18n="clave". Al cambiar a EN se
     guarda el HTML original en data-es y se pisa con el diccionario; al
     volver a ES se restaura. Persistido en localStorage (dt-lang). */
  const EN = {
    skip: "Skip to content",
    bar_t: "Available for new projects \u2014",
    bar_l: "Chat on WhatsApp",
    nav_inicio: "Home", nav_prod: "Products", nav_proy: "Projects", nav_sobre: "About me", nav_contacto: "Contact",
    chat: "Get in touch",
    hero_t: "Building your",
    hero_sub: "Custom websites, online stores and CRMs — with automation and AI where it counts. Built in Salta, running in production.",
    cta_hero: "Chat on WhatsApp \u2192",
    cta_work: "See my work",
    mob_eb: "Truly mobile-first",
    mob_h: "Built for how it's really used: from the phone.",
    srv_eb: "Products", srv_h: "Choose where to start.",
    srv_sub: "Four ways to work with me, from a site with a bot to the full system.",
    ribbon: "Most requested",
    s1_h: "Webs & Stores",
    s1_tag: "Landings, corporate sites and e-commerce that sell.",
    s1_l1: "Custom landing and corporate site",
    s1_l2: "Online store with payments and shipping",
    s1_l3: "SEO, analytics and a built-in WhatsApp bot",
    price: "Price: <b>Custom</b>",
    see_more: "Learn more \u2192",
    acc_pill: "See details \u2192",
    acc_reset: "\u2715 Close details",
    s2_h: "Systems & CRM",
    s2_tag: "Software for your business: CRM, panel and portal, like DT-System.",
    s2_l1: "CRM with pipeline, projects and tasks",
    s2_l2: "PDF quotes, invoicing and P&amp;L",
    s2_l3: "Client portal and reports",
    s3_h: "Mobile apps",
    s3_tag: "Custom Android & iPhone apps, from design to the store.",
    s3_l1: "Mobile-first design and prototype",
    s3_l2: "Cross-platform development",
    s3_l3: "Google Play & App Store release",
    s4_h: "AI Automation",
    s4_tag: "Processes that run themselves: AI + integrations.",
    s4_l1: "WhatsApp bots with AI (Claude)",
    s4_l2: "M365/Azure flows and Graph API",
    s4_l3: "Integrations across your tools",
    lap_eb: "See it working", lap_h: "One of my CRMs at work.",
    lap_sub: "This is Brújula, the CRM I built for Berni Studio — shown with demo data.",
    about_eb: "About me", about_h: "The person behind the system.",
    f_p1: "SysAdmin at JBKnowledge (a global company) based in Salta, Argentina. Computer Engineering student, 5+ years managing M365, Azure and automation.",
    f_p2: "Today I have two custom CRMs in production: Francisco Molins's, which feeds his real-estate portal, and the one that runs Berni Studio's work. I designed and built both, and I maintain them myself.",
    f_p3: "I work from idea to deploy: solo when that's enough, building a team when the project calls for it.",
    f_cta: "Work with me",
    f_h: "The Founder",
    st1: "Years in IT", st2: "Custom CRMs in production", st3: "Sites in Argentina and Mexico",
    globe_h: "Based in Salta, Argentina",
    avail: "AVAILABLE \u00b7 REMOTE WORLDWIDE",
    tools_h: "Everyday stack",
    test_eb: "Trust", test_h: "Results, not promises.",
    test_note: "*Straight from clients",
    cta_note: "*No fluff",
    mk_h: "Brands that already trusted me",
    mk_note: "*Delivered work, not filler logos",
    cs_eb: "Cases", cs_h: "Work delivered.",
    cs_sub: "Real clients, in production. Anything with a link, you can open right now.",
    cs_s1: "client projects", cs_s2: "online right now", cs_s3: "on their own domain",
    cs_f0: "All", cs_f1: "Sites & stores", cs_f2: "Systems & CRM",
    cs_f3: "Mobile apps", cs_f4: "AI automation",
    // CASOS:INICIO
    c13s: "Real-estate development · Salta",
    c14s: "Custom CRM + portal · Salta",
    c1s: "Site + bookings · Salta retreats",
    c2s: "Custom store · leather atelier",
    c16s: "Yucatán chukum · bilingual",
    c4s: "Trilingual corporate site · agri",
    c5s: "Gated community · real estate",
    c12s: "Real-estate brokerage · Salta",
    or_c: "Client", or_p: "Own",
    // CASOS:FIN
    cta_eb: "Seriously", cta_h: "LET'S TALK.",
    cta_sub: "Got an idea? Tell me about it. Fill in the briefing and WhatsApp or your email opens with the message ready \u2014 I read it myself and get back to you.",
    cta_btn: "Talk to my assistant",
    af_head: "Tell me about your project",
    af_badge: "AI \u00b7 instant reply",
    af_name: "Your name", af_from: "Your business / project",
    af_mail: "Your email", af_tel: "Your phone", af_opt: "\u00b7 optional",
    af_via: "Send via",
    af_type: "What do you need?",
    af_t1: "Web / Store", af_t2: "System / CRM", af_t3: "Mobile app", af_t4: "AI Automation", af_t5: "Other",
    af_idea: "Tell me the idea",
    af_hint: "Opens WhatsApp with your briefing ready to send.",
    af_send: "Send briefing",
    af_direct: "Direct WhatsApp \u2197",
    nl_h: "News & deals",
    nl_p: "Launches, deals and lessons from building with AI. Zero spam.",
    nl_btn: "Count me in \u2192",
    f_proj: "Projects", f_rec: "Resources", f_cont: "Contact",
    f_wa: "WhatsApp", f_status: "Available for projects", f_crm: "Custom CRM",
    made: "Made in Salta, Argentina"
  };
  const langLbl = $("#langLabel");
  function setLang(l, animate) {
    lang = l;
    localStorage.setItem("dt-lang", l);
    document.documentElement.lang = l === "en" ? "en" : "es";
    if (langLbl) langLbl.textContent = l.toUpperCase();
    $$("[data-i18n]").forEach((el) => {
      const k = el.dataset.i18n;
      if (el.dataset.es === undefined) el.dataset.es = el.innerHTML; // snapshot ES
      const v = l === "en" ? EN[k] : el.dataset.es;
      if (v !== undefined) el.innerHTML = v;
    });
    // Placeholders de inputs/textarea (data-ph = clave i18n)
    const PH_EN = { af_name_ph: "Jane Doe", af_from_ph: "Store, studio, startup\u2026", af_idea_ph: "I want a system that\u2026", af_mail_ph: "you@email.com", af_tel_ph: "+1 555 000 0000", nl_ph: "you@email.com" };
    $$("[data-ph]").forEach((el) => {
      if (el.dataset.esPh === undefined) el.dataset.esPh = el.placeholder;
      el.placeholder = l === "en" ? (PH_EN[el.dataset.ph] ?? el.placeholder) : el.dataset.esPh;
    });
    // Los H2 se re-parten palabra por palabra en el idioma nuevo
    if (!reduced) $$(".h2[data-i18n]").forEach((hEl) => { splitH2(hEl); hEl.classList.add("in"); });
    // Efecto de cambio: cada texto traducido entra con blur+fade (suave,
    // menos abrupto que el reveal del tema pero visible)
    if (animate && !reduced) {
      root.classList.add("lang-swap");
      setTimeout(() => root.classList.remove("lang-swap"), 650);
    }
  }
  $("#langToggle")?.addEventListener("click", () => setLang(lang === "en" ? "es" : "en", true));

  /* ---------- 19. Testimonios arrastrables ----------
     El drag NO pelea con la animación del marquee: el keyframe anima
     transform, y el offset del drag va por la propiedad 'translate'
     (independiente). Al soltar, el offset decae suavemente a 0. */
  const tmq = $(".t-marquee");
  if (tmq) {
    let dragging = false, sx = 0, base = 0, off = 0;
    tmq.addEventListener("pointerdown", (e) => {
      dragging = true; sx = e.clientX; base = off;
      tmq.setPointerCapture(e.pointerId);
      tmq.classList.add("dragging");
      $$(".mtrack", tmq).forEach((t) => { t.style.animationPlayState = "paused"; });
    });
    tmq.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      off = Math.max(-380, Math.min(380, base + e.clientX - sx));
      tmq.style.setProperty("--drag", off + "px");
    });
    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      tmq.classList.remove("dragging");
      $$(".mtrack", tmq).forEach((t) => { t.style.animationPlayState = ""; });
      (function decay() {
        off *= 0.94;
        tmq.style.setProperty("--drag", off.toFixed(1) + "px");
        if (Math.abs(off) > 0.5 && !dragging) requestAnimationFrame(decay);
      })();
    };
    tmq.addEventListener("pointerup", endDrag);
    tmq.addEventListener("pointercancel", endDrag);
  }
  if (lang === "en") setLang("en");   // aplicar idioma guardado al cargar

  /* ---------- 19. Newsletter (footer) ----------
     Sin backend: abre un mail de suscripción prellenado y muestra "Listo ✓".
     Para automatizarlo: reemplazar por fetch al endpoint de Formspree/
     Buttondown/Mailchimp con el mismo input. */
  const nlForm = $("#nlForm");
  nlForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    nlForm.classList.add("tried");
    if (!nlForm.checkValidity()) { nlForm.reportValidity(); return; }
    const em = nlForm.email.value.trim();
    const subj = lang === "en" ? "Newsletter signup" : "Suscripci\u00f3n a novedades";
    const body = lang === "en" ? `Please add me to the list: ${em}` : `Sumame a la lista: ${em}`;
    location.href = `mailto:david_taranto@outlook.es?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
    const btn = $(".nl-btn", nlForm);
    const prev = btn.textContent;
    btn.textContent = lang === "en" ? "Done \u2713" : "Listo \u2713";
    setTimeout(() => { btn.textContent = prev; nlForm.reset(); nlForm.classList.remove("tried"); }, 2500);
  });

  /* ---------- 17. Acordeón de servicios (Stökt) ----------
     Un panel abierto a la vez; los cerrados quedan como franjas con el
     título vertical. La animación es CSS (transition de flex). */
  const acc = $("#acc");
  const accReset = $("#accReset");
  if (acc) {
    const closeAll = () => {
      $$(".acc-p", acc).forEach((p) => {
        p.classList.remove("open");
        $(".acc-tab", p)?.setAttribute("aria-expanded", "false");
      });
    };
    $$(".acc-tab", acc).forEach((tab) =>
      tab.addEventListener("click", () => {
        closeAll();
        const p = tab.closest(".acc-p");
        p.classList.add("open");
        tab.setAttribute("aria-expanded", "true");
        acc.classList.add("has-open");         // modo detalle
        accReset?.removeAttribute("hidden");
      })
    );
    // Mini botón de reset: cierra todo y vuelve a la grilla inicial
    accReset?.addEventListener("click", () => {
      closeAll();
      acc.classList.remove("has-open");
      accReset.setAttribute("hidden", "");
    });
  }

  /* ---------- 18. Cursor inteligente (Stökt) ----------
     Cuadradito blanco con mix-blend-mode: difference → invierte lo que
     tiene debajo, así SIEMPRE contrasta (fondo claro → se ve oscuro y
     viceversa), sin medir píxeles. Sigue al mouse con lerp (rAF) y crece
     sobre elementos interactivos. Solo mouse fino; nunca touch/reduced. */
  if (!reduced && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const cur = document.createElement("div");
    cur.className = "cursor";
    cur.setAttribute("aria-hidden", "true");
    const curTxt = document.createElement("span");   // texto del cursor-pill
    cur.appendChild(curTxt);
    document.body.appendChild(cur);
    root.classList.add("cursor-on");     // oculta el cursor nativo vía CSS
    let tx = innerWidth / 2, ty = -40, x = tx, y = ty;
    addEventListener("mousemove", (e) => {
      tx = e.clientX; ty = e.clientY;
      const it = e.target.closest && e.target.closest("a, button, summary, .pw, .acc-tab");
      cur.classList.toggle("on", !!it);
      // ¿El elemento (o un ancestro) declara una acción? → el cursor se
      // transforma en una pill con texto (estilo Stökt "LEARN MORE")
      const lb = e.target.closest && e.target.closest("[data-cursor]");
      if (lb) curTxt.textContent = (lang === "en" && lb.dataset.cursorEn) || lb.dataset.cursor;
      cur.classList.toggle("label", !!lb);
    }, { passive: true });
    addEventListener("mousedown", () => cur.classList.add("down"));
    addEventListener("mouseup", () => cur.classList.remove("down"));
    document.documentElement.addEventListener("mouseleave", () => { cur.style.opacity = "0"; });
    document.documentElement.addEventListener("mouseenter", () => { cur.style.opacity = "1"; });
    // El loop se corta cuando el cursor alcanzo al mouse y lo relanza el
    // proximo mousemove. Antes corria un rAF por frame para siempre, aunque
    // el mouse estuviera quieto o la pestaña sin uso.
    let siguiendo = false;
    const follow = () => {
      x += (tx - x) * 0.22; y += (ty - y) * 0.22;
      cur.style.left = x + "px"; cur.style.top = y + "px";
      if (Math.abs(tx - x) < 0.1 && Math.abs(ty - y) < 0.1) { siguiendo = false; return; }
      requestAnimationFrame(follow);
    };
    const arrancar = () => { if (!siguiendo) { siguiendo = true; requestAnimationFrame(follow); } };
    addEventListener("mousemove", arrancar, { passive: true });
    arrancar();
  }

  /* ---------- 20. Filtro de casos ----------
     Los chips filtran por data-cat sin tocar el DOM: solo [hidden]. El
     contador de resultados se lee por lector de pantalla (aria-live). */
  const csFilter = $("#csFilter"), csGrid = $("#csGrid");
  if (csFilter && csGrid) {
    const cards = $$(".demo", csGrid);
    const chips = $$(".af-chip", csFilter);
    const status = document.createElement("p");
    status.className = "sr-only";
    status.setAttribute("aria-live", "polite");
    csGrid.parentNode.insertBefore(status, csGrid);

    const apply = (f) => {
      let n = 0;
      cards.forEach((c) => {
        const show = f === "all" || c.dataset.cat === f;
        c.hidden = !show;
        if (show) n++;
      });
      status.textContent = n + (lang === "en" ? " projects shown" : " proyectos visibles");
    };

    // un chip cuya categoria no tiene casos hoy se esconde: si mañana
    // se agrega un caso de esa categoria, reaparece solo
    chips.forEach((chip) => {
      const f = chip.dataset.f;
      if (f !== "all" && !cards.some((c) => c.dataset.cat === f)) chip.hidden = true;
    });
    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        chips.forEach((c) => c.classList.toggle("on", c === chip));
        apply(chip.dataset.f);
        revelarVisibles();   // el filtro puede mostrar cards aún sin revelar
      });
    });
  }

  /* ---------- 21. Reveal escalonado de las cards de casos ----------
     Las 12 cards entraban de golpe. El escalonado se corta a las 8 primeras
     de cada tanda: más que eso y la última tarda casi medio segundo de más.
     Dos redes de seguridad, porque el modo de falla de este efecto es dejar
     contenido invisible para siempre:
       a) el gate .fx-on (en el <head>): si el JS no corre, todo se ve;
       b) el barrido de abajo, para el que scrollea rápido o entra por
          #proyectos — ahí el observer nunca cruza un umbral y no dispara. */
  let revelarVisibles = () => {};
  const csCards = $$(".cs-grid .demo");
  if (csCards.length) {
    if (reduced) {
      csCards.forEach((c) => c.classList.add("fx-visto"));
    } else if ("IntersectionObserver" in window) {
      let pendientes = csCards.slice();
      const marcar = (el, i) => {
        el.style.setProperty("--fx-d", Math.min(i, 7) * 55 + "ms");
        el.classList.add("fx-visto");
        rio.unobserve(el);
      };
      const rio = new IntersectionObserver((ents) => {
        let i = 0;
        ents.forEach((en) => { if (en.isIntersecting) marcar(en.target, i++); });
        pendientes = pendientes.filter((el) => !el.classList.contains("fx-visto"));
      }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
      csCards.forEach((el) => rio.observe(el));

      // Rescate: lo que quedó POR ENCIMA de la pantalla se muestra sin
      // transición. Si el usuario saltó con #proyectos o scrolleó de golpe,
      // el observer nunca cruza un umbral y esas cards no se enterarían.
      // Sólo mira r.bottom < 0: las que están a la vista las maneja el
      // observer, con su escalonado — rescatarlas acá lo anularía.
      const rescatarArriba = () => {
        for (let i = pendientes.length - 1; i >= 0; i--) {
          const el = pendientes[i];
          if (el.getBoundingClientRect().bottom < 0) {
            el.style.setProperty("--fx-d", "0ms");
            el.classList.add("fx-visto");
            rio.unobserve(el);
            pendientes.splice(i, 1);
          }
        }
      };
      addEventListener("scroll", rescatarArriba, { passive: true });
      addEventListener("resize", rescatarArriba, { passive: true });
      rescatarArriba();

      // El filtro puede sacar de [hidden] una card que nunca se reveló: si
      // ya está en pantalla, el observer no vuelve a dispararse por ella.
      revelarVisibles = () => {
        for (let i = pendientes.length - 1; i >= 0; i--) {
          const el = pendientes[i];
          if (el.hidden) continue;
          const r = el.getBoundingClientRect();
          if (r.top < innerHeight && r.bottom > 0) {
            el.style.setProperty("--fx-d", "0ms");
            el.classList.add("fx-visto");
            rio.unobserve(el);
            pendientes.splice(i, 1);
          }
        }
      };
    } else {
      csCards.forEach((c) => c.classList.add("fx-visto"));
    }
  }

  /* ---------- 22. Objetos animados del acordeon ----------
     Se resuelven en vivo sobre un <canvas>, no son video ni WebP: asi la
     animacion corre a la tasa de refresco real de la pantalla y el dibujo
     sale nitido a cualquier densidad. 48 KB los cuatro modulos.
     Cada panel tiene DOS canvas del mismo objeto: el del cover (quieto en
     su frame mas legible; anima al hover) y el del detalle, que corre en
     loop continuo mientras el panel esta abierto — como la referencia de
     wearestokt.com, donde el objeto sigue vivo en la card expandida. */
  const REPOSO = { web: 18, sys: 18, app: 17, ia: 9 };
  $$(".acc-p").forEach((panel) => {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const instanciar = (cv) => {
      const crear = window.DTAnim && window.DTAnim[cv.dataset.obj];
      if (!crear) return null;
      try { return crear(cv, { q: "scale=" + dpr, reposo: REPOSO[cv.dataset.obj] || 0 }); }
      catch (e) { return null; }
    };
    const cover = instanciar($(".acc-cover canvas.srv-obj", panel));
    const detalle = instanciar($(".acc-img canvas.srv-obj", panel));
    if (reduced) return;                  // quedan los frames quietos

    // cover: anima al hover, solo mientras el panel este cerrado
    if (cover) {
      const entra = () => { if (!panel.classList.contains("open")) cover.start(); };
      panel.addEventListener("pointerenter", entra);
      panel.addEventListener("pointerleave", cover.stop);
      panel.addEventListener("focusin", entra);
      panel.addEventListener("focusout", cover.stop);
    }
    // detalle: loop continuo mientras el panel este abierto. Se observa la
    // clase .open en vez de engancharse al modulo del acordeon: cubre
    // tambien el boton de reset y no acopla los dos modulos.
    if (detalle && "MutationObserver" in window) {
      new MutationObserver(() => {
        if (panel.classList.contains("open")) { cover && cover.stop(); detalle.start(); }
        else detalle.stop();
      }).observe(panel, { attributes: true, attributeFilter: ["class"] });
    }
    // fuera del viewport nadie dibuja; al volver, el detalle retoma si
    // el panel sigue abierto
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((es) => {
        es.forEach((e) => {
          if (!e.isIntersecting) { cover && cover.stop(); detalle && detalle.stop(); }
          else if (detalle && panel.classList.contains("open")) detalle.start();
        });
      }, { rootMargin: "120px 0px" }).observe(panel);
    }
  });

  /* ---------- 23. Pausar animaciones fuera del viewport ----------
     Las animaciones CSS siguen corriendo aunque el elemento no se vea: sin
     esto quedan ~33 loops activos, 24 de ellos invisibles, gastando batería.
     Se observan las <section> (8 observers en vez de 30) y el CSS pausa todo
     lo que cuelgue de la sección, pseudo-elementos incluidos.
     El rootMargin de 250px hace que la sección ya venga animando cuando
     asoma, así nunca se ve el arranque de un loop. La barra sticky queda
     afuera a propósito: siempre está a la vista. */
  if ("IntersectionObserver" in window && !reduced) {
    const pio = new IntersectionObserver((ents) => {
      ents.forEach((en) => en.target.classList.toggle("fx-quieto", !en.isIntersecting));
    }, { rootMargin: "250px 0px" });
    $$("section").forEach((sec) => pio.observe(sec));
  }

  /* ---------- 23b. Revelado generalizado + nav reactivo + parallax ----------
     Mismo contrato que el reveal de los casos: estado oculto solo bajo
     html.fx-on, observer que marca .fx-visto, y rescate POR GEOMETRIA
     (nunca por reloj — ver el error del timer ciego en la wiki): lo que
     quedo con el borde inferior por encima del viewport se muestra sin
     transicion. */
  const rvEls = $$("[data-rv]");
  if (rvEls.length) {
    if (reduced || !("IntersectionObserver" in window)) {
      rvEls.forEach((el) => el.classList.add("fx-visto"));
    } else {
      let pend = rvEls.slice();
      const rvo = new IntersectionObserver((es) => {
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("fx-visto");
          rvo.unobserve(e.target);
        });
        pend = pend.filter((el) => !el.classList.contains("fx-visto"));
      }, { threshold: 0.12, rootMargin: "0px 0px -30px 0px" });
      rvEls.forEach((el) => rvo.observe(el));
      const rescate = () => {
        for (let i = pend.length - 1; i >= 0; i--) {
          const el = pend[i];
          if (el.getBoundingClientRect().bottom < 0) {
            el.style.transition = "none";
            el.classList.add("fx-visto");
            rvo.unobserve(el);
            pend.splice(i, 1);
          }
        }
      };
      addEventListener("scroll", rescate, { passive: true });
      rescate();
    }
  }

  /* Nav reactivo: la pill gana cuerpo al despegarse del tope. Un solo
     listener con bandera para no tocar clases en cada frame. */
  {
    let lejos = false;
    const medir = () => {
      const ahora = scrollY > 24;
      if (ahora !== lejos) { lejos = ahora; root.classList.toggle("nav-lejos", ahora); }
    };
    addEventListener("scroll", medir, { passive: true });
    medir();
  }

  /* Parallax corto del poster de la laptop: recorrido de 40px, batcheado
     con rAF, apagado en tactil y reduced. */
  const lapPx = $(".lap-px");
  if (lapPx && !reduced && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    let pedido = false;
    const mover = () => {
      pedido = false;
      const r = lapPx.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;  // -0.5..0.5
      lapPx.style.translate = "0 " + (-p * 40).toFixed(1) + "px";
    };
    addEventListener("scroll", () => {
      if (!pedido) { pedido = true; requestAnimationFrame(mover); }
    }, { passive: true });
    mover();
  }

  /* ---------- 24. Tarjeta holografica del founder ----------
     Portado del ProfileCard de React Bits. El puntero define cuatro
     variables CSS y el CSS hace todo el trabajo visual; aca solo se
     calculan numeros.
     El seguimiento es con lerp (no salto directo): el valor corre hacia
     el objetivo un 14% por frame, que es lo que le da la sensacion de
     peso. Al salir vuelve al centro y el rAF se corta solo, asi no queda
     un bucle girando de fondo. */
  const pfCard = $(".pf-card");
  if (pfCard && !reduced && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const TAU = 0.14;
    let px = 50, py = 50, tx = 50, ty = 50;     // actual y objetivo, en %
    let raf = null, activo = false;

    const pintar = () => {
      const dx = tx - px, dy = ty - py;
      px += dx * TAU; py += dy * TAU;
      const alCentro = Math.min(1, Math.hypot(py - 50, px - 50) / 50);
      const st = pfCard.style;
      st.setProperty("--pointer-x", px.toFixed(2) + "%");
      st.setProperty("--pointer-y", py.toFixed(2) + "%");
      st.setProperty("--pointer-from-center", alCentro.toFixed(3));
      st.setProperty("--rotate-x", (-(py - 50) / 6).toFixed(2) + "deg");
      st.setProperty("--rotate-y", ((px - 50) / 5).toFixed(2) + "deg");
      // se corta cuando alcanzo al puntero y ya no hay nadie encima
      if (!activo && Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) { raf = null; return; }
      raf = requestAnimationFrame(pintar);
    };
    const arrancar = () => { if (raf === null) raf = requestAnimationFrame(pintar); };

    pfCard.addEventListener("pointermove", (e) => {
      const r = pfCard.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * 100;
      ty = ((e.clientY - r.top) / r.height) * 100;
      arrancar();
    }, { passive: true });
    pfCard.addEventListener("pointerenter", () => {
      activo = true;
      pfCard.style.setProperty("--pf-op", "1");
      pfCard.style.transition = "none";          // el tilt lo maneja el rAF
      arrancar();
    });
    pfCard.addEventListener("pointerleave", () => {
      activo = false;
      tx = 50; ty = 50;                          // vuelve al centro
      pfCard.style.setProperty("--pf-op", "0");
      pfCard.style.transition = "";              // y el CSS suaviza la vuelta
      arrancar();
    });
  }
})();
