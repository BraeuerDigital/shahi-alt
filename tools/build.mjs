#!/usr/bin/env node
/* =====================================================================
   SHAHI Küche – Seitengenerator
   ---------------------------------------------------------------------
   Erzeugt alle HTML-Seiten, sitemap.xml und robots.txt aus
   data/config.json und data/menu.json. Keine Pakete nötig (Node ≥ 18).

     node tools/build.mjs

   Die Seiten werden mit Speisekarte als statischem HTML ausgeliefert
   (Suchmaschinen, ohne JavaScript lesbar). Im Browser lädt app.js die
   JSON-Daten frisch nach – Preisänderungen in menu.json wirken also
   sofort, die statischen Seiten sollten trotzdem neu erzeugt werden.
   ===================================================================== */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const C = require("../assets/js/core.js");
const V = require("../assets/js/view.js");

const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const write = (f, s) => { fs.mkdirSync(path.dirname(path.join(ROOT, f)), { recursive: true }); fs.writeFileSync(path.join(ROOT, f), s); };
const config = JSON.parse(read("data/config.json"));
const menu = JSON.parse(read("data/menu.json"));

const check = C.validateMenu(menu);
if (check.errors.length) {
  console.error("Speisekarte enthält Fehler – Build abgebrochen:\n- " + check.errors.join("\n- "));
  process.exit(1);
}
const idx = C.normalizeMenu(menu);
const R = config.restaurant;
const esc = V.esc, icon = V.icon;
const BASE_URL = config.website.basisUrl.replace(/\/$/, "");
const INDEX = config.website.indexierbar === true;
const MODE = C.siteMode(config);

/* ---------- Versionskennung gegen veraltete Browser-Caches ---------- */
const hash = (f) => crypto.createHash("sha1").update(read(f)).digest("hex").slice(0, 8);
const VER = {
  css: hash("assets/css/shahi.css"),
  core: hash("assets/js/core.js"), view: hash("assets/js/view.js"), app: hash("assets/js/app.js"),
  data: crypto.createHash("sha1").update(read("data/config.json") + read("data/menu.json")).digest("hex").slice(0, 8)
};

/* ---------- Platzhalter für fehlende Betreiberangaben ---------- */
const PH = [];
function ph(value, label) {
  if (value !== null && value !== undefined && value !== "") return esc(value);
  PH.push(label);
  return `<mark class="ph">[${esc(label)} – vom Betreiber zu ergänzen]</mark>`;
}

/* ---------- Icons (inline, ein Sprite je Seite) ---------- */
const ICONS = {
  bag: '<path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  chat: '<path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4A8 8 0 1 1 20 12z"/><path d="M9 10.5h6M9 13.5h4"/>',
  pin: '<path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  scooter: '<circle cx="6" cy="17" r="2.5"/><circle cx="18" cy="17" r="2.5"/><path d="M8.5 17h7M15.5 17L13 8h3.5l3 7M13 8H9.5"/>',
  store: '<path d="M4 10h16v10H4z"/><path d="M3 10l2-5h14l2 5"/><path d="M10 20v-5h4v5"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  pencil: '<path d="M4 20l1-4L16 5l3 3L8 19l-4 1z"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.6v.4"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  leaf: '<path d="M5 19c0-8 5-14 14-14 0 9-6 14-14 14z"/><path d="M5 19l7-7"/>',
  chili: '<path d="M8 8c-3 4-2 10 4 12 5-1 6-6 5-10-1-3-4-3-6-1"/><path d="M11 7c0-2 1-3 3-3"/>',
  copy: '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M5 15V5h10"/>',
  book: '<path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4z"/><path d="M20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z"/>',
  left: '<path d="M15 6l-6 6 6 6"/>',
  right: '<path d="M9 6l6 6-6 6"/>',
  alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.4"/>',
  pause: '<path d="M9 6v12M15 6v12"/>',
  play: '<path d="M8 5l11 7-11 7z"/>',
  external: '<path d="M14 5h5v5M19 5l-8 8M18 14v5H5V6h5"/>'
};
const SPRITE = '<svg class="sprite" aria-hidden="true" focusable="false"><defs>' +
  Object.entries(ICONS).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${v}</symbol>`).join("") +
  "</defs></svg>";

/* ---------- Logo ---------- */
const ARCH = "M0 260 L0 118 C0 74 40 56 66 44 C86 34 98 18 100 0 C102 18 114 34 134 44 C160 56 200 74 200 118 L200 260 Z";
const ARCH_INNER = "M24 260 L24 126 C24 94 52 80 74 69 C90 61 98 48 100 34 C102 48 110 61 126 69 C148 80 176 94 176 126 L176 260";
function logoMark(fg = "#FFB320", bg = "#22307A", cls = "brand-mark") {
  return `<svg class="${cls}" viewBox="-8 -30 216 292" aria-hidden="true" focusable="false"><path d="${ARCH}" fill="${fg}"/><path d="${ARCH_INNER}" fill="none" stroke="${bg}" stroke-width="8"/><text x="100" y="224" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="600" font-size="150" fill="${bg}">S</text><circle cx="100" cy="-16" r="11" fill="#E0352B"/></svg>`;
}

/* ---------- Gemeinsame Daten ---------- */
const PHONES = R.telefon.filter((t) => t.sichtbar !== false);
const MAIN_PHONE = PHONES[0];
const ADDRESS_LINE = `${R.strasse}, ${R.plz} ${R.ort}`;
const tel = (t) => `<a class="tel" href="tel:${esc(t.nummer)}">${esc(t.anzeige)}</a>`;
const waLink = `https://wa.me/${R.whatsapp.nummer}`;
const WEEK = C.weekOverview(config);
const PRODUCTS_BY_CAT = {};
idx.products.forEach((p) => { (PRODUCTS_BY_CAT[p.kategorie] = PRODUCTS_BY_CAT[p.kategorie] || []).push(p); });
const NUMBERED = idx.products.filter((p) => p.nr).length;

function hoursList(cls = "hours") {
  return `<ul class="${cls}" data-hours>` + WEEK.map((d) => `<li data-wd="${d.wd}"${d.slots.length ? "" : ' class="is-closed"'}><span>${esc(d.name)}</span><span>${esc(d.text)}</span></li>`).join("") + "</ul>" +
    `<p class="hours-note">Bestellungen nehmen wir bis ${esc(config.oeffnungszeiten.bestellschluss)} Uhr an.</p>`;
}

function zonesTable() {
  return `<table class="zones"><caption class="vh">Liefergebiete mit Mindestbestellwert und Lieferkosten</caption>
<thead><tr><th scope="col">Liefer&shy;gebiet</th><th scope="col">Mindest&shy;bestell&shy;wert</th><th scope="col">Liefer&shy;kosten</th></tr></thead><tbody>` +
    config.lieferung.zonen.map((z) => `<tr><th scope="row">${esc(z.name)}</th><td>${C.euro(z.mindestbestellwertCent)}</td><td>${C.euro(z.lieferkostenCent)}</td></tr>`).join("") +
    "</tbody></table>";
}

function ringsSvg() {
  const z = config.lieferung.zonen;
  return `<svg class="rings" viewBox="0 0 320 320" role="img" aria-labelledby="rings-t rings-d">
<title id="rings-t">Liefergebiete rund um die Bachgasse 17</title><desc id="rings-d">${z.map((x) => `${x.name}: ab ${C.euro(x.mindestbestellwertCent)}, Lieferkosten ${C.euro(x.lieferkostenCent)}`).join(". ")}. Schematische Darstellung.</desc>
<circle cx="160" cy="160" r="150" class="ring r3"/><circle cx="160" cy="160" r="104" class="ring r2"/><circle cx="160" cy="160" r="58" class="ring r1"/>
<path d="M150 150 L150 132 C150 126 154 124 157 122 C159 121 160 118 160 116 C160 118 161 121 163 122 C166 124 170 126 170 132 L170 150 Z" class="ring-pin"/>
<text x="160" y="170" class="ring-sub">Bachgasse 17</text>
<text x="160" y="200" class="ring-label">${esc(z[0].name)}</text>
<text x="160" y="248" class="ring-label">${esc(z[1].name)}</text>
<text x="160" y="294" class="ring-label">${esc(z[2].name)}</text>
</svg>`;
}

/* ---------- Seitengerüst ---------- */
function head({ title, description, canonical, base, jsonld, robots }) {
  const url = BASE_URL + canonical;
  const fullTitle = title.includes("SHAHI") ? title : `${title} | SHAHI Küche Biberach`;
  return `<!DOCTYPE html>
<html lang="de" data-base="${base}" data-version="${VER.data}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${robots || (INDEX ? "index, follow" : "noindex, nofollow")}">
<link rel="canonical" href="${esc(url)}">
<meta name="theme-color" content="#22307A">
<meta name="format-detection" content="telephone=no">
<meta property="og:type" content="website">
<meta property="og:locale" content="de_DE">
<meta property="og:site_name" content="SHAHI Küche">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${BASE_URL}/assets/img/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="SHAHI Küche – Abholung und Lieferservice in Biberach">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${base}assets/img/favicon.svg" type="image/svg+xml">
<link rel="icon" href="${base}assets/img/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="${base}assets/img/apple-touch-icon.png">
<link rel="manifest" href="${base}site.webmanifest">
<link rel="preload" href="${base}assets/fonts/fraunces-600.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${base}assets/css/shahi.css?v=${VER.css}">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>\n` : ""}</head>`;
}

function header(base, current) {
  const nav = [["speisekarte/index.html", "Speisekarte", "karte"], ["lieferung.html", "Lieferung & Abholung", "lieferung"], ["restaurant.html", "Restaurant & Kontakt", "restaurant"]];
  return `<body>
${SPRITE}
<a class="skip" href="#inhalt">Zum Inhalt springen</a>
<header class="site-head">
  <div class="wrap head-bar">
    <a class="brand" href="${base}index.html" aria-label="SHAHI Küche – zur Startseite">${logoMark()}<span class="brand-word"><b>SHAHI</b><span>Küche</span></span></a>
    <nav class="main-nav" id="hauptnavigation" aria-label="Hauptnavigation">
      <ul>${nav.map(([href, label, key]) => `<li><a href="${base}${href}"${current === key ? ' aria-current="page"' : ""}>${esc(label)}</a></li>`).join("")}</ul>
    </nav>
    <p class="status-pill" data-status-pill><span class="dot" aria-hidden="true"></span><span data-status-short>${MODE === "pre" ? "Eröffnung in Vorbereitung" : "Öffnungszeiten"}</span></p>
    <button class="cart-btn" type="button" data-cart-open hidden aria-label="Warenkorb öffnen">${icon("bag")}<span class="cart-count" data-cart-count>0</span></button>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="hauptnavigation"><span class="vh" data-nav-label>Menü öffnen</span><span class="bars" aria-hidden="true"></span></button>
  </div>
</header>
<main id="inhalt" tabindex="-1">`;
}

function footer(base) {
  return `</main>
<footer class="site-foot">
  <div class="wrap foot-grid">
    <div class="foot-brand">
      <a class="brand brand-foot" href="${base}index.html" aria-label="SHAHI Küche – zur Startseite">${logoMark()}<span class="brand-word"><b>SHAHI</b><span>Küche</span></span></a>
      <address>${esc(R.strasse)}<br>${esc(R.plz)} ${esc(R.ort)}</address>
      <p class="foot-contact">${PHONES.map((t) => tel(t)).join("<br>")}<br><a href="${waLink}" target="_blank" rel="noopener noreferrer">WhatsApp ${esc(R.whatsapp.anzeige)}</a></p>
    </div>
    <div>
      <h2 class="foot-h">Öffnungszeiten</h2>
      ${hoursList("hours hours-foot")}
    </div>
    <div>
      <h2 class="foot-h">Seiten</h2>
      <ul class="foot-links">
        <li><a href="${base}speisekarte/index.html">Speisekarte</a></li>
        <li><a href="${base}lieferung.html">Lieferung &amp; Abholung</a></li>
        <li><a href="${base}restaurant.html">Restaurant &amp; Kontakt</a></li>
        <li><a href="${base}allergene.html">Allergene &amp; Zusatzstoffe</a></li>
        <li><a href="${base}bestellinformationen.html">Bestell- &amp; Verbraucherinformationen</a></li>
        <li><a href="${base}impressum.html">Impressum</a></li>
        <li><a href="${base}datenschutz.html">Datenschutz</a></li>
      </ul>
    </div>
  </div>
  <div class="wrap foot-bottom">
    <p>© <span data-year>2026</span> SHAHI Küche, Biberach an der Riß</p>
    <p>Webdesign: <a href="${esc(config.betreiber.webdesign.url)}" target="_blank" rel="noopener">${esc(config.betreiber.webdesign.name)}</a></p>
  </div>
</footer>
<nav class="action-bar" aria-label="Schnellzugriff">
  <a href="${base}speisekarte/index.html">${icon("book")}<span>Speisekarte</span></a>
  <a href="tel:${esc(MAIN_PHONE.nummer)}">${icon("phone")}<span>Anrufen</span></a>
  <a href="${esc(R.mapsUrl)}" target="_blank" rel="noopener noreferrer" data-bar-route>${icon("pin")}<span>Route</span></a>
  <button type="button" data-cart-open data-bar-cart hidden>${icon("bag")}<span>Warenkorb</span><b class="bar-count" data-cart-count>0</b></button>
</nav>
${dialogs(base)}
<div class="toast" data-toast role="status" aria-live="polite"></div>
<noscript><p class="noscript">Für Warenkorb und Bestellung wird JavaScript benötigt. Speisekarte, Preise und Allergene sind auch ohne JavaScript lesbar. Telefonisch erreichen Sie uns unter ${esc(MAIN_PHONE.anzeige)}.</p></noscript>
<script src="${base}assets/js/core.js?v=${VER.core}" defer></script>
<script src="${base}assets/js/view.js?v=${VER.view}" defer></script>
<script src="${base}assets/js/app.js?v=${VER.app}" defer></script>
</body>
</html>
`;
}

function dialogs(base) {
  return `<dialog class="sheet item-sheet" id="item-dialog" aria-labelledby="item-title">
  <form method="dialog" class="sheet-inner" data-item-form novalidate>
    <div class="sheet-head">
      <div class="sheet-arch" aria-hidden="true"><svg viewBox="0 0 120 120"><use data-item-illu href=""></use></svg></div>
      <div class="sheet-titles"><p class="sheet-nr" data-item-nr></p><h2 id="item-title" data-item-title></h2></div>
      <button class="icon-btn" type="button" data-close aria-label="Schließen">${icon("close")}</button>
    </div>
    <div class="sheet-body">
      <p class="item-desc" data-item-desc></p>
      <div data-item-variants></div>
      <div data-item-groups></div>
      <div class="field" data-item-note-wrap>
        <label for="item-note">Hinweis zur Zubereitung <span class="opt">(optional)</span></label>
        <input id="item-note" type="text" maxlength="200" autocomplete="off" placeholder="z. B. ohne Zwiebeln" data-item-note>
      </div>
      <details class="item-allergens"><summary>Allergene &amp; Zusatzstoffe</summary><div data-item-allergens></div></details>
      <p class="item-info" data-item-info hidden></p>
    </div>
    <div class="sheet-foot" data-item-foot>
      <div class="qty" role="group" aria-label="Menge">
        <button type="button" class="qty-btn" data-qty-minus aria-label="Menge verringern">${icon("minus")}</button>
        <output data-qty aria-live="polite">1</output>
        <button type="button" class="qty-btn" data-qty-plus aria-label="Menge erhöhen">${icon("plus")}</button>
      </div>
      <button type="submit" class="btn btn-gold btn-grow" data-item-submit>In den Warenkorb</button>
    </div>
  </form>
</dialog>
<dialog class="sheet cart-sheet" id="cart-dialog" aria-labelledby="cart-title">
  <div class="sheet-inner">
    <div class="sheet-head">
      <div class="sheet-titles"><h2 id="cart-title">Warenkorb</h2><p class="sheet-nr" data-cart-sub></p></div>
      <button class="icon-btn" type="button" data-close aria-label="Schließen">${icon("close")}</button>
    </div>
    <div class="sheet-body">
      <div data-cart-lines></div>
    </div>
    <div class="sheet-foot cart-foot">
      <dl class="sums" data-cart-sums></dl>
      <a class="btn btn-gold btn-block" href="${base}bestellen.html" data-to-checkout>Zur Bestellung</a>
    </div>
  </div>
</dialog>`;
}

function page({ file, title, description, canonical, current, body, jsonld, robots }) {
  const depth = file.split("/").length - 1;
  const base = depth ? "../".repeat(depth) : "";
  write(file, head({ title, description, canonical, base, jsonld, robots }) + "\n" + header(base, current) + "\n" + body(base) + "\n" + footer(base));
  return file;
}

const restaurantLd = () => {
  const ld = {
    "@context": "https://schema.org", "@type": "Restaurant", "@id": BASE_URL + "/#restaurant",
    name: R.name, url: BASE_URL + "/", logo: BASE_URL + "/assets/img/logo-512.png", image: BASE_URL + "/assets/img/og-image.png",
    telephone: MAIN_PHONE.nummer,
    address: { "@type": "PostalAddress", streetAddress: R.strasse, postalCode: R.plz, addressLocality: R.ort, addressCountry: R.land },
    servesCuisine: ["Pizza", "Burger", "Döner", "Indisch", "Pakistanisch"],
    hasMenu: BASE_URL + "/speisekarte/"
  };
  if (config.oeffnungszeiten._bestaetigt && config.oeffnungszeiten._bestaetigt.zeiten === true) {
    const map = { 0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday" };
    ld.openingHoursSpecification = WEEK.filter((d) => d.slots.length).flatMap((d) => d.slots.map((s) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: map[d.wd], opens: s[0], closes: s[1] })));
  }
  return ld;
};

const ctxStatic = (base) => ({ idx, config, mode: MODE, ordering: false, base });
const catMeta = (c) => { const list = PRODUCTS_BY_CAT[c.id] || []; return `${list.length} ${list.length === 1 ? "Gericht" : "Gerichte"}, ab ${C.euro(Math.min(...list.map(C.minPriceCent)))}`; };
const catMetaHtml = (c) => { const list = PRODUCTS_BY_CAT[c.id] || []; return `<span>${list.length} ${list.length === 1 ? (c.id === "getraenke" ? "Getränk" : "Gericht") : (c.id === "getraenke" ? "Getränke" : "Gerichte")}</span><span>ab ${C.euro(Math.min(...list.map(C.minPriceCent))).replace(" €", "&nbsp;€")}</span>`; };
const SHAHI_ITEMS = idx.products.filter((p) => /shahi/i.test(p.name));
const files = [];

/* =====================================================================
   Startseite
   ===================================================================== */
files.push(page({
  file: "index.html", canonical: "/", current: "start",
  title: "SHAHI Küche Biberach – Pizza, Burger, Döner & Currys | Abholung und Lieferservice",
  description: "SHAHI Küche in der Bachgasse 17 in Biberach an der Riß: Pizza, Burger, Döner, Schnitzel sowie indische und pakistanische Gerichte – zum Abholen und mit Lieferservice.",
  jsonld: restaurantLd(),
  body: (base) => `
<section class="hero" aria-labelledby="hero-title">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="hero-place">${icon("pin")} ${esc(R.strasse)}, Biberach an der Riß</p>
      <h1 class="hero-title" id="hero-title" data-hero-title>
        <span class="ht-line">Von <a class="ht-word" href="${base}speisekarte/pizza.html" data-word="a">Pizza</a></span>
        <span class="ht-line">bis <a class="ht-word" href="${base}speisekarte/index.html?q=Palak" data-word="b">Palak</a>.</span>
      </h1>
      <p class="hero-lead" data-hero-lead>${MODE === "pre"
        ? "SHAHI Küche eröffnet bald in der Bachgasse 17 – mit Pizza, Burgern, Döner, Schnitzel und indischen und pakistanischen Gerichten. Zum Abholen und mit Lieferservice in Biberach."
        : "Pizza, Burger, Döner, Schnitzel und indische und pakistanische Gerichte – zum Abholen in der Bachgasse 17 oder mit Lieferung in Biberach und Umgebung."}</p>
      <div class="hero-cta">
        <a class="btn btn-gold" href="${base}speisekarte/index.html" data-hero-primary>Speisekarte ansehen</a>
        <a class="btn btn-line" href="tel:${esc(MAIN_PHONE.nummer)}">${icon("phone")} ${esc(MAIN_PHONE.anzeige)}</a>
      </div>
      <div class="opening-note" data-opening-note${MODE === "pre" ? "" : " hidden"}>
        <p><strong>Eröffnung in Vorbereitung.</strong> <span data-opening-text>${esc(config.betrieb.vorEroeffnungText)}</span></p>
      </div>
    </div>
    <div class="hero-visual" aria-hidden="true">
      <svg class="hero-arch" viewBox="-8 -34 216 296" focusable="false"><path d="${ARCH}" fill="#FFB320"/><path d="${ARCH_INNER}" fill="none" stroke="#22307A" stroke-width="6" opacity=".35"/><circle cx="100" cy="-13" r="10" fill="#E0352B"/><g class="hero-illu"><use data-hero-illu href="${base}assets/img/illustrationen.svg#pizza" x="30" y="104" width="140" height="140"></use></g></svg>
    </div>
    <button class="hero-pause" type="button" data-hero-pause hidden>${icon("pause")}<span>Wechsel anhalten</span></button>
  </div>
</section>

<section class="sec sec-karte" aria-labelledby="h-karte">
  <div class="wrap">
    <div class="sec-head">
      <h2 id="h-karte">Was darf’s sein?</h2>
      <p>${idx.categories.length} Kategorien und ${idx.products.length} Gerichte und Getränke – mit Preisen und Allergenangaben.</p>
    </div>
    <form class="menu-search menu-search-home" role="search" action="${base}speisekarte/index.html" method="get">
      <label for="q-home" class="vh">Gericht, Zutat oder Nummer suchen</label>
      <input id="q-home" name="q" type="search" placeholder="Gericht, Zutat oder Nummer" autocomplete="off">
      <button type="submit" class="btn btn-blue">${icon("search")}<span>Suchen</span></button>
    </form>
    <ul class="cat-grid">
      ${idx.categories.map((c) => `<li><a class="cat-tile" href="${base}speisekarte/${c.id}.html"><span class="cat-arch">${V.illu(base, c.illustration)}</span><b>${esc(c.name)}</b><span class="cat-meta">${catMetaHtml(c)}</span></a></li>`).join("\n      ")}
    </ul>
  </div>
</section>

<section class="sec sec-shahi" aria-labelledby="h-shahi">
  <div class="wrap">
    <div class="sec-head">
      <h2 id="h-shahi">Alles, was Shahi heißt</h2>
      <p>${SHAHI_ITEMS.length} Gerichte tragen den Namen des Hauses – quer durch die Karte.</p>
    </div>
    <ul class="shahi-strip">
      ${SHAHI_ITEMS.map((p) => `<li><a class="shahi-card" href="${base}speisekarte/${p.kategorie}.html#p-${p.id}"><span class="shahi-nr">${esc(p.nr || "")}</span><b>${esc(p.name)}</b><span class="shahi-desc">${esc(p.beschreibung || idx.catById[p.kategorie].name)}</span><span class="shahi-price">${V.priceHtml(p)}</span></a></li>`).join("\n      ")}
    </ul>
  </div>
</section>

<section class="sec sec-service" aria-labelledby="h-service">
  <div class="wrap">
    <div class="sec-head"><h2 id="h-service">Abholen oder liefern lassen</h2></div>
    <div class="service-grid">
      <article class="service-card">
        <h3>${icon("store")} Abholung</h3>
        <p>Sie holen Ihre Bestellung in der ${esc(R.strasse)} ab – ohne Lieferkosten und ohne Mindestbestellwert.</p>
        <p><a class="link-arrow" href="${esc(R.mapsUrl)}" target="_blank" rel="noopener noreferrer">Route in Google Maps öffnen ${icon("external")}</a></p>
      </article>
      <article class="service-card service-delivery">
        <h3>${icon("scooter")} Lieferung</h3>
        <div class="delivery-split">${ringsSvg()}<div>${zonesTable()}<p class="small">${esc(config.oeffnungszeiten.lieferzeitHinweis)}</p><p><a class="link-arrow" href="${base}lieferung.html">Alle Lieferbedingungen ${icon("right")}</a></p></div></div>
      </article>
    </div>
  </div>
</section>

<section class="sec sec-visit" aria-labelledby="h-visit">
  <div class="wrap visit-grid">
    <div>
      <h2 id="h-visit">Öffnungszeiten</h2>
      <p class="status-line" data-status-long>${MODE === "pre" ? "Die Öffnungszeiten gelten ab der Eröffnung." : ""}</p>
      ${hoursList()}
    </div>
    <div class="visit-contact">
      <h2>Kontakt</h2>
      <address>${esc(R.name)}<br>${esc(R.strasse)}<br>${esc(R.plz)} ${esc(R.ort)}</address>
      <ul class="contact-list">
        ${PHONES.map((t) => `<li>${icon("phone")} ${tel(t)}${t.zweck ? ` <span class="small">${esc(t.zweck)}</span>` : ""}</li>`).join("")}
        <li>${icon("chat")} <a href="${waLink}" target="_blank" rel="noopener noreferrer">WhatsApp ${esc(R.whatsapp.anzeige)}</a></li>
      </ul>
    </div>
  </div>
</section>`
}));

/* =====================================================================
   Speisekarte (gesamt + Kategorieseiten)
   ===================================================================== */
const rail = (base, current, anchors) => `<nav class="cat-rail" aria-label="Kategorien der Speisekarte" data-rail>
  <ul class="wrap">${idx.categories.map((c) => `<li><a href="${anchors ? "#" + c.id : base + "speisekarte/" + c.id + ".html"}"${current === c.id ? ' aria-current="page"' : ""}>${V.illu(base, c.illustration, "rail-illu")}<span>${esc(c.name)}</span></a></li>`).join("")}</ul>
</nav>`;

const legendSection = () => `<section class="legend" id="legende" aria-labelledby="h-legende">
  <h2 id="h-legende">Allergene &amp; Zusatzstoffe</h2>
  ${V.legendHtml(idx.legende)}
  <p class="small">Die Kennzeichnung stammt aus der aktuellen Speisekarte. Bei Gerichten mit dem Vermerk „wird geprüft“ klären wir die Angaben gerade mit unserer Küche ab. Alle Angaben auch als Übersicht: <a href="../allergene.html">Allergene &amp; Zusatzstoffe</a>.</p>
</section>`;

const priceNote = () => `<p class="price-note" data-price-note>Alle Preise in Euro. Getränke zuzüglich Pfand, soweit angegeben. Bei Lieferung kommen Lieferkosten hinzu.</p>`;

files.push(page({
  file: "speisekarte/index.html", canonical: "/speisekarte/", current: "karte",
  title: "Speisekarte – Pizza, Burger, Döner & indische Gerichte",
  description: `Die komplette Speisekarte von SHAHI Küche in Biberach: ${NUMBERED} Gerichte von Salat bis Dessert plus Getränke – mit Preisen, Varianten und Allergenangaben.`,
  body: (base) => `
<section class="page-head page-head-menu">
  <div class="wrap">
    <h1>Speisekarte</h1>
    <p>${NUMBERED} Gerichte und ${PRODUCTS_BY_CAT.getraenke.length} Getränke. Tippen Sie auf ein Gericht für Größen, Extras und alle Allergene.</p>
    <form class="menu-search" role="search" action="index.html" method="get" data-search-form>
      <label for="q" class="vh">Gericht, Zutat oder Nummer suchen</label>
      <input id="q" name="q" type="search" placeholder="Gericht, Zutat oder Nummer" autocomplete="off" data-search>
      <button type="submit" class="btn btn-gold">${icon("search")}<span>Suchen</span></button>
    </form>
    <div class="filters" role="group" aria-label="Gerichte filtern">
      <button type="button" class="chip" aria-pressed="false" data-filter="vegetarisch">${icon("leaf")} vegetarisch</button>
      <button type="button" class="chip" aria-pressed="false" data-filter="scharf">${icon("chili")} scharf</button>
    </div>
  </div>
</section>
${rail(base, null, true)}
<div class="wrap menu-wrap">
  <div class="search-results" data-search-results hidden aria-live="polite"></div>
  <div data-menu-list="alle">
    ${idx.categories.map((c) => V.categoryHtml(c, PRODUCTS_BY_CAT[c.id] || [], ctxStatic(base))).join("\n    ")}
  </div>
  ${priceNote()}
  ${legendSection()}
</div>`
}));

idx.categories.forEach((c, i) => {
  const prev = idx.categories[i - 1], next = idx.categories[i + 1];
  files.push(page({
    file: `speisekarte/${c.id}.html`, canonical: `/speisekarte/${c.id}.html`, current: "karte",
    title: `${c.seo.titel || c.name} – Speisekarte`,
    description: c.seo.beschreibung || `${c.name} bei SHAHI Küche in Biberach.`,
    body: (base) => `
<section class="page-head page-head-menu page-head-cat">
  <div class="wrap">
    <p class="crumbs"><a href="index.html">Speisekarte</a> ${icon("right")} <span>${esc(c.name)}</span></p>
    <h1>${esc(c.seo.titel || c.name)}</h1>
    <p>${esc(catMeta(c))}. ${esc(c.beschreibung || "")}</p>
  </div>
</section>
${rail(base, c.id, false)}
<div class="wrap menu-wrap">
  <div data-menu-list="${c.id}">
    ${V.categoryHtml({ ...c, beschreibung: "" }, PRODUCTS_BY_CAT[c.id] || [], ctxStatic(base), { headingLevel: 2 })}
  </div>
  <nav class="cat-pager" aria-label="Weitere Kategorien">
    ${prev ? `<a href="${prev.id}.html">${icon("left")} ${esc(prev.name)}</a>` : "<span></span>"}
    <a href="index.html">Ganze Speisekarte</a>
    ${next ? `<a href="${next.id}.html">${esc(next.name)} ${icon("right")}</a>` : "<span></span>"}
  </nav>
  ${priceNote()}
  ${legendSection()}
</div>`
  }));
});

/* =====================================================================
   Lieferung & Abholung
   ===================================================================== */
const confirmedPlaces = (config.lieferung.orte || []).filter((o) => o.bestaetigt === true);
files.push(page({
  file: "lieferung.html", canonical: "/lieferung.html", current: "lieferung",
  title: "Lieferservice & Abholung in Biberach – Liefergebiete und Mindestbestellwert",
  description: "Lieferservice von SHAHI Küche in Biberach: Liefergebiete, Mindestbestellwerte, Lieferkosten und Lieferzeit – oder Abholung in der Bachgasse 17.",
  body: (base) => `
<section class="page-head"><div class="wrap"><h1>Lieferung &amp; Abholung</h1><p>Holen Sie Ihr Essen in der ${esc(R.strasse)} ab oder lassen Sie es sich nach Hause bringen.</p></div></section>
<div class="wrap prose-wrap">
  <section class="block" aria-labelledby="h-zonen">
    <h2 id="h-zonen">Liefergebiete und Kosten</h2>
    <div class="delivery-split">${ringsSvg()}<div>${zonesTable()}
      <ul class="plain">${config.lieferung.hinweise.map((h) => `<li>${esc(h)}</li>`).join("")}</ul></div></div>
    <h3>Welche Orte gehören dazu?</h3>
    <div data-places>${confirmedPlaces.length
      ? `<ul class="place-list">${confirmedPlaces.map((o) => `<li>${esc(o.name)} <span class="small">${esc(o.plz)}</span> – ${esc((C.zoneById(config, o.zone) || {}).name || "")}</li>`).join("")}</ul><p class="small">Ihr Ort fehlt? Rufen Sie uns an – wir sagen Ihnen, ob wir liefern.</p>`
      : `<p>Die genaue Zuordnung der Orte zu den Liefergebieten veröffentlichen wir zur Eröffnung. Bis dahin beantworten wir Fragen gern telefonisch unter ${tel(MAIN_PHONE)}.</p>`}</div>
  </section>
  <section class="block" aria-labelledby="h-zeit">
    <h2 id="h-zeit">Lieferzeit</h2>
    <p>${esc(config.oeffnungszeiten.lieferzeitHinweis)}</p>
    <p>Bei der Bestellung wählen Sie „so schnell wie möglich“ oder eine Uhrzeit am selben Tag. Die Uhrzeit ist ein Wunsch – wir bestätigen sie Ihnen mit der Bestellung.</p>
  </section>
  <section class="block" aria-labelledby="h-abholung">
    <h2 id="h-abholung">Abholung</h2>
    <p>Abholung in der ${esc(ADDRESS_LINE)}. Bei Abholung fallen keine Lieferkosten an und es gibt keinen Mindestbestellwert.</p>
    <p><a class="link-arrow" href="${esc(R.mapsUrl)}" target="_blank" rel="noopener noreferrer">Route in Google Maps öffnen ${icon("external")}</a></p>
  </section>
  <section class="block" aria-labelledby="h-ablauf">
    <h2 id="h-ablauf">So läuft eine Online-Bestellung ab</h2>
    <ol class="steps">
      <li><b>Gerichte wählen.</b> Größe, Extras und Hinweise legen Sie direkt beim Gericht fest.</li>
      <li><b>Abholung oder Lieferung wählen.</b> Bei Lieferung prüfen wir Ort und Mindestbestellwert.</li>
      <li><b>Angaben und Wunschzeit eintragen.</b> Name und Telefonnummer brauchen wir für Rückfragen.</li>
      <li><b>Übersicht prüfen.</b> Alles lässt sich vor dem Absenden noch ändern.</li>
      <li><b>In WhatsApp absenden.</b> Ihre fertige Bestellung öffnet sich in WhatsApp. Erst wenn Sie dort auf Senden tippen, geht sie an uns.</li>
      <li><b>Bestätigung abwarten.</b> Wir bestätigen jede Bestellung persönlich per WhatsApp.</li>
    </ol>
    <p class="small">Die Online-Bestellung ist ab der Eröffnung freigeschaltet. Details zu Preisen, Zahlung und Vertragsschluss: <a href="${base}bestellinformationen.html">Bestell- &amp; Verbraucherinformationen</a>.</p>
  </section>
  <section class="block" aria-labelledby="h-zeiten-l"><h2 id="h-zeiten-l">Öffnungszeiten</h2>${hoursList()}</section>
</div>`
}));

/* =====================================================================
   Restaurant & Kontakt
   ===================================================================== */
files.push(page({
  file: "restaurant.html", canonical: "/restaurant.html", current: "restaurant",
  title: "Restaurant & Kontakt – SHAHI Küche, Bachgasse 17, Biberach",
  description: "SHAHI Küche in der Bachgasse 17, 88400 Biberach an der Riß: Adresse, Telefon, WhatsApp, Öffnungszeiten und Anfahrt.",
  jsonld: restaurantLd(),
  body: (base) => `
<section class="page-head"><div class="wrap"><h1>Restaurant &amp; Kontakt</h1><p>${esc(R.name)}, ${esc(ADDRESS_LINE)}</p></div></section>
<div class="wrap prose-wrap">
  <section class="block about" aria-labelledby="h-about">
    <h2 id="h-about">Über SHAHI Küche</h2>
    <p>SHAHI Küche ist ein Restaurant mit Abholung und Lieferservice in der Bachgasse 17 in Biberach an der Riß. Auf der Karte stehen Salate, Burger, Döner, Pizza und Party-Pizza, Nudeln, Schnitzel sowie indische und pakistanische Gerichte – vom Naan bis zum Butter Chicken.</p>
    <p>Alle Speisen bereiten wir frisch zu. Deshalb kann es bei viel Betrieb etwas dauern – bei der Lieferung rechnen Sie je nach Entfernung mit etwa 20 bis 90 Minuten.</p>
    <p data-opening-inline${MODE === "pre" ? "" : " hidden"}><strong>Wir eröffnen bald.</strong> ${config.betrieb.eroeffnungsdatum ? `Eröffnung: ${esc(config.betrieb.eroeffnungsdatum)}.` : "Den Termin geben wir hier bekannt, sobald er feststeht."}</p>
  </section>
  <div class="contact-grid">
    <section class="block" aria-labelledby="h-adresse">
      <h2 id="h-adresse">Adresse</h2>
      <address>${esc(R.name)}<br>${esc(R.strasse)}<br>${esc(R.plz)} ${esc(R.ort)}</address>
      <p><a class="btn btn-blue" href="${esc(R.mapsUrl)}" target="_blank" rel="noopener noreferrer">${icon("pin")} Route in Google Maps</a></p>
      <p class="small">Der Link öffnet Google Maps in einem neuen Fenster. Erst dann werden Daten an Google übertragen.</p>
    </section>
    <section class="block" aria-labelledby="h-kontakt">
      <h2 id="h-kontakt">Telefon &amp; WhatsApp</h2>
      <ul class="contact-list">
        ${PHONES.map((t) => `<li>${icon("phone")} ${tel(t)}${t.zweck ? ` <span class="small">${esc(t.zweck)}</span>` : ""}</li>`).join("")}
        <li>${icon("chat")} <a href="${waLink}" target="_blank" rel="noopener noreferrer">WhatsApp ${esc(R.whatsapp.anzeige)}</a></li>
        ${config.betreiber.email ? `<li>${icon("chat")} <a href="mailto:${esc(config.betreiber.email)}">${esc(config.betreiber.email)}</a></li>` : ""}
      </ul>
    </section>
  </div>
  <section class="block" aria-labelledby="h-zeiten"><h2 id="h-zeiten">Öffnungszeiten</h2><p class="status-line" data-status-long></p>${hoursList()}</section>
</div>`
}));

/* =====================================================================
   Bestellen (Warenkorb & Checkout)
   ===================================================================== */
files.push(page({
  file: "bestellen.html", canonical: "/bestellen.html", current: "bestellen", robots: "noindex, follow",
  title: "Bestellen – Warenkorb und Bestellübersicht",
  description: "Warenkorb und Bestellung bei SHAHI Küche in Biberach – Abholung oder Lieferung, Übermittlung per WhatsApp.",
  body: (base) => `
<section class="page-head page-head-slim"><div class="wrap"><h1>Bestellen</h1></div></section>
<div class="wrap checkout-wrap">
  <div class="notice" data-checkout-off>
    <h2>Online-Bestellung startet mit der Eröffnung</h2>
    <p>Die Speisekarte mit allen Preisen und Allergenen können Sie schon ansehen. Sobald wir geöffnet haben, bestellen Sie hier zum Abholen oder Liefern.</p>
    <p><a class="btn btn-gold" href="${base}speisekarte/index.html">Zur Speisekarte</a> <a class="btn btn-line-dark" href="tel:${esc(MAIN_PHONE.nummer)}">${icon("phone")} ${esc(MAIN_PHONE.anzeige)}</a></p>
  </div>
  <div class="checkout" data-checkout hidden>
    <ol class="stepper" data-stepper aria-label="Bestellschritte"></ol>
    <div class="checkout-grid">
      <div class="checkout-main">
        <p class="test-banner" data-test-banner hidden></p>
        <p class="alert" data-closed-banner hidden></p>

        <section class="step" data-step="warenkorb" aria-labelledby="st-warenkorb">
          <h2 id="st-warenkorb">Ihr Warenkorb</h2>
          <div data-checkout-lines></div>
          <div class="step-empty" data-checkout-empty hidden>
            <p>Ihr Warenkorb ist leer.</p>
            <p><a class="btn btn-gold" href="${base}speisekarte/index.html">Gerichte auswählen</a></p>
          </div>
          <div class="step-actions"><a class="btn btn-line-dark" href="${base}speisekarte/index.html">Weitere Gerichte</a><button type="button" class="btn btn-gold" data-next>Weiter</button></div>
        </section>

        <section class="step" data-step="art" aria-labelledby="st-art" hidden>
          <h2 id="st-art">Abholen oder liefern lassen?</h2>
          <fieldset class="mode-cards">
            <legend class="vh">Bestellart</legend>
            <label class="mode-card"><input type="radio" name="art" value="abholung" data-f="art"><span class="mode-body">${icon("store")}<b>Abholung</b><span>${esc(R.strasse)} – ohne Lieferkosten</span></span></label>
            <label class="mode-card"><input type="radio" name="art" value="lieferung" data-f="art"><span class="mode-body">${icon("scooter")}<b>Lieferung</b><span data-delivery-summary>ab ${C.euro(config.lieferung.zonen[0].mindestbestellwertCent)} Warenwert</span></span></label>
          </fieldset>
          <p class="field-error" data-err="art" hidden></p>
          <p class="info" data-art-info hidden></p>
          <div class="step-actions"><button type="button" class="btn btn-text" data-back>${icon("left")} Zurück</button><button type="button" class="btn btn-gold" data-next>Weiter</button></div>
        </section>

        <section class="step" data-step="adresse" aria-labelledby="st-adresse" hidden>
          <h2 id="st-adresse">Lieferadresse</h2>
          <div class="field">
            <label for="f-ort">Ort</label>
            <select id="f-ort" data-f="ort" autocomplete="address-level2"></select>
            <p class="field-error" data-err="ort" hidden></p>
          </div>
          <p class="info" data-zone-info hidden></p>
          <div class="field-row">
            <div class="field field-grow"><label for="f-strasse">Straße und Hausnummer</label><input id="f-strasse" type="text" data-f="strasse" autocomplete="street-address" maxlength="120"><p class="field-error" data-err="strasse" hidden></p></div>
            <div class="field field-plz"><label for="f-plz">PLZ</label><input id="f-plz" type="text" inputmode="numeric" data-f="plz" autocomplete="postal-code" maxlength="5"><p class="field-error" data-err="plz" hidden></p></div>
          </div>
          <div class="field"><label for="f-fahrer">Hinweis für den Fahrer <span class="opt">(optional)</span></label><input id="f-fahrer" type="text" data-f="fahrerHinweis" maxlength="200" placeholder="z. B. Hinterhaus, 2. OG"><p class="field-error" data-err="fahrerHinweis" hidden></p></div>
          <div class="step-actions"><button type="button" class="btn btn-text" data-back>${icon("left")} Zurück</button><button type="button" class="btn btn-gold" data-next>Weiter</button></div>
        </section>

        <section class="step" data-step="kontakt" aria-labelledby="st-kontakt" hidden>
          <h2 id="st-kontakt">Ihre Kontaktdaten</h2>
          <div class="field"><label for="f-name">Name</label><input id="f-name" type="text" data-f="name" autocomplete="name" maxlength="80"><p class="field-error" data-err="name" hidden></p></div>
          <div class="field"><label for="f-tel">Telefonnummer für Rückfragen</label><input id="f-tel" type="tel" data-f="telefon" autocomplete="tel" maxlength="40"><p class="field-error" data-err="telefon" hidden></p></div>
          <div class="field"><label for="f-notiz">Anmerkung zur Bestellung <span class="opt">(optional)</span></label><textarea id="f-notiz" data-f="notiz" rows="3" maxlength="300"></textarea><p class="field-error" data-err="notiz" hidden></p></div>
          <div class="step-actions"><button type="button" class="btn btn-text" data-back>${icon("left")} Zurück</button><button type="button" class="btn btn-gold" data-next>Weiter</button></div>
        </section>

        <section class="step" data-step="zeit" aria-labelledby="st-zeit" hidden>
          <h2 id="st-zeit">Wann möchten Sie Ihr Essen?</h2>
          <fieldset class="time-choice">
            <legend class="vh">Wunschzeit</legend>
            <label class="radio-line"><input type="radio" name="zeitart" value="asap" data-f="zeitart" checked> <span><b>So schnell wie möglich</b><span class="small" data-asap-note></span></span></label>
            <label class="radio-line"><input type="radio" name="zeitart" value="uhrzeit" data-f="zeitart"> <span><b>Heute zu einer Uhrzeit</b></span></label>
          </fieldset>
          <div class="field" data-time-field hidden><label for="f-zeit">Uhrzeit</label><select id="f-zeit" data-f="zeit"></select></div>
          <p class="field-error" data-err="zeit" hidden></p>
          <p class="small">Wir bereiten alle Speisen frisch zu. Die Uhrzeit ist ein Wunsch – wir bestätigen sie mit Ihrer Bestellung.</p>
          <div class="step-actions"><button type="button" class="btn btn-text" data-back>${icon("left")} Zurück</button><button type="button" class="btn btn-gold" data-next>Zur Übersicht</button></div>
        </section>

        <section class="step" data-step="uebersicht" aria-labelledby="st-uebersicht" hidden>
          <h2 id="st-uebersicht">Bestellübersicht</h2>
          <div class="receipt" data-receipt></div>
          <div class="legal-box" data-legal-box></div>
          <p class="alert" data-send-alert hidden></p>
          <div class="send-row">
            <a class="btn btn-gold btn-send" data-send href="#" target="_blank" rel="noopener noreferrer">${icon("chat")} <span data-send-label>Zahlungspflichtig bestellen</span></a>
            <p class="small" data-send-sub>Öffnet WhatsApp mit Ihrer fertigen Bestellung. Erst wenn Sie dort auf Senden tippen, geht sie an uns.</p>
          </div>
          <div class="sent-box" data-sent hidden>
            <h3>WhatsApp wurde geöffnet</h3>
            <p>Bitte senden Sie die Nachricht in WhatsApp ab, falls noch nicht geschehen. Ihre Bestellung ist erst angenommen, wenn wir sie Ihnen per WhatsApp bestätigen.</p>
            <p>Bitte senden Sie dieselbe Bestellung nur einmal. Ihre Referenz: <b data-sent-ref></b></p>
            <p class="sent-actions"><button type="button" class="btn btn-line-dark" data-new-order>Neue Bestellung beginnen</button></p>
          </div>
          <details class="fallback">
            <summary>WhatsApp öffnet sich nicht?</summary>
            <p>Kopieren Sie den Bestelltext und senden Sie ihn an ${esc(R.whatsapp.anzeige)} – oder rufen Sie uns an: ${tel(MAIN_PHONE)}.</p>
            <p><button type="button" class="btn btn-line-dark" data-copy-message>${icon("copy")} Bestelltext kopieren</button></p>
            <label for="msg-preview" class="vh">Bestelltext</label>
            <textarea id="msg-preview" class="msg-preview" readonly rows="10" data-message-preview></textarea>
          </details>
          <div class="step-actions"><button type="button" class="btn btn-text" data-back>${icon("left")} Zurück</button></div>
        </section>
      </div>
      <aside class="checkout-side" aria-label="Zusammenfassung">
        <div class="side-card">
          <h2>Zusammenfassung</h2>
          <dl class="sums" data-side-sums></dl>
          <p class="ref-line">Referenz <b data-ref></b></p>
          <p class="small">Die Referenz hilft uns bei Rückfragen. Sie ist keine Bestätigung.</p>
          <p><button type="button" class="btn btn-text btn-small" data-clear-all>${icon("trash")} Warenkorb und Angaben löschen</button></p>
        </div>
      </aside>
    </div>
  </div>
</div>`
}));

/* =====================================================================
   Allergene & Zusatzstoffe
   ===================================================================== */
files.push(page({
  file: "allergene.html", canonical: "/allergene.html", current: "",
  title: "Allergene & Zusatzstoffe – Übersicht aller Gerichte",
  description: "Allergen- und Zusatzstoffkennzeichnung aller Gerichte und Getränke von SHAHI Küche in Biberach.",
  body: (base) => `
<section class="page-head"><div class="wrap"><h1>Allergene &amp; Zusatzstoffe</h1><p>Die Kennzeichnung aller Gerichte und Getränke auf einen Blick.</p></div></section>
<div class="wrap prose-wrap">
  <section class="block">${V.legendHtml(idx.legende)}
    <p>Gerichte mit dem Vermerk <span class="codes-check">wird geprüft</span> stimmen wir gerade mit unserer Küche ab – zum Beispiel, wenn eine Zutat in der Beschreibung steht, aber nicht gekennzeichnet ist. Bitte fragen Sie bei Allergien oder Unverträglichkeiten immer vor der Bestellung nach: ${tel(MAIN_PHONE)}.</p>
    <p>Extras und Beilagen können weitere Allergene enthalten. Die Angaben zu gewählten Extras sehen Sie beim Gericht und im Warenkorb.</p>
  </section>
  ${idx.categories.map((c) => `<section class="block allergen-cat" aria-labelledby="ac-${c.id}"><h2 id="ac-${c.id}">${esc(c.name)}</h2>
  <div class="table-scroll"><table class="allergen-table"><thead><tr><th scope="col">Nr.</th><th scope="col">Gericht</th><th scope="col">Allergene</th><th scope="col">Zusatzstoffe</th></tr></thead><tbody>
  ${(PRODUCTS_BY_CAT[c.id] || []).map((p) => `<tr><td>${esc(p.nr || "–")}</td><th scope="row">${esc(p.name)}${p.pruefen.some((x) => x.feld === "allergene") ? ' <span class="codes-check">wird geprüft</span>' : ""}</th><td>${p.allergene.length ? p.allergene.map((a) => `<abbr title="${esc(idx.legende.allergene[a])}">${esc(a)}</abbr>`).join(", ") : "–"}</td><td>${p.zusatzstoffe.length ? p.zusatzstoffe.map((z) => `<abbr title="${esc(idx.legende.zusatzstoffe[z])}">${esc(z)}</abbr>`).join(", ") : "–"}</td></tr>`).join("\n  ")}
  </tbody></table></div></section>`).join("\n  ")}
  <section class="block"><h2>Kennzeichnung bei Extras</h2>
  ${Object.entries(idx.groups).filter(([, g]) => g.optionen.some((o) => (o.allergene || []).length || (o.zusatzstoffe || []).length)).map(([, g]) => `<p><b>${esc(g.label)}:</b> ${g.optionen.filter((o) => (o.allergene || []).length || (o.zusatzstoffe || []).length).map((o) => `${esc(o.name)} (${[...(o.allergene || []), ...(o.zusatzstoffe || [])].join(", ")})`).join("; ")}</p>`).join("")}
  </section>
</div>`
}));

/* =====================================================================
   Bestell- & Verbraucherinformationen
   ===================================================================== */
const op = config.betreiber;
const st = config.steuer;
const taxSentence = st.status === "bestaetigt" && st.kleinunternehmer === true
  ? "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet. Alle Preise sind Endpreise."
  : st.status === "bestaetigt" && st.kleinunternehmer === false
    ? "Alle Preise sind Endpreise in Euro und enthalten die gesetzliche Umsatzsteuer (Speisen 7 %, Getränke 19 %)."
    : ph(null, "Hinweis zur Umsatzsteuer (Regelbesteuerung „inkl. USt.“ oder Kleinunternehmer nach § 19 UStG)");
const legalModel = config.bestellung.rechtsmodell;
files.push(page({
  file: "bestellinformationen.html", canonical: "/bestellinformationen.html", current: "",
  title: "Bestell- & Verbraucherinformationen",
  description: "Informationen zu Bestellung, Preisen, Pfand, Lieferung, Zahlung und Vertragsschluss bei SHAHI Küche in Biberach.",
  body: (base) => `
<section class="page-head"><div class="wrap"><h1>Bestell- &amp; Verbraucher&shy;informationen</h1><p>Was Sie vor einer Bestellung wissen sollten.</p></div></section>
<div class="wrap prose-wrap legal">
  <p class="draft-note">Entwurf – vor dem Livegang rechtlich prüfen lassen. Markierte Stellen ergänzt der Betreiber.</p>
  <h2>Anbieter</h2>
  <p>${ph(op.name, "Name des Inhabers / Firma")}${op.rechtsform ? ", " + esc(op.rechtsform) : ""}, handelnd unter „${esc(op.firma)}“<br>${esc(op.anschrift)}<br>Telefon: ${tel(MAIN_PHONE)}<br>E-Mail: ${op.email ? `<a href="mailto:${esc(op.email)}">${esc(op.email)}</a>` : ph(null, "E-Mail-Adresse")}</p>

  <h2>Angebot und wesentliche Merkmale</h2>
  <p>Wir bieten frisch zubereitete Speisen und Getränke zur Abholung und zur Lieferung an. Bezeichnung, Beschreibung, Größen und Allergenkennzeichnung jedes Gerichts finden Sie in der <a href="${base}speisekarte/index.html">Speisekarte</a> und in der <a href="${base}allergene.html">Allergenübersicht</a>. Die Fotos und Illustrationen auf dieser Website sind keine Produktfotos.</p>

  <h2>Preise, Pfand und Lieferkosten</h2>
  <p>${taxSentence}</p>
  <p>Für Getränke in Einwegverpackungen wird Pfand berechnet, wenn es beim Getränk angegeben ist. Das Pfand steht in der Speisekarte beim Getränk und wird im Warenkorb gesondert ausgewiesen.</p>
  <p>Bei Lieferung kommen Lieferkosten je nach Liefergebiet hinzu. Mindestbestellwerte beziehen sich auf den Warenwert ohne Lieferkosten und Pfand.</p>
  ${zonesTable()}

  <h2>Lieferbeschränkungen</h2>
  <p>Wir liefern nur innerhalb unseres Liefergebiets (siehe <a href="${base}lieferung.html">Lieferung &amp; Abholung</a>). Liegt Ihre Adresse außerhalb, ist online nur die Abholung möglich. Bestellungen nehmen wir während der Öffnungszeiten bis ${esc(config.oeffnungszeiten.bestellschluss)} Uhr an. Vorbestellungen außerhalb der Öffnungszeiten sind derzeit nicht möglich.</p>
  <p>${esc(config.oeffnungszeiten.lieferzeitHinweis)}</p>

  <h2>Zahlung</h2>
  <p>${config.zahlung.arten ? esc(config.zahlung.arten.join(", ")) + (config.zahlung.hinweis ? ". " + esc(config.zahlung.hinweis) : "") : ph(null, "Akzeptierte Zahlungsarten (z. B. bar bei Abholung/Lieferung, Karte)")}</p>
  <p>Eine Zahlung über diese Website findet nicht statt.</p>

  <h2>So kommt der Vertrag zustande</h2>
  <ol class="steps">
    <li>Sie stellen Ihre Gerichte in den Warenkorb und wählen Abholung oder Lieferung.</li>
    <li>Sie geben Ihre Kontaktdaten, bei Lieferung Ihre Adresse, und eine Wunschzeit ein.</li>
    <li>In der Bestellübersicht prüfen Sie alle Angaben. Über „Ändern“ und „Zurück“ korrigieren Sie Eingabefehler jederzeit.</li>
    <li>Mit der Schaltfläche „${legalModel === "anfrage" ? "Bestellanfrage senden" : "Zahlungspflichtig bestellen"}“ öffnet sich WhatsApp mit Ihrer fertigen Nachricht. Auf dem Weg dorthin wird noch nichts an uns übermittelt.</li>
    <li>Erst wenn Sie die Nachricht in WhatsApp absenden, erhalten wir Ihre ${legalModel === "anfrage" ? "Bestellanfrage" : "Bestellung"}. ${legalModel === "anfrage" ? "" : "Damit geben Sie ein verbindliches Angebot ab."}</li>
    <li>Der Vertrag kommt zustande, wenn wir Ihre Bestellung per WhatsApp bestätigen. Können wir nicht liefern (z. B. bei Überlastung), sagen wir Ihnen das ebenfalls per WhatsApp.</li>
  </ol>
  <p>Vertragssprache ist Deutsch. Den Bestelltext speichern wir nicht auf dieser Website; er bleibt als Nachricht in Ihrem WhatsApp-Chatverlauf. Wie wir Bestellungen intern aufbewahren, steht in der <a href="${base}datenschutz.html">Datenschutzerklärung</a>.</p>

  <h2>Widerrufsrecht</h2>
  <p>${ph(null, "Angaben zum Widerrufsrecht bzw. zu den gesetzlichen Ausnahmen – rechtlich zu prüfen (u. a. § 312g Abs. 2 BGB, Widerrufsfunktion nach § 356a BGB seit 19.06.2026)")}</p>

  <h2>Allergene</h2>
  <p>Allergene und Zusatzstoffe sind bei jedem Gericht angegeben. Bei Allergien oder Unverträglichkeiten fragen Sie bitte vor der Bestellung telefonisch nach.</p>

  <h2>Verbraucherstreitbeilegung</h2>
  <p>${op.verbraucherstreitbeilegung ? esc(op.verbraucherstreitbeilegung) : ph(null, "Angabe nach § 36 VSBG, soweit erforderlich – rechtlich zu prüfen")}</p>

  <h2>Kontakt bei Fragen und Beschwerden</h2>
  <p>Telefon ${tel(MAIN_PHONE)}, WhatsApp <a href="${waLink}" target="_blank" rel="noopener noreferrer">${esc(R.whatsapp.anzeige)}</a>${op.email ? `, E-Mail <a href="mailto:${esc(op.email)}">${esc(op.email)}</a>` : ""}.</p>
</div>`
}));

/* =====================================================================
   Impressum
   ===================================================================== */
files.push(page({
  file: "impressum.html", canonical: "/impressum.html", current: "",
  title: "Impressum", description: "Impressum von SHAHI Küche, Bachgasse 17, 88400 Biberach an der Riß.",
  body: (base) => `
<section class="page-head page-head-slim"><div class="wrap"><h1>Impressum</h1></div></section>
<div class="wrap prose-wrap legal">
  <p class="draft-note">Entwurf – markierte Angaben fehlen noch. Ohne vollständiges Impressum darf die Seite nicht öffentlich betrieben werden.</p>
  <h2>Angaben gemäß § 5 DDG</h2>
  <p>${ph(op.name, "Vollständiger Name des Inhabers bzw. Firma laut Gewerbeanmeldung/Register")}<br>
  ${op.rechtsform ? esc(op.rechtsform) : ph(null, "Rechtsform (z. B. Einzelunternehmen, GmbH)")}${op.firma ? `, handelnd unter „${esc(op.firma)}“` : ""}<br>
  ${esc(R.strasse)}<br>${esc(R.plz)} ${esc(R.ort)}<br>Deutschland</p>
  ${op.vertretung ? `<p>Vertreten durch: ${esc(op.vertretung)}</p>` : `<p>Vertretungsberechtigt: ${ph(null, "nur bei Gesellschaften – Geschäftsführer/Gesellschafter; sonst diesen Absatz löschen")}</p>`}
  <h2>Kontakt</h2>
  <p>Telefon: ${tel(MAIN_PHONE)}<br>WhatsApp: <a href="${waLink}" target="_blank" rel="noopener noreferrer">${esc(R.whatsapp.anzeige)}</a><br>E-Mail: ${op.email ? `<a href="mailto:${esc(op.email)}">${esc(op.email)}</a>` : ph(null, "E-Mail-Adresse")}</p>
  <h2>Register und Steuer</h2>
  <p>Handelsregister: ${op.handelsregister ? esc(op.handelsregister) : ph(null, "Registergericht und Nummer – nur falls eingetragen, sonst Zeile löschen")}<br>
  Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: ${op.ustId ? esc(op.ustId) : ph(null, "USt-IdNr. – nur falls vorhanden, sonst Zeile löschen")}<br>
  Wirtschafts-Identifikationsnummer: ${op.wirtschaftsId ? esc(op.wirtschaftsId) : ph(null, "W-IdNr. – nur falls bereits zugeteilt, sonst Zeile löschen")}</p>
  <h2>Aufsichtsbehörde</h2>
  <p>${op.aufsichtsbehoerde ? esc(op.aufsichtsbehoerde) : ph(null, "nur falls eine behördliche Zulassung nötig ist (rechtlich zu prüfen), sonst Abschnitt löschen")}</p>
  <h2>Verbraucherstreitbeilegung</h2>
  <p>${op.verbraucherstreitbeilegung ? esc(op.verbraucherstreitbeilegung) : ph(null, "Angabe nach § 36 VSBG, soweit erforderlich – rechtlich zu prüfen")}</p>
  <h2>Verantwortlich für den Inhalt</h2>
  <p>${op.inhaltlichVerantwortlich ? esc(op.inhaltlichVerantwortlich) : ph(null, "Name, Anschrift – nur falls redaktionelle Inhalte angeboten werden (§ 18 Abs. 2 MStV), sonst Abschnitt löschen")}</p>
  <h2>Gestaltung und Umsetzung</h2>
  <p><a href="${esc(op.webdesign.url)}" target="_blank" rel="noopener">${esc(op.webdesign.name)}</a></p>
  <h2>Bildnachweis</h2>
  <p>Logo, Illustrationen und Icons: eigene Gestaltung für SHAHI Küche (${esc(op.webdesign.name)}). Schrift „Fraunces“ unter der SIL Open Font License 1.1.</p>
</div>`
}));

/* =====================================================================
   Datenschutzerklärung
   ===================================================================== */
files.push(page({
  file: "datenschutz.html", canonical: "/datenschutz.html", current: "",
  title: "Datenschutzerklärung", description: "Datenschutzerklärung von SHAHI Küche: Hosting, Warenkorb, Bestellung per WhatsApp, Kontakt und Ihre Rechte.",
  body: (base) => `
<section class="page-head page-head-slim"><div class="wrap"><h1>Datenschutzerklärung</h1></div></section>
<div class="wrap prose-wrap legal">
  <p class="draft-note">Entwurf, abgestimmt auf die technisch eingesetzten Dienste (Stand: ${esc(menu.stand)}). Vor dem Livegang fachlich prüfen lassen; markierte Angaben ergänzt der Betreiber.</p>

  <h2>1. Verantwortlicher</h2>
  <p>${ph(op.name, "Name des Inhabers / Firma")}<br>${esc(R.strasse)}, ${esc(R.plz)} ${esc(R.ort)}<br>Telefon: ${tel(MAIN_PHONE)}<br>E-Mail: ${op.email ? `<a href="mailto:${esc(op.email)}">${esc(op.email)}</a>` : ph(null, "E-Mail-Adresse")}</p>
  <p>Ein Datenschutzbeauftragter ist ${ph(null, "nach Prüfung: nicht benannt, da nicht erforderlich – oder Kontaktdaten angeben")}.</p>

  <h2>2. Überblick</h2>
  <p>Diese Website setzt keine Cookies, keine Analyse- oder Werbedienste, keine Social-Media-Plugins, keine eingebetteten Karten und keine Schriften fremder Server ein. Alle Dateien werden von unserem Hoster ausgeliefert. Personenbezogene Daten verarbeiten wir nur, soweit es für die Bereitstellung der Website, Ihre Bestellung oder Ihre Kontaktaufnahme nötig ist.</p>

  <h2>3. Hosting und Server-Protokolle</h2>
  <p>Die Website wird über GitHub Pages bereitgestellt, einen Dienst der GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA. Beim Aufruf der Website verarbeitet GitHub technisch notwendige Daten, insbesondere Ihre IP-Adresse, Datum und Uhrzeit, die aufgerufene Seite, Browsertyp und Betriebssystem. Nach Angaben von GitHub wird die IP-Adresse der Besucher von GitHub-Pages-Seiten zu Sicherheitszwecken protokolliert und gespeichert. Wir selbst erhalten diese Protokolle nicht.</p>
  <p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer sicheren und stabilen Bereitstellung der Website). Dabei kann eine Übermittlung in die USA stattfinden. ${ph(null, "Grundlage der Drittlandübermittlung prüfen und angeben (z. B. Zertifizierung nach EU-US Data Privacy Framework oder Standardvertragsklauseln) sowie Auftragsverarbeitung mit GitHub")}. Weitere Informationen: Datenschutzerklärung von GitHub (<a href="https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener noreferrer">docs.github.com</a>).</p>

  <h2>4. Speicherung im Browser (Warenkorb)</h2>
  <p>Damit Ihr Warenkorb beim Wechsel zwischen den Seiten erhalten bleibt, speichern wir ihn im lokalen Speicher Ihres Browsers (localStorage, Schlüssel <code>shahi-warenkorb-v1</code>): gewählte Gerichte, Größen, Extras, Hinweise zum Gericht, Mengen, den Zeitpunkt der letzten Änderung und die Bestell-Referenz. Name, Telefonnummer und Adresse sind dort nicht enthalten. Der Warenkorb wird nach ${esc(config.bestellung.warenkorbGueltigStunden)} Stunden ohne Änderung beim nächsten Aufruf gelöscht, ebenso über „Warenkorb und Angaben löschen“ oder „Neue Bestellung beginnen“.</p>
  <p>Ihre Eingaben im Bestellformular (Bestellart, Ort, Adresse, Hinweise, Name, Telefonnummer, Anmerkung) speichern wir nur für die Dauer der Browsersitzung im sessionStorage (Schlüssel <code>shahi-angaben-v1</code>). Sie werden gelöscht, wenn Sie den Tab schließen oder die Angaben löschen.</p>
  <p>Diese Daten verlassen Ihr Gerät nicht, bis Sie die Bestellung selbst an WhatsApp übergeben. Die Speicherung ist für den von Ihnen gewünschten Warenkorb unbedingt erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG); Rechtsgrundlage der Verarbeitung ist Art. 6 Abs. 1 lit. b DSGVO.</p>

  <h2>5. Bestellung über WhatsApp</h2>
  <p>Am Ende der Bestellung erzeugt die Website einen Link zu WhatsApp (<code>wa.me</code>) mit Ihrer vorbereiteten Bestellung. Wenn Sie auf „${legalModel === "anfrage" ? "Bestellanfrage senden" : "Zahlungspflichtig bestellen"}“ tippen, verlassen Sie unsere Website: Der Bestelltext – einschließlich Name, Telefonnummer, gegebenenfalls Lieferadresse, Wunschzeit, Bestellpositionen, Beträge und Bestell-Referenz – wird dabei als Teil des Links an WhatsApp übergeben. An uns gesendet wird die Nachricht erst, wenn Sie sie in WhatsApp selbst absenden.</p>
  <p>WhatsApp wird angeboten von der WhatsApp Ireland Limited, Merrion Road, Dublin 4, D04 X2K5, Irland. Dabei kann eine Übermittlung an Meta Platforms, Inc. in den USA erfolgen. Für die Nutzung von WhatsApp gelten die Bedingungen und die Datenschutzrichtlinie von WhatsApp. ${ph(null, "Angaben zur eigenen WhatsApp-Nutzung: WhatsApp oder WhatsApp Business, verwendetes Gerät, Zugriff durch Mitarbeitende, Löschfristen der Chats")}</p>
  <p>Wir verarbeiten Ihre Bestelldaten, um die Bestellung zu bestätigen, zuzubereiten, auszuliefern bzw. zur Abholung bereitzustellen und bei Rückfragen Kontakt aufzunehmen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertrag und vorvertragliche Maßnahmen). Bestelldaten bewahren wir auf, solange es für die Abwicklung nötig ist, und darüber hinaus nur, soweit gesetzliche Aufbewahrungspflichten bestehen (Art. 6 Abs. 1 lit. c DSGVO). ${ph(null, "konkrete Lösch- bzw. Aufbewahrungsfristen")}</p>
  <p>Wenn Sie WhatsApp nicht nutzen möchten, können Sie telefonisch bestellen.</p>

  <h2>6. Kontakt per Telefon, WhatsApp oder E-Mail</h2>
  <p>Wenn Sie uns anrufen, uns über WhatsApp schreiben oder eine E-Mail senden, verarbeiten wir Ihre Angaben (z. B. Telefonnummer, Name, Inhalt der Anfrage), um Ihr Anliegen zu bearbeiten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, sofern es um eine Bestellung geht, sonst Art. 6 Abs. 1 lit. f DSGVO. Die Daten löschen wir, wenn sie für die Bearbeitung nicht mehr erforderlich sind und keine Aufbewahrungspflichten bestehen. ${ph(null, "E-Mail-Anbieter angeben, falls relevant")}</p>

  <h2>7. Links zu Google Maps und anderen Websites</h2>
  <p>Für die Anfahrt verlinken wir auf Google Maps. Es ist keine Karte eingebunden; Daten werden erst an Google übertragen, wenn Sie den Link anklicken und Google Maps sich öffnet. Dann gilt die Datenschutzerklärung von Google. Dasselbe gilt für andere externe Links (z. B. WhatsApp, Webdesign-Hinweis).</p>

  <h2>8. Empfänger</h2>
  <p>Empfänger Ihrer Daten sind – je nach Nutzung – unser Hoster GitHub, WhatsApp bzw. Meta bei Bestellung oder Kontakt über WhatsApp sowie gegebenenfalls ${ph(null, "weitere Empfänger, z. B. Steuerberatung, Lieferfahrer/Lieferdienst")}.</p>

  <h2>9. Ihre Rechte</h2>
  <p>Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen Verarbeitungen auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO (Art. 21). Wenden Sie sich dazu an die oben genannten Kontaktdaten.</p>
  <p>Sie können sich bei einer Datenschutz-Aufsichtsbehörde beschweren, zum Beispiel beim Landesbeauftragten für den Datenschutz und die Informationsfreiheit Baden-Württemberg (<a href="https://www.baden-wuerttemberg.datenschutz.de" target="_blank" rel="noopener noreferrer">baden-wuerttemberg.datenschutz.de</a>).</p>

  <h2>10. Pflicht zur Bereitstellung</h2>
  <p>Für eine Bestellung benötigen wir Ihren Namen, Ihre Telefonnummer und bei Lieferung Ihre Adresse. Ohne diese Angaben können wir die Bestellung nicht ausführen. Eine automatisierte Entscheidungsfindung oder Profilbildung findet nicht statt.</p>
</div>`
}));

/* =====================================================================
   404 (eigenständig, funktioniert unter jedem Pfad)
   ===================================================================== */
write("404.html", `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Seite nicht gefunden | SHAHI Küche Biberach</title><meta name="robots" content="noindex">
<meta name="theme-color" content="#22307A">
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#22307A;color:#fff;font:400 1.0625rem/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;text-align:center;padding:2rem}
svg{width:96px;height:auto;margin:0 auto 1.5rem;display:block}h1{font:600 2.2rem/1.1 Georgia,serif;margin:0 0 .75rem}p{max-width:34rem;margin:0 auto 1.25rem}
a{display:inline-block;margin:.25rem;padding:.8rem 1.4rem;border-radius:999px;background:#FFB320;color:#22307A;font-weight:700;text-decoration:none}a.l{background:transparent;color:#fff;box-shadow:inset 0 0 0 2px #fff}a:focus-visible{outline:3px solid #fff;outline-offset:3px}
</style></head><body><main>
${logoMark().replace('class="brand-mark"', 'class="m"')}
<h1>Diese Seite gibt es nicht.</h1>
<p>Vielleicht hat sich die Adresse geändert. Die Speisekarte und alle Infos finden Sie auf der Startseite.</p>
<p><a id="home" href="/">Zur Startseite</a><a id="menu" class="l" href="/speisekarte/">Zur Speisekarte</a></p>
</main><script>
/* Auf GitHub Pages ohne eigene Domain liegt die Seite unter /&lt;repo&gt;/ – Links passend setzen */
(function(){var m=location.pathname.match(/^\\/([^\\/]+)\\//),base="/";if(location.hostname.slice(-10)===".github.io"&&m)base="/"+m[1]+"/";document.getElementById("home").href=base;document.getElementById("menu").href=base+"speisekarte/";})();
</script></body></html>
`);

/* =====================================================================
   sitemap.xml, robots.txt, Web-Manifest
   ===================================================================== */
const sitemapPaths = ["/", "/speisekarte/", ...idx.categories.map((c) => `/speisekarte/${c.id}.html`), "/lieferung.html", "/restaurant.html", "/allergene.html", "/bestellinformationen.html", "/impressum.html", "/datenschutz.html"];
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapPaths.map((p) => `  <url><loc>${BASE_URL}${p}</loc><lastmod>${menu.stand}</lastmod></url>`).join("\n")}
</urlset>
`);
write("robots.txt", INDEX
  ? `User-agent: *\nAllow: /\nDisallow: /bestellen.html\nDisallow: /docs/\nDisallow: /tests/\nDisallow: /tools/\n\nSitemap: ${BASE_URL}/sitemap.xml\n`
  : `# Vor dem Livegang: Seiten tragen „noindex“. Crawler dürfen lesen, damit sie das noindex sehen.\nUser-agent: *\nAllow: /\n`);
write("site.webmanifest", JSON.stringify({
  name: "SHAHI Küche Biberach", short_name: "SHAHI", lang: "de", start_url: "./", display: "browser",
  background_color: "#22307A", theme_color: "#22307A",
  icons: [{ src: "assets/img/logo-192.png", sizes: "192x192", type: "image/png" }, { src: "assets/img/logo-512.png", sizes: "512x512", type: "image/png" }]
}, null, 2) + "\n");

/* ---------- Logo-Dateien (SVG, mit eingebetteter Schrift) ---------- */
const fontB64 = fs.readFileSync(path.join(ROOT, "assets/fonts/fraunces-600.woff2")).toString("base64");
const fontStyle = `<style>@font-face{font-family:"Fraunces";font-weight:600;src:url(data:font/woff2;base64,${fontB64}) format("woff2")}</style>`;
write("assets/img/logo.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 300" role="img" aria-label="SHAHI Küche">${fontStyle}
<g transform="translate(20 34) scale(0.86)"><path d="${ARCH}" fill="#FFB320"/><path d="${ARCH_INNER}" fill="none" stroke="#22307A" stroke-width="8"/><text x="100" y="224" text-anchor="middle" font-family="Fraunces" font-weight="600" font-size="150" fill="#22307A">S</text><circle cx="100" cy="-16" r="11" fill="#E0352B"/></g>
<text x="232" y="172" font-family="Fraunces" font-weight="600" font-size="128" letter-spacing="5" fill="#22307A">SHAHI</text>
<text x="238" y="240" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" font-weight="600" font-size="46" letter-spacing="2" fill="#22307A">Küche</text></svg>
`);
write("assets/img/favicon.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${fontStyle}<rect width="64" height="64" rx="14" fill="#22307A"/><g transform="translate(13 9) scale(0.19)"><path d="${ARCH}" fill="#FFB320"/><text x="100" y="224" text-anchor="middle" font-family="Fraunces" font-weight="600" font-size="160" fill="#22307A">S</text></g></svg>
`);

/* ---------- Bericht ---------- */
const checks = C.openChecks(menu);
const uniquePH = [...new Set(PH)];
console.log(`✓ ${files.length + 1} Seiten erzeugt (${idx.products.length} Produkte, ${idx.categories.length} Kategorien) – Modus: ${MODE}${INDEX ? "" : ", noindex"}`);
console.log(`  Offene Prüfpunkte in der Speisekarte: ${checks.length} (davon sperrend im Live-Modus: ${checks.filter((c) => c.sperrt).length})`);
console.log(`  Platzhalter in Rechtstexten: ${uniquePH.length}`);
const blockers = C.launchBlockers(config);
if (blockers.length) console.log("  Online-Bestellung im Live-Modus gesperrt, solange fehlt:\n   - " + blockers.join("\n   - "));
await import("./report.mjs");
