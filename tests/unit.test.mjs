/* Unit-Tests der Kernlogik – ausführen mit:  node --test tests/unit.test.mjs
   Keine Pakete nötig (Node ≥ 18). */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const C = require("../assets/js/core.js");
const menu = JSON.parse(fs.readFileSync(new URL("../data/menu.json", import.meta.url)));
const baseConfig = JSON.parse(fs.readFileSync(new URL("../data/config.json", import.meta.url)));
const clone = (o) => JSON.parse(JSON.stringify(o));
const idx = C.normalizeMenu(menu);

/** Konfiguration „geöffnet & freigegeben“ für Tests */
function liveConfig(over = {}) {
  const c = clone(baseConfig);
  c.betrieb.modus = "geoeffnet";
  c.betreiber.name = "Test Inhaber"; c.betreiber.rechtsform = "Einzelunternehmen"; c.betreiber.email = "test@example.org";
  c.zahlung = { arten: ["Barzahlung"], hinweis: "bar bei Abholung bzw. Lieferung" };
  c.steuer = { status: "bestaetigt", kleinunternehmer: false, saetze: { speisen: 7, getraenke: 19 }, lieferkosten: "anteilig", pfand: "wie-getraenk", ausweisen: true };
  c.lieferung.orte.forEach((o) => { o.bestaetigt = true; });
  return Object.assign(c, over);
}
/** Speisekarte mit bestätigten Prüfpunkten (für Preistests) */
function confirmedIdx() {
  const m = clone(menu);
  m.produkte.forEach((p) => { (p.pruefen || []).forEach((x) => { x.sperrt = false; }); if (p.pfandCent === null) p.pfandCent = 0; });
  Object.values(m.optionsgruppen).forEach((g) => (g.pruefen || []).forEach((x) => { x.sperrt = false; }));
  return C.normalizeMenu(m);
}
const L = (p, v = "standard", s = {}, q = 1, n = "") => ({ p, v, s, q, n });
const at = (iso) => new Date(iso);

/* ------------------------------------------------------------------ */
test("Speisekarte: Struktur fehlerfrei, IDs und Artikelnummern eindeutig", () => {
  const r = C.validateMenu(menu);
  assert.deepEqual(r.errors, []);
  const ids = menu.produkte.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  const nrs = menu.produkte.filter((p) => p.nr).map((p) => p.nr);
  assert.equal(new Set(nrs).size, nrs.length);
  assert.ok(nrs.includes("96a") && nrs.includes("98b") && nrs.includes("134a") && nrs.includes("129a"), "Nummern mit Buchstaben vorhanden");
  // Artikelnummer und technische ID sind getrennt
  menu.produkte.forEach((p) => assert.ok(!/^\d+[a-z]?$/.test(p.id), "ID ist keine Artikelnummer: " + p.id));
});

test("Speisekarte: Anzahl je Kategorie entspricht dem Flyer", () => {
  const expected = { salate: 13, burger: 17, potatoes: 7, fingerfood: 15, partyplatten: 4, dips: 8, doener: 8, ueberbacken: 6, pizza: 35, partypizza: 2, nudeln: 14, indisch: 11, vegetarisch: 4, schnitzel: 5, dessert: 4, getraenke: 13 };
  const count = {};
  idx.products.forEach((p) => { count[p.kategorie] = (count[p.kategorie] || 0) + 1; });
  assert.deepEqual(count, expected);
  assert.equal(idx.products.filter((p) => p.nr).length, 153);
});

test("Speisekarte: Preise stichprobenartig mit dem Flyer abgeglichen", () => {
  const flyer = {
    "01": 490, "04": 850, "05": 950, "09": 1090, "11": 1290, "12": 1290, "14": 1890,
    "20": 550, "21": 600, "22": 600, "24": 1050, "25": 1090, "27": 1090, "28": 1150, "29": 1050, "30": 1190, "34": 1890, "35": 1050, "36": 1090, "37": 950, "38": 1290, "39": 1290,
    "50": 790, "51": 600, "56": 890, "64": 990, "65": 850, "66": 990, "73": 1850,
    "80": 120, "87": 120, "88": 50, "90": 700, "91": 790, "92": 600, "93": 850, "94": 700, "95": 1090, "96": 990, "96a": 1190,
    "97": 1250, "98": 1250, "98a": 1250, "98b": 1890, "99": 1250, "99a": 1190,
    "100": 500, "101": 790, "105": 890, "106": 940, "107": 940, "108": 990, "116": 990, "117": 940, "118": 940, "119": 1090, "121": 1090, "122": 990, "125": 990, "126": 1090, "128": 990, "129a": 990, "131": 1090, "133": 990, "134": 1090, "134a": 890,
    "135": 2800, "136": 3400, "139": 890, "140": 900, "141": 990, "142": 1090, "149": 1090, "151": 1390, "152": 1290, "153": 1290,
    "155": 300, "156": 350, "157": 1290, "158": 1490, "167": 1290, "170": 1090, "173": 1090,
    "180": 1090, "181": 1450, "182": 1450, "183": 1550, "184": 1550, "190": 390, "191": 290, "192": 390, "193": 490
  };
  const byNr = {};
  idx.products.forEach((p) => { if (p.nr) byNr[p.nr] = p; });
  for (const [nr, cent] of Object.entries(flyer)) assert.equal(byNr[nr].varianten[0].preisCent, cent, "Nr. " + nr);
  assert.deepEqual(byNr["40"].varianten.map((v) => v.preisCent), [490, 690]);
  assert.deepEqual(byNr["46"].varianten.map((v) => v.preisCent), [550, 790]);
  assert.deepEqual(byNr["72"].varianten.map((v) => v.preisCent), [3490, 4890]);
  assert.deepEqual(idx.productById["getraenk-fanta"].varianten.map((v) => v.preisCent), [225, 250, 350]);
  assert.equal(idx.productById["getraenk-red-bull"].varianten[0].preisCent, 300);
  assert.equal(idx.productById["getraenk-eistee"].varianten[0].preisCent, 450);
});

test("Speisekarte: Allergen-/Zusatzstoffkennzeichnung wie im Flyer", () => {
  const p = (id) => idx.productById[id];
  assert.deepEqual(p("burger-cheeseburgerle").allergene, ["A", "C", "G", "F", "J"]);
  assert.deepEqual(p("burger-cheeseburgerle").zusatzstoffe, ["6", "7", "8", "2"]);
  assert.deepEqual(p("finger-fruehlingsrollen").allergene, ["A"]);
  assert.deepEqual(p("finger-fruehlingsrollen").zusatzstoffe, ["6"]);
  assert.deepEqual(p("nudeln-aglio").zusatzstoffe, ["6", "9"]);
  assert.deepEqual(p("getraenk-coca-cola").allergene, ["O"]);
  assert.deepEqual(p("getraenk-uludag").zusatzstoffe, ["3", "4"]);
  assert.deepEqual(p("pizza-hackfleisch").allergene, []);
  // ungekennzeichnete bzw. widersprüchliche Gerichte sind zur Prüfung markiert
  ["pizza-hackfleisch", "burger-cheese-garnelen", "finger-calamari", "pizza-vera"].forEach((id) => assert.ok(p(id).pruefen.some((x) => x.feld === "allergene"), id));
});

test("Geldbeträge: Cent-Formatierung ohne Gleitkommafehler", () => {
  assert.equal(C.euro(0), "0,00 €");
  assert.equal(C.euro(5), "0,05 €");
  assert.equal(C.euro(1090), "10,90 €");
  assert.equal(C.euro(123456), "1.234,56 €");
  // 0,1 + 0,2 in Cent
  assert.equal(C.euro(10 + 20), "0,30 €");
  assert.ok(!/ /.test(C.euro(1234)));
});

test("Warenkorb: Varianten, Extras und Mengen werden korrekt berechnet", () => {
  const cfg = liveConfig(), ix = confirmedIdx();
  const burger = C.priceLine(L("burger-shahi-spezial-xxl", "standard", { "burger-beilage": ["wedges"], "burger-extras": ["kaese", "jalapenos"] }, 2, "ohne Zwiebeln"), ix, cfg);
  assert.equal(burger.unitCent, 1150 + 350 + 100 + 50);
  assert.equal(burger.totalCent, 2 * 1650);
  assert.deepEqual(burger.details.map((d) => d.label), ["Beilage dazu", "Extra Zusatz", "Hinweis"]);
  const pommes = C.priceLine(L("potatoes-pommes", "gross"), ix, cfg);
  assert.equal(pommes.unitCent, 690);
  const nudel = C.priceLine(L("nudeln-bolognese", "standard", { "nudel-sorte": ["penne"], "nudel-ueberbacken": ["ueberbacken"] }), ix, cfg);
  assert.equal(nudel.unitCent, 1090 + 250);
  assert.ok(nudel.allergene.includes("G"));
  const ohne = C.priceLine(L("burger-hamburgerle", "standard", { "burger-beilage": ["ohne"] }), ix, cfg);
  assert.equal(ohne.details.length, 0, "„ohne Beilage“ wird nicht aufgeführt");
  const cola = C.priceLine(L("getraenk-coca-cola", "05", {}, 3), ix, cfg);
  assert.equal(cola.totalCent, 750);
  assert.equal(cola.pfandCent, 75);
});

test("Warenkorb: ungültige Auswahl wird bereinigt, Pflichtauswahl erkannt", () => {
  const cfg = liveConfig(), ix = confirmedIdx();
  const pp = C.priceLine(L("partypizza-4-belaege", "standard", { "partypizza-belaege": ["salami", "salami", "pilze-unbekannt", "mais"] }), ix, cfg);
  assert.deepEqual(pp.sel["partypizza-belaege"], ["salami", "mais"]);
  assert.equal(pp.selectionErrors[0].missing, 2);
  const pp4 = C.priceLine(L("partypizza-4-belaege", "standard", { "partypizza-belaege": ["salami", "mais", "oliven", "ei", "tomaten"] }), ix, cfg);
  assert.equal(pp4.sel["partypizza-belaege"].length, 4, "höchstens 4");
  assert.equal(pp4.selectionErrors.length, 0);
  assert.ok(pp4.zusatzstoffe.includes("9"), "Oliven bringen Zusatzstoff 9 mit");
  assert.equal(C.priceLine(L("pizza-salami", "gibtsnicht"), ix, cfg), null);
  assert.equal(C.priceLine(L("gibtsnicht"), ix, cfg), null);
  assert.equal(C.priceLine(L("pizza-salami", "standard", {}, 0), ix, cfg), null);
  assert.equal(C.priceLine(L("pizza-salami", "standard", {}, 51), ix, cfg), null);
});

test("Warenkorb: identische Konfiguration = gleicher Schlüssel, abweichende = getrennt", () => {
  const a = C.lineKey(L("pizza-salami", "standard", {}, 1, ""));
  const b = C.lineKey(L("pizza-salami", "standard", {}, 3, "  "));
  assert.equal(a, b);
  assert.notEqual(C.lineKey(L("potatoes-pommes", "klein")), C.lineKey(L("potatoes-pommes", "gross")));
  assert.notEqual(C.lineKey(L("pizza-salami", "standard", {}, 1, "extra scharf")), a);
  const k1 = C.lineKey(L("burger-hamburgerle", "standard", { "burger-extras": ["kaese"], "burger-beilage": ["pommes"] }));
  const k2 = C.lineKey(L("burger-hamburgerle", "standard", { "burger-beilage": ["pommes"], "burger-extras": ["kaese"] }));
  assert.equal(k1, k2, "Reihenfolge der Gruppen egal");
});

test("Freigabe: Prüfpunkte sperren im Live-Modus, nicht vor der Eröffnung", () => {
  const live = liveConfig();
  assert.equal(C.productState(idx.productById["burger-chickenburgerle"], idx, live).orderable, false, "Preis unklar");
  assert.equal(C.productState(idx.productById["partypizza-4-belaege"], idx, live).orderable, false, "Belagliste unklar");
  assert.equal(C.productState(idx.productById["getraenk-ayran"], idx, live).orderable, false, "Pfand unklar");
  const burger = C.productState(idx.productById["burger-hamburgerle"], idx, live);
  assert.equal(burger.orderable, true);
  assert.deepEqual(burger.groups, [], "unbestätigte Extras ausgeblendet, Burger bleibt bestellbar");
  assert.equal(C.productState(idx.productById["pizza-salami"], idx, live).orderable, true);
  const off = clone(live); off.freigabe.sperrePruefpunkte = false;
  assert.equal(C.productState(idx.productById["burger-chickenburgerle"], idx, off).orderable, true);
});

test("Betriebsmodus und Livegang-Sperre", () => {
  assert.equal(C.siteMode(baseConfig), "pre");
  assert.equal(C.onlineOrderingEnabled(baseConfig), false);
  const live = clone(baseConfig); live.betrieb.modus = "geoeffnet";
  assert.equal(C.siteMode(live), "live");
  assert.ok(C.launchBlockers(live).length >= 4);
  assert.equal(C.onlineOrderingEnabled(live), false, "ohne Impressum/Zahlung/Steuer keine Bestellung");
  assert.equal(C.onlineOrderingEnabled(liveConfig()), true);
  const t = clone(baseConfig); t.betrieb.testmodus = { aktiv: true, whatsappNummer: "" };
  assert.equal(C.siteMode(t), "pre", "Testmodus nur mit Testnummer");
  t.betrieb.testmodus.whatsappNummer = "4915100000000";
  assert.equal(C.siteMode(t), "test");
});

test("Lieferung: Zonen, Mindestbestellwert (knapp darunter / genau), Lieferkosten", () => {
  const cfg = liveConfig(), ix = confirmedIdx();
  const priced = (cent) => [{ totalCent: cent, pfandCent: 0, qty: 1, taxUnit: { 7: cent } }];
  let t = C.totals(priced(1499), cfg, { art: "lieferung", ort: "Biberach an der Riß" });
  assert.equal(t.zone.id, "biberach"); assert.equal(t.minMissingCent, 1); assert.equal(t.feeCent, 100);
  t = C.totals(priced(1500), cfg, { art: "lieferung", ort: "Biberach an der Riß" });
  assert.equal(t.minMissingCent, 0); assert.equal(t.totalCent, 1600);
  t = C.totals(priced(2499), cfg, { art: "lieferung", ort: "Warthausen" });
  assert.equal(t.zone.id, "bis7"); assert.equal(t.minMissingCent, 1); assert.equal(t.feeCent, 200);
  t = C.totals(priced(4500), cfg, { art: "lieferung", ort: "Hochdorf" });
  assert.equal(t.zone.id, "7bis12"); assert.equal(t.minMissingCent, 0); assert.equal(t.feeCent, 300);
  t = C.totals(priced(4499), cfg, { art: "lieferung", ort: "Hochdorf" });
  assert.equal(t.minMissingCent, 1);
  // Pfand zählt nicht zum Mindestbestellwert
  const withPfand = [{ totalCent: 1400, pfandCent: 200, qty: 1, taxUnit: { 7: 1400 } }];
  assert.equal(C.totals(withPfand, cfg, { art: "lieferung", ort: "Biberach an der Riß" }).minMissingCent, 100);
  // außerhalb / unbekannter Ort
  t = C.totals(priced(9000), cfg, { art: "lieferung", ort: "Ulm" });
  assert.equal(t.zone, null); assert.equal(t.feeOpen, true);
  // Abholung: keine Lieferkosten
  t = C.totals(priced(500), cfg, { art: "abholung" });
  assert.equal(t.feeCent, 0); assert.equal(t.totalCent, 500);
  void ix;
});

test("Lieferung: nur bestätigte Orte sind bestellbar", () => {
  assert.equal(C.deliveryPlaces(baseConfig).length, 0);
  const c = clone(baseConfig); c.lieferung.orte[0].bestaetigt = true;
  assert.deepEqual(C.deliveryPlaces(c).map((o) => o.name), ["Biberach an der Riß"]);
  c.lieferung.aktiv = false;
  assert.equal(C.deliveryPlaces(c).length, 0);
});

test("Umsatzsteuer: Speisen 7 %, Getränke 19 %, Pfand wie Getränk, Lieferkosten anteilig", () => {
  const cfg = liveConfig(), ix = confirmedIdx();
  const food = [C.priceLine(L("pizza-salami"), ix, cfg)];
  let t = C.totals(food, cfg, { art: "abholung" });
  assert.deepEqual(t.tax.buckets, [{ rate: 7, grossCent: 940, netCent: 879, taxCent: 61 }]);
  const drinks = [C.priceLine(L("getraenk-coca-cola", "033", {}, 2), ix, cfg)];
  t = C.totals(drinks, cfg, { art: "abholung" });
  assert.deepEqual(t.tax.buckets, [{ rate: 19, grossCent: 500, netCent: 420, taxCent: 80 }]);
  const mixed = [C.priceLine(L("pizza-salami"), ix, cfg), C.priceLine(L("burger-shahi-spezial-xxl", "standard", { "burger-beilage": ["pommes"], "burger-extras": ["kaese"] }), ix, cfg), C.priceLine(L("getraenk-coca-cola", "05", {}, 2), ix, cfg)];
  t = C.totals(mixed, cfg, { art: "lieferung", ort: "Biberach an der Riß" });
  assert.equal(t.totalCent, 3040 + 100 + 50);
  assert.deepEqual(t.tax.buckets, [{ rate: 7, grossCent: 2624, netCent: 2452, taxCent: 172 }, { rate: 19, grossCent: 566, netCent: 476, taxCent: 90 }]);
  const sum = t.tax.buckets.reduce((s, b) => s + b.grossCent, 0);
  assert.equal(sum, t.totalCent, "keine doppelten Aufschläge: Brutto je Satz = Gesamtsumme");
  assert.equal(t.tax.ausweisbar, true);
});

test("Umsatzsteuer: Kombiangebot ohne festgelegte Aufteilung bleibt offen, § 19 UStG ohne Ausweis", () => {
  const cfg = liveConfig(), ix = confirmedIdx();
  const menue = [C.priceLine(L("menue-1-person", "standard", { "menue-burger": ["nr21"] }), ix, cfg)];
  let t = C.totals(menue, cfg, { art: "abholung" });
  assert.equal(t.tax.offenCent, 1850); assert.equal(t.tax.ausweisbar, false);
  const m2 = clone(menu); m2.produkte.find((p) => p.id === "menue-1-person").steuer.getraenkeAnteilCent = 250;
  m2.produkte.forEach((p) => (p.pruefen || []).forEach((x) => { x.sperrt = false; }));
  const ix2 = C.normalizeMenu(m2);
  t = C.totals([C.priceLine(L("menue-1-person", "standard", { "menue-burger": ["nr20"] }), ix2, cfg)], cfg, { art: "abholung" });
  assert.deepEqual(t.tax.buckets.map((b) => [b.rate, b.grossCent]), [[7, 1600], [19, 250]]);
  const klein = liveConfig(); klein.steuer.kleinunternehmer = true;
  t = C.totals([C.priceLine(L("pizza-salami"), ix, klein)], klein, { art: "abholung" });
  assert.equal(t.tax.kleinunternehmer, true); assert.deepEqual(t.tax.buckets, []); assert.equal(t.tax.ausweisbar, false);
  const unclear = clone(baseConfig);
  t = C.totals([C.priceLine(L("pizza-salami"), ix, unclear)], unclear, { art: "abholung" });
  assert.equal(t.tax.ausweisbar, false, "ohne Bestätigung kein Steuerausweis");
});

test("Öffnungszeiten: geöffnet, geschlossen, Ruhetag, Bestellschluss (Europe/Berlin)", () => {
  const cfg = liveConfig();
  const s = (iso) => C.orderingStatus(at(iso), cfg);
  assert.equal(s("2026-11-16T15:00:00Z").grund, "vor-oeffnung");          // Mo 16:00 MEZ
  assert.equal(s("2026-11-16T15:30:00Z").canOrder, true);                  // Mo 16:30
  assert.equal(s("2026-11-16T21:14:00Z").canOrder, true);                  // Mo 22:14
  assert.equal(s("2026-11-16T21:15:00Z").grund, "bestellschluss");         // Mo 22:15
  assert.equal(s("2026-11-16T21:31:00Z").grund, "geschlossen");            // Mo 22:31
  const tue = s("2026-11-17T17:00:00Z");
  assert.equal(tue.grund, "ruhetag"); assert.match(tue.text, /morgen ab 16:30/);
  assert.equal(s("2026-11-20T10:00:00Z").canOrder, true);                  // Fr 11:00
  assert.equal(s("2026-11-19T10:30:00Z").grund, "vor-oeffnung");           // Do 11:30 – erst 16:30
  assert.match(s("2026-11-16T21:20:00Z").text, /Mittwoch ab 16:30/);
});

test("Öffnungszeiten: Sommer- und Winterzeit", () => {
  const cfg = liveConfig();
  // Sommerzeit (MESZ = UTC+2): Mi 01.07.2026 16:30 MESZ = 14:30 UTC
  assert.equal(C.orderingStatus(at("2026-07-01T14:29:00Z"), cfg).canOrder, false);
  assert.equal(C.orderingStatus(at("2026-07-01T14:30:00Z"), cfg).canOrder, true);
  // Winterzeit (MEZ = UTC+1): Mi 18.11.2026 16:30 MEZ = 15:30 UTC
  assert.equal(C.orderingStatus(at("2026-11-18T14:30:00Z"), cfg).canOrder, false);
  assert.equal(C.orderingStatus(at("2026-11-18T15:30:00Z"), cfg).canOrder, true);
  // Umstellungstag So 29.03.2026 (02:00 → 03:00): 11:00 MESZ = 09:00 UTC
  assert.equal(C.orderingStatus(at("2026-03-29T08:59:00Z"), cfg).canOrder, false);
  assert.equal(C.orderingStatus(at("2026-03-29T09:00:00Z"), cfg).canOrder, true);
  // So 25.10.2026 (03:00 → 02:00): 11:00 MEZ = 10:00 UTC
  assert.equal(C.orderingStatus(at("2026-10-25T09:59:00Z"), cfg).canOrder, false);
  assert.equal(C.orderingStatus(at("2026-10-25T10:00:00Z"), cfg).canOrder, true);
  // Jahr/Monat der Referenz nach Berliner Zeit: 31.12. 23:30 UTC = 01.01. 00:30 MEZ
  assert.equal(C.yearMonth(at("2026-12-31T23:30:00Z"), "Europe/Berlin"), "202701");
});

test("Öffnungszeiten: Sonderzeiten, Feiertag, Betriebsferien, Schließung, Bestellpause", () => {
  const cfg = liveConfig();
  cfg.oeffnungszeiten.ausnahmen = [
    { datum: "2026-12-24", geschlossen: true, hinweis: "Heiligabend geschlossen" },
    { datum: "2026-11-17", zeiten: [["17:00", "21:00"]], bestellschluss: "20:30", hinweis: "Sonderöffnung" }
  ];
  cfg.oeffnungszeiten.betriebsferien = [{ von: "2027-01-04", bis: "2027-01-10", hinweis: "Betriebsferien" }];
  cfg.oeffnungszeiten.schliessungen = [{ von: "2026-11-20T18:00", bis: "2026-11-20T19:00", hinweis: "Vorübergehend geschlossen" }];
  const s = (iso) => C.orderingStatus(at(iso), cfg);
  assert.equal(s("2026-12-24T12:00:00Z").grund, "ausnahme");
  assert.equal(s("2026-11-17T17:00:00Z").canOrder, true, "Sonderöffnung am Ruhetag");
  assert.equal(s("2026-11-17T19:31:00Z").grund, "bestellschluss");
  const ferien = s("2027-01-06T12:00:00Z");
  assert.equal(ferien.grund, "betriebsferien"); assert.match(ferien.text, /11\.01\.2027|Montag/);
  const cl = s("2026-11-20T17:30:00Z");
  assert.equal(cl.grund, "schliessung"); assert.match(cl.text, /heute ab 19:00/);
  assert.equal(s("2026-11-20T18:00:00Z").canOrder, true);
  cfg.oeffnungszeiten.bestellpause = { aktiv: true, hinweis: "Gerade sehr viel los." };
  const pause = s("2026-11-20T12:00:00Z");
  assert.equal(pause.canOrder, false); assert.equal(pause.grund, "pause");
});

test("Wunschzeiten: Raster, Vorlauf, späteste Zeit, keine Vorbestellung", () => {
  const cfg = liveConfig();
  const pick = C.wishTimes(at("2026-11-16T17:07:00Z"), "abholung", cfg);   // 18:07 → +20 = 18:27 → 18:30
  assert.equal(pick[0], "18:30"); assert.equal(pick[pick.length - 1], "22:30");
  const del = C.wishTimes(at("2026-11-16T17:07:00Z"), "lieferung", cfg);   // +30 = 18:37 → 18:45
  assert.equal(del[0], "18:45");
  assert.deepEqual(C.wishTimes(at("2026-11-16T21:10:00Z"), "lieferung", cfg), [], "22:10 + 30 > 22:30");
  assert.deepEqual(C.wishTimes(at("2026-11-17T12:00:00Z"), "abholung", cfg), [], "Ruhetag: keine Zeiten");
  assert.deepEqual(C.wishTimes(at("2026-11-16T14:00:00Z"), "abholung", cfg), [], "vor Öffnung keine Vorbestellung");
});

test("Bestell-Referenz: Format, Zeichensatz, Verteilung, keine unsichere Ersatzlösung", () => {
  const nodeCrypto = globalThis.crypto;
  const ref = C.formatRef("lieferung", "202611", C.randomRefId(nodeCrypto));
  assert.match(ref, /^SHA-L-202611-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);
  assert.match(C.formatRef("abholung", "202611", "ABCDEFGH"), /^SHA-A-/);
  assert.throws(() => C.randomRefId(undefined));
  assert.throws(() => C.randomRefId({}));
  const N = 100000, seen = new Set(), freq = {};
  for (let i = 0; i < N; i++) {
    const id = C.randomRefId(nodeCrypto);
    assert.ok(C.REF_ID_RE.test(id));
    seen.add(id);
    for (const ch of id) freq[ch] = (freq[ch] || 0) + 1;
  }
  assert.equal(Object.keys(freq).length, 32);
  const expected = (N * 8) / 32;
  const chi2 = Object.values(freq).reduce((s, f) => s + (f - expected) ** 2 / expected, 0);
  assert.ok(chi2 < 70, "Gleichverteilung (χ² bei 31 FG): " + chi2.toFixed(2));
  assert.ok(seen.size >= N - 1, "praktisch keine Doppelungen in 100.000 Kennungen");
});

test("WhatsApp: Nachricht vollständig, Link im internationalen Format", () => {
  const cfg = liveConfig(), ix = confirmedIdx();
  const priced = [C.priceLine(L("pizza-salami", "standard", {}, 2), ix, cfg), C.priceLine(L("getraenk-coca-cola", "05", {}, 1), ix, cfg)];
  const sums = C.totals(priced, cfg, { art: "lieferung", ort: "Warthausen" });
  const msg = C.buildMessage({ ref: "SHA-L-202611-ABCDEFGH", art: "lieferung", name: "Erika Muster", telefon: "0151 2345678", strasse: "Hauptstr. 5", plz: "88447", ort: "Warthausen", fahrerHinweis: "Hinterhaus", zeit: "19:30", notiz: "Bitte klingeln", priced, sums }, cfg);
  ["SHAHI Küche", "SHA-L-202611-ABCDEFGH", "LIEFERUNG", "Erika Muster", "0151 2345678", "Hauptstr. 5, 88447 Warthausen", "Hinterhaus", "heute, 19:30 Uhr",
    "2 × Nr. 106 Salami – 18,80 €", "je 9,40 €", "Coca-Cola", "Größe: 0,5 l", "Pfand: 1 × 0,25 €", "Warenwert: 21,30 €", "Lieferkosten: 2,00 €", "Pfand: 0,25 €", "Gesamt: 23,55 €", "Bitte klingeln", "zahlungspflichtig"]
    .forEach((part) => assert.ok(msg.includes(part), "fehlt: " + part));
  assert.ok(!/[  ]/.test(msg));
  const pick = C.buildMessage({ ref: "SHA-A-202611-ABCDEFGH", art: "abholung", name: "A B", telefon: "0151 2345678", zeit: "asap", priced, sums: C.totals(priced, cfg, { art: "abholung" }) }, cfg);
  assert.ok(pick.includes("ABHOLUNG") && !pick.includes("Lieferkosten") && pick.includes("so schnell wie möglich"));
  const url = C.whatsappUrl(cfg.restaurant.whatsapp.nummer, msg);
  assert.ok(url.startsWith("https://wa.me/491796950047?text="));
  assert.equal(decodeURIComponent(url.split("?text=")[1]), msg);
  const anfrage = clone(cfg); anfrage.bestellung.rechtsmodell = "anfrage";
  assert.ok(C.buildMessage({ ref: "x", art: "abholung", name: "A B", telefon: "1234567", zeit: "asap", priced, sums }, anfrage).includes("Bestellanfrage"));
});

test("Kundenangaben: Pflichtfelder, Adresse, PLZ, Telefon", () => {
  const cfg = liveConfig();
  const ok = { art: "lieferung", ort: "Warthausen", strasse: "Hauptstraße 5", plz: "88447", name: "Erika Muster", telefon: "+49 151 2345678", zeit: "asap" };
  assert.deepEqual(C.validateCheckout(ok, cfg, []), {});
  assert.ok(C.validateCheckout({ ...ok, strasse: "Hauptstraße" }, cfg, []).strasse, "Hausnummer fehlt");
  assert.ok(C.validateCheckout({ ...ok, plz: "88400" }, cfg, []).plz, "PLZ passt nicht zum Ort");
  assert.ok(C.validateCheckout({ ...ok, ort: "Ulm" }, cfg, []).ort, "außerhalb");
  assert.ok(C.validateCheckout({ ...ok, telefon: "abc" }, cfg, []).telefon);
  assert.ok(C.validateCheckout({ ...ok, telefon: "12" }, cfg, []).telefon);
  assert.ok(C.validateCheckout({ ...ok, name: "" }, cfg, []).name);
  assert.ok(C.validateCheckout({ ...ok, zeit: "19:30" }, cfg, ["20:00"]).zeit);
  assert.deepEqual(C.validateCheckout({ art: "abholung", name: "Erika", telefon: "0151 2345678", zeit: "asap" }, cfg, []), {}, "Abholung ohne Adresse");
  assert.ok(C.validateCheckout({ ...ok, art: "" }, cfg, []).art);
});

test("Suche: Nummern, Umlaute und Teilbegriffe", () => {
  assert.deepEqual(C.searchProducts(idx.products, "96a", idx.catById).map((p) => p.id), ["doener-teller-beilage"]);
  assert.ok(C.searchProducts(idx.products, "duerum", idx.catById).some((p) => p.nr === "93"));
  assert.ok(C.searchProducts(idx.products, "butter chicken", idx.catById).some((p) => p.nr === "166"));
  assert.equal(C.searchProducts(idx.products, "xyzabc", idx.catById).length, 0);
});

test("Grundpreis je Liter", () => {
  assert.equal(C.unitPriceText({ preisCent: 225, volumenMl: 330 }), "6,82 €/l");
  assert.equal(C.unitPriceText({ preisCent: 350, volumenMl: 1000 }), "3,50 €/l");
  assert.equal(C.unitPriceText({ preisCent: 300, volumenMl: null }), "");
});
