#!/usr/bin/env python3
"""
SHAHI Küche – Schriftzug „SHAHI“ und Unterzeile im Stil des Flyer-/MINAR-Logos
==============================================================================

Der SHAHI-Flyer verwendet dasselbe Logo wie MINAR (Tier vor der Sonne, rote Zierlinien,
Halbmond mit Stern, grüner Schriftzug mit weißer Kontur, darunter „Küche“) – nur mit
„SHAHI“ statt „MINAR“. Dieses Skript erzeugt aus den vektorisierten MINAR-Formen
(tools/logo/paths-minar.json = tools/paths.json aus BraeuerDigital/minar) die SHAHI-Fassung:

  A, I   unverändert die Original-Buchstaben aus dem MINAR-Schriftzug
  H      zwei Original-„I“ mit Querbalken (Abstand und Balken nach den Proportionen der
         Bookman Demi, auf der das Original beruht)
  S      Bookman Demi (URW, TeX Live), auf die Strichstärke des Originals verstärkt und mit
         demselben Verfahren vektorisiert wie der MINAR-Schriftzug (tools/trace.py bei MINAR)
  Unterzeile  aus der Original-Unterzeile „— RESTAURANT • LIEFERSERVICE • ABHOLUNG —“ wird
         „— LIEFERSERVICE • ABHOLUNG —“ (SHAHI: Abholung und Lieferservice), neu zentriert

Ausgabe: tools/logo/paths.json (Grundlage für tools/logo/logo_anim.py)
Ausführen: python3 tools/logo/schriftzug.py && python3 tools/logo/logo_anim.py && node tools/build.mjs
Benötigt: numpy, opencv-python, fontTools; Bookman Demi als Type-1-Datei (BOOKMAN=Pfad zur ubkd8a.pfb)
"""
import json, os, re
import numpy as np, cv2
from fontTools.t1Lib import T1Font
from fontTools.pens.basePen import BasePen

HERE = os.path.dirname(os.path.abspath(__file__))
P = json.load(open(os.path.join(HERE, "paths-minar.json")))
BOOKMAN = os.environ.get("BOOKMAN", "/usr/share/texlive/texmf-dist/fonts/type1/urw/bookman/ubkd8a.pfb")

S = 4                                   # Rasterauflösung wie beim MINAR-Tracing (4-fach)
W, H = 1600, 1100                       # Koordinatensystem des MINAR-Logos
BASE, CAP = 716.0, 185.0                # Grundlinie und Versalhöhe des MINAR-Schriftzugs
STEM = 54.0                             # Stammbreite „I“ im MINAR-Schriftzug


def polys(d):
    return [np.array(list(map(float, sp.split()))).reshape(-1, 2) for sp in re.findall(r"M([^MZ]*)Z", d)]


def fmt(pl):
    return "".join("M" + " ".join("%.1f %.1f" % (x, y) for x, y in p) + "Z" for p in pl)


def shift(pl, dx, dy=0.0):
    return [p + np.array([dx, dy]) for p in pl]


def raster(pl):
    """gerade-ungerade-Füllung (Gegenformen bleiben frei)"""
    acc = np.zeros((H * S, W * S), np.uint8)
    for p in pl:
        t = np.zeros_like(acc); cv2.fillPoly(t, [np.round(p * S).astype(np.int32)], 1); acc ^= t
    return acc


def trace(mask, eps=1.2, blur=0.8):
    """wie tools/trace.py bei MINAR: weichzeichnen, Schwelle, Konturen, Polygon vereinfachen"""
    m = cv2.GaussianBlur(mask.astype(np.float32), (0, 0), blur * S)
    b = (m > 0.5).astype(np.uint8)
    cs, _ = cv2.findContours(b, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    out = []
    for c in cs:
        if cv2.contourArea(c) < 30 * S * S: continue
        out.append(cv2.approxPolyDP(c, eps, True).reshape(-1, 2) / S)
    return out


def bbox(pl):
    a = np.vstack(pl); return a[:, 0].min(), a[:, 0].max(), a[:, 1].min(), a[:, 1].max()


L = {n: polys(d) for n, d in P["word_letters"]}

# ---------- H: zwei Original-„I“ + Querbalken (Bookman Demi: Innenabstand 0,373 · Balken 0,142 der Versalhöhe, Mitte bei 0,538) ----------
I = L["I"]
ix0, ix1, _, _ = bbox(I)
stem_l = 533.0                                    # linker Stamm des Original-„I“ (533–587)
gap = 0.373 * CAP * 1.15                          # MINAR ist rund 15 % breiter als Bookman
off = STEM + gap
bar_h, bar_c = 0.142 * CAP, BASE - 0.538 * CAP
bar = np.array([[stem_l + STEM - 2, bar_c - bar_h / 2], [stem_l + off + 2, bar_c - bar_h / 2],
                [stem_l + off + 2, bar_c + bar_h / 2], [stem_l + STEM - 2, bar_c + bar_h / 2]])
hmask = raster(I) | raster(shift(I, off)) | raster([bar])
H_ = trace(hmask)

# ---------- S: Bookman Demi, verstärkt auf die Strichstärke des Originals ----------
class PolyPen(BasePen):
    def __init__(s, gs): super().__init__(gs); s.polys, s.cur = [], []
    def _moveTo(s, p): s.cur = [p]
    def _lineTo(s, p): s.cur.append(p)
    def _curveToOne(s, p1, p2, p3):
        p0 = s.cur[-1]
        for i in range(1, 33):
            t = i / 32; a, b, c, d = (1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t * t, t ** 3
            s.cur.append((a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]))
    def _closePath(s): s.polys.append(s.cur); s.cur = []
    _endPath = _closePath

font = T1Font(BOOKMAN); font.parse(); gs = font.getGlyphSet()
pen = PolyPen(gs); gs["S"].draw(pen)
grow = (STEM - 0.258 * CAP) / 2                   # Bookman-Stamm 0,258 × Versalhöhe → auf 54 verstärken
sy = (CAP - 2 * grow) / 681.0
sx = sy * 1.15
spoly = [np.array([(x * sx, BASE - y * sy) for x, y in p]) for p in pen.polys]
k = int(round(grow * S)) * 2 + 1
smask = cv2.dilate(raster(shift(spoly, 300)), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
S_ = shift(trace(smask), -300)

# ---------- Satz: S H A H I, mittig wie der MINAR-Schriftzug ----------
def norm(pl):
    x0 = bbox(pl)[0]; return shift(pl, -x0)
glyphs = [("S", norm(S_)), ("H", norm(H_)), ("A", norm(L["A"])), ("H", norm(H_)), ("I", norm(L["I"]))]
gaps = [12, 6, 6, 16]                              # Laufweite wie im Original (Serife an Serife ≈ 16, an Schrägen enger)
widths = [bbox(g)[1] - bbox(g)[0] for _, g in glyphs]
total = sum(widths) + sum(gaps)
mw = bbox(sum((v for v in L.values()), []))
center = (mw[0] + mw[1]) / 2                       # Mitte des MINAR-Schriftzugs
x = center - total / 2
letters = []
for i, (n, g) in enumerate(glyphs):
    letters.append([n, fmt(shift(g, x))])
    x += widths[i] + (gaps[i] if i < len(gaps) else 0)

# ---------- Unterzeile ohne „RESTAURANT •“ ----------
tag = polys(P["tagline"])
cut0, cut1 = 600.0, 1300.0                        # „LIEFERSERVICE • ABHOLUNG“ = x 610–1278
dash_l = [p for p in tag if p[:, 0].max() < 240]
dash_r = [p for p in tag if p[:, 0].min() > 1300]
text = [p for p in tag if p[:, 0].min() > cut0 and p[:, 0].max() < cut1]
t0, t1, _, _ = bbox(text); a0, a1, _, _ = bbox(dash_l); b0, b1, _, _ = bbox(dash_r)
orig_text = bbox([p for p in tag if 240 < p[:, 0].min() < 1300])
tc = (orig_text[0] + orig_text[1]) / 2
dx = tc - (t0 + t1) / 2
gap_l, gap_r = orig_text[0] - a1, b0 - orig_text[1]
text = shift(text, dx)
dash_l = shift(dash_l, (t0 + dx - gap_l) - a1)
dash_r = shift(dash_r, (t1 + dx + gap_r) - b0)

out = dict(P)
out["word_letters"] = letters
out["word"] = "".join(d for _, d in letters) + P["word_kueche"]
out["tagline"] = fmt(dash_l + text + dash_r)
out["_quelle"] = "MINAR-Logo (paths-minar.json); Schriftzug SHAHI und Unterzeile: tools/logo/schriftzug.py"
json.dump(out, open(os.path.join(HERE, "paths.json"), "w"))
print("tools/logo/paths.json geschrieben – SHAHI", [round(w) for w in widths], "Breite", round(total), "Mitte", round(center))
