"""Empaqueta el juego entero en un solo HTML que funciona sin conexión y sin
servidor: código concatenado (sin módulos), y fuentes/sprites como data URI."""
import re, base64, json, os, pathlib

raiz = pathlib.Path('.')
def leer(p): return (raiz / p).read_text(encoding='utf-8')
def b64(p): return base64.b64encode((raiz / p).read_bytes()).decode()

# ── 1. CSS: fuentes incrustadas y sin ?v= ────────────────────────────────────
css = leer('css/estilo.css')
for f, fam in [('SpaceGrotesk.woff2','woff2'), ('PixelifySans.woff2','woff2'), ('Silkscreen-Bold.woff2','woff2')]:
    uri = f"data:font/woff2;base64,{b64('fuentes/'+f)}"
    css = re.sub(r"url\('\.\./fuentes/" + re.escape(f) + r"\?v=\d+'\)", f"url('{uri}')", css)
css = css.replace("url('../objetos/poke.png')", f"url('data:image/png;base64,{b64('objetos/poke.png')}')")

# ── 2. JS: concatenar en orden de dependencias, quitando import/export ───────
orden = ['datos.js', 'motor.js', 'eventos.js', 'tarjeta.js', 'juego.js']
partes = []
for f in orden:
    s = leer('js/' + f)
    s = re.sub(r"^import\s+.*?from\s+'[^']+';\s*$", '', s, flags=re.M | re.S)
    s = re.sub(r"^import\s*\{[^}]*\}\s*from\s*'[^']+';", '', s, flags=re.M | re.S)
    s = re.sub(r"^export\s+\{[^}]*\};?\s*$", '', s, flags=re.M)
    s = re.sub(r"^export\s+", '', s, flags=re.M)
    partes.append(f"\n/* ── {f} ── */\n" + s)
js = "\n".join(partes)

# ── 3. Imágenes: mapa dex -> data URI, y el resolutor apunta ahí ─────────────
dex = sorted({int(d) for d in re.findall(r"E\((\d+),", leer('js/datos.js'))})
sprites = {str(d): f"data:image/png;base64,{b64(f'sprites/{d}.png')}" for d in dex}
objetos = {}
for p in sorted((raiz / 'objetos').glob('*.png')):
    objetos[p.stem] = f"data:image/png;base64,{b64('objetos/'+p.name)}"

js = js.replace("const spriteUrl", "const spriteUrlOriginal", 1)
js = re.sub(r"^(const|function)\s+iconoObjeto", r"\1 iconoObjetoOriginal", js, flags=re.M)
# En la versión sin conexión el pie de la tarjeta debe seguir apuntando al
# juego de verdad, no a la ruta del fichero en el disco.
js = re.sub(r"const dominio = .*?;", "const dominio = 'hazte-con-todos.pages.dev';", js, count=1, flags=re.S)

js = ("const SPRITES_INCRUSTADOS = " + json.dumps(sprites) + ";\n"
      + "const OBJETOS_INCRUSTADOS = " + json.dumps(objetos) + ";\n"
      + "const spriteUrl = d => SPRITES_INCRUSTADOS[String(d)] ?? OBJETOS_INCRUSTADOS['poke'];\n"
      + "const iconoObjeto = i => OBJETOS_INCRUSTADOS[i] ?? OBJETOS_INCRUSTADOS['poke'];\n"
      + js)

# ── 4. HTML final ───────────────────────────────────────────────────────────
html = leer('index.html')
html = re.sub(r'\s*<link rel="preload"[^>]*>', '', html)
html = re.sub(r'\s*<link rel="stylesheet"[^>]*>', lambda _: '\n  <style>\n' + css + '\n  </style>', html)
html = re.sub(r'\s*<script type="module"[^>]*></script>', lambda _: '\n  <script>\n' + js + '\n  </script>', html)
html = re.sub(r'\s*<meta property="og:[^>]*>|\s*<meta name="twitter:[^>]*>', '', html)
html = html.replace('<title>Hazte con Todos', '<title>Hazte con Todos (sin conexión)')

destino = pathlib.Path('/tmp/hazte-con-todos-offline.html')
destino.write_text(html, encoding='utf-8')
print(f"{destino}  ·  {destino.stat().st_size/1024/1024:.2f} MB")
print(f"sprites incrustados: {len(sprites)} · iconos: {len(objetos)}")
