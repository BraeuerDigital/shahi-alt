#!/usr/bin/env python3
"""
Visuelle Abnahme: MINAR und SHAHI nebeneinander bei identischen Viewports
=========================================================================

Erzeugt docs/abnahme/<seite>-<breite>.jpg (links MINAR, rechts SHAHI) für 390, 768 und 1440 px:
Startseite (oberer Bereich und ganze Seite), Kategorieseite, Warenkorb, Bestellübersicht (Bon),
mobile Navigation. Beide Seiten werden zur selben simulierten Uhrzeit (Montag 18:00, geöffnet)
gezeigt; SHAHI im Test-Normalbetrieb (Daten nur im Test überschrieben, wie tests/e2e.py).

Ausführen:
    python3 tests/vergleich.py /pfad/zu/minar/public      (lokale Kopie von BraeuerDigital/minar)
"""
import functools, http.server, io, os, socketserver, sys, threading
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import e2e  # Server, Daten-Patches, Zeiten

MINAR = sys.argv[1] if len(sys.argv) > 1 else "/home/claude/braeuerdigital/minar/public"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs", "abnahme")
os.makedirs(OUT, exist_ok=True)

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
class S(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    def handle_error(self, *a): pass
m_srv = S(("127.0.0.1", 0), functools.partial(Q, directory=MINAR))
threading.Thread(target=m_srv.serve_forever, daemon=True).start()
M_BASE = f"http://127.0.0.1:{m_srv.server_address[1]}/"

M_CART = [{"nr": "106", "name": "Salami", "v": 0, "sel": {}, "qty": 2, "note": ""},
          {"nr": "20", "name": "Hamburgerle", "v": 0, "sel": {"burger-extra": [0, 5]}, "qty": 1, "note": "ohne Zwiebeln"},
          {"nr": "", "name": "Coca-Cola", "v": 1, "sel": {}, "qty": 1, "note": ""}]
S_CART = [{"id": "pizza-salami", "v": 0, "sel": {}, "qty": 2, "note": ""},
          {"id": "burger-hamburgerle", "v": 0, "sel": {"burger-beilage": [1], "burger-extras": [3]}, "qty": 1, "note": "ohne Zwiebeln"},
          {"id": "getraenk-coca-cola", "v": 1, "sel": {}, "qty": 1, "note": ""}]


def shot(pg, full=False):
    return Image.open(io.BytesIO(pg.screenshot(full_page=full, type="png"))).convert("RGB")


def pair(a, b, name, scale=1.0):
    h = max(a.height, b.height)
    gap = 24
    c = Image.new("RGB", (a.width + b.width + gap, h + 34), "white")
    c.paste(a, (0, 34)); c.paste(b, (a.width + gap, 34))
    d = ImageDraw.Draw(c)
    d.text((8, 10), "MINAR (Original)", fill="black"); d.text((a.width + gap + 8, 10), "SHAHI (Nachbau)", fill="black")
    if scale != 1.0: c = c.resize((int(c.width * scale), int(c.height * scale)))
    c.save(os.path.join(OUT, name + ".jpg"), quality=78)
    print("  docs/abnahme/" + name + ".jpg")


def site(browser, minar, width):
    ctx = browser.new_context(viewport={"width": width, "height": 900 if width > 800 else (1024 if width > 500 else 844)},
                              reduced_motion="reduce", locale="de-DE", timezone_id="Europe/Berlin")
    def route(r):
        u = r.request.url
        if not minar and u.startswith(e2e.BASE) and "/assets/js/menu-data.js" in u:
            return r.fulfill(status=200, content_type="application/javascript", body=e2e.patched(e2e.LIVE + e2e.CONFIRM_ALL))
        if u.startswith(M_BASE) or u.startswith(e2e.BASE): return r.continue_()
        return r.abort()
    ctx.route("**/*", route)
    pg = ctx.new_page(); pg.clock.set_fixed_time(e2e.MON_18)
    return ctx, pg, (M_BASE if minar else e2e.BASE)


def main():
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=e2e.CHROME, args=["--no-sandbox"]) if e2e.CHROME else p.chromium.launch()
        for w in (390, 768, 1440):
            imgs = {}
            for minar in (True, False):
                ctx, pg, base = site(b, minar, w)
                k = "m" if minar else "s"
                pg.goto(base + "index.html"); pg.wait_for_timeout(500)
                imgs[k + "home"] = shot(pg)
                pg.evaluate("document.querySelectorAll('img[loading=lazy]').forEach(i => i.loading = 'eager')"); pg.wait_for_timeout(500)
                imgs[k + "full"] = shot(pg, True)
                pg.goto(base + "speisekarte/pizza.html"); pg.wait_for_timeout(400)
                imgs[k + "cat"] = shot(pg)
                if w < 960:
                    pg.goto(base + "index.html"); pg.click(".nav-toggle"); pg.wait_for_timeout(500)
                    imgs[k + "nav"] = shot(pg)
                key, cart = ("minar-cart-v4", M_CART) if minar else ("shahi-cart-v1", S_CART)
                pg.evaluate("([k, c]) => localStorage.setItem(k, JSON.stringify({ t: Date.now(), lines: c }))", [key, cart])
                pg.goto(base + "bestellen.html"); pg.wait_for_timeout(300)
                pg.evaluate("document.querySelector('.cart-card').scrollIntoView()"); pg.wait_for_timeout(200)
                imgs[k + "cart"] = shot(pg)
                pg.fill("[data-f-name]", "Erika Muster"); pg.fill("[data-f-phone]", "0170 1234567")
                pg.click("[data-to-summary]", force=True); pg.wait_for_timeout(500)
                imgs[k + "bon"] = shot(pg)
                pg.goto(base + "speisekarte/pizza.html"); pg.wait_for_timeout(300)
                pg.click(".cart-link" if w >= 960 else "[data-cart-fab]"); pg.wait_for_timeout(600)
                imgs[k + "drawer"] = shot(pg)
                ctx.close()
            for name in ("home", "cat", "cart", "bon", "drawer", "nav", "full"):
                if "m" + name in imgs:
                    pair(imgs["m" + name], imgs["s" + name], f"{name}-{w}", scale=(0.5 if name == "full" else 1.0) if w > 500 else 1.0)
        b.close()


if __name__ == "__main__":
    main()
