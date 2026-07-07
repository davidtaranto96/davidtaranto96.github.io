# Handoff: DT System — Web Personal v2

## Overview
Web personal / portfolio de **David Taranto** (Salta, Argentina) bajo la marca **DT System**: SysAdmin en JBKnowledge + builder freelance de productos con IA. La página vende 4 productos (Webs y Tiendas, Sistemas y CRM, Apps móviles, Automatización IA), muestra DT-System (CRM interno con bot de WhatsApp + Claude) como prueba de capacidad, y convierte vía un asistente de WhatsApp con IA.

**Lema:** "Automate the boring stuff, focus on what matters."
**Estética:** mono-tech premium — inspiración directa de buildcleanslate.com (tipografía mono, grilla, beams de luz) y wearestokt.com (nav de vidrio, cursor inteligente, acordeón, globo punteado, títulos palabra-por-palabra).

## About the Design Files
Los archivos de este bundle son **referencias de diseño construidas en HTML/CSS/JS vanilla** — son un prototipo funcional completo (corre tal cual en GitHub Pages), pero si el destino es otro entorno (Next.js, Astro, etc.), la tarea es **recrear estos diseños con los patrones del codebase destino**, usando este código como spec exacta. Si no hay entorno aún, el HTML estático de este bundle ES deployable directamente.

## Fidelity
**High-fidelity (hifi).** Colores, tipografía, espaciados, animaciones y microinteracciones son finales. Los únicos elementos placeholder son: imágenes (SVGs rayados con medidas exactas + prompts de generación comentados en el HTML), el número de WhatsApp (`wa.me/PLACEHOLDER`), el video del laptop (`assets/dt-system-demo.mp4`) y los testimonios (marcados `[REEMPLAZAR]`).

---

## Marca

### Logo e ícono (en `assets/brand/`)
- `icon.svg` — ícono app/favicon: cuadrado redondeado #0E0F12 (rx 15/64), letras "d" y "t" en Geist Mono 700 blancas, y la **barra "/" en gradiente IA** (celeste→violeta→rosa) como gesto central de la marca, con anillo de borde en el mismo gradiente al 55%.
- `icon-light.svg` — variante para fondos claros.
- `wordmark-light-bg.svg` / `wordmark-dark-bg.svg` — ícono + "dt/system" (slash celeste) + tagline "AUTOMATE THE BORING STUFF" en mono espaciado.
- En la UI el logo es texto: `dt/system` en Geist Mono 14px, con el `/` en `--accent`.

### Voz
Español rioplatense (vos): "Hablá con mi asistente", "Contame la idea", "Probalo vos mismo". Inglés como idioma secundario (toggle ES/EN). Directo, sin humo: notas con asterisco tipo "\*Sin vueltas", "\*Palabra de clientes".

---

## Design Tokens

### Colores
| Token | Light | Dark |
|---|---|---|
| `--bg` | `#FFFFFF` | `#0E0F12` |
| `--text` | `#333333` | `#F2F2F2` |
| `--muted` | text al 62% | text al 60% |
| `--accent` | `#52BFFE` (celeste, primario) | igual |
| `--amber` | `#F59E0B` (muy poco uso) | igual |
| `--pink` | `#EC4899` (muy poco uso, errores de form) | igual |
| `--line` | text al 12% | text al 14% |
| `--card` | `#FFFFFF` | `#15171C` |
| `--grid-color` | text al 8% | text al 8% |

**Gradiente IA** (typewriter, botón iridiscente, punto del form, barra del logo):
`linear-gradient(115deg, #52BFFE, #8B7CF6 40%, #EC4899 70%, #52BFFE)` con `background-size: 300% 100%` + `animation: ai-pan 5s ease-in-out infinite`.

Verde estado: `#22C55E` (badges "Live", "Bot online").

### Tipografía (Google Fonts, preload + display=swap)
- **Instrument Sans** 400/500/700 — títulos (`--font-head`). H2: `clamp(28px, 4.2vw, 44px)`, weight 500, `letter-spacing: -0.01em`. CTA gigante: `clamp(44px, 11vw, 150px)`, line-height 0.95.
- **Geist Mono** 400/700 — TODO el cuerpo, nav, botones, labels, chips (`--font-mono`). Base 15px / 1.65.
- Labels mono: 10–12px, `letter-spacing: 0.09–0.14em`, uppercase.

### Otros
- Radios: pills 999px · cards 14–20px · nav bar 18px · form 20px.
- Sombra: `0 24px 60px -24px rgba(14,15,18,0.22)` (dark: negro al 65%).
- Easing global: `cubic-bezier(0.4, 0, 0.2, 1)`.
- Secciones: `padding: 96px 0` (68px mobile). Wrap: `max-width: 1180px`.

---

## Manual de efectos (los trucos que definen esta web)

Cada uno está comentado en el código; acá el índice de dónde vive y cómo funciona:

1. **Temas con reveal circular** (`main.js §1`): View Transitions API — `document.startViewTransition` + `clip-path: circle()` animado desde el centro del botón sobre `::view-transition-new(root)`, 550ms. Fallback: clase `.theme-fade` con transition de colores 0.55s. Persistido en localStorage, default `prefers-color-scheme`. El doble-click rápido lleva `.catch()` en `vt.ready`.
2. **Capa de efectos global** (`styles.css §3`): `.fx` fija en `z-index:-1` (el fondo vive en `<html>`, body transparente). Grilla 1px de 56px con `mask-image: radial-gradient(ellipse …)` + **spotlight** de cursor (radial 280px del accent al 30%, movido con rAF, apagado en `(hover:none)` y reduced-motion).
3. **Beams sincronizados al reloj** (`main.js §2 y §14`): todo beam (announcement bar y border-beams) recibe `animation-delay: -(Date.now() % duración)` → el destello está "en hora" y nunca se resetea entre cargas ni pestañas.
4. **Border beam** (`styles.css §16, .beam-card`): `@property --bb-a` (ángulo animable) + `conic-gradient` en un pseudo `::after` con doble `mask` y `mask-composite: exclude` → solo queda visible el "padding" de 1.5px del borde. Loop 4.5s.
5. **Botón iridiscente** (`.btn-ai`): gradiente IA panning + halo `::before` con `blur(16px)` al 65% con el MISMO timing (`ai-pan 5s`) → botón y glow laten juntos.
6. **Typewriter con gradiente** (`main.js §4` + `.tw`): tipeo real 85ms/letra, borrado 45ms, pausa 2.4s, palabras por idioma en `data-words`/`data-words-en`; el texto lleva el gradiente IA con `background-clip: text`.
7. **Parallax de floats del hero** (`main.js §5`): `data-depth` 2–4 → desplazamiento máx ~18px, batched con rAF, apagado en touch/reduced.
8. **Cursor inteligente** (`main.js §18` + `styles.css §18`): div fijo con `mix-blend-mode: difference` → contraste garantizado sobre cualquier fondo sin medir píxeles. Sigue con lerp 0.22. Estados: cuadradito 14px → **pill redonda** sobre interactivos → **pill con label** cuando el target tiene `data-cursor` (p.ej. "Ver detalle →", "← Arrastrá →", "Visitar ↗"; versión EN en `data-cursor-en`). Con cursor activo, las pills estáticas del DOM se ocultan (`html.cursor-on .demo-ov { display:none }`); en touch quedan visibles y fijas.
9. **Globo punteado en canvas** (`main.js §15`): mapa mundial como bitmask ASCII 48×24 → interpolación bilinear + ruido determinístico → muestreo denso corregido por latitud; borde de máscara (0.45–0.57) = **costa brillante**, interior = relleno tenue. Proyección ortográfica (rotación Y + tilt X fijo −0.42 que centra el hemisferio sur). Marker celeste pulsante con anillo + etiqueta "SALTA" en (−24.7859, −65.4117). Gira completo y desacelera con hover. Pausado fuera del viewport con IntersectionObserver.
10. **Acordeón de productos** (`styles.css §17` + `main.js §17`): paneles flex; el abierto crece (`flex 0.65s`), los cerrados son franjas con título vertical (`writing-mode: vertical-rl` rotado). Covers con imagen animada de preview. Contenido entra en cascada (delays 0.22→0.52s). Full-bleed con `margin-inline: calc(50% - 50vw + 20px)`. Botón reset. En mobile: acordeón vertical.
11. **Marquees infinitos** (`styles.css §7`): track duplicado con `aria-hidden="true"` + `translateX(-100%)` loop; máscara lateral con `mask-image: linear-gradient`. Filas opuestas 10s/13s (teléfonos CSS con notch y reflejo) y ~55s (testimonios, con drag).
12. **Títulos palabra por palabra** (Stökt): JS parte cada `.h2` en `<span class="w" style="--w:i">` y un IO les da entrada escalonada.
13. **Laptop 100% CSS** (`styles.css §9`): tapa/cámara/bisagra/base/teclado/trackpad/LED dibujados con gradientes; video adentro con IO threshold 0.35 para pausar.
14. **i18n ES/EN** (`main.js §16`): ES inline en el HTML (default), EN en diccionario `EN{}`; `data-i18n` por elemento, snapshot del ES en `data-es`, placeholders vía `data-ph` + `PH_EN`. Persistido (`dt-lang`). Al cambiar idioma hay un efecto de transición suave.
15. **Form IA sin backend** (`main.js §9`): arma el briefing multilínea y lo envía por `wa.me/?text=` o `mailto:` según el canal elegido (chips WhatsApp/Email). Newsletter (§19): mailto de suscripción, comentado dónde enchufar Formspree/Buttondown.
16. **prefers-reduced-motion**: mata TODO (animaciones 0.01ms, marquees quietos, typewriter estático, cursor nativo, globo estático).

## Screens / Views (orden de la página)
1. **Announcement bar** sticky: beam de luz en el borde inferior, dismissible (localStorage).
2. **Nav bar de vidrio** (Stökt): una sola pill `blur(20px) saturate(1.5)`, fondo al 62%, borde al 13%, highlight interior. Logo | links mono uppercase centrados (hover: rotación vertical, la palabra entra en accent) | idioma ES/EN + toggle tema + CTA "Chat IA" negro. Mobile: hamburguesa `<details>` con items escalonados.
3. **Hero**: 4 screenshots flotando con bob + parallax, H1 con typewriter gradiente, subtítulo, CTA iridiscente + secundario.
4. **Mobile showcase**: 2 marquees de teléfonos CSS en direcciones opuestas.
5. **Productos**: acordeón horizontal 4 paneles (covers → detalle), full-bleed.
6. **Laptop**: DT-System corriendo en laptop CSS con video.
7. **Sobre mí (bento)**: stats con count-up · globo punteado · founder grande (foto + nombre superpuesto + bio) · stack con logos SVG en marquee. Sección con colores invertidos respecto al tema.
8. **Testimonios**: 3 stats + review destacada + marquee con drag.
9. **Demos en vivo**: cards con badge "● Live" pulsante, chip PW copiable, cursor "Visitar ↗".
10. **HABLEMOS**: título gigante + **form IA** (border beam, labels numerados, inputs subrayados, chips de tipo, canal WhatsApp/Email, botón iridiscente con spinner).
11. **Footer**: newsletter de vidrio + wordmark gigante de fondo (opacity 0.04) + columnas (acordeón en mobile) + status "● Bot online 24/7".

## Assets
- `assets/brand/` — logo/ícono definitivos (SVG).
- `assets/ph-*.svg` — placeholders rayados con medidas; cada `<img>` del HTML tiene comentado el **prompt de Higgsfield** para generar la imagen real (paleta celeste #52BFFE, estilo mockup producto).
- Pendientes del dueño: `wa.me` real, foto founder (duotono), `assets/dt-system-demo.mp4`, testimonios reales, `assets/og.png` (1200×630).

## Files
- `index.html` — estructura completa, SEO (OG + JSON-LD Person), i18n markup.
- `styles.css` — tokens, temas, todos los efectos (comentados en español).
- `main.js` — toda la interacción (16+ módulos numerados y comentados).
- `assets/` — placeholders + marca.

**Deploy:** es estático puro — GitHub Pages sirve `index.html` tal cual. Cero dependencias salvo Google Fonts.
