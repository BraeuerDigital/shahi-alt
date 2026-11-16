/* Browser-Tests mit Playwright – ausführen mit:
     npm install --no-save playwright && npx playwright install chromium
     node --test tests/e2e.test.mjs
   Alternativ vorhandenes Playwright/Chrome nutzen:
     PLAYWRIGHT_MODULE=/pfad/playwright/index.mjs CHROME=/usr/bin/google-chrome node --test tests/e2e.test.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { startServer } from "./static-server.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
let chromium;
try { ({ chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright")); } catch (e) { chromium = null; }

const config0 = JSON.parse(fs.readFileSync(path.join(ROOT, "data/config.json"), "utf8"));
const menu0 = JSON.parse(fs.readFileSync(path.join(ROOT, "data/menu.json"), "utf8"));
const clone = (o) => JSON.parse(JSON.stringify(o));
const PAGES = ["index.html", "speisekarte/index.html", ...menu0.kategorien.map((c) => `speisekarte/${c.id}.html`), "lieferung.html", "restaurant.html", "bestellen.html", "allergene.html", "bestellinformationen.html", "impressum.html", "datenschutz.html"];

function liveConfig(mut) {
  const c = clone(config0);
  c.betrieb.modus = "geoeffnet";
  c.betreiber.name = "Test Inhaber"; c.betreiber.rechtsform = "Einzelunternehmen"; c.betreiber.email = "test@example.org";
  c.zahlung = { arten: ["Barzahlung"], hinweis: "bar bei Abholung bzw. Lieferung" };
  c.steuer = { status: "bestaetigt", kleinunternehmer: false, saetze: { speisen: 7, getraenke: 19 }, lieferkosten: "anteilig", pfand: "wie-getraenk", ausweisen: true };
  c.lieferung.orte.forEach((o) => { o.bestaetigt = true; });
  if (mut) mut(c);
  return c;
}
function confirmedMenu() {
  const m = clone(menu0);
  m.produkte.forEach((p) => { (p.pruefen || []).forEach((x) => { x.sperrt = false; }); if (p.pfandCent === null) p.pfandCent = 0; });
  Object.values(m.optionsgruppen).forEach((g) => (g.pruefen || []).forEach((x) => { x.sperrt = false; }));
  return m;
}
const OPEN = "2026-11-16T17:00:00Z";      // Montag 18:00 MEZ
const TUESDAY = "2026-11-17T17:00:00Z";   // Ruhetag
const LATE = "2026-11-16T21:20:00Z";      // Montag 22:20 MEZ – nach Bestellschluss
const SUMMER = "2026-07-01T14:35:00Z";    // Mittwoch 16:35 MESZ

const skip = !chromium && "Playwright nicht installiert";
let srv, browser;

test.before(async () => {
  if (skip) return;
  srv = await startServer(ROOT);
  browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ["--no-sandbox", "--disable-background-networking", "--disable-component-update", "--no-first-run"] });
});
test.after(async () => { if (browser) await browser.close(); if (srv) srv.server.close(); });

/** Neuer Kontext; optional mit Konfiguration/Speisekarte, Uhrzeit, gefülltem Warenkorb */
async function ctx({ config, menu, time, cart, viewport = { width: 390, height: 844 }, reducedMotion } = {}) {
  const c = await browser.newContext({ viewport, timezoneId: "UTC", locale: "de-DE", reducedMotion: reducedMotion || "no-preference" });
  const external = [];
  await c.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (u.hostname !== "127.0.0.1") { external.push(u.href); return route.fulfill({ status: 200, contentType: "text/html", body: "<title>extern</title>" }); }
    if (config && u.pathname.endsWith("/data/config.json")) return route.fulfill({ contentType: "application/json", body: JSON.stringify(config) });
    if (menu && u.pathname.endsWith("/data/menu.json")) return route.fulfill({ contentType: "application/json", body: JSON.stringify(menu) });
    return route.continue();
  });
  if (cart) await c.addInitScript(([data, t]) => { if (!sessionStorage.getItem("__init")) { localStorage.setItem("shahi-warenkorb-v1", JSON.stringify({ t, ref: null, lines: data })); sessionStorage.setItem("__init", "1"); } }, [cart, time ? new Date(time).getTime() : Date.now()]);
  const page = await c.newPage();
  if (time) await page.clock.setFixedTime(new Date(time));
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  return { c, page, errors, external };
}
async function open(page, p) {
  await page.goto(srv.url + p, { waitUntil: "networkidle" });
  await page.waitForSelector("html[data-ready]", { timeout: 5000 });
}
async function addSimple(page, id) {
  await page.click(`[data-open="${id}"]`);
  await page.click("[data-item-submit]");
  await page.waitForFunction(() => !document.querySelector("#item-dialog").open);
}

/* ------------------------------------------------------------------ */
test("Alle Seiten: keine JS-Fehler, kein seitliches Scrollen, keine externen Anfragen", { skip }, async () => {
  for (const vp of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    const { c, page, errors, external } = await ctx({ viewport: vp });
    for (const p of PAGES) {
      await open(page, p);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 0, `${p} @${vp.width}px: ${overflow}px horizontal`);
    }
    assert.deepEqual(errors, [], "JS-Fehler @" + vp.width);
    assert.deepEqual(external, [], "externe Anfragen @" + vp.width);
    await c.close();
  }
});

test("Interne Links und Ressourcen erreichbar, 404-Seite liefert Status 404", { skip }, async () => {
  const { c, page } = await ctx();
  const seen = new Set();
  for (const p of PAGES) {
    await open(page, p);
    const urls = await page.evaluate(() => [...document.querySelectorAll("a[href], link[href], script[src], use[href]")]
      .map((e) => e.href && e.href.baseVal !== undefined ? new URL(e.href.baseVal, location.href).href : (e.href || e.src))
      .filter((u) => u && u.startsWith(location.origin)));
    urls.forEach((u) => seen.add(u.split("#")[0].split("?")[0]));
  }
  for (const u of seen) {
    const r = await fetch(u);
    assert.equal(r.status, 200, "nicht erreichbar: " + u);
  }
  const r404 = await fetch(srv.url + "gibt-es-nicht.html");
  assert.equal(r404.status, 404);
  assert.ok(seen.size > 30);
  await c.close();
});

test("Vor der Eröffnung: Karte sichtbar, keine Bestellung möglich", { skip }, async () => {
  const { c, page, errors } = await ctx({ time: OPEN });
  await open(page, "speisekarte/index.html");
  assert.equal(await page.locator(".dish").count(), 166);
  assert.equal(await page.locator(".dish-btn.is-add").count(), 0);
  assert.equal(await page.locator(".cart-btn").isHidden(), true);
  assert.match(await page.textContent("[data-status-short]"), /Eröffnung in Vorbereitung/);
  await page.click('[data-open="pizza-salami"]');
  assert.equal(await page.locator("[data-item-foot]").isHidden(), true);
  assert.match(await page.textContent("[data-item-info]"), /ab der Eröffnung/);
  await open(page, "bestellen.html");
  assert.equal(await page.locator("[data-checkout]").isHidden(), true);
  assert.equal(await page.locator("[data-checkout-off]").isVisible(), true);
  await open(page, "index.html");
  assert.equal(await page.locator("[data-opening-note]").isVisible(), true);
  assert.deepEqual(errors, []);
  await c.close();
});

test("Live ohne Betreiberdaten: Bestellung gesperrt (Livegang-Schutz)", { skip }, async () => {
  const cfg = clone(config0); cfg.betrieb.modus = "geoeffnet";
  const { c, page } = await ctx({ config: cfg, time: OPEN });
  await open(page, "bestellen.html");
  assert.equal(await page.locator("[data-checkout]").isHidden(), true);
  assert.match(await page.textContent("[data-checkout-off] h2"), /nicht verfügbar/);
  await c.close();
});

test("Speisekarte: Suche nach Nummer und Begriff, Filter vegetarisch", { skip }, async () => {
  const { c, page } = await ctx();
  await open(page, "speisekarte/index.html?q=96a");
  assert.equal(await page.locator("[data-search-results] .dish").count(), 1);
  await page.fill("[data-search]", "butter chicken");
  await page.waitForTimeout(300);
  assert.ok(await page.locator('[data-search-results] [data-product="indisch-butter-chicken"]').count() === 1);
  await page.fill("[data-search]", "");
  await page.click('[data-filter="vegetarisch"]');
  const n = await page.locator("[data-search-results] .dish").count();
  assert.equal(n, menu0.produkte.filter((p) => (p.merkmale || []).includes("vegetarisch")).length);
  await c.close();
});

test("Warenkorb: zusammenfassen, getrennte Varianten, Extras, Menge, Entfernen, Ändern, Navigation", { skip }, async () => {
  const { c, page, errors } = await ctx({ config: liveConfig(), menu: confirmedMenu(), time: OPEN });
  await open(page, "speisekarte/pizza.html");
  await addSimple(page, "pizza-salami");
  await addSimple(page, "pizza-salami");
  let cart = await page.evaluate(() => window.SHAHI.cart());
  assert.equal(cart.lines.length, 1); assert.equal(cart.lines[0].q, 2);
  assert.match(cart.ref.id, /^[23456789A-HJ-NP-Z]{8}$/);
  const ref0 = cart.ref.id;

  await open(page, "speisekarte/potatoes.html");                       // Navigation: Warenkorb bleibt
  await page.click('[data-open="potatoes-pommes"]');
  await page.click('label.opt:has-text("klein")');
  await page.click("[data-item-submit]");
  await page.click('[data-open="potatoes-pommes"]');
  await page.click('label.opt:has-text("groß")');
  assert.match(await page.textContent("[data-item-submit]"), /6,90/);
  await page.click("[data-item-submit]");
  cart = await page.evaluate(() => window.SHAHI.cart());
  assert.equal(cart.lines.length, 3, "klein und groß getrennt");

  await open(page, "speisekarte/burger.html");
  await page.click('[data-open="burger-shahi-spezial-xxl"]');
  await page.click('label.opt:has-text("mit Wedges")');
  await page.click('label.opt:has-text("Käse")');
  await page.click("[data-qty-plus]");
  assert.match(await page.textContent("[data-item-submit]"), /32,00 €/, "(11,50 + 3,50 + 1,00) × 2");
  await page.fill("[data-item-note]", "ohne Zwiebeln");
  await page.click("[data-item-submit]");

  await page.click("[data-bar-cart]");
  await page.waitForSelector("#cart-dialog[open]");
  assert.match(await page.textContent("#cart-dialog [data-cart-sums]"), /Warenwert\s*62,60 €/);
  // Menge erhöhen und reduzieren
  await page.click('#cart-dialog [data-line="0"] [data-l-plus]');
  cart = await page.evaluate(() => window.SHAHI.cart());
  assert.equal(cart.lines[0].q, 3);
  // Pommes klein → groß ändern: verschmilzt mit vorhandener Zeile „groß“
  await page.click('#cart-dialog [data-line="1"] [data-l-edit]');
  await page.click('#item-dialog label.opt:has-text("groß")');
  await page.click("#item-dialog [data-item-submit]");
  cart = await page.evaluate(() => window.SHAHI.cart());
  assert.equal(cart.lines.length, 3);
  assert.deepEqual(cart.lines.find((l) => l.p === "potatoes-pommes"), { p: "potatoes-pommes", v: "gross", s: {}, n: "", q: 2 });
  // Entfernen
  await page.click('#cart-dialog [data-line="0"] [data-l-remove]');
  cart = await page.evaluate(() => window.SHAHI.cart());
  assert.equal(cart.lines.length, 2);
  assert.equal(cart.ref.id, ref0, "Referenz bleibt während der Bestellung gleich");
  // Keine Personendaten im localStorage
  const ls = await page.evaluate(() => localStorage.getItem("shahi-warenkorb-v1"));
  assert.ok(!/Erika|0151|straße/i.test(ls));
  assert.deepEqual(errors, []);
  await c.close();
});

test("Bestellung Abholung: Schritte, Übersicht, identische Referenz, WhatsApp-Link, keine Erfolgsbehauptung", { skip }, async () => {
  const cart = [{ p: "pizza-salami", v: "standard", s: {}, n: "", q: 2 }, { p: "getraenk-coca-cola", v: "05", s: {}, n: "", q: 1 }];
  const { c, page, errors } = await ctx({ config: liveConfig(), menu: confirmedMenu(), time: OPEN, cart });
  await open(page, "bestellen.html");
  await page.click('[data-step="warenkorb"] [data-next]');
  await page.click('[data-step="art"] [data-next]');
  assert.ok(await page.locator('[data-err="art"]').isVisible(), "Bestellart Pflicht");
  await page.check('input[name="art"][value="abholung"]', { force: true });
  await page.click('[data-step="art"] [data-next]');
  assert.ok(await page.locator('[data-step="kontakt"]').isVisible(), "Adresse wird bei Abholung übersprungen");
  await page.click('[data-step="kontakt"] [data-next]');
  assert.ok(await page.locator('[data-err="name"]').isVisible());
  await page.fill('[data-f="name"]', "Erika Muster");
  await page.fill('[data-f="telefon"]', "abc");
  await page.click('[data-step="kontakt"] [data-next]');
  assert.match(await page.textContent('[data-err="telefon"]'), /prüfen/);
  await page.fill('[data-f="telefon"]', "0151 2345678");
  await page.click('[data-step="kontakt"] [data-next]');
  await page.check('input[name="zeitart"][value="uhrzeit"]', { force: true });
  const firstTime = await page.$eval('[data-f="zeit"] option', (o) => o.value);
  assert.equal(firstTime, "18:30", "18:00 + 20 Min. Vorlauf → 18:30");
  await page.click('[data-step="zeit"] [data-next]');
  assert.ok(await page.locator('[data-step="uebersicht"]').isVisible());

  const receiptRef = (await page.textContent(".receipt-ref")).trim();
  const sideRef = (await page.textContent("[data-ref]")).trim();
  assert.match(receiptRef, /^SHA-A-202611-[23456789A-HJ-NP-Z]{8}$/);
  assert.equal(receiptRef, sideRef);
  const href = await page.getAttribute("[data-send]", "href");
  assert.ok(href.startsWith("https://wa.me/491796950047?text="));
  const msg = decodeURIComponent(href.split("?text=")[1]);
  assert.ok(msg.includes(receiptRef) && msg.includes("ABHOLUNG") && msg.includes("Erika Muster") && msg.includes("heute, 18:30 Uhr"));
  assert.ok(msg.includes("Warenwert: 21,30 €") && msg.includes("Pfand: 0,25 €") && msg.includes("Gesamt: 21,55 €"));
  assert.equal(await page.textContent("[data-send-label]"), "Zahlungspflichtig bestellen");

  const popup = page.waitForEvent("popup");
  await page.click("[data-send]");
  const wa = await popup;
  assert.ok(wa.url().startsWith("https://wa.me/491796950047"));
  assert.equal(page.url(), srv.url + "bestellen.html", "Website bleibt geöffnet");
  assert.ok(await page.locator("[data-sent]").isVisible());
  assert.match(await page.textContent("[data-sent]"), /erst angenommen, wenn wir sie Ihnen per WhatsApp bestätigen/);
  assert.equal((await page.textContent("[data-sent-ref]")).trim(), receiptRef);
  // erneut öffnen: gleiche Referenz, keine automatische Übermittlung
  const href2 = await page.getAttribute("[data-send]", "href");
  assert.equal(href2, href);
  // neue Bestellung → neue Referenz
  await page.click("[data-new-order]");
  const after = await page.evaluate(() => window.SHAHI.cart());
  assert.equal(after.lines.length, 0); assert.equal(after.ref, null);
  assert.deepEqual(errors, []);
  await c.close();
});

test("Bestellung Lieferung: Mindestbestellwert knapp darunter / erreicht, unvollständige Adresse, Lieferkosten", { skip }, async () => {
  // 9,40 + 4,90 = 14,30 € (< 15 €)
  const cart = [{ p: "pizza-salami", v: "standard", s: {}, n: "", q: 1 }, { p: "potatoes-pommes", v: "klein", s: {}, n: "", q: 1 }];
  const { c, page, errors } = await ctx({ config: liveConfig(), menu: confirmedMenu(), time: OPEN, cart });
  await open(page, "bestellen.html");
  await page.click('[data-step="warenkorb"] [data-next]');
  await page.check('input[name="art"][value="lieferung"]', { force: true });
  await page.click('[data-step="art"] [data-next]');
  await page.selectOption('[data-f="ort"]', "Biberach an der Riß");
  assert.equal(await page.inputValue('[data-f="plz"]'), "88400");
  await page.fill('[data-f="strasse"]', "Bachgasse");
  await page.click('[data-step="adresse"] [data-next]');
  assert.match(await page.textContent('[data-err="strasse"]'), /Hausnummer/);
  await page.fill('[data-f="strasse"]', "Marktplatz 1");
  await page.click('[data-step="adresse"] [data-next]');
  assert.match(await page.textContent('[data-err="ort"]'), /es fehlen noch 0,70 €/);
  // Dip 0,50 € + Ketchup 0,50 € → 15,30 € ≥ 15 €
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("shahi-warenkorb-v1"));
    raw.lines.push({ p: "dip-ketchup-mayo-remoulade", v: "standard", s: { "dip-sorte": ["ketchup"] }, n: "", q: 2 });
    localStorage.setItem("shahi-warenkorb-v1", JSON.stringify(raw));
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("html[data-ready]");
  assert.ok(await page.locator('[data-step="adresse"]').isVisible(), "Schritt bleibt nach Neuladen erhalten");
  assert.equal(await page.inputValue('[data-f="strasse"]'), "Marktplatz 1", "Angaben bleiben in der Sitzung erhalten");
  await page.click('[data-step="adresse"] [data-next]');
  assert.ok(await page.locator('[data-step="kontakt"]').isVisible());
  await page.fill('[data-f="name"]', "Erika Muster");
  await page.fill('[data-f="telefon"]', "+49 151 2345678");
  await page.click('[data-step="kontakt"] [data-next]');
  await page.click('[data-step="zeit"] [data-next]');
  const msg = decodeURIComponent((await page.getAttribute("[data-send]", "href")).split("?text=")[1]);
  assert.ok(msg.includes("LIEFERUNG") && msg.includes("Marktplatz 1, 88400 Biberach an der Riß"));
  assert.ok(msg.includes("Warenwert: 15,30 €") && msg.includes("Lieferkosten: 1,00 €") && msg.includes("Gesamt: 16,30 €"));
  assert.match(msg, /^\*SHAHI Küche – Bestellung\*\nReferenz: SHA-L-202611-/);
  assert.deepEqual(errors, []);
  await c.close();
});

test("Liefergebiet: nur bestätigte Orte wählbar, ohne bestätigte Orte keine Lieferung", { skip }, async () => {
  const cfg = liveConfig((c) => { c.lieferung.orte.forEach((o, i) => { o.bestaetigt = i === 0; }); });
  const cart = [{ p: "pizza-salami", v: "standard", s: {}, n: "", q: 3 }];
  let { c, page } = await ctx({ config: cfg, menu: confirmedMenu(), time: OPEN, cart });
  await open(page, "bestellen.html");
  assert.equal(await page.locator('[data-f="ort"] option').count(), 2, "Platzhalter + 1 bestätigter Ort");
  await c.close();
  const none = liveConfig((c2) => { c2.lieferung.orte.forEach((o) => { o.bestaetigt = false; }); });
  ({ c, page } = await ctx({ config: none, menu: confirmedMenu(), time: OPEN, cart }));
  await open(page, "bestellen.html");
  await page.click('[data-step="warenkorb"] [data-next]');
  assert.equal(await page.locator('input[name="art"][value="lieferung"]').isDisabled(), true);
  assert.ok(await page.locator("[data-art-info]").isVisible());
  await c.close();
});

test("Zeitsteuerung: Ruhetag und nach Bestellschluss gesperrt, Sommerzeit geöffnet", { skip }, async () => {
  const cart = [{ p: "pizza-salami", v: "standard", s: {}, n: "", q: 2 }];
  for (const [time, open1] of [[TUESDAY, false], [LATE, false], [SUMMER, true]]) {
    const { c, page } = await ctx({ config: liveConfig(), menu: confirmedMenu(), time, cart });
    await open(page, "bestellen.html");
    assert.equal(await page.locator("[data-closed-banner]").isVisible(), !open1, time);
    if (!open1) {
      assert.match(await page.textContent("[data-closed-banner]"), /wieder|öffnen/);
      await page.click('[data-step="warenkorb"] [data-next]');
      await page.check('input[name="art"][value="abholung"]', { force: true });
      await page.click('[data-step="art"] [data-next]');
      await page.fill('[data-f="name"]', "Erika Muster");
      await page.fill('[data-f="telefon"]', "0151 2345678");
      await page.click('[data-step="kontakt"] [data-next]');
      await page.click('[data-step="zeit"] [data-next]');
      assert.ok(await page.locator('[data-err="zeit"]').isVisible(), "Übersicht außerhalb der Bestellzeit gesperrt");
      assert.equal(await page.locator('[data-step="uebersicht"]').isHidden(), true);
    }
    await c.close();
  }
});

test("Testmodus: Nachricht an Testnummer, als TEST markiert", { skip }, async () => {
  const cfg = clone(config0);
  cfg.betrieb.testmodus = { aktiv: true, whatsappNummer: "4915100000000" };
  const cart = [{ p: "pizza-salami", v: "standard", s: {}, n: "", q: 1 }];
  const { c, page } = await ctx({ config: cfg, menu: confirmedMenu(), time: TUESDAY, cart });
  await open(page, "bestellen.html");
  assert.ok(await page.locator("[data-test-banner]").isVisible());
  await page.click('[data-step="warenkorb"] [data-next]');
  await page.check('input[name="art"][value="abholung"]', { force: true });
  await page.click('[data-step="art"] [data-next]');
  await page.fill('[data-f="name"]', "Test Person");
  await page.fill('[data-f="telefon"]', "0151 2345678");
  await page.click('[data-step="kontakt"] [data-next]');
  await page.click('[data-step="zeit"] [data-next]');
  const href = await page.getAttribute("[data-send]", "href");
  assert.ok(href.startsWith("https://wa.me/4915100000000?text="));
  assert.ok(decodeURIComponent(href).includes("*** TEST – bitte nicht zubereiten ***"));
  await c.close();
});

test("Barrierefreiheit (Basis): Bild-Alternativen, Formular-Labels, Überschriften, Bewegung reduzierbar", { skip }, async () => {
  const { c, page } = await ctx({ reducedMotion: "reduce" });
  for (const p of PAGES) {
    await open(page, p);
    const r = await page.evaluate(() => ({
      h1: document.querySelectorAll("h1").length,
      lang: document.documentElement.lang,
      unlabeled: [...document.querySelectorAll("input, select, textarea")].filter((el) => el.type !== "hidden" && el.type !== "radio" && el.type !== "checkbox" && !(el.id && document.querySelector(`label[for="${el.id}"]`)) && !el.getAttribute("aria-label")).map((el) => el.outerHTML.slice(0, 80)),
      imgs: [...document.querySelectorAll("img:not([alt])")].length,
      btns: [...document.querySelectorAll("button")].filter((b) => !b.textContent.trim() && !b.getAttribute("aria-label")).map((b) => b.outerHTML.slice(0, 80))
    }));
    assert.equal(r.h1, 1, p + ": genau eine h1");
    assert.equal(r.lang, "de");
    assert.deepEqual(r.unlabeled, [], p);
    assert.equal(r.imgs, 0);
    assert.deepEqual(r.btns, [], p);
  }
  await open(page, "index.html");
  const w0 = await page.textContent('[data-word="a"]');
  await page.waitForTimeout(3800);
  assert.equal(await page.textContent('[data-word="a"]'), w0, "keine Animation bei reduzierter Bewegung");
  await c.close();
});
