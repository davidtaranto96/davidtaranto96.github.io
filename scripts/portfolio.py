#!/usr/bin/env python3
"""
portfolio.py — mantiene la grilla de casos del portfolio.

La fuente de verdad es proyectos.json. El HTML de la grilla y las claves
i18n se generan desde ahi, entre marcadores, para que agregar un proyecto
sea editar el JSON y correr esto — nunca tocar la grilla a mano.

  --check     busca repos con GitHub Pages activo que no esten en el JSON
  --capture   captura los casos que no tengan imagen todavia
  --build     regenera la grilla en index.html y el i18n en main.js (y og.png)
  --og        rehace solo assets/og.png con los numeros del JSON
  --all       las tres cosas, en orden

Requiere: gh (autenticado), Google Chrome, sips. Todo local, cero tokens.
"""
import argparse, json, os, re, shutil, subprocess, sys, time, urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
JSON = RAIZ / "proyectos.json"
HTML = RAIZ / "index.html"
JS   = RAIZ / "main.js"
CAPS = RAIZ / "assets" / "casos"
USUARIO = "davidtaranto96"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OG = RAIZ / "assets" / "og.png"

# repos que nunca van al portfolio (perfil, forks, experimentos viejos)
EXCLUIDOS = {"davidtaranto96", "davidtaranto96.github.io", "flutter_app", "Juli"}

CATEGORIAS = {"web", "sys", "app", "ia"}


def sh(cmd, **kw):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True, **kw).stdout.strip()


def cargar():
    return json.loads(JSON.read_text(encoding="utf-8"))


def guardar(doc):
    JSON.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


# ---------------------------------------------------------------- check
def check(doc):
    """Repos con Pages activo que todavia no estan en el JSON."""
    conocidas = {c["url"].rstrip("/") for c in doc["casos"]}
    repos = sh(f'gh repo list {USUARIO} --limit 200 --json name --jq ".[].name"').splitlines()
    nuevos = []
    for r in repos:
        if r in EXCLUIDOS:
            continue
        # gh escupe el JSON de error por stdout cuando el repo no tiene Pages,
        # asi que no alcanza con mirar si la salida esta vacia.
        url = sh(f'gh api "repos/{USUARIO}/{r}/pages" -q ".cname // .html_url" 2>/dev/null')
        if not url or "{" in url or " " in url or "." not in url:
            continue
        url = ("https://" + url) if not url.startswith("http") else url
        if url.rstrip("/") in conocidas:
            continue
        codigo = sh(f'curl -s -o /dev/null -w "%{{http_code}}" -L --max-time 12 "{url}"')
        nuevos.append((r, url, codigo))

    if not nuevos:
        print("Sin novedades: todos los repos con Pages ya estan en el JSON.")
        return []
    print(f"{len(nuevos)} repo(s) con Pages fuera del portfolio:\n")
    for r, url, codigo in nuevos:
        print(f"  {r:28} {url:52} HTTP {codigo}")
    print("\nPara sumar uno, agregalo a proyectos.json y corre --capture --build.")
    return nuevos


# -------------------------------------------------------------- capture
def capturar_una(url, destino, presupuesto=10000, ancho=1280, alto=800):
    tmp = Path("/tmp") / (destino.stem + ".png")
    subprocess.run(
        [CHROME, "--headless", "--disable-gpu", "--hide-scrollbars", "--no-sandbox",
         f"--virtual-time-budget={presupuesto}", f"--window-size={ancho},{alto}",
         f"--screenshot={tmp}", url],
        capture_output=True)
    if not tmp.exists() or tmp.stat().st_size < 12000:
        return False   # pagina en blanco o error
    subprocess.run(["sips", "--resampleHeightWidth", "400", "640",
                    "--setProperty", "format", "jpeg",
                    "--setProperty", "formatOptions", "82",
                    str(tmp), "--out", str(destino)], capture_output=True)
    return destino.exists()


def capture(doc, forzar=False):
    CAPS.mkdir(parents=True, exist_ok=True)
    hechas, saltadas, fallidas = [], [], []
    for c in doc["casos"]:
        destino = CAPS / f"case-{c['id']}.jpg"
        if destino.exists() and not forzar:
            saltadas.append(c["id"]); continue
        if not c["url"] or not c["url"].startswith("http"):
            fallidas.append((c["id"], "sin URL publica — la captura va a mano")); continue
        # presupuesto corto: agarra la pagina antes de que aparezcan los popups
        ok = capturar_una(c["url"], destino, presupuesto=2400)
        (hechas if ok else fallidas).append(c["id"] if ok else (c["id"], "captura vacia"))
    if hechas:   print(f"capturadas: {', '.join(hechas)}")
    if saltadas: print(f"ya tenian imagen: {len(saltadas)}")
    for f in fallidas: print(f"  FALTA {f[0]}: {f[1]}")
    return hechas


# ---------------------------------------------------------------- build
def tarjeta(c):
    """Una card. Sin URL no es un <a>: no debe simular ser clickeable."""
    nota = f'          <!-- {c["nota"]} -->\n' if c.get("nota") else ""
    img = (f'<img src="assets/casos/case-{c["id"]}.jpg" width="640" height="400" '
           f'alt="{c["alt"]}" loading="lazy">')
    if c["estado"] == "live":
        badge = '<span class="live"><i aria-hidden="true"></i> Live</span>'
    else:
        badge = f'<span class="live off"><i aria-hidden="true"></i> {c["estado"].capitalize()}</span>'
    # la grilla es de clientes: el chip solo aparece si alguna vez entra algo propio
    chip = ('              <span class="origen" data-i18n="or_p">Propio</span>\n'
            if c.get("origen") == "propio" else "")
    info = (f'<div class="demo-info">\n'
            f'              <div><h3>{c["nombre"]}</h3>'
            f'<small data-i18n="{c["i18n"]}">{c["sub"]["es"]}</small></div>\n'
            f'{chip}'
            f'              {badge}\n'
            f'            </div>')
    if not c["url"]:
        return (nota + f'          <div class="demo" data-cat="{c["cat"]}">\n'
                f'            {img}\n            {info}\n          </div>')
    return (nota + f'          <a class="demo" data-cat="{c["cat"]}" '
            f'data-cursor="{c["cursor"]["es"]}" data-cursor-en="{c["cursor"]["en"]}" '
            f'href="{c["url"]}" target="_blank" rel="noopener">\n'
            f'            {img}\n            {info}\n'
            f'            <div class="demo-ov" aria-hidden="true"><span>{c["cursor"]["es"]}</span></div>\n'
            f'          </a>')


def entre_marcadores(texto, ini, fin, nuevo, que):
    """Reemplaza lo que hay entre los marcadores conservando su sangria."""
    patron = re.compile(r"([ \t]*)" + re.escape(ini) + r".*?([ \t]*)" + re.escape(fin), re.S)
    m = patron.search(texto)
    if not m:
        sys.exit(f"ERROR: no encontre los marcadores de {que}. Ponelos antes de correr --build.")
    sangria = m.group(1)
    return patron.sub(lambda _: f"{sangria}{ini}\n{nuevo}\n{sangria}{fin}", texto, count=1)


def build(doc):
    casos = doc["casos"]
    for c in casos:
        if c["cat"] not in CATEGORIAS:
            sys.exit(f'ERROR: categoria "{c["cat"]}" invalida en {c["id"]}. Validas: {sorted(CATEGORIAS)}')
        if not (CAPS / f'case-{c["id"]}.jpg').exists():
            print(f'  aviso: {c["id"]} no tiene imagen — corre --capture')

    html = HTML.read_text(encoding="utf-8")
    html = entre_marcadores(html, "<!-- CASOS:INICIO -->", "<!-- CASOS:FIN -->",
                            "\n\n".join(tarjeta(c) for c in casos), "la grilla en index.html")
    # los stats se derivan de los datos: nunca afirman algo que el JSON no sostenga
    _, vivos, propios = numeros(casos)
    for clave, valor in (("cs_s1", len(casos)), ("cs_s2", vivos), ("cs_s3", propios)):
        html = re.sub(r'(<b data-count=")\d+(">)\d+(</b><span data-i18n="%s")' % clave,
                      rf'\g<1>{valor}\g<2>{valor}\g<3>', html)
    html, n = re.subn(r"\d+ proyectos de clientes, \d+ en línea",
                      f"{len(casos)} proyectos de clientes, {vivos} en línea", html)
    if not n:
        print("  aviso: la meta description no tiene la frase de los numeros; actualizala a mano")
    HTML.write_text(html, encoding="utf-8")

    js = JS.read_text(encoding="utf-8")
    i18n = "\n".join(f'    {c["i18n"]}: "{c["sub"]["en"]}",' for c in casos)
    i18n += '\n    or_c: "Client", or_p: "Own",'
    js = entre_marcadores(js, "// CASOS:INICIO", "// CASOS:FIN", i18n, "el i18n en main.js")
    JS.write_text(js, encoding="utf-8")

    print(f"grilla regenerada: {len(casos)} casos · {vivos} en linea · {propios} con dominio propio")
    og(casos)


def numeros(casos):
    vivos = sum(1 for c in casos if c["url"].startswith("http"))
    propios = sum(1 for c in casos
                  if c["url"] and "github.io" not in c["url"] and "railway.app" not in c["url"])
    return len(casos), vivos, propios


# ---------------------------------------------------------------- og
def og(casos):
    """La imagen que se ve al compartir el link lleva los mismos numeros que la grilla."""
    if not Path(CHROME).exists():
        print("  aviso: sin Chrome no se rehace og.png"); return
    total, vivos, _ = numeros(casos)
    url = (RAIZ / "scripts" / "og.html").as_uri() + f"?n={total}&v={vivos}"
    antes = time.time()
    subprocess.run([CHROME, "--headless", "--no-sandbox", "--hide-scrollbars",
                    "--virtual-time-budget=4000", "--window-size=1200,630",
                    f"--screenshot={OG}", url], capture_output=True, timeout=90)
    if not OG.exists() or OG.stat().st_mtime < antes or OG.stat().st_size < 20000:
        sys.exit("ERROR: og.png no se rehizo; revisa scripts/og.html")
    print(f"og.png rehecha: {total} proyectos de clientes · {vivos} en linea")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--capture", action="store_true")
    ap.add_argument("--build", action="store_true")
    ap.add_argument("--og", action="store_true")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--forzar", action="store_true", help="recapturar aunque ya exista la imagen")
    a = ap.parse_args()
    if not any([a.check, a.capture, a.build, a.og, a.all]):
        ap.print_help(); return
    doc = cargar()
    if a.check or a.all:   check(doc)
    if a.capture or a.all: capture(doc, forzar=a.forzar)
    if a.build or a.all:   build(doc)
    elif a.og:             og(doc["casos"])


if __name__ == "__main__":
    main()
