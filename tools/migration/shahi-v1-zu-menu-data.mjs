#!/usr/bin/env node
/* =====================================================================
   Einmalige Datenmigration: bisherige SHAHI-Website → MINAR-Datenformat
   ---------------------------------------------------------------------
   Quelle:  data/menu.json und data/config.json der bisherigen SHAHI-Website
            (Sicherungs-Branch sicherung/shahi-vor-minar-2026-11-16, Stand 15.11.2026)
   Ziel:    public/assets/js/menu-data.js (window.SHAHI_DATA) – Aufbau wie
            menu-data.js von MINAR, erweitert um die zusätzlichen SHAHI-Felder
            (Produkt-ID, Füllmenge, Steuerart, Prüfpunkte, Flyer-Schreibweise,
            Betriebsmodus, erweiterte Öffnungszeiten, Lieferorte mit Bestätigung).

   Verlustfrei: Jedes Feld der Quelle wird übernommen oder abgebildet (siehe
   Tabelle in docs/MIGRATION.md). Preise werden von Cent in Euro umgerechnet
   (490 → 4.9); app.js rechnet intern wieder in ganzen Cent.

   Ausführen (nur einmalig bzw. zur Nachvollziehbarkeit):
       node tools/migration/shahi-v1-zu-menu-data.mjs            # liest aus dem Sicherungs-Branch
       node tools/migration/shahi-v1-zu-menu-data.mjs menu.json config.json
   Danach wird ausschließlich public/assets/js/menu-data.js gepflegt – die
   Quelldateien sind nicht mehr Teil der Website.
   ===================================================================== */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BRANCH = "sicherung/shahi-vor-minar-2026-11-16";
const read = (arg, file) => JSON.parse(arg ? fs.readFileSync(arg, "utf8")
  : execFileSync("git", ["-C", ROOT, "show", `${BRANCH}:data/${file}`], { encoding: "utf8" }));
const M = read(process.argv[2], "menu.json");
const C = read(process.argv[3], "config.json");

const eur = (c) => (c == null ? c : Number((c / 100).toFixed(2)));
const codes = (o) => [...(o.allergene || []), ...(o.zusatzstoffe || [])].join(",");
const checks = (list) => (list || []).map((x) => {
  const o = {}; if (x.feld) o.field = x.feld; o.note = x.hinweis; if (x.sperrt) o.blocks = true; return o;
});

/* ---------- Kategorien (Reihenfolge wie auf dem Flyer) ---------- */
const SLUG = { partypizza: "party-pizza", indisch: "indisch-pakistanisch", vegetarisch: "vegetarische-gerichte", schnitzel: "schnitzel-steak", dessert: "desserts" };
const ILLU_ALT = { salat: "Illustration: Salat", burger: "Illustration: Burger", pommes: "Illustration: Pommes", fingerfood: "Illustration: Fingerfood",
  platte: "Illustration: Partyplatte", dip: "Illustration: Dips", doener: "Illustration: Döner", auflauf: "Illustration: überbackenes Gericht",
  pizza: "Illustration: Pizza", partypizza: "Illustration: Party-Pizza", pasta: "Illustration: Nudelgericht", curry: "Illustration: Curry mit Reis",
  curryveg: "Illustration: vegetarisches Curry", schnitzel: "Illustration: Schnitzel mit Pommes", donut: "Illustration: Donut", getraenk: "Illustration: Getränk" };
const catOpts = {};
const categories = M.kategorien.map((c) => {
  catOpts[c.id] = c.optionen || [];
  const o = { id: c.id, slug: SLUG[c.id] || c.id, name: c.name };
  if (c.beschreibung) o.desc = c.beschreibung;
  if (c.illustration) { o.img = `illu/${c.illustration}.svg`; o.imgAlt = ILLU_ALT[c.illustration] || c.name; }
  if (c.steuer) o.tax = c.steuer;
  if (c.seo) o.seo = { title: c.seo.titel, desc: c.seo.beschreibung };
  return o;
});

/* ---------- Auswahl- und Zusatzoptionen ---------- */
const optionGroups = {};
for (const [gid, g] of Object.entries(M.optionsgruppen)) {
  const o = { label: g.label };
  if (g.kurz) o.short = g.kurz;
  o.type = g.typ === "eine" ? "one" : "many";
  if (g.optional) o.optional = true;
  if (g.min) o.min = g.min;
  if (g.max) o.max = g.max;
  if (g.min) { o.unit = "Beläge"; o.unitOne = "Belag"; }
  o.options = g.optionen.map((x) => {
    const y = { id: x.id, name: x.name };
    if (x.preisCent) y.price = eur(x.preisCent);
    const cd = codes(x); if (cd) y.codes = cd;
    if (x.neutral) y.neutral = true;
    return y;
  });
  if (g.pruefen) o.checks = checks(g.pruefen);
  optionGroups[gid] = o;
}

/* ---------- Gerichte ---------- */
const items = M.produkte.map((p) => {
  const o = { id: p.id };
  if (p.nr) o.nr = p.nr;
  o.cat = p.kategorie;
  o.name = p.name;
  if (p.nameLautFlyer) o.flyerName = p.nameLautFlyer;
  if (p.beschreibung) o.desc = p.beschreibung;
  o.prices = p.varianten
    ? p.varianten.map((v) => (v.volumenMl ? [v.name, eur(v.preisCent), v.volumenMl] : [v.name, eur(v.preisCent)]))
    : [eur(p.preisCent)];
  const cd = codes(p); if (cd) o.codes = cd;
  const opts = p.optionen || catOpts[p.kategorie];
  if (opts && opts.length) o.opts = opts;
  if (p.merkmale && p.merkmale.length) o.tags = p.merkmale;
  if (p.pfandCent !== undefined) o.pfand = eur(p.pfandCent);
  if (p.steuer) o.tax = typeof p.steuer === "string" ? p.steuer : { split: true, drinkShare: eur(p.steuer.getraenkeAnteilCent) };
  if (p.pruefen) o.checks = checks(p.pruefen);
  return o;
});

/* ---------- Restaurant, Betrieb, Zeiten, Lieferung ---------- */
const R = C.restaurant, B = C.betreiber, H = C.oeffnungszeiten, L = C.lieferung;
const [tel0, ...telMore] = R.telefon;
const restaurant = {
  name: R.name, street: R.strasse, zip: R.plz, city: R.ort, cityShort: "Biberach",
  phoneDisplay: tel0.anzeige, phoneLink: tel0.nummer, phonePurpose: tel0.zweck || "",
  phonesMore: telMore.filter((t) => t.sichtbar).map((t) => ({ display: t.anzeige, link: t.nummer, purpose: t.zweck || "" })),
  whatsappDisplay: R.whatsapp.anzeige, whatsappNumber: R.whatsapp.nummer,
  testMode: !!C.betrieb.testmodus.aktiv, testWhatsappNumber: C.betrieb.testmodus.whatsappNummer || "",
  cartDrawer: true,
  email: R.email || B.email, fax: null,
  owner: B.name, legalForm: B.rechtsform, representative: B.vertretung, vatId: B.ustId, economicId: B.wirtschaftsId,
  register: B.handelsregister, supervisoryAuthority: B.aufsichtsbehoerde, disputeResolution: B.verbraucherstreitbeilegung,
  responsibleContent: B.inhaltlichVerantwortlich,
  googleReviewUrl: "",
  mapsUrl: R.mapsUrl,
  website: C.website.basisUrl,
  offer: R.angebot
};
const operation = {
  mode: C.betrieb.modus, openingDate: C.betrieb.eroeffnungsdatum, preOpeningText: C.betrieb.vorEroeffnungText,
  blockChecks: C.freigabe.sperrePruefpunkte !== false, indexable: !!C.website.indexierbar,
  orderModel: C.bestellung.rechtsmodell, cartHours: C.bestellung.warenkorbGueltigStunden,
  maxQty: C.bestellung.maxMengeProPosition, messageWarnLength: C.bestellung.nachrichtWarnLaenge
};
const hours = {
  timezone: H.zeitzone,
  week: H.woche,
  orderUntil: { pickup: H.bestellschluss, delivery: H.bestellschluss },
  lead: { pickup: H.vorlaufMinuten.abholung, delivery: H.vorlaufMinuten.lieferung },
  latestWish: { pickup: H.spaetesteWunschzeit.abholung, delivery: H.spaetesteWunschzeit.lieferung },
  slot: H.zeitraster,
  exceptions: H.ausnahmen, holidays: H.betriebsferien, closures: H.schliessungen,
  pause: { active: !!H.bestellpause.aktiv, note: H.bestellpause.hinweis || "" },
  deliveryTimeNote: H.lieferzeitHinweis,
  confirmed: { times: H._bestaetigt.zeiten, lead: H._bestaetigt.vorlauf, latestWish: H._bestaetigt.spaetesteWunschzeit }
};
const delivery = {
  pickup: true, delivery: !!L.aktiv,
  zones: L.zonen.map((z) => ({ id: z.id, name: z.name, minOrder: eur(z.mindestbestellwertCent), fee: eur(z.lieferkostenCent),
    places: L.orte.filter((o) => o.zone === z.id).map((o) => ({ name: o.name, zip: o.plz, confirmed: !!o.bestaetigt })) })),
  notes: L.hinweise
};
const payment = { methods: C.zahlung.arten, note: C.zahlung.hinweis };
const tax = { status: C.steuer.status, smallBusiness: C.steuer.kleinunternehmer, rates: { food: C.steuer.saetze.speisen, drinks: C.steuer.saetze.getraenke },
  deliveryFee: C.steuer.lieferkosten, deposit: C.steuer.pfand, show: !!C.steuer.ausweisen };
const legend = { allergens: M.legende.allergene, additives: M.legende.zusatzstoffe, notes: M.legende.hinweise };

/* ---------- Ausgabe im Stil von MINAR (ein Gericht je Zeile) ---------- */
const KEY = /^[A-Za-z_$][\w$]*$/;
function lit(v, ind = "") {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map((x) => lit(x, ind)).join(", ") + "]";
  return "{ " + Object.entries(v).map(([k, x]) => (KEY.test(k) ? k : JSON.stringify(k)) + ": " + lit(x, ind)).join(", ") + " }";
}
function block(obj, ind) {
  return "{\n" + Object.entries(obj).map(([k, v]) => `${ind}  ${KEY.test(k) ? k : JSON.stringify(k)}: ${lit(v)}`).join(",\n") + `\n${ind}}`;
}
const byCat = {};
items.forEach((it) => (byCat[it.cat] = byCat[it.cat] || []).push(it));
const itemsJs = categories.map((c) => `    /* ${c.name.toUpperCase()} */\n` + byCat[c.id].map((it) => "    " + lit(it)).join(",\n")).join(",\n\n");

const out = `/* =====================================================================
   SHAHI Küche – zentrale Daten
   ---------------------------------------------------------------------
   Diese Datei enthält ALLE Inhalte, die sich regelmäßig ändern können:
   Betriebsmodus (Eröffnung), Restaurant- und Betreiberdaten, Öffnungszeiten,
   Lieferkonditionen, Zahlung, Steuer, Kategorien und Gerichte.
   Aufbau wie bei MINAR (menu-data.js); Layout und Logik (styles.css, app.js)
   müssen für Preis- oder Gerichtsänderungen nicht angefasst werden.

   Quelle: zwei Fotos des gedruckten SHAHI-Küche-Flyers, digitalisiert am
   15.11.2026 (bisherige SHAHI-Website), migriert am 16.11.2026 mit
   tools/migration/shahi-v1-zu-menu-data.mjs. Offene Punkte stehen bei den
   Gerichten unter „checks“ und gesammelt in docs/FREIGABELISTE.md.

   Werte mit null sind vom Betreiber noch nicht bestätigt.

   ---------------------------------------------------------------------
   Aufbau eines Gerichts:

   {
     id: "pizza-salami",          // feste Kennung (Kleinbuchstaben, Ziffern, -) – nicht ändern,
                                  //   der gespeicherte Warenkorb bezieht sich darauf
     nr: "106",                   // Artikelnummer laut Flyer (Text), Getränke ohne Nummer
     cat: "pizza",                // id aus "categories"
     name: "Salami",
     flyerName: "…",              // nur, wenn der Flyer anders schreibt (Dokumentation)
     desc: "Beschreibung laut Flyer",
     prices: [9.4]                // ein Preis in Euro …
     prices: [["klein", 4.9], ["groß", 6.9]],          // … oder Größen/Varianten
     prices: [["0,33 l", 2.25, 330]],                    // Getränke: 3. Wert = Füllmenge in ml (Grundpreis je Liter)
     codes: "A,G,6,7",            // Kennzeichnung exakt wie auf dem Flyer:
                                  //   Buchstaben = Allergene, Zahlen = Zusatzstoffe
     opts: ["nudel-sorte"],       // Auswahl/Extras aus "optionGroups"
     tags: ["vegetarisch"],       // nur, wenn der Flyer es so benennt ("vegetarisch", "scharf")
     pfand: 0.25,                 // Getränkepfand je Stück in € (separat ausgewiesen); 0 = kein Pfand,
                                  //   null = unbekannt → online nicht bestellbar
     tax: "getraenke",            // Steuerart, sonst von der Kategorie ("speisen" = 7 %, "getraenke" = 19 %);
                                  //   { split: true, drinkShare: 2.5 } = Kombiangebot mit Getränkeanteil in €
     checks: [{ field: "pfand", note: "…", blocks: true }]   // offene Prüfpunkte; blocks = im Livebetrieb
                                  //   online nicht bestellbar, bis der Punkt gelöscht ist
   }
   ===================================================================== */

window.SHAHI_DATA = {
  /* --- Betrieb ---------------------------------------------------------
     mode: "vor-eroeffnung" = Speisekarte sichtbar, keine Bestellanfragen möglich
           "geoeffnet"      = Normalbetrieb (Online-Bestellung nur, wenn Betreiber-
                              angaben, Zahlungsarten und Steuerstatus vollständig sind)
     blockChecks: true = Gerichte/Optionen mit sperrenden Prüfpunkten sind im
                  Normalbetrieb nicht online bestellbar („gerne telefonisch“)      */
  operation: ${block(operation, "  ")},

  /* --- Restaurant und Betreiber (Impressum) --- */
  restaurant: ${block(restaurant, "  ")},

  /* --- Zahlung: methods z. B. ["bar"] oder ["bar", "Karte bei Lieferung"]; note = Satz für Warenkorb/Bon --- */
  payment: ${lit(payment)},

  /* --- Umsatzsteuer (vom Betreiber mit der Steuerberatung zu bestätigen) ---
     status "bestaetigt" + smallBusiness false + show true → enthaltene USt. im Bon ausweisen;
     smallBusiness true → Hinweis nach § 19 UStG. Preise sind immer Endpreise (brutto). */
  tax: ${lit(tax)},

  menuSource: "Alle Preise in Euro. Getränkepfand und Lieferkosten werden im Warenkorb gesondert ausgewiesen.",

  /* --- Öffnungszeiten (laut Flyer, vom Betreiber zu bestätigen) ---
     week: 0 = Sonntag, 1 = Montag … 6 = Samstag; mehrere Zeitfenster je Tag möglich, [] = Ruhetag
     orderUntil: Bestellannahmeschluss je Bestellart · lead: Mindestvorbereitungszeit in Minuten
     latestWish: späteste Wunschzeit · slot: Zeitraster der Wunschzeit
     exceptions: Sonderöffnungszeiten   { date: "2026-12-24", closed: true, note: "Heiligabend geschlossen" }
                                        { date: "2026-12-31", times: [["11:00", "18:00"]], orderUntil: "17:30", note: "Silvester" }
     holidays:   Betriebsferien         { from: "2027-01-07", to: "2027-01-20", note: "Betriebsferien" }
     closures:   kurzfristige Schließung { from: "2026-12-01T18:00", to: "2026-12-01T20:00", note: "…" }
     pause:      manuelle Bestellpause  { active: true, note: "Gerade sehr viel los – bitte telefonisch bestellen." } */
  hours: ${block(hours, "  ")},

  /* --- Lieferung (Mindestbestellwert und Lieferkosten laut Flyer) ---
     Online wählbar sind nur Orte mit confirmed: true. Die Zuordnung der Orte zu den
     Entfernungszonen muss der Betreiber bestätigen (keine automatische Entfernungsberechnung). */
  delivery: {
    pickup: ${delivery.pickup},
    delivery: ${delivery.delivery},
    zones: [
${delivery.zones.map((z) => "      { id: " + JSON.stringify(z.id) + ", name: " + JSON.stringify(z.name) + ", minOrder: " + z.minOrder + ", fee: " + z.fee + ", places: [\n" +
  z.places.map((p) => "        " + lit(p)).join(",\n") + "\n      ] }").join(",\n")}
    ],
    notes: ${JSON.stringify(delivery.notes, null, 6).replace(/\n\]$/, "\n    ]")}
  },

  /* --- Legende (laut Flyer) --- */
  legend: {
    allergens: ${JSON.stringify(legend.allergens, null, 6).replace(/\n\}$/, "\n    }")},
    additives: ${JSON.stringify(legend.additives, null, 6).replace(/\n\}$/, "\n    }")},
    notes: ${JSON.stringify(legend.notes, null, 6).replace(/\n\]$/, "\n    ]")}
  },

  /* --- Auswahl- und Zusatzoptionen ---
     type "one"  = genau eine Auswahl (optional: true = mit neutraler Wahl wie „ohne Beilage“)
     type "many" = beliebig viele; max: n begrenzt, min: n = Pflichtanzahl (unit = Bezeichnung im Hinweis)
     Option: name, price (Aufpreis in €), codes (Allergene/Zusatzstoffe), neutral (nicht im Bon aufführen) */
  optionGroups: {
${Object.entries(optionGroups).map(([k, g]) => `    ${JSON.stringify(k)}: ${lit(g)}`).join(",\n")}
  },

  /* --- Kategorien (Reihenfolge wie auf dem Flyer) ---
     slug = Dateiname der Unterseite: speisekarte/<slug>.html
     img  = Bild aus assets/images/ (derzeit eigene Illustrationen, keine Produktfotos)
     seo  = Seitentitel und Beschreibung der Kategorieseite
     Neue Kategorie → danach \`node tools/build.mjs\` ausführen.        */
  categories: [
${categories.map((c) => "    " + lit(c)).join(",\n")}
  ],

  /* --- Gerichte --- */
  items: [
${itemsJs}
  ]
};
`;
const target = path.join(ROOT, "public/assets/js/menu-data.js");
fs.writeFileSync(target, out);

/* ---------- Kontrolle: nichts verloren ---------- */
const ctx = { window: {} };
(await import("node:vm")).runInNewContext(out, ctx);
const D = ctx.window.SHAHI_DATA;
const sumIn = M.produkte.reduce((n, p) => n + (p.varianten ? p.varianten.reduce((a, v) => a + v.preisCent, 0) : p.preisCent), 0);
const sumOut = D.items.reduce((n, it) => n + it.prices.reduce((a, p) => a + Math.round((Array.isArray(p) ? p[1] : p) * 100), 0), 0);
const chkIn = M.produkte.reduce((n, p) => n + (p.pruefen || []).length, 0) + Object.values(M.optionsgruppen).reduce((n, g) => n + (g.pruefen || []).length, 0);
const chkOut = D.items.reduce((n, it) => n + (it.checks || []).length, 0) + Object.values(D.optionGroups).reduce((n, g) => n + (g.checks || []).length, 0);
console.log(`${target}\n  Kategorien ${D.categories.length}/${M.kategorien.length} · Gerichte ${D.items.length}/${M.produkte.length} · Preissumme ${sumOut}/${sumIn} Cent · Prüfpunkte ${chkOut}/${chkIn} · Lieferorte ${D.delivery.zones.reduce((n, z) => n + z.places.length, 0)}/${L.orte.length}`);
if (D.items.length !== M.produkte.length || sumIn !== sumOut || chkIn !== chkOut) { console.error("Migration unvollständig!"); process.exit(1); }
