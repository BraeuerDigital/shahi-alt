#!/usr/bin/env python3
"""
SHAHI Küche – Logo-Varianten erzeugen
=====================================

Statische Logo-Varianten (Kopfzeile, Fußzeile, Bon, Favicon). Das animierte Logo der Startseite
entsteht separat aus dem Flyer-/MINAR-Logo: tools/logo/schriftzug.py + tools/logo/logo_anim.py.

Grundlage ist ausschließlich das bestehende SHAHI-Logo (Spitzbogen mit „S“, Turmspitze,
Wortmarke „SHAHI“ in Fraunces 600, „Küche“ in der Systemschrift) aus dem bisherigen Projekt
(Sicherungs-Branch, Datei assets/img/logo.svg). Formen, Farben und Proportionen bleiben
unverändert; die Fraunces-Buchstaben werden nur in Pfade umgewandelt, damit das Logo ohne
eingebettete Schrift (25 KB) und ohne Nachladen auskommt. Die Glyphen-Positionen entsprechen
der Darstellung des Originals in Chrome (letter-spacing 5, keine Unterschneidung).

Erzeugt in public/assets/logo/:
  shahi-logo.svg          Original-Anordnung (Bogen links, Wortmarke rechts) – Kopfzeile
  shahi-logo-stacked.svg  gestapelt (Bogen oben) – Bildschirmgrößen ohne Animation, Druck
  shahi-logo-light.svg    gestapelt für dunkle Flächen (Fußzeile): Wortmarke hell, Bogen wie „auf Blau“
  shahi-emblem.svg        nur Bildmarke – Bestellübersicht (Bon)
  favicon.svg             Bildmarke auf Shahi-Blau (wie bisheriges Favicon)

Ausführen:  python3 tools/logo/logo.py   (benötigt fontTools; WOFF2 braucht das Paket „brotli“,
            ersatzweise wird Node.js zum Entpacken genutzt)
Danach:     node tools/build.mjs
Schrift:    Fraunces 600, SIL Open Font License 1.1 (tools/logo/Fraunces-OFL.txt)
"""
import os, subprocess, sys, tempfile, types

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "..", "public", "assets", "logo"))

# ---------- brotli: echtes Paket oder Ersatz über Node.js ----------
try:
    import brotli  # noqa: F401
except ImportError:
    def _decompress(data):
        with tempfile.NamedTemporaryFile(delete=False) as f:
            f.write(data); name = f.name
        try:
            return subprocess.run(["node", "-e", "process.stdout.write(require('zlib').brotliDecompressSync(require('fs').readFileSync(process.argv[1])))", name],
                                  capture_output=True, check=True).stdout
        finally:
            os.unlink(name)
    sys.modules["brotli"] = types.SimpleNamespace(decompress=_decompress, error=Exception)

from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

FONT = TTFont(os.path.join(HERE, "fraunces-600.woff2"))
GS, CMAP, UPM = FONT.getGlyphSet(), FONT.getBestCmap(), FONT["head"].unitsPerEm

# ---------- Originalfarben (unverändert) ----------
BLUE, MARIGOLD, CHILI = "#22307A", "#FFB320", "#E0352B"
LIGHT = "#FBFDF6"                      # Wortmarke auf dunklem Grund (Fußzeile)
SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif"

# ---------- Bildmarke (Pfade 1:1 aus dem Original, Koordinaten 0–200 × −27–260) ----------
ARCH = "M0 260 L0 118 C0 74 40 56 66 44 C86 34 98 18 100 0 C102 18 114 34 134 44 C160 56 200 74 200 118 L200 260 Z"
LINE = "M24 260 L24 126 C24 94 52 80 74 69 C90 61 98 48 100 34 C102 48 110 61 126 69 C148 80 176 94 176 126 L176 260"


def glyph_path(ch, x, baseline, size):
    """Umriss eines Zeichens als SVG-Pfad (Ursprung = Grundlinie links)."""
    g = CMAP[ord(ch)]
    pen = SVGPathPen(GS, ntos=lambda v: ("%.2f" % v).rstrip("0").rstrip("."))
    s = size / UPM
    GS[g].draw(TransformPen(pen, (s, 0, 0, -s, x, baseline)))
    return pen.getCommands()


def glyph_bounds(ch, size):
    bp = BoundsPen(GS); GS[CMAP[ord(ch)]].draw(bp)
    s = size / UPM
    x0, y0, x1, y1 = bp.bounds
    return x0 * s, x1 * s


def advance(ch, size):
    return FONT["hmtx"][CMAP[ord(ch)]][0] * size / UPM


def word(text, x, baseline, size, spacing):
    """Liste (Zeichen, Pfad) – Positionen wie im Original (Vorschub + letter-spacing)."""
    out, cx = [], x
    for ch in text:
        out.append((ch, glyph_path(ch, cx, baseline, size)))
        cx += advance(ch, size) + spacing
    return out


def word_extent(text, size, spacing):
    """Sichtbare Breite (erste linke Kante bis letzte rechte Kante)."""
    cx, left, right = 0, None, 0
    for i, ch in enumerate(text):
        x0, x1 = glyph_bounds(ch, size)
        if left is None: left = cx + x0
        right = cx + x1
        cx += advance(ch, size) + spacing
    return left, right


def mark(fill_line=BLUE, fill_s=BLUE, cls=False):
    """Bildmarke im Koordinatensystem des Originals."""
    s_path = glyph_path("S", 0, 0, 150)
    sx = 100 - advance("S", 150) / 2      # text-anchor="middle" wie im Original (Mitte des Vorschubs)
    c = (lambda n: f' class="{n}"') if cls else (lambda n: "")
    return (f'<path{c("lg-arch")} d="{ARCH}" fill="{MARIGOLD}"/>'
            f'<path{c("lg-line")} d="{LINE}" fill="none" stroke="{fill_line}" stroke-width="8"/>'
            f'<g{c("lg-s")}><path transform="translate({sx:.2f} 224)" d="{s_path}" fill="{fill_s}"/></g>'
            f'<circle{c("lg-finial")} cx="100" cy="-16" r="11" fill="{CHILI}"/>')


def svg(viewbox, body, label="SHAHI Küche", extra_attr=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}" role="img" aria-label="{label}"{extra_attr}>'
            f'<title>{label}</title>{body}</svg>\n')


def write(name, content):
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  {name:24s} {len(content.encode()):6d} Bytes")


# ===================== 1. Original-Anordnung (horizontal) =====================
def horizontal():
    letters = word("SHAHI", 232, 172, 128, 5)
    body = (f'<g transform="translate(20 34) scale(0.86)">{mark()}</g>'
            + "".join(f'<path d="{p}" fill="{BLUE}"/>' for _, p in letters)
            + f'<text x="238" y="240" font-family="{SANS}" font-weight="600" font-size="46" letter-spacing="2" fill="{BLUE}">Küche</text>')
    # Sichtbarer Bereich: Turmspitze (y ≈ 10,8) bis Bogenfuß (y ≈ 257,6), x 20 bis Ende „I“
    _, right = word_extent("SHAHI", 128, 5)
    return svg(f"14 4 {232 + right + 8 - 14:.0f} 260", body)


# ===================== 2. Gestapelt =====================
W = 520
ARCH_SCALE = 1.06                       # Bildmarke etwas größer als in der Horizontalen (0,86), Verhältnis bleibt stimmig
ARCH_TOP = 18                           # Oberkante Turmspitze


def stacked_parts(word_fill=BLUE, cls=False):
    s = ARCH_SCALE
    ax = (W - 200 * s) / 2
    ay = ARCH_TOP + 27 * s               # Turmspitze reicht 27 Einheiten über den Bogen
    arch_bottom = ay + 260 * s
    base = arch_bottom + 30 + 1400 * 128 / UPM      # Abstand 30 + Versalhöhe
    left, right = word_extent("SHAHI", 128, 5)
    x = (W - (right - left)) / 2 - left
    letters = word("SHAHI", x, base, 128, 5)
    kb = base + 68
    c = (lambda n: f' class="{n}"') if cls else (lambda n: "")
    parts = {
        "mark": f'<g{c("lg-mark")} transform="translate({ax:.2f} {ay:.2f}) scale({s})">{mark(cls=cls)}</g>',
        "letters": "".join(f'<path{c("lg-letter")} d="{p}" fill="{word_fill}"/>' for _, p in letters),
        "kueche": f'<text{c("lg-kueche")} x="{W/2}" y="{kb:.1f}" text-anchor="middle" font-family="{SANS}" font-weight="600" font-size="46" letter-spacing="2" fill="{word_fill}">Küche</text>',
        "height": kb + 16,
        "arch": (ax, ay, s),
    }
    return parts


def stacked(word_fill=BLUE):
    p = stacked_parts(word_fill)
    return svg(f"0 0 {W} {p['height']:.0f}", p["mark"] + p["letters"] + p["kueche"])


# ===================== 3. Bildmarke / Favicon =====================
def emblem():
    return svg("-8 -30 216 292", mark(), label="SHAHI Küche – Bildmarke")


def favicon():
    # wie das bisherige SHAHI-Favicon: Bogen auf Shahi-Blau, „S“ blau, ohne Innenlinie und Turmspitze
    s_path = glyph_path("S", 0, 0, 160)
    sx = 100 - advance("S", 160) / 2
    body = (f'<rect width="64" height="64" rx="14" fill="{BLUE}"/>'
            f'<g transform="translate(13 9) scale(0.19)"><path d="{ARCH}" fill="{MARIGOLD}"/>'
            f'<path transform="translate({sx:.2f} 224)" d="{s_path}" fill="{BLUE}"/></g>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">{body}</svg>\n'


if __name__ == "__main__":
    print("Logo-Varianten →", OUT)
    write("shahi-logo.svg", horizontal())
    write("shahi-logo-stacked.svg", stacked())
    write("shahi-logo-light.svg", stacked(LIGHT))
    write("shahi-emblem.svg", emblem())
    write("favicon.svg", favicon())
