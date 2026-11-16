#!/usr/bin/env python3
"""
SHAHI Küche – Browser-Tests (Funktionsabnahme)
==============================================

Prüft die gebaute Website in public/ mit Chromium/Chrome über Playwright:
Seiten, Links, JavaScript-Fehler, externe Anfragen, Eröffnungsmodus, Öffnungszeiten
(simulierte Uhrzeit Europe/Berlin), Warenkorb, Varianten, Extras, Pflichtauswahl,
Pfand, Lieferkosten, Mindestbestellwert, Steueraufteilung, Bestellreferenz,
WhatsApp-Nachricht (ohne automatisches Senden), Datensparsamkeit und mobile Darstellung.

Für den Normalbetrieb werden die Daten NUR im Test überschrieben (menu-data.js wird beim
Laden ergänzt) – die echte Datei bleibt im Eröffnungsmodus.

Ausführen:
    pip install playwright && playwright install chromium     (einmalig)
    node tools/build.mjs
    python3 tests/e2e.py                 # oder: CHROME=/usr/bin/google-chrome python3 tests/e2e.py
"""
import functools, http.server, json, os, re, socketserver, sys, threading, urllib.parse
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")
CHROME = os.environ.get("CHROME") or ("/usr/bin/google-chrome" if os.path.exists("/usr/bin/google-chrome") else None)

# ---------------------------------------------------------------- Server
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
class Server(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    def handle_error(self, *a): pass          # abgebrochene Verbindungen (Seitenwechsel) nicht melden
srv = Server(("127.0.0.1", 0), functools.partial(Quiet, directory=ROOT))
PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORT}/"
DATA_JS = open(os.path.join(ROOT, "assets/js/menu-data.js"), encoding="utf-8").read()

# ---------------------------------------------------------------- Prüfprotokoll
results = []
def check(name, cond, info=""):
    results.append((name, bool(cond), info))
    print(("  ✓ " if cond else "  ✗ ") + name + (("  – " + str(info)) if (info and not cond) else ""))
    return cond

def eur(c): return f"{c // 100},{c % 100:02d} €"

# ---------------------------------------------------------------- Daten-Patches (nur im Test)
LIVE = """
D.operation.mode = "geoeffnet";
Object.assign(D.restaurant, { owner: "Test Inhaber", legalForm: "Einzelunternehmen", email: "test@example.org" });
D.payment = { methods: ["bar"], note: null };
D.tax.status = "bestaetigt"; D.tax.smallBusiness = false;
D.delivery.zones.forEach(function (z) { z.places.forEach(function (p) { p.confirmed = true; }); });
"""
CONFIRM_ALL = """
D.items.forEach(function (i) { delete i.checks; if (i.pfand === null) i.pfand = 0; });
Object.keys(D.optionGroups).forEach(function (k) { delete D.optionGroups[k].checks; });
"""
def patched(extra):
    return DATA_JS + "\n;(function (D) {" + extra + "})(window.SHAHI_DATA);\n"

def at(iso_utc):  # "2026-11-16T17:00:00Z" → datetime
    return datetime.fromisoformat(iso_utc.replace("Z", "+00:00"))

MON_18 = at("2026-11-16T17:00:00Z")      # Montag 18:00 Berlin (MEZ)
MON_1600 = at("2026-11-16T15:00:00Z")    # Montag 16:00 – vor Öffnung
MON_2220 = at("2026-11-16T21:20:00Z")    # Montag 22:20 – nach Bestellschluss, noch geöffnet
TUE_18 = at("2026-11-17T17:00:00Z")      # Dienstag – Ruhetag
FRI_1105 = at("2026-11-20T10:05:00Z")    # Freitag 11:05
SUMMER_MON_18 = at("2026-07-06T16:00:00Z")  # Montag 18:00 Berlin (MESZ)


class Site:
    def __init__(self, browser, width=1440, patch=None, time=None, reduced=True):
        self.ctx = browser.new_context(viewport={"width": width, "height": 900 if width > 800 else 844},
                                       reduced_motion="reduce" if reduced else "no-preference", locale="de-DE",
                                       timezone_id="Europe/Berlin")
        self.errors, self.external = [], []
        def route(r):
            u = r.request.url
            if u.startswith(BASE):
                if patch is not None and "/assets/js/menu-data.js" in u:
                    return r.fulfill(status=200, content_type="application/javascript", body=patched(patch))
                return r.continue_()
            self.external.append(u)
            if u.startswith("https://wa.me/"):
                return r.fulfill(status=200, content_type="text/html", body="<p>wa.me (Test)</p>")
            return r.abort()
        self.ctx.route("**/*", route)
        self.page = self.ctx.new_page()
        if time is not None:
            self.page.clock.set_fixed_time(time)
        self.page.on("pageerror", lambda e: self.errors.append(str(e)))
        self.page.on("console", lambda m: self.errors.append(m.text) if m.type == "error" else None)

    def go(self, path):
        self.page.goto(BASE + path, wait_until="load")
        self.page.wait_for_timeout(150)
        return self.page

    def close(self): self.ctx.close()


def add_simple(pg, item_id):
    pg.click(f'[data-add="{item_id}"]')
    pg.wait_for_timeout(80)

def open_all_groups(pg):
    pg.evaluate("document.querySelectorAll('#item-dialog details').forEach(d => d.open = true)")

def dialog_submit(pg):
    pg.click("[data-item-add]", force=True)
    pg.wait_for_timeout(120)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"]) if CHROME else p.chromium.launch()

        # ============ A. Seiten, Links, Fehler, externe Anfragen ============
        print("A. Seiten und Links")
        s = Site(browser)
        pages = ["index.html", "speisekarte/index.html", "bestellen.html", "lieferservice.html", "ueber-uns.html", "kontakt.html",
                 "impressum.html", "datenschutz.html", "bestellinformationen.html", "allergene.html", "404.html"]
        cats = re.findall(r'slug: "([^"]+)"', DATA_JS)
        pages += [f"speisekarte/{c}.html" for c in cats]
        links = set()
        for path in pages:
            pg = s.go(path)
            for href in pg.eval_on_selector_all("a[href], img[src], link[href], script[src]", "els => els.map(e => e.href || e.src)"):
                if href.startswith(BASE): links.add(href.split("#")[0].split("?")[0])
        check(f"{len(pages)} Seiten ohne JavaScript-Fehler", not s.errors, s.errors[:3])
        check("keine externen Anfragen beim Seitenaufruf", not s.external, s.external[:3])
        import urllib.request
        broken = []
        for u in sorted(links):
            try: urllib.request.urlopen(u).read(1)
            except Exception as e: broken.append(u)
        # 404.html nutzt absolute Pfade (Domain-Stamm) – lokal unter / identisch
        check(f"alle {len(links)} internen Links und Dateien erreichbar", not broken, broken[:5])
        html_all = "".join(open(os.path.join(ROOT, f), encoding="utf-8").read() for f in pages)
        leftovers = [w for w in ["Bad Buchau", "Schussenrieder", "07582", "0163 359", "491633590188", "minarbuchau", "Rehan", "DE 364887498", "minar-cart", "MIN-A-"] if w in html_all + open(os.path.join(ROOT, "assets/js/app.js"), encoding="utf-8").read()]
        check("keine MINAR-Restaurantdaten in Seiten und app.js", not leftovers, leftovers)
        s.close()

        # ============ B. Eröffnungsmodus (Originaldaten) ============
        print("B. Vor-Eröffnungsmodus")
        s = Site(browser, time=MON_18)
        pg = s.go("speisekarte/pizza.html")
        check("Status „Eröffnung in Vorbereitung“", "Eröffnung in Vorbereitung" in pg.inner_text(".topbar"))
        add_simple(pg, "pizza-margherita")
        check("Speisekarte sichtbar, Gericht in den Warenkorb", pg.inner_text(".cart-count") == "1")
        pg.click(".cart-link"); pg.wait_for_timeout(200)
        check("Warenkorb-Drawer öffnet", pg.is_visible("#cart-drawer .cart-lines li"))
        check("Bestellarten gesperrt", pg.eval_on_selector_all("#cart-drawer [data-mode]", "r => r.every(x => x.disabled)"))
        hint = pg.inner_text("#cart-drawer [data-checkout-hint]")
        check("Hinweis: Bestellung ab Eröffnung", "Eröffnung" in hint, hint)
        pg.click("#cart-drawer [data-to-summary]", force=True); pg.wait_for_timeout(200)
        check("keine Bestellübersicht / kein WhatsApp im Vor-Eröffnungsmodus", not pg.is_visible("#bon-dialog"))
        check("keine Fehler", not s.errors, s.errors[:3])
        s.close()

        # ============ C. Normalbetrieb: Abholung und Lieferung (Mischbestellung) ============
        print("C. Bestellung im Normalbetrieb (Montag 18:00)")
        s = Site(browser, patch=LIVE + CONFIRM_ALL, time=MON_18)
        pg = s.go("speisekarte/pizza.html")
        check("Status geöffnet, Bestellschluss 22:15", "Jetzt geöffnet · Bestellungen bis 22:15 Uhr" in pg.inner_text(".topbar"), pg.inner_text(".topbar"))
        add_simple(pg, "pizza-salami"); add_simple(pg, "pizza-salami")
        pg = s.go("speisekarte/burger.html")
        pg.click('[data-add="burger-hamburgerle"]'); open_all_groups(pg)
        pg.check('#item-dialog input[data-g="burger-beilage"][value="1"]')          # mit Pommes +3,50
        pg.check('#item-dialog input[data-g="burger-extras"][value="3"]')           # Käse +1,00
        check("Dialogpreis Burger 10,00 €", "10,00" in pg.inner_text("[data-item-add]"), pg.inner_text("[data-item-add]"))
        dialog_submit(pg)
        pg = s.go("speisekarte/party-pizza.html")
        pg.click('[data-add="partypizza-4-belaege"]')
        check("Party-Pizza: Pflichtauswahl 4 Beläge", "Noch 4 Beläge wählen" in pg.inner_text("[data-item-add]"))
        dialog_submit(pg)
        check("ohne 4 Beläge nicht hinzufügbar", pg.is_visible("#item-dialog"))
        for v in [0, 1, 5, 6]: pg.check(f'#item-dialog input[data-g="partypizza-belaege"][value="{v}"]')
        check("5. Belag gesperrt (max 4)", pg.is_disabled('#item-dialog input[data-g="partypizza-belaege"][value="7"]'))
        dialog_submit(pg)
        pg = s.go("speisekarte/getraenke.html")
        pg.click('[data-add="getraenk-coca-cola"]'); pg.check('#item-dialog input[name=variant][value="1"]'); dialog_submit(pg)
        add_simple(pg, "getraenk-ayran")
        check("Grundpreis je Liter bei Getränken", "€/l" in pg.inner_text('[data-menu-list="getraenke"]'))
        pg = s.go("bestellen.html")
        lines = pg.eval_on_selector_all("[data-cart-lines] > li", "els => els.length")
        check("5 Positionen (Salami zusammengeführt)", lines == 5, lines)
        check("Salami Menge 2", "2 ×" in pg.inner_text("[data-cart-lines] > li:first-child .cl-qty"))
        goods = 2 * 940 + 1000 + 3400 + 250 + 150
        sums = pg.inner_text("[data-cart-sums]")
        check("Warenwert 66,80 €", eur(goods) in sums, sums)
        check("Pfand 0,25 € separat", eur(25) in sums and "Getränkepfand" in sums, sums)
        check("Gesamt Abholung 67,05 €", eur(goods + 25) in pg.inner_text("[data-grand]"))
        ref = pg.inner_text("[data-ref-nr]")
        check("Referenz SHA-A-YYYYMM-XXXXXXXX", re.fullmatch(r"SHA-A-202611-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}", ref), ref)
        # Ändern: Salami auf 3, dann wieder 2
        pg.click("[data-cart-lines] > li:first-child [data-l-plus]")
        check("Menge + aktualisiert Summe", eur(goods + 940 + 25) in pg.inner_text("[data-grand]"))
        pg.click("[data-cart-lines] > li:first-child [data-l-minus]")
        # Bearbeiten: Burger-Beilage auf Wedges
        pg.click("[data-cart-lines] > li:nth-child(2) [data-l-edit]"); open_all_groups(pg)
        pg.check('#item-dialog input[data-g="burger-beilage"][value="2"]'); dialog_submit(pg)
        check("Bearbeiten übernimmt Variante", "mit Wedges" in pg.inner_text("[data-cart-lines] > li:nth-child(2)"))
        # Angaben
        pg.click("[data-to-summary]", force=True); pg.wait_for_timeout(150)
        check("Pflichtfelder werden markiert", pg.eval_on_selector("[data-f-name]", "e => e.getAttribute('aria-invalid')") == "true")
        pg.fill("[data-f-name]", "Erika Muster"); pg.fill("[data-f-phone]", "0170 1234567")
        pg.click("[data-to-summary]", force=True); pg.wait_for_timeout(250)
        check("Bestellübersicht (Bon) öffnet", pg.is_visible("#bon-dialog"))
        bon = pg.inner_text("#bon-dialog .bon")
        check("Bon: SHAHI, Adresse, Referenz", "SHAHI KÜCHE" in bon and "Bachgasse 17" in bon and ref in bon)
        check("Bon: Positionen mit Extras und Pfand", "Beilage dazu: mit Wedges (+3,50" in bon and "Extra Zusatz: Käse (+1,00" in bon and "Pfand 1 × 0,25" in bon, bon[:400])
        check("Bon: Gesamt bar 67,05 €", eur(goods + 25) in bon and "bar" in bon)
        href = pg.get_attribute("[data-bon-send]", "href")
        check("WhatsApp-Link an 0179 69 500 47", href.startswith("https://wa.me/491796950047?text="), href[:60])
        msg = urllib.parse.unquote(href.split("text=", 1)[1])
        check("Nachricht vollständig", all(x in msg for x in ["SHAHI KÜCHE – BESTELLUNG", "Bestellreferenz: " + ref, "Bestellart: Abholung", "Name: Erika Muster",
              "2 × Nr. 106 Salami – 18,80 €", "- Beläge: Salami, Schinken, Chicken, Champignons", "- Pfand: 1 × 0,25 €", "GESAMTBETRAG: 67,05 €", "Zahlungsart: Barzahlung bei Abholung"]), msg)
        check("keine geschützten Leerzeichen in der Nachricht", " " not in msg and " " not in msg)
        with pg.expect_popup() as pop:
            pg.click("[data-bon-send]")
        popup = pop.value; popup.wait_for_load_state()
        check("„Weiter zu WhatsApp“ öffnet nur wa.me (kein Versand durch die Website)", popup.url.startswith("https://wa.me/491796950047"))
        popup.close()
        opened = pg.inner_text("[data-bon-opened]")
        check("neutraler Hinweis, keine Erfolgsmeldung", pg.is_visible("[data-bon-opened]") and "erfolgreich" not in opened.lower() and "Bestellung eingegangen" not in opened)
        pg.click("#bon-dialog [data-close] >> nth=-1"); pg.wait_for_timeout(100)
        # Datensparsamkeit
        ls = pg.evaluate("localStorage.getItem('shahi-cart-v1')"); ss = pg.evaluate("sessionStorage.getItem('shahi-form-v1')")
        check("localStorage ohne Name/Telefon", ls and "Erika" not in ls and "0170" not in ls)
        check("Formular nur im sessionStorage", ss and "Erika" in ss)
        check("keine MINAR-Schlüssel", pg.evaluate("Object.keys(localStorage).concat(Object.keys(sessionStorage)).filter(k => k.indexOf('minar') > -1).length") == 0)
        # Referenz bleibt nach Neuladen gleich, Lieferung ändert nur A/L
        pg = s.go("bestellen.html")
        check("Referenz nach Neuladen identisch", pg.inner_text("[data-ref-nr]") == ref)
        pg.check('[data-mode][value="Lieferung"]'); pg.wait_for_timeout(100)
        check("Lieferung: SHA-L mit gleicher Kennung", pg.inner_text("[data-ref-nr]") == ref.replace("SHA-A-", "SHA-L-"))
        pg.select_option("[data-f-place]", "Warthausen")
        check("Liefergebühr bis 7 km: 2,00 €", eur(200) in pg.inner_text("[data-cart-sums]"))
        check("Gesamt Lieferung 69,05 €", eur(goods + 25 + 200) in pg.inner_text("[data-grand]"))
        pg.fill("[data-f-address]", "Hauptstraße"); pg.click("[data-to-summary]", force=True); pg.wait_for_timeout(150)
        check("Hausnummer wird verlangt", "Hausnummer" in pg.inner_text("[data-checkout-hint]"), pg.inner_text("[data-checkout-hint]"))
        pg.fill("[data-f-address]", "Hauptstraße 5"); pg.click("[data-to-summary]", force=True); pg.wait_for_timeout(250)
        msg = urllib.parse.unquote(pg.get_attribute("[data-bon-send]", "href").split("text=", 1)[1])
        check("Lieferadresse mit PLZ und Ort", "Lieferadresse: Hauptstraße 5, 88447 Warthausen" in msg, msg[:300])
        check("Liefergebühr in der Nachricht", "Liefergebühr: 2,00 €" in msg)
        # Neue Bestellung: neue Referenz, Mindestbestellwert
        pg.evaluate("document.querySelector('[data-new-order]').hidden = false")
        pg.click("[data-new-order]"); pg.wait_for_url(re.compile(r".*/speisekarte/index\.html")); pg.wait_for_timeout(150)
        check("„Neue Bestellung“ leert Warenkorb und führt zur Speisekarte", pg.evaluate("localStorage.getItem('shahi-cart-v1')") is None)
        pg = s.go("speisekarte/pizza.html"); add_simple(pg, "pizza-margherita")
        pg = s.go("bestellen.html")
        check("neue Bestellung → neue Referenz", pg.inner_text("[data-ref-nr]")[-8:] != ref[-8:])
        pg.check('[data-mode][value="Lieferung"]'); pg.select_option("[data-f-place]", "Biberach an der Riß")
        pg.fill("[data-f-name]", "Erika"); pg.fill("[data-f-phone]", "0170 1234567"); pg.fill("[data-f-address]", "Marktplatz 1")
        pg.click("[data-to-summary]", force=True); pg.wait_for_timeout(150)
        check("Mindestbestellwert 15 € sperrt (7,90 €)", not pg.is_visible("#bon-dialog") and "Mindestbestellwert" in pg.inner_text("[data-checkout-hint]"))
        pg.check('[data-mode][value="Abholung"]'); pg.click("[data-to-summary]", force=True); pg.wait_for_timeout(250)
        check("Getränke-Abfrage bei Bestellung ohne Getränk", pg.is_visible(".sheet-drinks"))
        pg.click("[data-drinks-skip]"); pg.wait_for_timeout(250)
        check("danach Bestellübersicht", pg.is_visible("#bon-dialog"))
        check("keine Fehler im Bestellablauf", not s.errors, s.errors[:3])
        s.close()

        # ============ D. Öffnungszeiten (Europe/Berlin) ============
        print("D. Öffnungszeiten")
        def status_at(t, extra=""):
            s = Site(browser, patch=LIVE + CONFIRM_ALL + extra, time=t)
            pg = s.go("bestellen.html")
            txt = pg.inner_text(".topbar-status")
            s.close(); return txt
        check("Dienstag: Ruhetag, öffnet morgen 16:30", "Heute Ruhetag · öffnet morgen um 16:30 Uhr" in status_at(TUE_18), status_at(TUE_18))
        check("Montag 16:00: geschlossen, öffnet heute 16:30", "Geschlossen · öffnet heute um 16:30 Uhr" in status_at(MON_1600), status_at(MON_1600))
        check("Montag 22:20: Bestellschluss vorbei", "Bestellschluss für heute vorbei" in status_at(MON_2220), status_at(MON_2220))
        check("Freitag 11:05: geöffnet", "Jetzt geöffnet" in status_at(FRI_1105), status_at(FRI_1105))
        check("Sommerzeit (MESZ) Montag 18:00: geöffnet", "Jetzt geöffnet" in status_at(SUMMER_MON_18), status_at(SUMMER_MON_18))
        exc = 'D.hours.exceptions = [{ date: "2026-11-16", closed: true, note: "Geschlossene Gesellschaft" }];'
        check("Sonderöffnungszeit: geschlossen mit Hinweis", "Geschlossene Gesellschaft" in status_at(MON_18, exc), status_at(MON_18, exc))
        hol = 'D.hours.holidays = [{ from: "2026-11-16", to: "2026-11-22", note: "Betriebsferien" }];'
        check("Betriebsferien: nächste Öffnung danach", "Betriebsferien · öffnet am 23.11. um 16:30 Uhr" in status_at(MON_18, hol), status_at(MON_18, hol))
        # Bestellpause und Wunschzeiten
        s = Site(browser, patch=LIVE + CONFIRM_ALL + 'D.hours.pause = { active: true, note: "Gerade sehr viel los – bitte telefonisch bestellen." };', time=MON_18)
        pg = s.go("speisekarte/pizza.html"); add_simple(pg, "pizza-salami"); pg = s.go("bestellen.html")
        check("Bestellpause sperrt beide Bestellarten", pg.eval_on_selector_all("[data-mode]", "r => r.every(x => x.disabled)"))
        check("Bestellpause: Hinweis", "sehr viel los" in pg.inner_text("[data-cart-closed]"))
        s.close()
        s = Site(browser, patch=LIVE + CONFIRM_ALL, time=MON_18)
        pg = s.go("speisekarte/pizza.html"); add_simple(pg, "pizza-salami"); pg = s.go("bestellen.html")
        times = pg.eval_on_selector_all("[data-f-time] option", "o => o.map(x => x.value)")
        check("Wunschzeit Abholung: ab 18:30 (20 Min. Vorlauf, 15-Min.-Raster) bis 22:30", times[0] == "asap" and times[1] == "18:30" and times[-1] == "22:30", times[:3] + times[-1:])
        pg.check('[data-mode][value="Lieferung"]')
        times = pg.eval_on_selector_all("[data-f-time] option", "o => o.map(x => x.value)")
        check("Wunschzeit Lieferung: ab 18:30 (30 Min. Vorlauf)", times[1] == "18:30", times[:3])
        s.close()
        s = Site(browser, patch=LIVE + CONFIRM_ALL, time=MON_2220)
        pg = s.go("speisekarte/pizza.html"); add_simple(pg, "pizza-salami"); pg = s.go("bestellen.html")
        check("nach Bestellschluss keine Bestellung", pg.eval_on_selector_all("[data-mode]", "r => r.every(x => x.disabled)") and "Bestellschluss" in pg.inner_text("[data-cart-closed]"))
        s.close()

        # ============ E. Prüfpunkte sperren im Normalbetrieb ============
        print("E. Sperrende Prüfpunkte (Normalbetrieb, Daten wie migriert)")
        s = Site(browser, patch=LIVE, time=MON_18)
        pg = s.go("speisekarte/getraenke.html")
        check("Getränke mit offenem Pfand-Prüfpunkt: nur telefonisch", pg.eval_on_selector_all('[data-menu-list="getraenke"] .add-btn', "b => b.every(x => x.getAttribute('aria-disabled') === 'true')"))
        pg = s.go("speisekarte/burger.html"); pg.click('[data-add="burger-hamburgerle"]')
        check("Burger: nicht freigegebene Extras ausgeblendet, Burger bestellbar", pg.is_visible("#item-dialog") is False and pg.inner_text(".cart-count") == "1")
        pg = s.go("speisekarte/party-pizza.html")
        check("Party-Pizza mit offener Belagliste: nur telefonisch", pg.get_attribute('[data-add="partypizza-4-belaege"]', "aria-disabled") == "true")
        s.close()
        s = Site(browser, patch='D.operation.mode = "geoeffnet";', time=MON_18)
        pg = s.go("speisekarte/pizza.html"); add_simple(pg, "pizza-salami"); pg = s.go("bestellen.html")
        check("ohne Impressum/Zahlungsarten/Steuerstatus keine Online-Bestellung", "freigeschaltet" in pg.inner_text("[data-cart-closed]"), pg.inner_text("[data-cart-closed]"))
        s.close()

        # ============ F. Steueraufteilung (ausgewiesen, wenn bestätigt) ============
        print("F. Umsatzsteuer")
        s = Site(browser, patch=LIVE + CONFIRM_ALL + "D.tax.show = true;", time=MON_18)
        pg = s.go("speisekarte/pizza.html"); add_simple(pg, "pizza-salami"); add_simple(pg, "pizza-salami")
        pg = s.go("speisekarte/burger.html"); pg.click('[data-add="burger-hamburgerle"]'); open_all_groups(pg)
        pg.check('#item-dialog input[data-g="burger-beilage"][value="1"]'); pg.check('#item-dialog input[data-g="burger-extras"][value="3"]'); dialog_submit(pg)
        pg = s.go("speisekarte/party-pizza.html"); pg.click('[data-add="partypizza-4-belaege"]')
        for v in [0, 1, 5, 6]: pg.check(f'#item-dialog input[data-g="partypizza-belaege"][value="{v}"]')
        dialog_submit(pg)
        pg = s.go("speisekarte/getraenke.html"); pg.click('[data-add="getraenk-coca-cola"]'); pg.check('#item-dialog input[name=variant][value="1"]'); dialog_submit(pg); add_simple(pg, "getraenk-ayran")
        pg = s.go("bestellen.html"); pg.fill("[data-f-name]", "Test"); pg.fill("[data-f-phone]", "0170 1234567")
        pg.click("[data-to-summary]", force=True); pg.wait_for_timeout(250)
        # Erwartung unabhängig berechnet: Speisen 62,80 € (7 %), Getränke 4,00 € + Pfand 0,25 € (19 %)
        def tax(g, r): return g - round(g * 100 / (100 + r))
        food, drinks = 6280, 400 + 25
        exp = f"7 % {eur(tax(food, 7))}, 19 % {eur(tax(drinks, 19))}"
        bon = pg.inner_text("#bon-dialog .bon")
        check(f"Abholung: enthaltene USt. {exp.replace(chr(160), ' ')}", exp.replace(" ", " ") in bon.replace(" ", " "), bon[-400:])
        pg.click("#bon-dialog [data-close] >> nth=-1")
        pg.check('[data-mode][value="Lieferung"]'); pg.select_option("[data-f-place]", "Warthausen"); pg.fill("[data-f-address]", "Hauptstraße 5")
        pg.click("[data-to-summary]", force=True); pg.wait_for_timeout(250)
        fee, gf, gd = 200, 6280, 400
        a7 = fee * gf // (gf + gd); a19 = fee * gd // (gf + gd)
        rem = sorted([(fee * gf / (gf + gd) - a7, 7), (fee * gd / (gf + gd) - a19, 19)], reverse=True)
        for i in range(fee - a7 - a19):
            if rem[i % 2][1] == 7: a7 += 1
            else: a19 += 1
        exp = f"7 % {eur(tax(gf + a7, 7))}, 19 % {eur(tax(gd + 25 + a19, 19))}"
        bon = pg.inner_text("#bon-dialog .bon")
        check(f"Lieferung: Liefergebühr anteilig, USt. {exp.replace(chr(160), ' ')}", exp.replace(" ", " ") in bon.replace(" ", " "), bon[-300:])
        check("keine Umsatzsteuer aufgeschlagen (Gesamt unverändert brutto)", eur(6280 + 400 + 25 + 200) in bon)
        s.close()

        # ============ G. Lange Nachricht, Referenz-Zufall ============
        print("G. Lange Nachrichten, Bestellreferenz")
        s = Site(browser, patch=LIVE + CONFIRM_ALL, time=MON_18)
        pg = s.go("speisekarte/index.html")
        pg.evaluate("""() => {
          const items = window.SHAHI_DATA.items.filter(i => i.prices.length === 1 && !(i.opts || []).length).slice(0, 45);
          localStorage.setItem('shahi-cart-v1', JSON.stringify({ t: Date.now(), lines: items.map(i => ({ id: i.id, v: 0, sel: {}, qty: 1, note: 'bitte gut durch und extra scharf' })) }));
        }""")
        pg = s.go("bestellen.html"); pg.fill("[data-f-name]", "Test"); pg.fill("[data-f-phone]", "0170 1234567")
        pg.click("[data-to-summary]", force=True); pg.wait_for_timeout(250)
        if pg.is_visible(".sheet-drinks"): pg.click("[data-drinks-skip]"); pg.wait_for_timeout(250)
        check("lange Nachricht: Warnung und Kopier-Ausweg", "Bestelltext kopieren" in pg.inner_text("[data-bon-alert]") and pg.is_visible("[data-bon-copy]"))
        refs = pg.evaluate("Array.from({ length: 20000 }, () => window.SHAHI_REF.generate())")
        check("20.000 Referenzen: Format korrekt, keine Doppelung", all(re.fullmatch(r"[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}", r) for r in refs) and len(set(refs)) == len(refs))
        pg.evaluate("""() => localStorage.setItem('shahi-cart-v1', JSON.stringify({ t: Date.now(), lines: [
            { id: 'burger-hamburgerle', v: 0, sel: { 'burger-beilage': [9, 1, 1], 'burger-extras': [3, 3, 77] }, qty: 999, note: '' },
            { id: 'gibt-es-nicht', v: 0, sel: {}, qty: 1 }, { id: 'pizza-salami', v: 5, sel: {}, qty: 1 } ] }))""")
        pg = s.go("bestellen.html")
        txt = pg.inner_text("[data-cart-lines]")
        check("… nur gültige Position, Menge begrenzt auf 50, Optionen bereinigt", pg.eval_on_selector_all("[data-cart-lines] > li", "l => l.length") == 1 and "50 ×" in txt and "mit Pommes" in txt and "Käse (+1,00" in txt, txt)
        s.close()

        # ============ H. Mobil (390 px) und Tablet (768 px) ============
        print("H. Mobile Darstellung")
        for w in (390, 768):
            s = Site(browser, width=w, patch=LIVE + CONFIRM_ALL, time=MON_18)
            over = []
            for path in pages:
                pg = s.go(path)
                if pg.evaluate("document.documentElement.scrollWidth > window.innerWidth + 1"): over.append(path)
            check(f"{w} px: kein seitliches Scrollen auf {len(pages)} Seiten", not over, over)
            pg = s.go("index.html")
            pg.click(".nav-toggle"); pg.wait_for_timeout(300)
            check(f"{w} px: Menü öffnet", pg.evaluate("document.body.classList.contains('nav-open')") and pg.is_visible(".main-nav ul a"))
            pg.keyboard.press("Escape")
            pg = s.go("speisekarte/pizza.html"); add_simple(pg, "pizza-salami"); pg.wait_for_timeout(200)
            pg.click("[data-cart-fab]"); pg.wait_for_timeout(300)
            check(f"{w} px: Warenkorb-Drawer über Schaltfläche", pg.is_visible("#cart-drawer .cart-lines li"))
            check(f"{w} px: keine Fehler", not s.errors, s.errors[:3])
            s.close()

        # ============ I. Logo-Intro ============
        print("I. Logo-Intro")
        s = Site(browser, reduced=True)
        pg = s.go("index.html")
        check("„Bewegung reduzieren“: statisches Logo ohne Intro", pg.evaluate("!document.querySelector('.shahi-logo-anim').classList.contains('is-intro')"))
        s.close()
        s = Site(browser, reduced=False)
        pg = s.go("index.html")
        check("Intro läuft", pg.evaluate("document.querySelector('.shahi-logo-anim').classList.contains('is-intro')"))
        pg.wait_for_timeout(3900)
        check("Intro endet nach ca. 3,4 s in der statischen Endpose", pg.evaluate("""(() => { const s = document.querySelector('.shahi-logo-anim');
            return s.classList.contains('is-done') && !s.querySelector('.lg-arch[transform], .lg-s[transform], .lg-finial[transform], .lg-letter[transform], .lg-kueche[transform], .lg-line[stroke-dasharray], [opacity]:not(.lg-shine)'); })()"""))
        check("keine Fehler", not s.errors, s.errors[:3])
        s.close()

        browser.close()
    ok = sum(1 for r in results if r[1])
    print(f"\n{ok}/{len(results)} Prüfungen bestanden")
    json.dump([{"pruefung": n, "ok": o, "info": str(i)[:300]} for n, o, i in results], open(os.path.join(os.path.dirname(__file__), "ergebnis.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    sys.exit(0 if ok == len(results) else 1)


if __name__ == "__main__":
    main()
