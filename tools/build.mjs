#!/usr/bin/env node
/* =====================================================================
   SHAHI Küche – Seitengenerator
   ---------------------------------------------------------------------
   Technische Grundlage: tools/build.mjs von MINAR Küche (gleiche Bausteine,
   gleiches Markup, gleiche Klassen). Angepasst sind nur Inhalte, Logo,
   Restaurantdaten, Rechtstexte und die SHAHI-Betriebsbedingungen.

   Erzeugt alle statischen HTML-Seiten in public/ mit einheitlichem Header, Footer
   und Navigation aus EINER Quelle (dieser Datei + assets/js/menu-data.js).
   Prüft vorher die Speisekarte (Bruch bei Fehlern) und schreibt die offenen
   Prüfpunkte nach docs/PRUEFPUNKTE-SPEISEKARTE.md.

   Ausführen (Node.js ≥ 16, keine Pakete nötig):
       node tools/build.mjs

   Nötig, wenn sich Header, Footer, Seitentexte, Öffnungszeiten, Lieferzonen,
   Zahlungsarten, Betreiberangaben oder die LISTE der Kategorien ändern.
   Preise und Gerichte werden zur Laufzeit aus assets/js/menu-data.js gelesen –
   dafür ist kein Build nötig (er schadet aber nicht und prüft die Daten).
   ===================================================================== */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const BASE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = path.join(BASE, "public");   // veröffentlichte Website
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, "assets/js/menu-data.js"), "utf8"), ctx);
const D = ctx.window.SHAHI_DATA;
const R = D.restaurant;
const OP = D.operation;
const H = D.hours;
const PAY = D.payment || {};
const TX = D.tax || {};
const CATS = D.categories;

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const MAPS = esc(R.mapsUrl || "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(`${R.name}, ${R.street}, ${R.zip} ${R.city}`));
const TEL = `tel:${R.phoneLink}`;
const WA = `https://wa.me/${R.whatsappNumber}`;
const CSS_VERSION = Date.now().toString(36);
const euro = (e) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(e).replace(/\u00a0/g, " ");
const euroShort = (e) => (Number.isInteger(e) ? e + " €" : euro(e));
/* Platzhalter für fehlende Betreiberangaben (gut sichtbar, nie erfunden) */
const ph = (v, label) => (v ? esc(v) : `<span class="ph">[${esc(label)} – vom Betreiber zu ergänzen]</span>`);

/* ===================== Datenprüfung (Bruch bei Fehlern) ===================== */
{
  const errors = [], ids = new Set(), nrs = new Set(), cats = new Set(CATS.map((c) => c.id));
  const L = D.legend, codeOk = (c) => /^\d+$/.test(c) ? L.additives[c] : L.allergens[c];
  for (const [gid, g] of Object.entries(D.optionGroups)) {
    if (g.type !== "one" && g.type !== "many") errors.push(`Optionsgruppe ${gid}: type muss "one" oder "many" sein`);
    (g.options || []).forEach((o) => {
      if (o.price != null && !(o.price >= 0)) errors.push(`Optionsgruppe ${gid}/${o.name}: Preis ungültig`);
      String(o.codes || "").split(",").filter(Boolean).forEach((c) => { if (!codeOk(c.trim())) errors.push(`Optionsgruppe ${gid}/${o.name}: Kennzeichnung ${c} nicht in der Legende`); });
    });
    if (g.min && g.max && g.min > g.max) errors.push(`Optionsgruppe ${gid}: min > max`);
  }
  D.items.forEach((it, i) => {
    const w = `Gericht ${it.id || "#" + i}`;
    if (!it.id || !/^[a-z0-9-]+$/.test(it.id)) errors.push(`${w}: id fehlt oder enthält unzulässige Zeichen`);
    if (ids.has(it.id)) errors.push(`${w}: id doppelt`); ids.add(it.id);
    if (it.nr) { if (nrs.has(it.nr)) errors.push(`${w}: Artikelnummer ${it.nr} doppelt`); nrs.add(it.nr); }
    if (!cats.has(it.cat)) errors.push(`${w}: unbekannte Kategorie ${it.cat}`);
    if (!it.name) errors.push(`${w}: Name fehlt`);
    (it.prices || []).forEach((p) => { const v = Array.isArray(p) ? p[1] : p; if (!(v > 0) || Math.round(v * 100) !== Math.round(v * 1000) / 10) errors.push(`${w}: Preis ${v} ungültig`); });
    (it.opts || []).forEach((g) => { if (!D.optionGroups[g]) errors.push(`${w}: unbekannte Optionsgruppe ${g}`); });
    String(it.codes || "").split(",").filter(Boolean).forEach((c) => { if (!codeOk(c.trim())) errors.push(`${w}: Kennzeichnung ${c} nicht in der Legende`); });
  });
  D.delivery.zones.forEach((z) => { if (!(z.minOrder >= 0) || !(z.fee >= 0)) errors.push(`Lieferzone ${z.name}: Werte ungültig`); });
  if (errors.length) { console.error("Fehler in menu-data.js:\n  " + errors.join("\n  ")); process.exit(1); }
}

/* ===================== Texte aus den Betriebsdaten ===================== */
const DAY = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"], DAY_LONG = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const slotTxt = (d) => (H.week[String(d)] || []).map((s) => s[0] + "–" + s[1]).join(", ");
/* „Mo, Mi, Do 16:30–22:30 · Fr–So 11:00–22:30“ – gleiche Zeiten zusammengefasst (Woche ab Montag) */
function hoursSummary(sep = " · ") {
  const order = [1, 2, 3, 4, 5, 6, 0], groups = [];
  order.forEach((d, i) => { const t = slotTxt(d); if (!t) return; const g = groups.find((x) => x.t === t); if (g) g.days.push(i); else groups.push({ t, days: [i] }); });
  return groups.map((g) => {
    const runs = []; g.days.forEach((i) => { const r = runs[runs.length - 1]; if (r && r[1] === i - 1) r[1] = i; else runs.push([i, i]); });
    return runs.map(([a, b]) => (b - a >= 2 ? DAY[order[a]] + "–" + DAY[order[b]] : b > a ? DAY[order[a]] + ", " + DAY[order[b]] : DAY[order[a]])).join(", ") + " " + g.t;
  }).join(sep);
}
const restDays = [1, 2, 3, 4, 5, 6, 0].filter((d) => !(H.week[String(d)] || []).length);
const restText = restDays.length ? restDays.map((d) => DAY_LONG[d]).join(" und ") + " Ruhetag" : "";
const restShort = restDays.length ? restDays.map((d) => DAY[d]).join(", ") + " Ruhetag" : "";
const restLower = restDays.length ? restDays.map((d) => DAY_LONG[d].toLowerCase() + "s").join(" und ") + " Ruhetag" : "";
const sameCut = H.orderUntil.pickup === H.orderUntil.delivery;
const cutText = sameCut ? `Bestellungen bis ${H.orderUntil.pickup} Uhr` : `Lieferung bis ${H.orderUntil.delivery} Uhr · Abholung bis ${H.orderUntil.pickup} Uhr`;
const cutSentence = sameCut ? `bis ${H.orderUntil.pickup} Uhr` : `für Lieferungen bis ${H.orderUntil.delivery} Uhr, zur Abholung bis ${H.orderUntil.pickup} Uhr`;
const leadText = H.lead.pickup === H.lead.delivery ? `Frühestens ${H.lead.pickup} Minuten` : `Frühestens ${H.lead.pickup} Minuten (Abholung) bzw. ${H.lead.delivery} Minuten (Lieferung)`;
const cashOnly = Array.isArray(PAY.methods) && PAY.methods.length === 1 && /^bar$/i.test(PAY.methods[0]);
const payKnown = Array.isArray(PAY.methods) && PAY.methods.length > 0;
const payText = cashOnly ? "Zahlung ausschließlich bar bei Abholung oder Lieferung – keine Onlinezahlung."
  : payKnown ? `Zahlung: ${esc(PAY.note || PAY.methods.join(", "))} – keine Onlinezahlung über die Website.`
  : "Die Zahlungsarten geben wir zur Eröffnung bekannt – eine Zahlung über die Website gibt es nicht.";
const taxNote = TX.status === "bestaetigt" && TX.smallBusiness === true ? "Alle Preise sind Endpreise in Euro; gemäß § 19 UStG wird keine Umsatzsteuer berechnet."
  : TX.status === "bestaetigt" && TX.smallBusiness === false ? "Alle Preise in Euro inkl. gesetzlicher Umsatzsteuer."
  : "Alle Preise sind Endpreise in Euro.";
const zones = D.delivery.zones;
const minZone = zones.reduce((a, z) => (z.minOrder < a.minOrder ? z : a), zones[0]);
const minFee = Math.min(...zones.map((z) => z.fee));
const maxKm = "12 km";

/* ---------- Icons ---------- */
const I = {
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3.5 9 3l1.6 4.2-2 1.4a11 11 0 0 0 6.8 6.8l1.4-2L21 15l-.5 2.4a2 2 0 0 1-2 1.6A15.5 15.5 0 0 1 5 5.5a2 2 0 0 1 1.6-2Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19l-4 1Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 9.2c.3 2.5 2.3 4.6 4.8 5l1.2-1.2 1.6.8c-.2 1-1 1.7-2 1.7-3.4 0-6.1-2.8-6.1-6.1 0-1 .7-1.8 1.7-2l.8 1.6L9 9.2Z" fill="currentColor"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="9.5" r="2.5" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
  bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 7Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 9.5V6a3 3 0 0 1 6 0v3.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  bike: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="17" r="2.5" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="18" cy="17" r="2.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8.5 17h7M3 12h9l2-5h3l3 7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  house: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V10l8-6 8 6v11M9 21v-6h6v6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m20 20-4.2-4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};

/* Geschwungenes Flyer-Band (Grün/Rot → Gelb), wie im MINAR-Designsystem */
const swoosh = (cls = "") => `<div class="swoosh ${cls}" aria-hidden="true"><svg viewBox="0 0 1440 120" preserveAspectRatio="none">
  <path class="sw-yellow" d="M0 40 Q720 150 1440 40 V120 H0Z"/>
  <path class="sw-red" d="M0 30 Q720 140 1440 30 V44 Q720 154 0 44Z"/>
  <path class="sw-green" d="M0 6 Q720 112 1440 6 V20 Q720 126 0 20Z"/>
</svg></div>`;

/* ---------- Navigation ---------- */
const NAV = [
  ["start", "index.html", "Startseite"],
  ["speisekarte", "speisekarte/index.html", "Speisekarte"],
  ["lieferservice", "lieferservice.html", "Lieferservice"],
  ["ueber-uns", "ueber-uns.html", "Über uns"],
  ["kontakt", "kontakt.html", "Kontakt"]
];
const CLAIM = (R.offer || []).slice().reverse().join(" · ") + " · " + R.cityShort;

function header(root, active) {
  const links = NAV.map(([k, href, label]) =>
    `<li><a href="${root}${href}"${k === active ? ' aria-current="page" class="is-active"' : ""}>${label}</a></li>`).join("\n          ");
  return `<a class="skip-link" href="#inhalt">Zum Inhalt springen</a>
  <header class="site-header">
    <div class="topbar">
      <div class="container topbar-inner">
        <span class="topbar-claim">${esc(CLAIM)}</span>
        <span class="topbar-status"><span class="status-dot" data-open-dot></span><span data-open-status-long>Öffnungszeiten: ${esc(hoursSummary(", "))}${restShort ? ", " + esc(restShort) : ""}</span></span>
        <a class="topbar-tel" href="${TEL}">${I.phone}<span>${esc(R.phoneDisplay)}</span></a>
      </div>
    </div>
    <div class="container header-inner">
      <a class="brand" href="${root}index.html" aria-label="${esc(R.name)} – zur Startseite">
        <img src="${root}assets/logo/shahi-logo-horizontal.svg" alt="${esc(R.name)}" width="236" height="56">
      </a>
      <nav class="main-nav" id="main-nav" aria-label="Hauptnavigation">
        <ul>
          ${links}
        </ul>
        <div class="mobile-nav-extra">
          <a class="btn btn-primary btn-block" href="${root}bestellen.html">Jetzt bestellen</a>
          <a class="btn btn-ghost btn-block" href="${TEL}">${I.phone}Anrufen · ${esc(R.phoneDisplay)}</a>
        </div>
      </nav>
      <div class="header-actions">
        <a class="icon-btn cart-link${active === "bestellen" ? " is-active" : ""}" href="${root}bestellen.html" aria-label="Warenkorb">${I.bag}<span class="cart-count" data-cart-count hidden>0</span></a>
        <a class="btn btn-primary header-order${active === "bestellen" ? " is-current" : ""}" href="${root}bestellen.html"${active === "bestellen" ? ' aria-current="page"' : ""}>Jetzt bestellen</a>
        <button class="icon-btn nav-toggle" type="button" aria-controls="main-nav" aria-expanded="false" aria-label="Menü öffnen"><span></span><span></span><span></span></button>
      </div>
    </div>
  </header>`;
}

function footer(root) {
  return `${swoosh("swoosh-footer")}
  <footer class="site-footer">
    <div class="container footer-grid">
      <div class="footer-brand">
        <img src="${root}assets/logo/shahi-logo.svg" alt="${esc(R.name)} – Logo" width="200" height="154" loading="lazy">
      </div>
      <div class="f-col">
        <div class="f-contact">
          <h2 class="footer-h">Kontakt</h2>
          <p class="f-contact-list"><a class="footer-link" href="${TEL}">${I.phone}<span>${esc(R.phoneDisplay)}</span></a><br>
          <a class="footer-link" href="${WA}" target="_blank" rel="noopener">${I.wa}<span>${esc(R.whatsappDisplay)}</span></a>${R.email ? `<br>
          <a class="footer-link f-mail" href="mailto:${esc(R.email)}">${I.mail}<span>${esc(R.email)}</span></a>` : `<br>
          <a class="footer-link" href="${MAPS}" target="_blank" rel="noopener noreferrer">${I.pin}<span>${esc(R.street)}, ${esc(R.cityShort)}</span></a>`}</p>
        </div>
      </div>
      <nav class="f-nav" aria-label="Footer-Navigation">
        <h2 class="footer-h">Navigation</h2>
        <ul class="footer-nav">
          ${NAV.map(([, href, label]) => `<li><a href="${root}${href}">${label}</a></li>`).join("")}
          <li><a href="${root}bestellen.html">Bestellen</a></li>
        </ul>
      </nav>
    </div>
    <div class="footer-bottom">
      <div class="container footer-bottom-inner">
        <p>© <span data-year>2026</span> ${esc(R.name)} · ${esc(R.cityShort)}</p>
        <p><a href="${root}impressum.html">Impressum</a> · <a href="${root}datenschutz.html">Datenschutz</a> · <a href="${root}bestellinformationen.html">Bestellinfos</a> · <a href="${root}allergene.html">Allergene</a></p>
        <p class="footer-credit"><span>Webauftritt von</span> <a class="credit-link" href="https://braeuer.digital" target="_blank" rel="noopener">Bräuer.Digital</a></p>
      </div>
    </div>
  </footer>
  <aside class="side-cta" data-side-cta aria-label="Schnell bestellen">
    <button class="side-cta-tab" type="button" aria-expanded="false" aria-controls="side-cta-panel">
      <span class="status-dot" data-open-dot></span><span class="side-cta-label"><span class="sc-long">Jetzt </span>bestellen</span>
    </button>
    <div class="side-cta-panel" id="side-cta-panel">
      <p class="side-cta-title">Hunger?</p>
      <p class="side-cta-status" data-open-status-long></p>
      <a class="side-cta-item side-cta-main" href="${root}speisekarte/index.html">${I.bag}<span><small>Online</small>Speisekarte &amp; Warenkorb</span></a>
      <a class="side-cta-item" href="${TEL}">${I.phone}<span><small>Anrufen</small>${esc(R.phoneDisplay)}</span></a>
      <a class="side-cta-item" href="${WA}" target="_blank" rel="noopener">${I.wa}<span><small>WhatsApp</small>${esc(R.whatsappDisplay)}</span></a>
    </div>
  </aside>
  <a class="cart-fab" href="${root}bestellen.html" data-cart-fab aria-label="Zum Warenkorb" hidden>
    ${I.bag}<span>Warenkorb</span><span class="cart-fab-count" data-cart-count>0</span><span class="cart-fab-total" data-cart-total></span>
  </a>
  <div class="toast" role="status" aria-live="polite" data-toast></div>`;
}

const itemDialog = `
  <dialog class="sheet" id="item-dialog" aria-labelledby="item-dialog-title">
    <form class="sheet-inner" method="dialog" data-item-form>
      <div class="sheet-head">
        <div>
          <p class="item-dialog-nr" data-item-nr></p>
          <h2 id="item-dialog-title" data-item-title></h2>
        </div>
        <button class="icon-btn sheet-close" type="button" data-close aria-label="Schließen">×</button>
      </div>
      <p class="item-dialog-desc" data-item-desc></p>
      <fieldset class="opt-group" data-item-variants hidden>
        <legend>Größe / Variante</legend>
        <div class="opt-list" data-variant-list></div>
      </fieldset>
      <div data-item-opts></div>
      <label class="field">
        <span>Hinweis zu diesem Gericht <small>(optional)</small></span>
        <input type="text" maxlength="120" placeholder="z. B. ohne Zwiebeln" data-item-note>
      </label>
      <div class="sheet-foot">
        <div class="qty" aria-label="Menge">
          <button type="button" data-qty-minus aria-label="Weniger">−</button>
          <output data-qty>1</output>
          <button type="button" data-qty-plus aria-label="Mehr">+</button>
        </div>
        <button class="btn btn-primary btn-grow" type="submit" data-item-add>Hinzufügen</button>
      </div>
    </form>
  </dialog>`;

/* ===================== Warenkorb-Inhalt (Bestellseite und Warenkorb-Drawer) ===================== */
/* Lieferzeit-Hinweis sinngemäß nach Flyer; Bezugspunkt der Lieferzeit = Annahme der Bestellung (vom Betreiber zu bestätigen) */
const FRESH_TEXT = "Wir bereiten alle Speisen frisch für Sie zu. Die voraussichtliche Lieferzeit beträgt je nach Entfernung und Bestellaufkommen 20–90 Minuten ab Annahme Ihrer Bestellung – sie ist keine garantierte Zeit. Ihre ausgewählte Uhrzeit ist eine Wunschzeit. " + esc(R.name) + " teilt Ihnen die bestätigte Abhol- oder Lieferzeit persönlich über WhatsApp mit.";
/* Ablauf und Vertragsschluss (Text wie MINAR, Stand 16.11.2026). Kein Ersatz für die rechtliche Prüfung der Absendehandlung. */
const HOW_TEXT = (root) => `<p>Sie stellen Ihre Bestellung auf unserer Website zusammen und kontrollieren alle Angaben. Über „Weiter zu WhatsApp“ öffnen Sie Ihre vorbereitete Bestellnachricht. Erst wenn Sie diese in WhatsApp selbst absenden, wird Ihre Bestellung an ${esc(R.name)} übermittelt.</p>
              <p>Mit dem Absenden geben Sie nach dem vorgesehenen Bestellmodell eine verbindliche, zahlungspflichtige Bestellung ab. Ein Vertrag kommt erst zustande, wenn ${esc(R.name)} Ihre Bestellung ausdrücklich annimmt.</p>
              <p>Die Bestätigung und die Abhol- oder Lieferzeit erhalten Sie persönlich über WhatsApp. ${payText}</p>
              <ul class="order-info-facts">
                <li><strong>Korrigieren:</strong> Bis zum Absenden jederzeit hier im Warenkorb oder über „Zurück und ändern“ in der Bestellübersicht.</li>
                <li><strong>Vertragssprache:</strong> Deutsch.</li>
                <li><strong>Speichern:</strong> Die Website selbst speichert keine Bestellungen. Ihre Bestellung bleibt als Nachricht in Ihrem WhatsApp-Chat mit uns erhalten; die Bestellübersicht können Sie vorher drucken oder als PDF speichern.</li>
                <li><strong>Rechtstexte:</strong> <a href="${root}bestellinformationen.html">Bestell- und Verbraucherinformationen</a> · <a href="${root}impressum.html">Impressum</a> · <a href="${root}datenschutz.html">Datenschutzerklärung</a></li>
              </ul>`;
const orderMainHtml = (root) => `        <div class="order-main">
          <div class="order-note" role="note"><strong>Vor dem Bestellen:</strong> ${payText} Lieferung nur in die <a href="${root}lieferservice.html">aufgeführten Liefergebiete</a> mit Mindestbestellwert und Liefergebühr je Gebiet. Bestellungen nur während der Öffnungszeiten ${cutSentence}${restLower ? ", " + restLower : ""}. Ein Vertrag kommt erst durch die persönliche Annahme von ${esc(R.name)} zustande.</div>

          <div class="cart-empty" data-cart-empty>
            <h2>Ihr Warenkorb ist noch leer.</h2>
            <p>Wählen Sie Ihre Gerichte in der Speisekarte aus – oder bestellen Sie direkt telefonisch bzw. per WhatsApp.</p>
            <a class="btn btn-primary btn-lg" href="${root}speisekarte/index.html">Zur Speisekarte</a>
          </div>

          <div class="cart-body" data-cart-body hidden>
            <section class="cart-card" aria-labelledby="cart-title">
              <header class="cart-card-head">
                <h2 id="cart-title">Deine Bestellung</h2>
                <span class="cart-card-count" data-cart-count-label>0 Artikel</span>
              </header>
              <div class="cart-ref" data-ref-box>
                <p class="cart-ref-label" id="ref-label">Deine Bestellreferenz</p>
                <div class="cart-ref-row">
                  <code class="cart-ref-nr" data-ref-nr aria-labelledby="ref-label"></code>
                  <button class="cart-ref-copy" type="button" data-ref-copy>Kopieren</button>
                </div>
                <p class="cart-ref-hint">Bitte bei Rückfragen angeben. Sie bleibt für diese Bestellung gleich – auch beim erneuten Öffnen von WhatsApp.</p>
                <p class="cart-ref-error" data-ref-error role="alert" hidden>Ihr Browser kann keine sichere Bestellreferenz erzeugen. Bitte nutzen Sie einen aktuellen Browser oder bestellen Sie telefonisch unter <a href="${TEL}">${esc(R.phoneDisplay)}</a>.</p>
              </div>
              <ul class="cart-lines" data-cart-lines></ul>
              <a class="cart-more" href="${root}speisekarte/index.html">${I.back} Weitere Gerichte hinzufügen</a>
              <dl class="cart-sums" data-cart-sums></dl>
              <p class="cart-cash">${payText}</p>
              <p class="cart-fine">${taxNote} Getränkepfand (je Getränk wie in der Speisekarte angegeben) und Lieferkosten werden separat ausgewiesen.</p>
            </section>

            <h2 class="h-red h-sm">Abholung oder Lieferung</h2>
            <div class="seg" role="radiogroup" aria-label="Abholung oder Lieferung">
              <label><input type="radio" name="mode" value="Abholung" checked data-mode><span>Abholung</span></label>
              <label><input type="radio" name="mode" value="Lieferung" data-mode><span>Lieferung</span></label>
            </div>
            <p class="cart-min" data-delivery-off hidden></p>
            <label class="field" data-place-field hidden><span>Lieferort <b class="req" aria-hidden="true">*</b></span><select data-f-place aria-required="true"></select></label>
            <p class="cart-min" data-cart-min hidden></p>
            <p class="fine place-hint" data-place-hint hidden>Ihr Ort ist nicht aufgeführt? Dorthin können wir leider nicht online liefern – gerne zur Abholung, oder fragen Sie telefonisch unter <a href="${TEL}">${esc(R.phoneDisplay)}</a> nach.</p>

            <h2 class="h-red h-sm">Ihre Angaben</h2>
            <div class="field-grid">
              <label class="field"><span>Name <b class="req" aria-hidden="true">*</b></span><input type="text" autocomplete="name" maxlength="80" required aria-required="true" data-f-name></label>
              <label class="field"><span>Telefon <b class="req" aria-hidden="true">*</b> <small>(für Rückfragen)</small></span><input type="tel" autocomplete="tel" inputmode="tel" maxlength="24" required aria-required="true" data-f-phone></label>
              <label class="field field-wide" data-address-field hidden><span>Straße und Hausnummer <b class="req" aria-hidden="true">*</b></span><input type="text" autocomplete="address-line1" maxlength="140" placeholder="z. B. ${esc(R.street)}" aria-required="true" data-f-address></label>
              <label class="field field-wide" data-address2-field hidden><span>Adresszusatz <small>(optional)</small></span><input type="text" autocomplete="address-line2" maxlength="100" placeholder="z. B. Etage, Klingelname, Hinterhaus" data-f-address2></label>
              <label class="field"><span>Wunschzeit</span><select data-f-time aria-describedby="time-hint"></select><small class="field-hint" id="time-hint">${leadText} nach Bestellung, in ${H.slot}-Minuten-Schritten. Dies ist eine Wunschzeit – die bestätigte Uhrzeit erhalten Sie per WhatsApp.</small><small class="field-hint is-warn" data-time-lost hidden></small></label>
              <label class="field field-wide"><span>Anmerkungen <small>(optional)</small></span><textarea rows="3" maxlength="300" data-f-note></textarea></label>
            </div>
            <p class="fine req-note"><b class="req">*</b> Pflichtfeld</p>
            <div class="fresh-note" role="note">
              <p class="fresh-title">Frische Zubereitung &amp; Lieferzeit</p>
              <p>${FRESH_TEXT}</p>
            </div>

            <details class="order-info" open>
              <summary>So funktioniert Ihre Bestellung</summary>
              ${HOW_TEXT(root)}
            </details>

            <p class="cart-closed" data-cart-closed hidden></p>
            <div class="checkout-bar">
              <div class="checkout-sum"><small>Insgesamt${cashOnly ? " bar" : ""} zu zahlen</small><strong data-grand></strong></div>
              <button class="btn btn-go btn-lg" type="button" data-to-summary aria-describedby="checkout-hint">Weiter zur Übersicht <span aria-hidden="true">→</span></button>
              <p class="checkout-hint" id="checkout-hint" data-checkout-hint aria-live="polite"></p>
            </div>
            <p class="cart-actions"><button class="btn btn-link" type="button" data-cart-clear>Warenkorb und Angaben löschen</button></p>
          </div>
        </div>`;
const bonDialogHtml = (root) => `<dialog class="bon-dialog" id="bon-dialog" aria-labelledby="bon-title">
      <div class="bon-wrap">
        <button class="icon-btn bon-close" type="button" data-close aria-label="Übersicht schließen">×</button>
        <article class="bon">
          <header class="bon-head">
            <img src="${root}assets/logo/shahi-emblem.svg" alt="" width="56" height="56">
            <p class="bon-brand">${esc(R.name.toUpperCase())}</p>
            <p class="bon-addr">${esc(R.street)}<br>${esc(R.zip)} ${esc(R.city)}</p>
          </header>
          <p class="bon-ref"><span>Bestellreferenz</span><strong data-bon-ref></strong></p>
          <h2 class="bon-title" id="bon-title">Ihre Bestellübersicht</h2>
          <dl class="bon-meta" data-bon-meta></dl>
          <ul class="bon-lines" data-bon-lines></ul>
          <dl class="bon-sums" data-bon-sums></dl>
          <p class="bon-cash">${payText}</p>
          <p class="bon-fresh"><strong>Frische Zubereitung &amp; Lieferzeit:</strong> ${FRESH_TEXT}</p>
          <p class="bon-legal">${taxNote} Diese Übersicht ist weder Rechnung noch Bestellbestätigung. Ein Vertrag kommt erst zustande, wenn ${esc(R.name)} Ihre Bestellung ausdrücklich per WhatsApp annimmt.</p>
          <p class="bon-stamp" data-bon-stamp></p>
        </article>
        <div class="bon-actions">
          <p class="bon-alert" data-bon-alert role="alert" hidden></p>
          <p class="bon-commit" id="bon-commit"><strong>Wichtig:</strong> „Weiter zu WhatsApp“ öffnet nur Ihre vorbereitete Bestellnachricht. Erst wenn Sie diese in WhatsApp selbst absenden, wird Ihre Bestellung an ${esc(R.name)} übermittelt. Mit dem Absenden geben Sie nach dem vorgesehenen Bestellmodell eine verbindliche, zahlungspflichtige Bestellung ab. Ein Vertrag kommt erst zustande, wenn ${esc(R.name)} Ihre Bestellung ausdrücklich annimmt.</p>
          <a class="btn btn-whatsapp btn-lg btn-block" href="#" target="_blank" rel="noopener" aria-describedby="bon-commit" data-bon-send>${I.wa}Weiter zu WhatsApp</a>
          <p class="bon-opened" data-bon-opened role="status" hidden>WhatsApp wurde geöffnet. Ihre Bestellung wird erst übermittelt, wenn Sie die Nachricht dort absenden; ein Vertrag kommt erst mit unserer ausdrücklichen Annahme zustande. Ein erneutes Öffnen verwendet dieselbe Bestellreferenz.</p>
          <button class="btn btn-new-order btn-block" type="button" data-new-order hidden>Neue Bestellung beginnen</button>
          <p class="fine bon-privacy">Mit dem Öffnen von WhatsApp verlassen Sie unsere Website. Ihre vorbereiteten Bestellangaben (einschließlich Name, Telefonnummer und ggf. Lieferadresse) werden dabei im Link an WhatsApp übergeben. An uns (${esc(R.whatsappDisplay)}) gesendet wird die Nachricht erst, wenn Sie sie in WhatsApp selbst absenden. Weitere Informationen finden Sie in unserer <a href="${root}datenschutz.html" target="_blank" rel="noopener">Datenschutzerklärung</a>.</p>
          <p class="bon-links"><button class="btn-text" type="button" data-bon-print>Übersicht drucken / als PDF speichern</button> · <button class="btn-text" type="button" data-bon-copy>Bestelltext kopieren</button> · <a href="${root}bestellinformationen.html" target="_blank" rel="noopener">Bestellinfos</a> · <a href="${root}impressum.html" target="_blank" rel="noopener">Impressum</a> · <a href="${root}datenschutz.html" target="_blank" rel="noopener">Datenschutz</a></p>
          <button class="btn btn-link" type="button" data-close>Zurück und ändern</button>
        </div>
      </div>
    </dialog>`;
/* Warenkorb als Drawer von unten: auf allen Seiten außer der Bestellseite eingebunden;
   aktiv nur bei restaurant.cartDrawer = true in menu-data.js – sonst führen die Warenkorb-Links zur Bestellseite. */
const cartDrawerHtml = (root) => `
  <dialog class="cart-drawer" id="cart-drawer" aria-labelledby="drawer-title">
    <div class="drawer-inner">
      <div class="drawer-grip" aria-hidden="true"></div>
      <div class="drawer-head">
        <h2 id="drawer-title">Warenkorb</h2>
        <button class="icon-btn drawer-close" type="button" data-close aria-label="Warenkorb schließen">×</button>
      </div>
${orderMainHtml(root)}
    </div>
  </dialog>
  ${bonDialogHtml(root)}`;

/* Sicherheitsrichtlinie als Meta-Tag (GitHub Pages kann keine HTTP-Header setzen): nur eigene Dateien */
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests";
const ROBOTS = OP.indexable ? "index, follow" : "noindex, nofollow";

function page({ file, title, desc, active, body, dialog = false, bodyClass = "" }) {
  const depth = file.split("/").length - 1;
  const root = depth ? "../".repeat(depth) : "";
  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta http-equiv="Content-Security-Policy" content="${CSP}">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <meta name="robots" content="${ROBOTS}">
  <meta name="theme-color" content="#151A0E">
  <link rel="icon" href="${root}assets/logo/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="${root}assets/logo/favicon-32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="${root}assets/logo/apple-touch-icon.png">
  <link rel="stylesheet" href="${root}assets/css/styles.css?v=${CSS_VERSION}">
</head>
<body class="${bodyClass}" data-page="${active}">
  ${header(root, active)}
  <main id="inhalt">
${body(root)}
  </main>
  ${reviewBand(active)}${footer(root)}${dialog || (active !== "bestellen" && active !== "404") ? itemDialog : ""}${active !== "bestellen" && active !== "404" ? cartDrawerHtml(root) : ""}
  <script src="${root}assets/js/menu-data.js?v=${CSS_VERSION}"></script>
  <script src="${root}assets/js/app.js?v=${CSS_VERSION}"></script>
  <script src="${root}assets/js/fx.js?v=${CSS_VERSION}"></script>
</body>
</html>
`;
  const out = path.join(ROOT, file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  return file;
}

/* ---------- Bausteine ---------- */
const noscript = `<noscript><p class="notice">Die Speisekarte benötigt JavaScript. Gerne nehmen wir Ihre Bestellung auch telefonisch unter <a href="${TEL}">${esc(R.phoneDisplay)}</a> entgegen.</p></noscript>`;
const pageHead = (eyebrow, h1, lead = "", extra = "") => `
    <section class="page-head">
      <div class="container">
        <p class="eyebrow">${eyebrow}</p>
        <h1>${h1}</h1>
        ${lead ? `<p class="lead">${lead}</p>` : ""}
        ${extra}
      </div>
    </section>`;
const contactCards = () => `
        <div class="contact-cards">
          <a class="contact-card" href="${TEL}"><span class="contact-ico">${I.phone}</span><span><small>Telefon${R.phonePurpose ? " · " + esc(R.phonePurpose) : ""}</small>${esc(R.phoneDisplay)}</span></a>
          <a class="contact-card" href="${WA}" target="_blank" rel="noopener"><span class="contact-ico">${I.wa}</span><span><small>WhatsApp</small>${esc(R.whatsappDisplay)}</span></a>
          <a class="contact-card" href="${MAPS}" target="_blank" rel="noopener noreferrer"><span class="contact-ico">${I.pin}</span><span><small>Route planen</small>In Google Maps öffnen</span></a>
        </div>
        <p class="fine">Der Kartenlink öffnet Google Maps in einem neuen Fenster; erst dann werden Daten an Google übermittelt.</p>`;
const hoursCard = () => `
        <div class="hours-card">
          <h2 class="hours-title">${I.clock}Öffnungszeiten</h2>
          <ul class="hours-list" data-hours-list></ul>
          <p class="hours-note">${esc(cutText)}${restShort ? " · " + esc(restText) : ""}</p>
          <p class="hours-special" data-hours-special hidden></p>
          <p class="hours-live"><span class="status-dot" data-open-dot></span><span data-open-status-long></span></p>
        </div>`;
const ctaBand = (root) => `
    <section class="cta-band">
      <div class="container cta-inner">
        <div>
          <h2>Hunger bekommen?</h2>
          <p>Gerichte online auswählen und als WhatsApp-Nachricht senden – oder einfach anrufen.</p>
        </div>
        <div class="cta-actions">
          <a class="btn btn-accent btn-lg" href="${root}speisekarte/index.html">Speisekarte entdecken</a>
          <a class="btn btn-light btn-lg" href="${TEL}">${I.phone}Anrufen</a>
        </div>
      </div>
    </section>`;

const tape = (words, n) => { const one = Array(n).fill(words).flat().map((w) => `<span>${esc(w)}</span><i>✦</i>`).join(""); return one + one; };

const REVIEW = (R.googleReviewUrl || "").trim();
const reviewOk = /^https:\/\/(g\.page\/r\/|search\.google\.com\/local\/writereview\?placeid=|www\.google\.[a-z.]+\/maps\/)/.test(REVIEW);
/* Google-Bewertung als eigener Bereich direkt über dem Footer – nur mit hinterlegtem Link des SHAHI-Profils */
const reviewBand = (active) => reviewOk && !["kontakt", "404", "impressum", "datenschutz"].includes(active) ? `
  <section class="section section-tight review-band" aria-label="Google-Bewertung">
    <div class="container">
      <div class="review-card reveal">
        <div>
          <h2>Wie hat es Ihnen bei SHAHI gefallen?</h2>
          <p>Wir freuen uns über Ihre ehrliche Bewertung auf Google.</p>
        </div>
        <a class="btn btn-accent btn-lg" href="${esc(REVIEW)}" target="_blank" rel="noopener noreferrer">Jetzt auf Google bewerten</a>
      </div>
    </div>
  </section>` : "";
const built = [];
const catImg = (c, root = "../") => c.img ? `${root}assets/images/${c.img}` : "";

/* ===================== Startseite ===================== */
/* Galerie wie MINAR – mit den eigenen SHAHI-Illustrationen, bis Fotos der Gerichte vorliegen */
const GALLERY = ["burger", "doener", "indisch", "salate", "schnitzel"];
built.push(page({
  file: "index.html", active: "start", bodyClass: "page-home",
  title: `${R.name} · Biberach – Lieferservice & Abholung`,
  desc: `${R.name} in Biberach an der Riß: Pizza, Burger, Döner, Salate, Nudeln, Schnitzel sowie indische und pakistanische Gerichte – zur Abholung in der ${R.street} und mit Lieferservice.`,
  body: (root) => `
    <section class="hero">
      <div class="container hero-grid">
        <div class="hero-logo">
          ${fs.readFileSync(path.join(ROOT, "assets/logo/shahi-logo-anim.svg"), "utf8").trim()}
          <script src="${root}assets/js/logo-anim.js?v=${CSS_VERSION}"></script>
        </div>
        <div class="hero-copy reveal">
          <p class="eyebrow"><span class="status-dot" data-open-dot></span><span data-open-status>${esc(R.cityShort)} · ${esc(R.street)}</span></p>
          <h1>Von Pizza bis Palak&nbsp;–<br><span>alles aus einer Küche.</span></h1>
          <p class="lead">Pizza, Burger, Döner, Salate, Nudeln, Schnitzel sowie indische und pakistanische Gerichte: Bei ${esc(R.name)} in der ${esc(R.street)} holen Sie ab oder lassen sich in ${esc(R.cityShort)} und Umgebung beliefern.</p>
          <div class="hero-actions">
            <a class="btn btn-primary btn-lg" href="${root}speisekarte/index.html">Speisekarte entdecken</a>
          </div>
        </div>
      </div>
      <div class="tapes" aria-hidden="true">
        <div class="tape tape-red"><div class="tape-track">${tape(["Lieferservice", "Abholung", R.cityShort, R.street], 6)}</div></div>
        <div class="tape tape-green"><div class="tape-track">${tape(CATS.map((c) => c.name), 2)}</div></div>
      </div>
      <p class="visually-hidden">${esc(CLAIM)}</p>
    </section>

    <section class="section intro">
      <div class="container intro-grid">
        <div class="reveal">
          <p class="eyebrow">Willkommen bei ${esc(R.name)}</p>
          <h2 class="h-red">Eine Karte, viele Lieblingsgerichte</h2>
          <p>Unsere Speisekarte umfasst ${D.items.length} Positionen in ${CATS.length} Kategorien – von Salaten, Burgern und Fingerfood über Döner, Pizza und Nudeln bis zu Currys und Masala-Gerichten der indischen und pakistanischen Küche.</p>
          <p>Alle Speisen bereiten wir frisch für Sie zu.</p>
          <a class="text-link" href="${root}ueber-uns.html">Mehr über uns ${I.arrow}</a>
        </div>
        <ul class="service-list reveal">
          <li><span class="service-ico">${I.house}</span><div><h3>In der ${esc(R.street)}</h3><p>${esc(hoursSummary(", "))} Uhr${restLower ? ", " + esc(restLower) : ""}.</p></div></li>
          <li><span class="service-ico">${I.bag}</span><div><h3>Zur Abholung</h3><p>Telefonisch, per WhatsApp oder über den Online-Warenkorb bestellen.</p></div></li>
          <li><span class="service-ico">${I.bike}</span><div><h3>Lieferservice</h3><p>${esc(R.cityShort)} und Umgebung bis ${maxKm} – Mindestbestellwert ab ${euroShort(minZone.minOrder)}.</p></div></li>
        </ul>
      </div>
    </section>

    <section class="section gallery-section">
      <div class="container">
        <div class="section-head-row">
          <div>
            <p class="eyebrow">Aus unserer Küche</p>
            <h2 class="h-red">Frisch auf den Teller</h2>
          </div>
          <p class="fine gallery-note">Illustrationen – keine Produktfotos.</p>
        </div>
        <div class="gallery">
          ${GALLERY.map((cat, i) => { const c = CATS.find((x) => x.id === cat); return `<a class="gallery-item is-illu${i === 0 ? " gallery-item-lg" : ""} reveal" href="${root}speisekarte/${c.slug}.html"><img src="${catImg(c, root)}" alt="${esc(c.imgAlt)}" loading="lazy" decoding="async"><span class="gallery-cap">${esc(c.name)}${I.arrow}</span></a>`; }).join("\n          ")}
        </div>
      </div>
    </section>

    <section class="section delivery-teaser">
      <div class="container delivery-teaser-grid">
        <div class="reveal">
          <p class="eyebrow eyebrow-light">Lieferservice &amp; Abholung</p>
          <h2>Wir liefern in ${esc(R.cityShort)} und Umgebung</h2>
          <p>Lieferzeit je nach Entfernung 20–90 Minuten. Mindestbestellwert und Lieferkosten richten sich nach der Entfernung.</p>
          <a class="btn btn-accent" href="${root}lieferservice.html">Liefergebiete ansehen</a>
        </div>
        <ul class="zone-pills reveal" data-zone-pills></ul>
      </div>
    </section>

    <section class="section visit">
      <div class="container visit-grid">
        <div class="reveal">
          <p class="eyebrow">Öffnungszeiten &amp; Standort</p>
          <h2 class="h-red">Besuchen Sie uns</h2>
          <address class="address">${esc(R.name)}<br>${esc(R.street)}<br>${esc(R.zip)} ${esc(R.city)}</address>
          ${contactCards()}
        </div>
        <div class="reveal">${hoursCard()}</div>
      </div>
    </section>
${ctaBand(root)}`
}));

/* ===================== Speisekarte (komplett) ===================== */
built.push(page({
  file: "speisekarte/index.html", active: "speisekarte", dialog: true, bodyClass: "page-menu page-fullmenu",
  title: `Speisekarte · ${R.name} Biberach`,
  desc: `Die komplette Speisekarte von ${R.name} in Biberach: Salate, Burger, Döner, Pizza, Nudeln, indische und pakistanische Gerichte, Desserts und Getränke – mit Preisen und Allergenen.`,
  body: (root) => `
    <section class="page-head page-head-cat">
      <div class="container">
        <h1 class="h-red">Speisekarte</h1>
        <form class="search" role="search" data-search-form>
          <label class="visually-hidden" for="q">Speisekarte durchsuchen</label>
          ${I.search}
          <input id="q" name="q" type="search" placeholder="z. B. Margherita, Palak oder 96a" autocomplete="off" data-menu-search>
          <button type="button" class="search-clear" data-search-clear aria-label="Suche leeren" hidden>×</button>
        </form>
      </div>
    </section>
    <nav class="cat-nav" aria-label="Kategorien">
        <div class="container"><ul class="chips" data-scrollspy>
          ${CATS.map((x) => `<li><a class="chip" href="#${x.slug}">${esc(x.name)}</a></li>`).join("")}
        </ul></div>
      </nav>
    <section class="section section-tight">
      <div class="container">
        ${noscript}
        <div class="search-results" data-search-results aria-live="polite" hidden></div>
        <div class="full-menu" data-cat-overview>
          ${CATS.map((c) => `<section class="menu-cat" id="${c.slug}" aria-labelledby="h-${c.slug}">
            <header class="menu-cat-head">
              <div><h2 class="h-red" id="h-${c.slug}">${esc(c.name)}</h2>${c.desc ? `<p class="fine">${esc(c.desc)}</p>` : ""}</div>
              ${c.img ? `<img class="menu-cat-img is-illu" src="${catImg(c)}" alt="${esc(c.imgAlt || c.name)}" loading="lazy" decoding="async">` : ""}
            </header>
            <div class="menu-items" data-menu-list="${c.id}"></div>
          </section>`).join("\n          ")}
        </div>
        <div data-legend-slot></div>
      </div>
    </section>`
}));

/* ===================== Kategorieseiten ===================== */
CATS.forEach((c, i) => {
  const prev = CATS[(i - 1 + CATS.length) % CATS.length], next = CATS[(i + 1) % CATS.length];
  built.push(page({
    file: `speisekarte/${c.slug}.html`, active: "speisekarte", dialog: true, bodyClass: "page-menu page-category",
    title: `${c.seo && c.seo.title ? c.seo.title : c.name} · Speisekarte · ${R.name}`,
    desc: c.seo && c.seo.desc ? c.seo.desc : `${c.name} bei ${R.name} in Biberach – mit Preisen, Größen und Allergenkennzeichnung.`,
    body: () => `
    <section class="page-head page-head-cat">
      <div class="container">
        <nav class="breadcrumb" aria-label="Brotkrümelnavigation"><a href="index.html">${I.back}Speisekarte</a><span aria-hidden="true">/</span><span aria-current="page">${esc(c.name)}</span></nav>
        <div class="cat-head${c.img ? " has-img" : ""}">
          <div>
            <h1 class="h-red">${esc(c.name)}</h1>
            ${c.desc ? `<p class="lead">${esc(c.desc)}</p>` : ""}
            <form class="search search-sm" role="search" action="index.html" method="get">
          <label class="visually-hidden" for="q">Ganze Speisekarte durchsuchen</label>
          ${I.search}<input id="q" name="q" type="search" placeholder="Ganze Speisekarte durchsuchen …" autocomplete="off">
            </form>
          </div>
          ${c.img ? `<figure class="cat-head-img is-illu"><img src="${catImg(c)}" alt="${esc(c.imgAlt || c.name)}" width="720" height="540" decoding="async"><figcaption>Illustration – kein Produktfoto.</figcaption></figure>` : ""}
        </div>
      </div>
    </section>
    <nav class="cat-nav" aria-label="Kategorien">
        <div class="container"><ul class="chips">
          ${CATS.map((x) => `<li><a class="chip" href="${x.slug}.html"${x.id === c.id ? ' aria-current="page"' : ""}>${esc(x.name)}</a></li>`).join("")}
        </ul></div>
      </nav>
    <section class="section section-tight">
      <div class="container">
        ${noscript}
        <div class="menu-items" data-menu-list="${c.id}"></div>
        <nav class="cat-pager" aria-label="Weitere Kategorien">
          <a href="${prev.slug}.html" class="cat-pager-prev">${I.back}<span><small>Vorherige</small>${esc(prev.name)}</span></a>
          <a href="index.html" class="cat-pager-all">Alle Kategorien</a>
          <a href="${next.slug}.html" class="cat-pager-next"><span><small>Nächste</small>${esc(next.name)}</span>${I.arrow}</a>
        </nav>
        <div data-legend-slot></div>
      </div>
    </section>`
  }));
});

/* ===================== Bestellen ===================== */
built.push(page({
  file: "bestellen.html", active: "bestellen", dialog: true, bodyClass: "page-order",
  title: `Bestellen · ${R.name} Biberach`,
  desc: `Warenkorb und Bestellvorbereitung per WhatsApp – ${R.name} Biberach.`,
  body: (root) => `${pageHead("Bestellen", "Ihre Bestellung", "Stellen Sie Ihre Bestellung zusammen und senden Sie sie als WhatsApp-Nachricht an uns.")}
    <section class="section section-tight">
      <div class="container order-grid">
${orderMainHtml(root)}
        <aside class="order-side">
          <div class="side-card">
            <h2 class="h-sm">Lieber direkt bestellen?</h2>
            <a class="contact-card" href="${TEL}"><span class="contact-ico">${I.phone}</span><span><small>Anrufen</small>${esc(R.phoneDisplay)}</span></a>
            <a class="contact-card" href="${WA}" target="_blank" rel="noopener"><span class="contact-ico">${I.wa}</span><span><small>WhatsApp</small>${esc(R.whatsappDisplay)}</span></a>
            <p class="sheet-status"><span class="status-dot" data-open-dot></span><span data-open-status-long></span></p>
          </div>
          <div class="side-card side-card-yellow">
            <h2 class="h-sm">Lieferkonditionen</h2>
            <p>Mindestbestellwert ab ${euroShort(minZone.minOrder)} (${esc(minZone.name)}), Lieferkosten ab ${euroShort(minFee)}. Alle Gebiete auf der Seite <a href="${root}lieferservice.html">Lieferservice</a>.</p>
          </div>
        </aside>
      </div>
    </section>
    ${bonDialogHtml(root)}`
}));

/* ===================== Lieferservice ===================== */
built.push(page({
  file: "lieferservice.html", active: "lieferservice", bodyClass: "page-delivery",
  title: `Lieferservice & Abholung · ${R.name} Biberach`,
  desc: `Liefergebiete, Mindestbestellwerte und Lieferkosten von ${R.name} in Biberach an der Riß sowie Informationen zur Abholung in der ${R.street}.`,
  body: (root) => `${pageHead("Lieferservice &amp; Abholung", "So kommt Ihr Essen zu Ihnen", `Wir liefern in ${esc(R.cityShort)} und Umgebung bis ${maxKm} – oder Sie holen Ihre Bestellung direkt bei uns in der ${esc(R.street)} ab.`)}
    <section class="section section-tight">
      <div class="container">
        <div class="steps">
          <article class="step reveal"><span class="step-num">1</span><h2>Bestellen</h2><p>Telefonisch unter <a href="${TEL}">${esc(R.phoneDisplay)}</a>, per <a href="${WA}" target="_blank" rel="noopener">WhatsApp</a> oder über den <a href="${root}bestellen.html">Online-Warenkorb</a>.</p></article>
          <article class="step reveal"><span class="step-num">2</span><h2>Bestätigung abwarten</h2><p>Ihre Bestellung gilt erst als angenommen, wenn wir sie bestätigt haben.</p></article>
          <article class="step reveal"><span class="step-num">3</span><h2>Abholen oder liefern lassen</h2><p>Abholung in der ${esc(R.street)} – ohne Lieferkosten und ohne Mindestbestellwert – oder Lieferung zu Ihnen nach Hause.</p></article>
        </div>
      </div>
    </section>
    <section class="section zones-section">
      <div class="container">
        <h2 class="h-red">Liefergebiete &amp; Konditionen</h2>
        <div class="table-card reveal" data-delivery-table></div>
        <ul class="delivery-notes" data-delivery-notes></ul>
        <p class="fine">Die Entfernungszonen gelten ab ${esc(R.street)}. Welche Orte genau dazugehören, bestätigen wir vor der Eröffnung – online wählbar sind nur bestätigte Orte. Fragen beantworten wir gern telefonisch unter <a href="${TEL}">${esc(R.phoneDisplay)}</a>.</p>
      </div>
    </section>
    <section class="section">
      <div class="container visit-grid">
        <div>
          <h2 class="h-red">Bestell- und Abholzeiten</h2>
          <p>Bestellungen nehmen wir während der Öffnungszeiten an (${esc(hoursSummary(", "))} Uhr${restLower ? ", " + esc(restLower) : ""}) – ${cutSentence}. Die Lieferzeit beträgt je nach Entfernung 20–90 Minuten.</p>
          <p>Die Lieferung erfolgt ohne Teller, Besteck und Dekoration.</p>
          ${contactCards()}
        </div>
        <div>${hoursCard()}</div>
      </div>
    </section>
${ctaBand(root)}`
}));

/* ===================== Über uns ===================== */
built.push(page({
  file: "ueber-uns.html", active: "ueber-uns", bodyClass: "page-about",
  title: `Über uns · ${R.name} Biberach`,
  desc: `${R.name} in Biberach an der Riß – Lieferservice und Abholung mit einer vielseitigen Speisekarte.`,
  body: (root) => `${pageHead("Über uns", `Willkommen bei ${esc(R.name)}`, `Abholung und Lieferservice in der ${esc(R.street)} in Biberach an der Riß.`)}
    <section class="section section-tight">
      <div class="container about-grid">
        <div class="prose reveal">
          <p>${esc(R.name)} verbindet auf einer Karte, was viele gern essen: Salate, Burger und Fingerfood, Döner und überbackene Teller, Pizza und Party-Pizza, Nudelgerichte, Schnitzel sowie Currys und Masala-Gerichte der indischen und pakistanischen Küche – vom Naan bis zum Butter Chicken –, dazu vegetarische Gerichte, Desserts und Getränke.</p>
          <p>Alle Speisen bereiten wir frisch zu. Deshalb kann es bei viel Betrieb etwas dauern – bei der Lieferung rechnen Sie je nach Entfernung mit etwa 20 bis 90 Minuten.</p>
          <p>Sie holen Ihre Bestellung bei uns in der ${esc(R.street)} ab oder lassen sich in ${esc(R.cityShort)} und Umgebung beliefern.</p>
        </div>
        <div class="about-photos reveal">
          <figure class="is-illu"><img src="${root}assets/images/illu/pizza.svg" alt="Illustration: Pizza" loading="lazy" decoding="async"><figcaption>Pizza &amp; Pasta</figcaption></figure>
          <figure class="is-illu"><img src="${root}assets/images/illu/curry.svg" alt="Illustration: Curry mit Reis" loading="lazy" decoding="async"><figcaption>Currys &amp; Masala</figcaption></figure>
        </div>
      </div>
    </section>
${ctaBand(root)}`
}));

/* ===================== Kontakt ===================== */
const morePhones = (R.phonesMore || []).map((p) => `<a href="tel:${esc(p.link)}">${esc(p.display)}</a>${p.purpose ? " (" + esc(p.purpose) + ")" : ""}`).join(" · ");
built.push(page({
  file: "kontakt.html", active: "kontakt", bodyClass: "page-contact",
  title: `Kontakt & Anfahrt · ${R.name} Biberach`,
  desc: `Adresse, Telefon, WhatsApp und Öffnungszeiten von ${R.name} in der ${R.street}, Biberach an der Riß.`,
  body: (root) => `${pageHead("Kontakt &amp; Anfahrt", "So erreichen Sie uns")}
    <section class="section section-tight">
      <div class="container visit-grid">
        <div>
          <address class="address address-lg"><strong>${esc(R.name)}</strong><br>${esc(R.street)}<br>${esc(R.zip)} ${esc(R.city)}</address>
          ${contactCards()}
          ${morePhones ? `<p>Weitere Telefonnummern: ${morePhones}</p>` : ""}
          ${R.email ? `<p>E-Mail: <a href="mailto:${esc(R.email)}">${esc(R.email)}</a></p>` : ""}
          <p>Bestellungen nehmen wir ${cutSentence} an – telefonisch, per WhatsApp oder über unseren <a href="${root}bestellen.html">Online-Warenkorb</a>.</p>
        </div>
        <div>${hoursCard()}</div>
      </div>
    </section>
    ${reviewOk ? `<section class="section section-tight review-section">
      <div class="container">
        <div class="review-card reveal">
          <div>
            <h2>Wie hat es Ihnen bei SHAHI gefallen?</h2>
            <p>Wir freuen uns über Ihre ehrliche Bewertung auf Google.</p>
          </div>
          <a class="btn btn-accent btn-lg" href="${esc(REVIEW)}" target="_blank" rel="noopener noreferrer">Jetzt auf Google bewerten</a>
        </div>
      </div>
    </section>` : `<!-- Google-Bewertung: ausgeblendet, bis restaurant.googleReviewUrl in assets/js/menu-data.js gesetzt ist -->`}
${ctaBand(root)}`
}));

/* ===================== Rechtliches ===================== */
const ownerComplete = R.owner && R.legalForm && R.email;
const draftNote = (what) => `<p class="legal-draft" role="note"><strong>Entwurf:</strong> ${what}</p>`;
const vendorBlock = () => `${ph(R.owner, "Vollständiger Name des Inhabers bzw. Firma laut Gewerbeanmeldung/Register")}<br>${ph(R.legalForm, "Rechtsform, z. B. Einzelunternehmen")}, handelnd unter „${esc(R.name)}“<br>${esc(R.street)}<br>${esc(R.zip)} ${esc(R.city)}<br>Deutschland`;

built.push(page({
  file: "impressum.html", active: "impressum", bodyClass: "page-legal",
  title: `Impressum · ${R.name} Biberach`, desc: `Impressum von ${R.name} Biberach.`,
  body: () => `${pageHead("Rechtliches", "Impressum")}
    <section class="section section-tight"><div class="container prose legal">
      ${ownerComplete ? "" : draftNote("Markierte Angaben fehlen noch und werden vom Betreiber ergänzt. Ohne vollständiges Impressum wird die Seite nicht öffentlich betrieben.")}
      <h2>Angaben gemäß § 5 DDG</h2>
      <p>${vendorBlock()}</p>
      ${R.representative ? `<p>Vertretungsberechtigt: ${esc(R.representative)}</p>` : `<p>Vertretungsberechtigt: <span class="ph">[nur bei Gesellschaften – sonst Zeile löschen – vom Betreiber zu ergänzen]</span></p>`}
      <h2>Kontakt</h2><p>Telefon: <a href="${TEL}">${esc(R.phoneDisplay)}</a><br>WhatsApp: <a href="${WA}" target="_blank" rel="noopener">${esc(R.whatsappDisplay)}</a><br>E-Mail: ${R.email ? `<a href="mailto:${esc(R.email)}">${esc(R.email)}</a>` : ph(null, "E-Mail-Adresse")}</p>
      <h2>Register und Umsatzsteuer</h2>
      <p>Handelsregister: ${ph(R.register, "Registergericht und Nummer – nur falls eingetragen, sonst Zeile löschen")}<br>
      Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: ${ph(R.vatId, "USt-IdNr. – nur falls vorhanden, sonst Zeile löschen")}<br>
      Wirtschafts-Identifikationsnummer: ${ph(R.economicId, "W-IdNr. – nur falls zugeteilt, sonst Zeile löschen")}</p>
      ${R.supervisoryAuthority ? `<h2>Aufsichtsbehörde</h2><p>${esc(R.supervisoryAuthority)}</p>` : `<h2>Aufsichtsbehörde</h2><p><span class="ph">[nur falls für die Tätigkeit eine behördliche Zulassung nötig ist (rechtlich zu prüfen), sonst Abschnitt löschen – vom Betreiber zu ergänzen]</span></p>`}
      <h2>Verbraucherstreitbeilegung</h2><p>${ph(R.disputeResolution, "Angabe nach § 36 VSBG, soweit erforderlich – rechtlich zu prüfen")}</p>
      ${R.responsibleContent ? `<h2>Verantwortlich für den Inhalt</h2><p>${esc(R.responsibleContent)}</p>` : ""}
      <h2>Webdesign</h2><p><a href="https://braeuer.digital" target="_blank" rel="noopener">Bräuer.Digital</a></p>
      <h2>Bildnachweis</h2><p>Logo: ${esc(R.name)} (Logo laut Speisekarte/Flyer). Illustrationen: eigene Gestaltung für ${esc(R.name)} (Bräuer.Digital).</p>
    </div></section>`
}));

built.push(page({
  file: "datenschutz.html", active: "datenschutz", bodyClass: "page-legal",
  title: `Datenschutz · ${R.name} Biberach`, desc: `Datenschutzerklärung von ${R.name} Biberach.`,
  body: () => {
    let n = 0; const h = (t) => `<h2>${++n}. ${t}</h2>`;
    return `${pageHead("Rechtliches", "Datenschutzerklärung")}
    <section class="section section-tight"><div class="container prose legal">
      ${draftNote("Diese Datenschutzerklärung ist auf die tatsächliche technische Umsetzung abgestimmt (statische Website auf GitHub Pages, Warenkorb im Browser, Bestellung über WhatsApp). Markierte Stellen ergänzt der Betreiber; vor der Veröffentlichung fachlich prüfen lassen.")}
      <p>Mit dieser Datenschutzerklärung informieren wir Sie darüber, welche personenbezogenen Daten beim Besuch dieser Website sowie bei einer Kontaktaufnahme oder Bestellanfrage verarbeitet werden. Personenbezogene Daten sind alle Informationen, die sich auf eine identifizierte oder identifizierbare Person beziehen.</p>

      ${h("Verantwortlicher")}
      <p>Verantwortlich im Sinne von Art. 4 Nr. 7 DSGVO ist:<br>${ph(R.owner, "Name des Inhabers bzw. Firma")} (${ph(R.legalForm, "Rechtsform")}, handelnd unter ${esc(R.name)})<br>${esc(R.street)}, ${esc(R.zip)} ${esc(R.city)}, Deutschland<br>Telefon: <a href="${TEL}">${esc(R.phoneDisplay)}</a><br>E-Mail: ${R.email ? `<a href="mailto:${esc(R.email)}">${esc(R.email)}</a>` : ph(null, "E-Mail-Adresse")}</p>

      ${h("Hosting über GitHub Pages und technische Zugriffsdaten")}
      <p>Diese Website ist eine rein statische Website. Sie wird über den Dienst GitHub Pages der GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA, bereitgestellt. Beim Aufruf der Website verarbeitet GitHub technisch notwendige Daten, damit die Seiten ausgeliefert und vor Missbrauch geschützt werden können. Dazu gehören insbesondere Ihre IP-Adresse, Datum und Uhrzeit des Zugriffs, die aufgerufene Seite oder Datei, Browsertyp und Betriebssystem. Nach Angaben von GitHub werden die IP-Adressen der Besucher von GitHub-Pages-Seiten zu Sicherheitszwecken protokolliert und gespeichert. Wir selbst erhalten diese Protokolle nicht und werten keine Zugriffsdaten aus.</p>
      <p>Zweck der Verarbeitung ist die sichere und stabile Bereitstellung der Website. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse liegt in einem technisch fehlerfreien und sicheren Betrieb. Dabei kann eine Übermittlung in die USA stattfinden. GitHub, Inc. ist eine Tochtergesellschaft der Microsoft Corporation; <span class="ph">[Grundlage der Drittlandübermittlung (z. B. Zertifizierung nach dem EU-U.S. Data Privacy Framework, Standardvertragsklauseln) und Auftragsverarbeitung mit GitHub prüfen und angeben – vom Betreiber zu ergänzen]</span>. Weitere Informationen: <a href="https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener">Datenschutzerklärung von GitHub</a>.</p>
      <p>Die Verbindung zur Website ist per HTTPS verschlüsselt. Bitte beachten Sie, dass sich Sicherheitsrisiken bei der Datenübertragung im Internet nie vollständig ausschließen lassen.</p>

      ${h("Keine Cookies, kein Tracking, keine externen Inhalte")}
      <p>Diese Website setzt keine Cookies, verwendet keine Analyse-, Werbe- oder Trackingdienste und lädt keine Schriften, Karten, Videos oder Skripte von fremden Servern nach. Alle Inhalte werden direkt mit der Website ausgeliefert. Ein Einwilligungsbanner ist daher nicht erforderlich.</p>

      ${h("Warenkorb – Speicherung in Ihrem Browser")}
      <p>Damit Ihre Auswahl beim Wechsel zwischen den Seiten erhalten bleibt, speichert die Website Daten ausschließlich lokal in Ihrem Browser. Diese Daten werden nicht automatisch an uns oder an Dritte übertragen.</p>
      <ul>
        <li><strong>Warenkorb</strong> (localStorage, Schlüssel „shahi-cart-v1“): ausgewählte Gerichte, Mengen, Varianten, Extras und Hinweise zum Gericht, der Zeitpunkt der letzten Änderung sowie eine zufällig erzeugte Bestellreferenz (Jahr, Monat und acht Zufallszeichen – ohne Bezug zu Name, Telefonnummer oder IP-Adresse), die Ihrer Bestellanfrage zur Zuordnung dient. Name, Telefonnummer und Adresse sind darin nicht enthalten. Der Warenkorb wird spätestens ${OP.cartHours || 12} Stunden nach der letzten Änderung beim nächsten Seitenaufruf automatisch gelöscht, außerdem sofort, wenn Sie ihn leeren.</li>
        <li><strong>Ihre Angaben im Bestellformular</strong> (sessionStorage, Schlüssel „shahi-form-v1“): Name, Telefonnummer, Bestellart, Lieferort, Lieferadresse mit Adresszusatz und Anmerkung. Diese Angaben bleiben nur in dem geöffneten Browser-Tab erhalten und werden gelöscht, sobald Sie den Tab bzw. Browser schließen, „Warenkorb und Angaben löschen“ oder „Neue Bestellung beginnen“ wählen.</li>
      </ul>
      <p>Die Speicherung ist für den von Ihnen gewünschten Warenkorb unbedingt erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG). Soweit dabei personenbezogene Daten verarbeitet werden, ist Rechtsgrundlage Art. 6 Abs. 1 lit. b DSGVO (Vorbereitung einer von Ihnen gewünschten Bestellung). Sie können die Daten zusätzlich jederzeit über die Einstellungen Ihres Browsers löschen.</p>

      ${h("Bestellung über WhatsApp")}
      <p>Über den Warenkorb können Sie Gerichte auswählen, Abholung oder Lieferung wählen, eine Wunschzeit angeben und eine Bestellübersicht prüfen. Mit „Weiter zu WhatsApp“ öffnet sich WhatsApp bzw. WhatsApp Web mit einer vorbereiteten Nachricht an unsere WhatsApp-Nummer ${esc(R.whatsappDisplay)}. Die Bestell- und Kontaktangaben sind dabei im aufgerufenen Link enthalten und werden <strong>bereits beim Öffnen des Links</strong> an WhatsApp übergeben. An uns übermittelt wird die Nachricht erst, wenn Sie sie in WhatsApp selbst absenden. Alternativ können Sie den Bestelltext kopieren; er wird dabei nur in die Zwischenablage Ihres Geräts gelegt.</p>
      <p>Senden Sie uns die Nachricht, verarbeiten wir die darin enthaltenen Angaben (insbesondere Bestellreferenz, Name, Telefonnummer, bestellte Gerichte, Bestellart, Lieferadresse, Wunschzeit und Anmerkungen), um Ihre Anfrage zu prüfen, die Bestellung individuell zu bestätigen oder abzulehnen und sie auszuführen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO; bei allgemeinen Anfragen Art. 6 Abs. 1 lit. f DSGVO (Interesse an der Beantwortung von Anfragen). Auf der Website findet keine Zahlung statt.</p>
      <p>Bei der Nutzung von WhatsApp werden Daten auch durch den Anbieter, die WhatsApp Ireland Limited (Irland), verarbeitet. Dabei kann eine Übermittlung in Drittländer, insbesondere in die USA, stattfinden. Die Muttergesellschaft Meta Platforms, Inc. ist nach dem EU-U.S. Data Privacy Framework zertifiziert. Einzelheiten finden Sie in der <a href="https://www.whatsapp.com/legal/privacy-policy-eea" target="_blank" rel="noopener">Datenschutzrichtlinie von WhatsApp</a>. Wenn Sie WhatsApp nicht nutzen möchten, können Sie uns gerne telefonisch unter <a href="${TEL}">${esc(R.phoneDisplay)}</a> erreichen.</p>

      ${h("Kontakt per Telefon" + (R.email ? " und E-Mail" : ""))}
      <p>Wenn Sie uns anrufen${R.email ? " oder eine E-Mail schreiben" : ""}, verarbeiten wir die von Ihnen mitgeteilten Daten (z. B. Name, Telefonnummer, Inhalt Ihres Anliegens, Bestell- und Lieferangaben), soweit dies zur Bearbeitung erforderlich ist. Die Telefon- und E-Mail-Links auf der Website öffnen lediglich die entsprechende Anwendung auf Ihrem Gerät; die Website selbst betreibt kein Kontaktformular. ${R.email ? "" : '<span class="ph">[E-Mail-Anbieter angeben, sobald eine E-Mail-Adresse feststeht – vom Betreiber zu ergänzen]</span> '}Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO bei Anfragen im Zusammenhang mit einer Bestellung, im Übrigen Art. 6 Abs. 1 lit. f DSGVO.</p>

      ${h("Link zu Google Maps")}
      <p>Die Website bindet keine Karte ein. Erst wenn Sie auf „In Google Maps öffnen“ klicken, wird Google Maps (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland) in einem neuen Fenster aufgerufen. Ab dann gelten die <a href="https://policies.google.com/privacy?hl=de" target="_blank" rel="noopener">Datenschutzhinweise von Google</a>.</p>
${reviewOk ? `
      ${h("Link zur Google-Bewertung")}
      <p>Über „Jetzt auf Google bewerten“ gelangen Sie zum Google-Unternehmensprofil von ${esc(R.name)}. Der Link öffnet eine Seite von Google (Google Ireland Limited) in einem neuen Fenster; vorher werden keine Daten an Google übermittelt. Für die Verarbeitung auf den Seiten von Google gelten die <a href="https://policies.google.com/privacy?hl=de" target="_blank" rel="noopener">Datenschutzhinweise von Google</a>.</p>` : ""}

      ${h("Empfänger der Daten")}
      <p>Personenbezogene Daten geben wir nur weiter, soweit dies für den Betrieb der Website, die Kommunikation, die Bearbeitung und Ausführung Ihrer Bestellung oder zur Erfüllung gesetzlicher Pflichten erforderlich ist. Empfänger können insbesondere sein: der Hostinganbieter GitHub, der Kommunikationsdienst WhatsApp, unsere Mitarbeitenden im Rahmen der Bestellbearbeitung und Lieferung, unsere Steuerberatung sowie – im gesetzlich vorgeschriebenen Umfang – Behörden. Eine Weitergabe zu Werbezwecken findet nicht statt.</p>

      ${h("Speicherdauer")}
      <p>Wir speichern personenbezogene Daten nur so lange, wie es für die genannten Zwecke erforderlich ist. Daten aus Bestellanfragen löschen wir, sobald sie für die Abwicklung und etwaige Rückfragen nicht mehr benötigt werden, es sei denn, gesetzliche Aufbewahrungspflichten (insbesondere nach Handels- und Steuerrecht für Buchungsbelege) stehen dem entgegen. <span class="ph">[Konkrete Löschfristen für WhatsApp-Chats und Bestelldaten – vom Betreiber zu ergänzen]</span> Die im Browser gespeicherten Daten werden wie in Abschnitt 4 beschrieben gelöscht.</p>

      ${h("Bereitstellung der Daten")}
      <p>Für den bloßen Besuch der Website müssen Sie keine Angaben machen. Für eine Bestellanfrage benötigen wir Ihren Namen, eine Telefonnummer für Rückfragen und bei Lieferung die Lieferadresse; ohne diese Angaben können wir die Bestellung nicht bearbeiten. Eine automatisierte Entscheidungsfindung einschließlich Profiling (Art. 22 DSGVO) findet nicht statt.</p>

      ${h("Ihre Rechte")}
      <p>Sie haben im Rahmen der gesetzlichen Voraussetzungen das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16 DSGVO), Löschung (Art. 17 DSGVO), Einschränkung der Verarbeitung (Art. 18 DSGVO), Datenübertragbarkeit (Art. 20 DSGVO) sowie auf Widerspruch (Art. 21 DSGVO). Wenden Sie sich dazu einfach an die oben genannten Kontaktdaten.</p>
      <p><strong>Widerspruchsrecht:</strong> Verarbeiten wir Daten auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO, können Sie dieser Verarbeitung aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit widersprechen (Art. 21 Abs. 1 DSGVO).</p>
      <p>Sie haben außerdem das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren (Art. 77 DSGVO). Für uns zuständig ist: Der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg, Heilbronner Straße 35, 70191 Stuttgart, <a href="https://www.baden-wuerttemberg.datenschutz.de/" target="_blank" rel="noopener">www.baden-wuerttemberg.datenschutz.de</a>.</p>

      ${h("Aktualität dieser Datenschutzerklärung")}
      <p>Wir passen diese Datenschutzerklärung an, wenn sich die Funktionen der Website, eingesetzte Dienste (z. B. bei Anbindung der Domain ${esc((R.website || "").replace(/^https?:\/\//, ""))}) oder rechtliche Vorgaben ändern.</p>
      <p class="fine">Stand: 16. November 2026</p>
    </div></section>`;
  }
}));

/* Bestell- und Verbraucherinformationen (inkl. Liefer- und Zahlungsbedingungen) */
built.push(page({
  file: "bestellinformationen.html", active: "bestellinformationen", bodyClass: "page-legal",
  title: `Bestell- & Verbraucherinformationen · ${R.name} Biberach`, desc: `Anbieter, Preise, Liefer- und Zahlungsbedingungen, Ablauf der Bestellung und Allergeninformationen von ${R.name}.`,
  body: (root) => `${pageHead("Rechtliches", "Bestell- &amp; Verbraucherinformationen", "Was Sie vor einer Bestellung wissen sollten.")}
    <section class="section section-tight"><div class="container prose legal">
      ${draftNote("Vor dem Livegang rechtlich prüfen lassen. Markierte Stellen ergänzt der Betreiber.")}
      <h2>Anbieter</h2>
      <p>${vendorBlock()}<br>Telefon: <a href="${TEL}">${esc(R.phoneDisplay)}</a> · WhatsApp: ${esc(R.whatsappDisplay)} · E-Mail: ${R.email ? `<a href="mailto:${esc(R.email)}">${esc(R.email)}</a>` : ph(null, "E-Mail-Adresse")}</p>
      <h2>Angebot und wesentliche Merkmale</h2>
      <p>Wir bieten frisch zubereitete Speisen und Getränke zur Abholung und zur Lieferung an. Bezeichnung, Beschreibung, Größen und Kennzeichnung (Allergene, Zusatzstoffe) jedes Gerichts finden Sie in der <a href="${root}speisekarte/index.html">Speisekarte</a> und in der <a href="${root}allergene.html">Allergenübersicht</a>. Die Abbildungen auf dieser Website sind Illustrationen, keine Produktfotos.</p>
      <h2>Preise, Pfand und Lieferkosten</h2>
      <p>${taxNote} ${TX.status === "bestaetigt" ? "" : '<span class="ph">[Hinweis zur Umsatzsteuer (Regelbesteuerung „inkl. USt.“ oder Kleinunternehmer nach § 19 UStG) – vom Betreiber zu bestätigen]</span>'}</p>
      <p>Für Getränke in pfandpflichtigen Einwegverpackungen wird Pfand berechnet. Das Pfand steht in der Speisekarte beim Getränk und wird im Warenkorb, in der Bestellübersicht und in der Bestellnachricht gesondert ausgewiesen. Bei Lieferung kommen Lieferkosten je nach Liefergebiet hinzu. Mindestbestellwerte beziehen sich auf den Warenwert ohne Lieferkosten und Pfand.</p>
      <table><thead><tr><th scope="col">Liefergebiet</th><th scope="col">Mindestbestellwert</th><th scope="col">Lieferkosten</th></tr></thead><tbody>
        ${zones.map((z) => `<tr><td>${esc(z.name)}</td><td>${euro(z.minOrder)}</td><td>${euro(z.fee)}</td></tr>`).join("")}
      </tbody></table>
      <h2>Lieferbedingungen</h2>
      <p>Wir liefern nur innerhalb unserer <a href="${root}lieferservice.html">Liefergebiete</a> (Entfernungszonen ab ${esc(R.street)}); online wählbar sind nur bestätigte Orte. Liegt Ihre Adresse außerhalb, ist online nur die Abholung möglich. Bestellungen nehmen wir während der Öffnungszeiten ${cutSentence} an${restLower ? ", " + restLower : ""}. Vorbestellungen außerhalb der Öffnungszeiten sind derzeit nicht möglich. Die Lieferung erfolgt ohne Teller, Besteck und Dekoration.</p>
      <p>${FRESH_TEXT}</p>
      <h2>Zahlung</h2>
      <p>${payText} ${payKnown ? "" : '<span class="ph">[Akzeptierte Zahlungsarten (z. B. bar bei Abholung/Lieferung, Karte) – vom Betreiber zu ergänzen]</span>'}</p>
      <h2>So kommt der Vertrag zustande</h2>
      <ol>
        <li>Sie legen Gerichte in den Warenkorb und wählen Abholung oder Lieferung.</li>
        <li>Sie geben Ihre Kontaktdaten, bei Lieferung Ihre Adresse, und eine Wunschzeit ein.</li>
        <li>In der Bestellübersicht prüfen Sie alle Angaben. Über „Ändern“, „Entfernen“ und „Zurück und ändern“ korrigieren Sie Eingabefehler jederzeit.</li>
        <li>„Weiter zu WhatsApp“ öffnet WhatsApp mit Ihrer vorbereiteten Bestellnachricht. Auf dem Weg dorthin wird noch nichts an uns übermittelt.</li>
        <li>Erst wenn Sie die Nachricht in WhatsApp selbst absenden, erhalten wir Ihre Bestellung. Damit geben Sie nach dem vorgesehenen Bestellmodell eine verbindliche, zahlungspflichtige Bestellung ab.</li>
        <li>Der Vertrag kommt zustande, wenn wir Ihre Bestellung ausdrücklich per WhatsApp annehmen. Können wir nicht liefern (z. B. bei Überlastung), teilen wir Ihnen das ebenfalls per WhatsApp mit.</li>
      </ol>
      <p>Vertragssprache ist Deutsch. Die Website speichert keine Bestellungen; Ihre Bestellung bleibt als Nachricht in Ihrem WhatsApp-Chat mit uns erhalten. Die Bestellübersicht können Sie vor dem Absenden drucken oder als PDF speichern.</p>
      <h2>Widerrufsrecht</h2>
      <p><span class="ph">[Angaben zum Widerrufsrecht bzw. zu den gesetzlichen Ausnahmen – rechtlich zu prüfen (u. a. § 312g Abs. 2 BGB, ggf. Widerrufsfunktion nach § 356a BGB) – vom Betreiber zu ergänzen]</span></p>
      <h2>Allergene und Zusatzstoffe</h2>
      <p>Allergene und Zusatzstoffe sind bei jedem Gericht angegeben und in der <a href="${root}allergene.html">Allergenübersicht</a> zusammengefasst. Bei Allergien oder Unverträglichkeiten fragen Sie bitte vor der Bestellung telefonisch nach.</p>
      <h2>Verbraucherstreitbeilegung</h2>
      <p>${ph(R.disputeResolution, "Angabe nach § 36 VSBG, soweit erforderlich – rechtlich zu prüfen")}</p>
      <h2>Kontakt bei Fragen und Beschwerden</h2>
      <p>Telefon <a href="${TEL}">${esc(R.phoneDisplay)}</a>, WhatsApp ${esc(R.whatsappDisplay)}.</p>
      <p class="fine">Stand: 16. November 2026</p>
    </div></section>`
}));

/* Allergenübersicht (alle Gerichte, statisch – auch ohne JavaScript lesbar) */
{
  const L = D.legend;
  const split = (codes) => { const a = [], z = []; String(codes || "").split(",").map((c) => c.trim()).filter(Boolean).forEach((c) => (/^\d+$/.test(c) ? z : a).push(c)); return [a, z]; };
  built.push(page({
    file: "allergene.html", active: "allergene", bodyClass: "page-legal",
    title: `Allergene & Zusatzstoffe · ${R.name} Biberach`, desc: `Allergene und Zusatzstoffe aller Gerichte und Getränke von ${R.name} auf einen Blick.`,
    body: (root) => `${pageHead("Speisekarte", "Allergene &amp; Zusatzstoffe", "Kennzeichnung aller Gerichte und Getränke laut Speisekarte.")}
    <section class="section section-tight"><div class="container prose legal">
      <p>Buchstaben stehen für Allergene, Zahlen für Zusatzstoffe. Die Erläuterung steht unter der Tabelle. ${esc(L.notes[L.notes.length - 1] || "")}</p>
      ${CATS.map((c) => `<h2>${esc(c.name)}</h2>
      <table><thead><tr><th scope="col">Nr.</th><th scope="col">Gericht</th><th scope="col">Allergene</th><th scope="col">Zusatzstoffe</th></tr></thead><tbody>
        ${D.items.filter((it) => it.cat === c.id).map((it) => { const [a, z] = split(it.codes); return `<tr><td>${esc(it.nr || "–")}</td><td>${esc(it.name)}</td><td>${a.length ? esc(a.join(", ")) : "–"}</td><td>${z.length ? esc(z.join(", ")) : "–"}</td></tr>`; }).join("\n        ")}
      </tbody></table>`).join("\n      ")}
      <h2>Auswahl und Extras</h2>
      <p>${Object.values(D.optionGroups).flatMap((g) => g.options.filter((o) => o.codes).map((o) => `${esc(o.name)} (${esc(g.label)}): ${esc(o.codes)}`)).join(" · ") || "–"}</p>
      <h2>Legende</h2>
      <h3>Allergene</h3><p>${Object.entries(L.allergens).map(([k, v]) => `<strong>${esc(k)}</strong> ${esc(v)}`).join("<br>")}</p>
      <h3>Zusatzstoffe</h3><p>${Object.entries(L.additives).map(([k, v]) => `<strong>${esc(k)}</strong> ${esc(v)}`).join("<br>")}</p>
      ${L.notes.slice(0, -1).map((n) => `<p>${esc(n)}</p>`).join("")}
      <p><a href="${root}speisekarte/index.html">Zur Speisekarte</a></p>
    </div></section>`
  }));
}

/* ===================== 404 ===================== */
/* Wird am Domain-Stamm ausgeliefert (GitHub Pages mit eigener Domain). Absolute Pfade, weil die Seite
   unter beliebiger Tiefe erscheinen kann. */
{
  const f = page({
    file: "404.html", active: "404", bodyClass: "page-404",
    title: `Seite nicht gefunden · ${R.name} Biberach`, desc: "Diese Seite gibt es nicht.",
    body: (root) => `${pageHead("Fehler 404", "Diese Seite gibt es leider nicht", "Vielleicht hilft Ihnen einer dieser Wege weiter:")}
    <section class="section section-tight"><div class="container">
      <div class="cta-actions">
        <a class="btn btn-primary btn-lg" href="${root}index.html">Zur Startseite</a>
        <a class="btn btn-accent btn-lg" href="${root}speisekarte/index.html">Zur Speisekarte</a>
      </div>
    </div></section>`
  });
  const out = path.join(ROOT, f);
  fs.writeFileSync(out, fs.readFileSync(out, "utf8").replace(/(href|src)="(?!https?:|mailto:|tel:|#|\/)/g, '$1="/'));
  built.push(f);
}

/* ===================== robots.txt ===================== */
fs.writeFileSync(path.join(ROOT, "robots.txt"), OP.indexable
  ? `User-agent: *\nAllow: /\n`
  : `# Vorschau-/Vorabversion: bitte nicht indexieren.\n# Nach Freigabe und Domain-Anbindung: operation.indexable = true in menu-data.js, dann node tools/build.mjs.\nUser-agent: *\nDisallow: /\n`);

/* ===================== Offene Prüfpunkte der Speisekarte ===================== */
{
  const rows = [];
  for (const [gid, g] of Object.entries(D.optionGroups)) (g.checks || []).forEach((x) => rows.push([`Optionsgruppe „${g.label}“ (${gid})`, x.field || "optionen", x.note, x.blocks]));
  D.items.forEach((it) => (it.checks || []).forEach((x) => rows.push([`${it.nr ? "Nr. " + it.nr + " " : ""}${it.name}`, x.field || "", x.note, x.blocks])));
  const unconfirmed = D.delivery.zones.flatMap((z) => z.places.filter((p) => !p.confirmed).map((p) => `${p.name} (${p.zip}) → ${z.name}`));
  const md = `# Offene Prüfpunkte der Speisekarte

Automatisch erzeugt von \`node tools/build.mjs\` aus \`public/assets/js/menu-data.js\` – nicht von Hand bearbeiten.
${rows.length} Punkte, davon ${rows.filter((r) => r[3]).length} sperrend.

**Sperrend** = im Normalbetrieb online nicht bestellbar („gerne telefonisch“), bis der Betreiber den Punkt bestätigt und der Eintrag \`checks\` beim Gericht bzw. bei der Optionsgruppe gelöscht ist.

| Gericht / Gruppe | Feld | Hinweis | sperrend |
|---|---|---|---|
${rows.map((r) => `| ${r[0].replace(/\|/g, "\\|")} | ${r[1]} | ${r[2].replace(/\|/g, "\\|")} | ${r[3] ? "ja" : ""} |`).join("\n")}

## Lieferorte ohne Bestätigung (online nicht wählbar)

${unconfirmed.length ? unconfirmed.map((x) => "- " + x).join("\n") : "– keine –"}

## Öffnungszeiten

Zeiten bestätigt: ${H.confirmed.times ? "ja" : "**nein**"} · Vorbereitungszeiten bestätigt: ${H.confirmed.lead ? "ja" : "**nein**"} · späteste Wunschzeit bestätigt: ${H.confirmed.latestWish ? "ja" : "**nein**"}
`;
  fs.mkdirSync(path.join(BASE, "docs"), { recursive: true });
  fs.writeFileSync(path.join(BASE, "docs/PRUEFPUNKTE-SPEISEKARTE.md"), md);
  built.push("../docs/PRUEFPUNKTE-SPEISEKARTE.md");
}

console.log(`${built.length} Dateien erzeugt (Modus: ${OP.mode}${R.testMode ? ", TESTMODUS" : ""}):\n  ` + built.join("\n  "));
