/* =====================================================================
   SHAHI Küche – Kernlogik (ohne DOM)
   ---------------------------------------------------------------------
   Preise, Warenkorb, Steueraufteilung, Pfand, Liefergebiet, Öffnungszeiten
   (Europe/Berlin), Bestell-Referenz und WhatsApp-Nachricht.
   Läuft im Browser (window.ShahiCore) und in Node (require) – dadurch sind
   alle Rechenregeln automatisiert testbar (tests/unit.test.mjs).

   Geldbeträge werden ausschließlich als ganze Cent verarbeitet.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ShahiCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ------------------------------------------------------------------ */
  /* Hilfsfunktionen                                                     */
  /* ------------------------------------------------------------------ */
  var DIACRIT_RE = new RegExp("[\\u0300-\\u036f]", "g");
  var CTRL_RE = new RegExp("[\\u0000-\\u001f\\u007f\\u200b-\\u200f\\u2028\\u2029]", "g");
  function isCent(n) { return typeof n === "number" && isFinite(n) && Math.floor(n) === n; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  /** 1234 → "12,34 €" (ohne geschützte Leerzeichen, damit Nachrichten sauber bleiben) */
  function euro(cent) {
    var c = Math.round(cent || 0), neg = c < 0;
    c = Math.abs(c);
    var e = String(Math.floor(c / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (neg ? "-" : "") + e + "," + pad(c % 100) + " €";
  }

  /** Text für Suche vereinheitlichen: Groß/klein, Umlaute, ß, Akzente */
  function fold(s) {
    return String(s || "").toLowerCase()
      .replace(/ß/g, "ss").replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u")
      .normalize("NFD").replace(DIACRIT_RE, "")
      .replace(/ae/g, "a").replace(/oe/g, "o").replace(/ue/g, "u")
      .replace(/[^a-z0-9]+/g, " ").trim();
  }

  /** Eingaben säubern: Steuerzeichen entfernen, Leerraum zusammenfassen, Länge begrenzen */
  function clean(s, max) {
    var t = String(s == null ? "" : s).replace(CTRL_RE, " ").replace(/\s+/g, " ").trim();
    return max ? t.slice(0, max) : t;
  }

  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }

  /* ------------------------------------------------------------------ */
  /* Speisekarte normalisieren und prüfen                                */
  /* ------------------------------------------------------------------ */
  function normalizeMenu(menu) {
    var groups = menu.optionsgruppen || {};
    var catById = {};
    var categories = (menu.kategorien || []).map(function (c, i) {
      var o = {
        id: c.id, name: c.name, beschreibung: c.beschreibung || "", illustration: c.illustration || "",
        optionen: c.optionen || [], steuer: c.steuer || "speisen", seo: c.seo || {}, index: i
      };
      catById[c.id] = o;
      return o;
    });
    var products = (menu.produkte || []).map(function (p, i) {
      var cat = catById[p.kategorie] || { optionen: [], steuer: "speisen", illustration: "" };
      var varianten = Array.isArray(p.varianten) && p.varianten.length
        ? p.varianten.map(function (v) { return { id: v.id, name: v.name || "", preisCent: v.preisCent, volumenMl: v.volumenMl || null }; })
        : [{ id: "standard", name: "", preisCent: p.preisCent, volumenMl: null }];
      var steuer = p.steuer || cat.steuer || "speisen";
      if (typeof steuer === "string") steuer = { typ: steuer };
      return {
        id: p.id, nr: p.nr || null, name: p.name, nameLautFlyer: p.nameLautFlyer || null,
        beschreibung: p.beschreibung || "", kategorie: p.kategorie,
        varianten: varianten,
        optionen: (p.optionen || cat.optionen || []).filter(function (g) { return !!groups[g]; }),
        allergene: (p.allergene || []).slice(), zusatzstoffe: (p.zusatzstoffe || []).slice(),
        steuer: steuer,
        pfandCent: p.pfandCent !== undefined ? p.pfandCent : (steuer.typ === "getraenke" ? null : 0),
        merkmale: p.merkmale || [], pruefen: p.pruefen || [],
        verfuegbar: p.verfuegbar !== false, bild: p.bild || null,
        illustration: p.illustration || cat.illustration, index: i
      };
    });
    var productById = {};
    products.forEach(function (p) { productById[p.id] = p; });
    return { categories: categories, catById: catById, products: products, productById: productById, groups: groups, legende: menu.legende || { allergene: {}, zusatzstoffe: {}, hinweise: [] } };
  }

  /** Strukturprüfung – liefert Fehler (Build bricht ab) und Hinweise */
  function validateMenu(menu) {
    var errors = [], warnings = [];
    var leg = menu.legende || {}, A = leg.allergene || {}, Z = leg.zusatzstoffe || {};
    var groups = menu.optionsgruppen || {};
    var cats = {}, ids = {}, nrs = {};
    (menu.kategorien || []).forEach(function (c) {
      if (cats[c.id]) errors.push("Kategorie doppelt: " + c.id);
      cats[c.id] = true;
      (c.optionen || []).forEach(function (g) { if (!groups[g]) errors.push("Kategorie " + c.id + ": unbekannte Optionsgruppe " + g); });
    });
    Object.keys(groups).forEach(function (gid) {
      var g = groups[gid], oids = {};
      if (g.typ !== "eine" && g.typ !== "mehrere") errors.push("Optionsgruppe " + gid + ": typ muss „eine“ oder „mehrere“ sein");
      if (!Array.isArray(g.optionen) || !g.optionen.length) errors.push("Optionsgruppe " + gid + ": keine Optionen");
      (g.optionen || []).forEach(function (o) {
        if (!o.id || oids[o.id]) errors.push("Optionsgruppe " + gid + ": Options-ID fehlt/doppelt (" + o.id + ")");
        oids[o.id] = true;
        if (o.preisCent !== undefined && (!isCent(o.preisCent) || o.preisCent < 0)) errors.push("Optionsgruppe " + gid + "/" + o.id + ": preisCent ungültig");
        (o.allergene || []).forEach(function (a) { if (!A[a]) errors.push("Optionsgruppe " + gid + "/" + o.id + ": Allergen " + a + " nicht in Legende"); });
        (o.zusatzstoffe || []).forEach(function (z) { if (!Z[z]) errors.push("Optionsgruppe " + gid + "/" + o.id + ": Zusatzstoff " + z + " nicht in Legende"); });
      });
      if (g.min && g.max && g.min > g.max) errors.push("Optionsgruppe " + gid + ": min > max");
      if (g.max && g.optionen && g.max > g.optionen.length) errors.push("Optionsgruppe " + gid + ": max größer als Optionsanzahl");
    });
    (menu.produkte || []).forEach(function (p, i) {
      var where = "Produkt " + (p.id || ("#" + i));
      if (!p.id || !/^[a-z0-9-]+$/.test(p.id)) errors.push(where + ": ID fehlt oder enthält unzulässige Zeichen");
      if (ids[p.id]) errors.push(where + ": ID doppelt vergeben");
      ids[p.id] = true;
      if (p.nr != null) {
        if (!/^\d{2,3}[a-z]?$/.test(p.nr)) errors.push(where + ": Artikelnummer „" + p.nr + "“ hat ein unerwartetes Format");
        if (nrs[p.nr]) errors.push(where + ": Artikelnummer " + p.nr + " doppelt (auch " + nrs[p.nr] + ")");
        nrs[p.nr] = p.id;
      }
      if (!cats[p.kategorie]) errors.push(where + ": unbekannte Kategorie " + p.kategorie);
      if (!p.name) errors.push(where + ": Name fehlt");
      var vars = p.varianten || [{ id: "standard", preisCent: p.preisCent }], vids = {};
      if (p.varianten && p.preisCent !== undefined) errors.push(where + ": entweder preisCent oder varianten angeben");
      vars.forEach(function (v) {
        if (!v.id || vids[v.id]) errors.push(where + ": Varianten-ID fehlt/doppelt");
        vids[v.id] = true;
        if (!isCent(v.preisCent) || v.preisCent <= 0) errors.push(where + ": Preis muss eine positive ganze Centzahl sein");
      });
      (p.optionen || []).forEach(function (g) { if (!groups[g]) errors.push(where + ": unbekannte Optionsgruppe " + g); });
      (p.allergene || []).forEach(function (a) { if (!A[a]) errors.push(where + ": Allergen " + a + " nicht in Legende"); });
      (p.zusatzstoffe || []).forEach(function (z) { if (!Z[z]) errors.push(where + ": Zusatzstoff " + z + " nicht in Legende"); });
      if (p.pfandCent !== undefined && p.pfandCent !== null && (!isCent(p.pfandCent) || p.pfandCent < 0)) errors.push(where + ": pfandCent ungültig");
      (p.pruefen || []).forEach(function (x) { if (!x.hinweis) errors.push(where + ": Prüfpunkt ohne Hinweis"); });
      if (p.steuer && typeof p.steuer === "object" && p.steuer.typ === "aufteilung" && p.steuer.getraenkeAnteilCent != null && !isCent(p.steuer.getraenkeAnteilCent)) errors.push(where + ": getraenkeAnteilCent ungültig");
    });
    return { errors: errors, warnings: warnings };
  }

  /** Alle offenen Prüfpunkte (für Freigabeliste und Build-Bericht) */
  function openChecks(menu) {
    var out = [];
    Object.keys(menu.optionsgruppen || {}).forEach(function (gid) {
      (menu.optionsgruppen[gid].pruefen || []).forEach(function (x) { out.push({ ort: "Optionsgruppe " + gid, feld: x.feld || "optionen", hinweis: x.hinweis, sperrt: !!x.sperrt }); });
    });
    (menu.produkte || []).forEach(function (p) {
      (p.pruefen || []).forEach(function (x) { out.push({ ort: (p.nr ? "Nr. " + p.nr + " " : "") + p.name, id: p.id, feld: x.feld || "", hinweis: x.hinweis, sperrt: !!x.sperrt }); });
    });
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Betriebsmodus und Freigabe                                          */
  /* ------------------------------------------------------------------ */
  /** "pre" = vor der Eröffnung, "live" = geöffnet, "test" = interner Testmodus */
  function siteMode(config) {
    var b = config.betrieb || {}, t = b.testmodus || {};
    if (t.aktiv && /^\d{8,15}$/.test(String(t.whatsappNummer || ""))) return "test";
    return b.modus === "geoeffnet" ? "live" : "pre";
  }

  /** Was vor dem Livegang zwingend fehlt – solange etwas fehlt, ist die Online-Bestellung gesperrt */
  function launchBlockers(config) {
    var b = [], op = config.betreiber || {}, st = config.steuer || {}, z = config.zahlung || {};
    if (!op.name) b.push("Name des Betreibers (Impressum) fehlt");
    if (!op.rechtsform) b.push("Rechtsform (Impressum) fehlt");
    if (!op.email) b.push("E-Mail-Adresse (Impressum) fehlt");
    if (!Array.isArray(z.arten) || !z.arten.length) b.push("Zahlungsarten fehlen");
    if (st.status !== "bestaetigt" || (st.kleinunternehmer !== true && st.kleinunternehmer !== false)) b.push("Umsatzsteuer-Status (Regelbesteuerung oder § 19 UStG) nicht bestätigt");
    if (!config.bestellung || (config.bestellung.rechtsmodell !== "verbindlich" && config.bestellung.rechtsmodell !== "anfrage")) b.push("Rechtsmodell der Bestellung fehlt");
    return b;
  }

  function onlineOrderingEnabled(config) {
    var m = siteMode(config);
    if (m === "test") return true;
    if (m !== "live") return false;
    return launchBlockers(config).length === 0;
  }

  /** Bestellbarkeit eines Produkts und die sichtbaren Optionsgruppen */
  function productState(p, idx, config) {
    var mode = siteMode(config);
    var strict = (mode === "live" || mode === "test") && !(config.freigabe && config.freigabe.sperrePruefpunkte === false);
    var vis = [];
    if (!p.verfuegbar) return { orderable: false, reason: "Derzeit nicht verfügbar", groups: [] };
    for (var i = 0; i < p.optionen.length; i++) {
      var g = idx.groups[p.optionen[i]];
      var blocked = strict && (g.pruefen || []).some(function (x) { return x.sperrt; });
      var required = (g.typ === "eine" && !g.optional) || (g.min || 0) > 0;
      if (blocked) {
        if (required) return { orderable: false, reason: "Online noch nicht bestellbar – gerne telefonisch", groups: [] };
        continue;
      }
      vis.push(p.optionen[i]);
    }
    if (strict && p.pruefen.some(function (x) { return x.sperrt; })) return { orderable: false, reason: "Online noch nicht bestellbar – gerne telefonisch", groups: vis };
    if (p.pfandCent === null) return { orderable: false, reason: "Online noch nicht bestellbar – gerne telefonisch", groups: vis };
    return { orderable: true, reason: "", groups: vis };
  }

  /* ------------------------------------------------------------------ */
  /* Auswahl, Warenkorbzeilen, Preise                                    */
  /* ------------------------------------------------------------------ */
  /** Ungültige oder doppelte Auswahl entfernen, Reihenfolge wie in der Gruppe */
  function sanitizeSelection(sel, visibleGroups, groups) {
    var out = {};
    visibleGroups.forEach(function (gid) {
      var g = groups[gid], valid = g.optionen.map(function (o) { return o.id; });
      var chosen = (sel && Array.isArray(sel[gid])) ? sel[gid] : [];
      chosen = valid.filter(function (id) { return chosen.indexOf(id) > -1; });
      if (g.typ === "eine") chosen = chosen.slice(0, 1);
      if (g.max) chosen = chosen.slice(0, g.max);
      if (chosen.length) out[gid] = chosen;
    });
    return out;
  }

  function selectionErrors(sel, visibleGroups, groups) {
    var errs = [];
    visibleGroups.forEach(function (gid) {
      var g = groups[gid], n = (sel[gid] || []).length;
      if (g.typ === "eine" && n !== 1) errs.push({ group: gid, missing: 1, msg: "Bitte „" + g.label + "“ wählen" });
      else if (g.min && n < g.min) errs.push({ group: gid, missing: g.min - n, msg: "Bitte noch " + (g.min - n) + " " + (g.min - n === 1 ? "Auswahl" : "Auswahlen") + " bei „" + (g.kurz || g.label) + "“ treffen" });
      else if (g.max && n > g.max) errs.push({ group: gid, missing: 0, msg: "Höchstens " + g.max + " bei „" + (g.kurz || g.label) + "“" });
    });
    return errs;
  }

  function lineKey(line) {
    var s = line.s || {}, keys = Object.keys(s).sort();
    var norm = keys.map(function (k) { return k + ":" + (s[k] || []).join(","); }).join(";");
    return [line.p, line.v, norm, clean(line.n || "", 200)].join("|");
  }

  function variantLabel(p) {
    if (p.kategorie === "getraenke" || p.kategorie === "potatoes") return "Größe";
    if (p.kategorie === "partyplatten") return "Portion";
    return "Variante";
  }

  /** Steueranteile einer Einheit in Cent je Satz (ohne Rundung, da ganze Cent) */
  function taxSplitUnit(p, unitCent, config) {
    var r = (config.steuer && config.steuer.saetze) || { speisen: 7, getraenke: 19 };
    var out = {};
    if (p.steuer.typ === "getraenke") out[r.getraenke] = unitCent;
    else if (p.steuer.typ === "aufteilung") {
      var d = p.steuer.getraenkeAnteilCent;
      if (isCent(d)) { var dd = Math.min(d, unitCent); out[r.getraenke] = dd; if (unitCent - dd) out[r.speisen] = (out[r.speisen] || 0) + unitCent - dd; }
      else out.offen = unitCent;
    } else out[r.speisen] = unitCent;
    return out;
  }

  /** Eine Warenkorbzeile berechnen. Liefert null, wenn die Zeile nicht (mehr) gültig ist. */
  function priceLine(line, idx, config) {
    var p = idx.productById[line.p];
    if (!p) return null;
    var v = null;
    for (var i = 0; i < p.varianten.length; i++) if (p.varianten[i].id === line.v) v = p.varianten[i];
    if (!v) return null;
    var qty = Math.floor(line.q);
    var max = (config.bestellung && config.bestellung.maxMengeProPosition) || 50;
    if (!(qty >= 1) || qty > max) return null;
    var state = productState(p, idx, config);
    var sel = sanitizeSelection(line.s, state.groups, idx.groups);
    var unit = v.preisCent, details = [], allergene = p.allergene.slice(), zus = p.zusatzstoffe.slice();
    if (v.name) details.push({ label: variantLabel(p), text: v.name });
    state.groups.forEach(function (gid) {
      var g = idx.groups[gid], chosen = (sel[gid] || []).map(function (id) {
        for (var k = 0; k < g.optionen.length; k++) if (g.optionen[k].id === id) return g.optionen[k];
        return null;
      }).filter(Boolean);
      chosen = chosen.filter(function (o) { return !o.neutral; });   // z. B. „ohne Beilage“ nicht extra aufführen
      if (!chosen.length) return;
      details.push({ label: g.kurz || g.label, text: chosen.map(function (o) {
        var pr = o.preisCent || 0;
        unit += pr;
        allergene = allergene.concat(o.allergene || []);
        zus = zus.concat(o.zusatzstoffe || []);
        return o.name + (pr ? " (+" + euro(pr) + ")" : "");
      }).join(", ") });
    });
    var note = clean(line.n || "", 200);
    if (note) details.push({ label: "Hinweis", text: note });
    var pfandUnit = p.pfandCent || 0;
    return {
      product: p, variant: v, qty: qty, sel: sel, note: note,
      unitCent: unit, totalCent: unit * qty,
      pfandUnitCent: pfandUnit, pfandCent: pfandUnit * qty,
      details: details, allergene: uniq(allergene), zusatzstoffe: uniq(zus),
      taxUnit: taxSplitUnit(p, unit, config),
      selectionErrors: selectionErrors(sel, state.groups, idx.groups),
      orderable: state.orderable, reason: state.reason
    };
  }

  /* ------------------------------------------------------------------ */
  /* Lieferung                                                           */
  /* ------------------------------------------------------------------ */
  function deliveryPlaces(config) {
    var L = config.lieferung || {};
    if (!L.aktiv) return [];
    var test = siteMode(config) === "test";
    return (L.orte || []).filter(function (o) { return test || o.bestaetigt === true; });
  }
  function zoneById(config, id) {
    var z = (config.lieferung && config.lieferung.zonen) || [];
    for (var i = 0; i < z.length; i++) if (z[i].id === id) return z[i];
    return null;
  }
  function placeByName(config, name) {
    var list = deliveryPlaces(config);
    for (var i = 0; i < list.length; i++) if (list[i].name === name) return list[i];
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* Steueraufteilung                                                    */
  /* ------------------------------------------------------------------ */
  /**
   * Bruttobeträge je Steuersatz. Speisen 7 %, Getränke 19 % (konfigurierbar),
   * Pfand wie Getränk, Lieferkosten anteilig nach Warenwert je Satz (Nebenleistung).
   * Die enthaltene Steuer wird je Satz aus der Summe herausgerechnet (keine Aufschläge).
   */
  function taxBreakdown(priced, pfandCent, feeCent, config) {
    var st = config.steuer || {}, r = st.saetze || { speisen: 7, getraenke: 19 };
    var goods = {}, total = 0;
    priced.forEach(function (c) {
      Object.keys(c.taxUnit).forEach(function (k) { goods[k] = (goods[k] || 0) + c.taxUnit[k] * c.qty; });
    });
    Object.keys(goods).forEach(function (k) { total += goods[k]; });
    var gross = {};
    Object.keys(goods).forEach(function (k) { gross[k] = goods[k]; });
    if (pfandCent) gross[r.getraenke] = (gross[r.getraenke] || 0) + pfandCent;
    if (feeCent && total > 0) {
      var keys = Object.keys(goods), alloc = {}, used = 0;
      var parts = keys.map(function (k) {
        var exact = feeCent * goods[k] / total, fl = Math.floor(exact);
        alloc[k] = fl; used += fl;
        return { k: k, rem: exact - fl };
      });
      parts.sort(function (a, b) { return b.rem - a.rem || (+b.k || 0) - (+a.k || 0); });
      for (var i = 0; used < feeCent; i++, used++) alloc[parts[i % parts.length].k] += 1;
      keys.forEach(function (k) { gross[k] = (gross[k] || 0) + alloc[k]; });
    } else if (feeCent) {
      gross[r.speisen] = (gross[r.speisen] || 0) + feeCent;
    }
    var offen = gross.offen || 0;
    var buckets = Object.keys(gross).filter(function (k) { return k !== "offen" && gross[k] > 0; })
      .map(Number).sort(function (a, b) { return a - b; })
      .map(function (rate) {
        var g = gross[rate], net = Math.round(g * 100 / (100 + rate));
        return { rate: rate, grossCent: g, netCent: net, taxCent: g - net };
      });
    var confirmed = st.status === "bestaetigt";
    return {
      kleinunternehmer: st.kleinunternehmer === true,
      buckets: st.kleinunternehmer === true ? [] : buckets,
      offenCent: offen,
      ausweisbar: confirmed && st.kleinunternehmer === false && st.ausweisen === true && offen === 0
    };
  }

  /* ------------------------------------------------------------------ */
  /* Summen                                                              */
  /* ------------------------------------------------------------------ */
  /**
   * @param priced  Ergebnis von priceLine() für alle Zeilen
   * @param opts    { art: "abholung" | "lieferung", ort: Ortsname }
   */
  function totals(priced, config, opts) {
    opts = opts || {};
    var goods = 0, pfand = 0, count = 0;
    priced.forEach(function (c) { goods += c.totalCent; pfand += c.pfandCent; count += c.qty; });
    var delivery = opts.art === "lieferung";
    var place = delivery && opts.ort ? placeByName(config, opts.ort) : null;
    var zone = place ? zoneById(config, place.zone) : null;
    var fee = zone ? zone.lieferkostenCent : 0;
    var missing = zone ? Math.max(0, zone.mindestbestellwertCent - goods) : 0;
    return {
      goodsCent: goods, pfandCent: pfand, feeCent: fee, totalCent: goods + pfand + fee, count: count,
      delivery: delivery, place: place, zone: zone, minMissingCent: missing,
      feeOpen: delivery && !zone,
      tax: taxBreakdown(priced, pfand, fee, config)
    };
  }

  /* ------------------------------------------------------------------ */
  /* Zeit (Europe/Berlin)                                                */
  /* ------------------------------------------------------------------ */
  var WD_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var WD_DE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  var WD_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

  function toMin(t) { var p = String(t).split(":"); return (+p[0]) * 60 + (+p[1] || 0); }
  function fmtMin(m) { return pad(Math.floor(m / 60)) + ":" + pad(m % 60); }

  /** Wanduhrzeit in der Zeitzone des Restaurants (inkl. Sommer-/Winterzeit) */
  function zonedNow(date, tz) {
    var o = {};
    new Intl.DateTimeFormat("en-GB", {
      timeZone: tz || "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit",
      weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(date || new Date()).forEach(function (x) { o[x.type] = x.value; });
    return {
      date: o.year + "-" + o.month + "-" + o.day, y: +o.year, m: +o.month, d: +o.day,
      wd: WD_EN.indexOf(o.weekday), min: (+o.hour % 24) * 60 + (+o.minute)
    };
  }

  function addDays(dateStr, n) {
    var p = dateStr.split("-"), d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
    return { date: d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()), wd: d.getUTCDay() };
  }

  /** Plan eines Kalendertags (Betriebsferien > Ausnahme > Wochenplan) */
  function daySchedule(dateStr, wd, H) {
    var ferien = (H.betriebsferien || []).filter(function (f) { return dateStr >= f.von && dateStr <= f.bis; })[0];
    if (ferien) return { slots: [], grund: "betriebsferien", hinweis: ferien.hinweis || "Betriebsferien" };
    var aus = (H.ausnahmen || []).filter(function (a) { return a.datum === dateStr; })[0];
    var slots, until = null;
    if (aus) {
      if (aus.geschlossen) return { slots: [], grund: "ausnahme", hinweis: aus.hinweis || "Geschlossen" };
      slots = (aus.zeiten || []).map(function (s) { return [toMin(s[0]), toMin(s[1])]; });
      if (aus.bestellschluss) until = toMin(aus.bestellschluss);
    } else {
      slots = ((H.woche || {})[String(wd)] || []).map(function (s) { return [toMin(s[0]), toMin(s[1])]; });
    }
    if (!slots.length) return { slots: [], grund: aus ? "ausnahme" : "ruhetag", hinweis: aus ? (aus.hinweis || "Geschlossen") : "Ruhetag" };
    var lastClose = Math.max.apply(null, slots.map(function (s) { return s[1]; }));
    if (until === null) until = Math.min(H.bestellschluss ? toMin(H.bestellschluss) : lastClose, lastClose);
    return { slots: slots, orderUntil: until, lastClose: lastClose, grund: aus ? "ausnahme" : "regulaer", hinweis: aus ? (aus.hinweis || "") : "" };
  }

  function closureAt(stamp, H) {
    return (H.schliessungen || []).filter(function (s) { return stamp >= s.von && stamp < s.bis; })[0] || null;
  }

  /** Nächster Zeitpunkt, ab dem Bestellungen angenommen werden */
  function nextOpening(now, H) {
    for (var add = 0; add <= 42; add++) {
      var day = add === 0 ? { date: now.date, wd: now.wd } : addDays(now.date, add);
      var plan = daySchedule(day.date, day.wd, H);
      for (var i = 0; i < plan.slots.length; i++) {
        var s = plan.slots[i];
        var start = s[0];
        if (add === 0) {
          if (now.min >= Math.min(s[1], plan.orderUntil)) continue;
          if (now.min >= start) continue;              // läuft bereits – dann sind wir „offen“
        }
        if (start >= plan.orderUntil) continue;
        var stamp = day.date + "T" + fmtMin(start);
        var cl = closureAt(stamp, H);
        if (cl) {
          var endDate = cl.bis.slice(0, 10), endMin = toMin(cl.bis.slice(11, 16));
          if (endDate === day.date && endMin < Math.min(s[1], plan.orderUntil)) return { date: day.date, wd: day.wd, min: endMin, daysAhead: add };
          continue;
        }
        return { date: day.date, wd: day.wd, min: start, daysAhead: add };
      }
    }
    return null;
  }

  function describeNext(next) {
    if (!next) return "";
    var t = fmtMin(next.min) + " Uhr";
    if (next.daysAhead === 0) return "heute ab " + t;
    if (next.daysAhead === 1) return "morgen ab " + t;
    if (next.daysAhead < 7) return "am " + WD_DE[next.wd] + " ab " + t;
    var p = next.date.split("-");
    return "am " + p[2] + "." + p[1] + "." + p[0] + " ab " + t;
  }

  /**
   * Bestellstatus zum Zeitpunkt `date`.
   * canOrder = Bestellannahme läuft (geöffnet, vor Bestellschluss, keine Pause/Schließung).
   */
  function orderingStatus(date, config) {
    var H = config.oeffnungszeiten, now = zonedNow(date, H.zeitzone);
    var plan = daySchedule(now.date, now.wd, H);
    var stamp = now.date + "T" + fmtMin(now.min);
    var closure = closureAt(stamp, H);
    var inSlot = plan.slots.some(function (s) { return now.min >= s[0] && now.min < s[1]; });
    var beforeCutoff = plan.slots.length > 0 && now.min < plan.orderUntil;
    var paused = !!(H.bestellpause && H.bestellpause.aktiv);
    var open = inSlot && !closure;
    var canOrder = open && beforeCutoff && !paused;
    var grund;
    if (closure) grund = "schliessung";
    else if (!plan.slots.length) grund = plan.grund;
    else if (canOrder) grund = "offen";
    else if (open && paused) grund = "pause";
    else if (open && !beforeCutoff) grund = "bestellschluss";
    else if (now.min < plan.slots[0][0]) grund = "vor-oeffnung";
    else grund = "geschlossen";
    var next = canOrder ? null : nextOpening(now, H);
    if (closure && plan.slots.length) {                    // Schließung endet noch heute innerhalb der Bestellzeit?
      var endD = closure.bis.slice(0, 10), endM = toMin(closure.bis.slice(11, 16));
      var slotOk = plan.slots.some(function (s) { return endM >= s[0] && endM < s[1]; });
      if (endD === now.date && slotOk && endM < plan.orderUntil) next = { date: now.date, wd: now.wd, min: endM, daysAhead: 0 };
    }
    var text;
    switch (grund) {
      case "offen": text = "Geöffnet – Bestellungen bis " + fmtMin(plan.orderUntil) + " Uhr"; break;
      case "pause": text = (H.bestellpause.hinweis || "Gerade nehmen wir keine Online-Bestellungen an.") ; break;
      case "bestellschluss": text = "Bestellschluss für heute ist vorbei" + (next ? " – wieder " + describeNext(next) : ""); break;
      case "schliessung": text = (closure.hinweis || "Vorübergehend geschlossen") + (next ? " – wieder " + describeNext(next) : ""); break;
      case "ruhetag": text = "Heute Ruhetag" + (next ? " – wieder " + describeNext(next) : ""); break;
      case "betriebsferien": case "ausnahme": text = plan.hinweis + (next ? " – wieder " + describeNext(next) : ""); break;
      default: text = "Geschlossen" + (next ? " – wir öffnen " + describeNext(next) : "");
    }
    return { now: now, plan: plan, open: open, canOrder: canOrder, grund: grund, next: next, text: text, orderUntil: plan.slots.length ? fmtMin(plan.orderUntil) : null };
  }

  /** Wählbare Wunschzeiten (heute, im Zeitraster, frühestens nach Vorlauf) */
  function wishTimes(date, art, config) {
    var H = config.oeffnungszeiten, test = siteMode(config) === "test";
    var st = orderingStatus(date, config), now = st.now;
    var lead = (H.vorlaufMinuten && H.vorlaufMinuten[art]) || 30, raster = H.zeitraster || 15;
    var start = Math.ceil((now.min + lead) / raster) * raster, out = [];
    if (test) {
      for (var t = start; t < Math.min(start + 240, 24 * 60); t += raster) out.push(fmtMin(t));
      return out;
    }
    if (!st.canOrder) return out;
    var latest = toMin((H.spaetesteWunschzeit && H.spaetesteWunschzeit[art]) || fmtMin(st.plan.lastClose));
    latest = Math.min(latest, st.plan.lastClose);
    for (var m = start; m <= latest; m += raster) {
      if (st.plan.slots.some(function (s) { return m > s[0] && m <= s[1]; })) out.push(fmtMin(m));
    }
    return out;
  }

  function weekOverview(config) {
    var H = config.oeffnungszeiten;
    return [1, 2, 3, 4, 5, 6, 0].map(function (wd) {
      var slots = (H.woche[String(wd)] || []);
      return { wd: wd, name: WD_DE[wd], kurz: WD_SHORT[wd], slots: slots, text: slots.length ? slots.map(function (s) { return s[0] + "–" + s[1]; }).join(", ") + " Uhr" : "Ruhetag" };
    });
  }

  /* ------------------------------------------------------------------ */
  /* Bestell-Referenz SHA-A-YYYYMM-XXXXXXXX / SHA-L-YYYYMM-XXXXXXXX       */
  /* ------------------------------------------------------------------ */
  var REF_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";   // 32 Zeichen, ohne 0/O/1/I
  var REF_ID_RE = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/;
  var REF_RE = /^SHA-[AL]-\d{6}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/;

  /** 8 Zeichen aus 32 Symbolen = 40 Bit. 256 / 32 = 8 → Maskierung ohne Verzerrung. */
  function randomRefId(cryptoObj) {
    if (!cryptoObj || typeof cryptoObj.getRandomValues !== "function") throw new Error("Keine sichere Zufallsquelle verfügbar");
    var b = cryptoObj.getRandomValues(new Uint8Array(8)), out = "";
    for (var i = 0; i < 8; i++) out += REF_CHARS.charAt(b[i] & 31);
    return out;
  }
  function yearMonth(date, tz) { var n = zonedNow(date, tz); return n.y + pad(n.m); }
  function formatRef(art, ym, id) { return "SHA-" + (art === "lieferung" ? "L" : "A") + "-" + ym + "-" + id; }

  /* ------------------------------------------------------------------ */
  /* Kundenangaben prüfen                                                */
  /* ------------------------------------------------------------------ */
  function phoneOk(v) {
    var digits = v.replace(/\D/g, "");
    return /^[+0-9][0-9\s\/().-]*$/.test(v) && digits.length >= 6 && digits.length <= 15;
  }

  /**
   * f = { art, ort, strasse, plz, fahrerHinweis, name, telefon, notiz, zeit }
   * zeiten = Ergebnis von wishTimes() für die gewählte Art
   */
  function validateCheckout(f, config, zeiten) {
    var e = {};
    var art = f.art;
    if (art !== "abholung" && art !== "lieferung") e.art = "Bitte wählen Sie Abholung oder Lieferung.";
    if (art === "lieferung") {
      var place = placeByName(config, f.ort);
      if (!place) e.ort = "Bitte wählen Sie Ihren Ort aus der Liste.";
      var str = clean(f.strasse, 120);
      if (str.length < 4 || !/[a-zA-ZäöüÄÖÜß]/.test(str)) e.strasse = "Bitte geben Sie Straße und Hausnummer an.";
      else if (!/\d/.test(str)) e.strasse = "Bitte ergänzen Sie die Hausnummer.";
      var plz = clean(f.plz, 5);
      if (!/^\d{5}$/.test(plz)) e.plz = "Bitte geben Sie eine fünfstellige Postleitzahl an.";
      else if (place && plz !== place.plz) e.plz = "Die Postleitzahl passt nicht zu " + place.name + " (" + place.plz + ").";
      if (clean(f.fahrerHinweis, 1000).length > 200) e.fahrerHinweis = "Bitte höchstens 200 Zeichen.";
    }
    var name = clean(f.name, 200);
    if (name.length < 2 || !/[a-zA-ZäöüÄÖÜß]/.test(name)) e.name = "Bitte geben Sie Ihren Namen an.";
    else if (name.length > 80) e.name = "Bitte höchstens 80 Zeichen.";
    var tel = clean(f.telefon, 40);
    if (!tel) e.telefon = "Bitte geben Sie Ihre Telefonnummer für Rückfragen an.";
    else if (!phoneOk(tel)) e.telefon = "Bitte prüfen Sie die Telefonnummer (nur Ziffern, Leerzeichen, +, /, -).";
    if (clean(f.notiz, 2000).length > 300) e.notiz = "Bitte höchstens 300 Zeichen.";
    if (f.zeit !== "asap" && (zeiten || []).indexOf(f.zeit) < 0) e.zeit = "Die gewählte Uhrzeit ist nicht mehr möglich. Bitte wählen Sie neu.";
    return e;
  }

  /* ------------------------------------------------------------------ */
  /* WhatsApp-Nachricht                                                  */
  /* ------------------------------------------------------------------ */
  /**
   * o = { ref, art, name, telefon, strasse, plz, ort, fahrerHinweis, zeit, notiz,
   *       priced: [...], sums: totals(), test: bool }
   */
  function buildMessage(o, config) {
    var R = config.restaurant, L = [];
    var verbindlich = !config.bestellung || config.bestellung.rechtsmodell !== "anfrage";
    var del = o.art === "lieferung";
    if (o.test) L.push("*** TEST – bitte nicht zubereiten ***", "");
    L.push("*" + R.name + " – " + (verbindlich ? "Bestellung" : "Bestellanfrage") + "*");
    L.push("Referenz: " + o.ref, "");
    L.push("Bestellart: " + (del ? "LIEFERUNG" : "ABHOLUNG"));
    L.push("Name: " + clean(o.name, 80));
    L.push("Telefon: " + clean(o.telefon, 40));
    if (del) {
      L.push("Adresse: " + clean(o.strasse, 120) + ", " + clean(o.plz, 5) + " " + clean(o.ort, 80));
      if (clean(o.fahrerHinweis, 200)) L.push("Hinweis für den Fahrer: " + clean(o.fahrerHinweis, 200));
    }
    L.push("Wunschzeit: " + (o.zeit && o.zeit !== "asap" ? "heute, " + o.zeit + " Uhr" : "so schnell wie möglich"), "");
    L.push("*Artikel*");
    o.priced.forEach(function (c) {
      L.push(c.qty + " × " + (c.product.nr ? "Nr. " + c.product.nr + " " : "") + c.product.name + " – " + euro(c.totalCent));
      if (c.qty > 1) L.push("   je " + euro(c.unitCent));
      c.details.forEach(function (d) { L.push("   " + d.label + ": " + d.text); });
      if (c.pfandUnitCent) L.push("   Pfand: " + c.qty + " × " + euro(c.pfandUnitCent));
    });
    L.push("");
    if (clean(o.notiz, 300)) L.push("Anmerkung: " + clean(o.notiz, 300), "");
    var s = o.sums;
    L.push("Warenwert: " + euro(s.goodsCent));
    if (del) L.push("Lieferkosten: " + euro(s.feeCent));
    if (s.pfandCent) L.push("Pfand: " + euro(s.pfandCent));
    L.push("*Gesamt: " + euro(s.totalCent) + "*");
    if (s.tax && s.tax.ausweisbar) {
      L.push("darin enthaltene USt.: " + s.tax.buckets.map(function (b) { return b.rate + " % " + euro(b.taxCent); }).join(", "));
    } else if (s.tax && s.tax.kleinunternehmer) {
      L.push("Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.");
    }
    var pay = config.zahlung && config.zahlung.hinweis;
    if (pay) L.push("Zahlung: " + pay);
    L.push("");
    L.push(verbindlich ? "Ich bestelle zahlungspflichtig und bitte um Bestätigung." : "Bitte bestätigen Sie meine Bestellanfrage.");
    return L.join("\n");
  }

  function whatsappUrl(number, text) {
    return "https://wa.me/" + String(number).replace(/\D/g, "") + "?text=" + encodeURIComponent(text);
  }

  /* ------------------------------------------------------------------ */
  /* Suche und Anzeige-Helfer                                            */
  /* ------------------------------------------------------------------ */
  function searchProducts(products, q, catById) {
    var f = fold(q);
    if (!f) return [];
    if (/^\d{2,3}[a-z]?$/.test(f.replace(/\s/g, ""))) {
      var nr = f.replace(/\s/g, "");
      var exact = products.filter(function (p) { return p.nr && p.nr.toLowerCase() === nr; });
      if (exact.length) return exact;
    }
    var words = f.split(" ");
    return products.filter(function (p) {
      var hay = " " + fold([p.nr, p.name, p.beschreibung, (catById[p.kategorie] || {}).name, p.merkmale.join(" "), p.varianten.map(function (v) { return v.name; }).join(" ")].join(" ")) + " ";
      return words.every(function (w) { return hay.indexOf(w) > -1; });
    });
  }

  function minPriceCent(p) { return Math.min.apply(null, p.varianten.map(function (v) { return v.preisCent; })); }

  /** Grundpreis je Liter (PAngV) – nur wenn die Füllmenge bekannt ist */
  function unitPriceText(v) {
    if (!v.volumenMl) return "";
    return euro(Math.round(v.preisCent * 1000 / v.volumenMl)) + "/l";
  }

  return {
    euro: euro, fold: fold, clean: clean, isCent: isCent,
    normalizeMenu: normalizeMenu, validateMenu: validateMenu, openChecks: openChecks,
    siteMode: siteMode, launchBlockers: launchBlockers, onlineOrderingEnabled: onlineOrderingEnabled, productState: productState,
    sanitizeSelection: sanitizeSelection, selectionErrors: selectionErrors, lineKey: lineKey, priceLine: priceLine, variantLabel: variantLabel,
    deliveryPlaces: deliveryPlaces, zoneById: zoneById, placeByName: placeByName,
    taxBreakdown: taxBreakdown, totals: totals,
    zonedNow: zonedNow, daySchedule: daySchedule, orderingStatus: orderingStatus, nextOpening: nextOpening, describeNext: describeNext,
    wishTimes: wishTimes, weekOverview: weekOverview, toMin: toMin, fmtMin: fmtMin, addDays: addDays, WD_DE: WD_DE,
    REF_CHARS: REF_CHARS, REF_RE: REF_RE, REF_ID_RE: REF_ID_RE, randomRefId: randomRefId, yearMonth: yearMonth, formatRef: formatRef,
    phoneOk: phoneOk, validateCheckout: validateCheckout,
    buildMessage: buildMessage, whatsappUrl: whatsappUrl,
    searchProducts: searchProducts, minPriceCent: minPriceCent, unitPriceText: unitPriceText
  };
});
