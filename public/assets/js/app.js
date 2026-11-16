/* =====================================================================
   SHAHI Küche – Interaktion (alle Seiten)
   Navigation · Öffnungsstatus · Speisekarte · Suche · Warenkorb · WhatsApp
   Technische Grundlage: MINAR Küche (app.js), übernommen und für SHAHI
   erweitert um Eröffnungsmodus, Öffnungszeiten mit Zeitfenstern/Ausnahmen/
   Bestellpause, Lieferorte mit Bestätigung, Steuerarten und Prüfpunkte.
   Geldbeträge werden intern ausschließlich in ganzen Cent berechnet.
   Keine externen Abhängigkeiten. Daten: assets/js/menu-data.js
   ===================================================================== */
(function () {
  "use strict";
  document.documentElement.classList.add("js");

  var D = window.SHAHI_DATA;
  if (!D) { console.error("menu-data.js fehlt"); return; }

  /* ---------------- Helfer ---------------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
  var money = function (c) { return eur.format((c || 0) / 100); };           // Betrag in Cent
  var toCents = function (e) { return Math.round((+e || 0) * 100); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* privat/gesperrt */ } }
  };
  var norm = function (s) { return String(s || "").toLowerCase().replace(/ß/g, "ss").normalize("NFD").replace(/[̀-ͯ]/g, ""); };
  var CTRL_RE = new RegExp("[\\u0000-\\u001f\\u007f\\u200b-\\u200f\\u2028\\u2029]", "g");   // Steuer- und unsichtbare Zeichen
  var clean = function (s, max) { var t = String(s == null ? "" : s).replace(CTRL_RE, " ").replace(/\s+/g, " ").trim(); return max ? t.slice(0, max) : t; };

  var R = D.restaurant;
  var OP = D.operation || {};
  var PAY = D.payment || {};
  var TX = D.tax || {};
  var LEG = D.legend || { allergens: {}, additives: {} };
  var PAGE = document.body.getAttribute("data-page");
  var TEST = !!R.testMode && /^\d{8,15}$/.test(String(R.testWhatsappNumber || ""));   // Testmodus (menu-data.js)
  var LIVE = OP.mode === "geoeffnet";
  var STRICT = (LIVE || TEST) && OP.blockChecks !== false;     // sperrende Prüfpunkte gelten im Normal- und Testbetrieb
  var MAXQ = OP.maxQty || 50;
  var ROOT = (function () { var b = $(".brand"); return b ? b.getAttribute("href").replace(/index\.html$/, "") : ""; })();

  /* Was vor dem Livegang zwingend fehlt – solange etwas fehlt, bleibt die Online-Bestellung gesperrt */
  function launchBlockers() {
    var b = [];
    if (!R.owner) b.push("Name des Betreibers (Impressum)");
    if (!R.legalForm) b.push("Rechtsform (Impressum)");
    if (!R.email) b.push("E-Mail-Adresse (Impressum)");
    if (!Array.isArray(PAY.methods) || !PAY.methods.length) b.push("Zahlungsarten");
    if (TX.status !== "bestaetigt" || (TX.smallBusiness !== true && TX.smallBusiness !== false)) b.push("Umsatzsteuer-Status");
    return b;
  }
  var BLOCKERS = LIVE ? launchBlockers() : [];
  if (BLOCKERS.length) console.warn("Online-Bestellung gesperrt – es fehlen: " + BLOCKERS.join(", "));
  var ORDERING_ON = TEST || (LIVE && !BLOCKERS.length);         // Bestellungen grundsätzlich freigeschaltet?

  /* ---------------- Daten normalisieren ---------------- */
  var GROUPS = {};
  Object.keys(D.optionGroups || {}).forEach(function (gid) {
    var g = D.optionGroups[gid];
    GROUPS[gid] = {
      id: gid, label: g.label, short: g.short, type: g.type, optional: !!g.optional, min: g.min || 0, max: g.max || 0, unit: g.unit, unitOne: g.unitOne,
      blocks: (g.checks || []).some(function (x) { return x.blocks; }),
      options: (g.options || []).map(function (o) {
        return { name: o.name, price: toCents(o.price), codes: String(o.codes || "").split(",").map(function (c) { return c.trim(); }).filter(Boolean), neutral: !!o.neutral };
      })
    };
  });
  var catById = {}; D.categories.forEach(function (c) { catById[c.id] = c; });
  var items = (D.items || []).map(function (src, i) {
    var cat = catById[src.cat] || {};
    var it = {
      _id: src.id || ("i" + i), nr: src.nr || "", name: src.name, category: src.cat,
      description: src.desc || "", tags: src.tags || [], codesCheck: !!src.codesCheck,
      allergens: [], additives: [], pfand: src.pfand === null ? null : toCents(src.pfand),
      tax: src.tax || cat.tax || "speisen",
      blocks: (src.checks || []).some(function (x) { return x.blocks; }),
      opts: (src.opts || []).filter(function (g) { return GROUPS[g]; })
    };
    it.prices = (src.prices && src.prices.length ? src.prices : [0]).map(function (p) {
      return Array.isArray(p) ? { label: p[0], price: toCents(p[1]), ml: p[2] || 0 } : (typeof p === "number" ? { label: "", price: toCents(p), ml: 0 } : p);
    });
    if (src.codes && !it.codesCheck) {
      src.codes.split(",").map(function (c) { return c.trim(); }).filter(Boolean).forEach(function (c) {
        (/^\d+$/.test(c) ? it.additives : it.allergens).push(c);
      });
    }
    return it;
  });
  var itemById = {}; items.forEach(function (it) { itemById[it._id] = it; });
  var minPrice = function (it) { return Math.min.apply(null, it.prices.map(function (p) { return p.price; })); };

  /* Bestellbarkeit eines Gerichts und die sichtbaren Optionsgruppen */
  var PHONE_ONLY = "Online noch nicht bestellbar – gerne telefonisch";
  function itemState(it) {
    if (it.pfand === null) return { ok: false, groups: [] };                 // Pfand unbekannt
    var vis = [];
    for (var i = 0; i < it.opts.length; i++) {
      var g = GROUPS[it.opts[i]];
      if (STRICT && g.blocks) {
        if ((g.type === "one" && !g.optional) || g.min) return { ok: false, groups: [] };   // Pflichtauswahl noch nicht freigegeben
        continue;                                                           // optionale Gruppe ausblenden
      }
      vis.push(it.opts[i]);
    }
    if (STRICT && it.blocks) return { ok: false, groups: vis };
    return { ok: true, groups: vis };
  }
  items.forEach(function (it) { var s = itemState(it); it.orderable = s.ok; it.groups = s.groups; });

  /* Lieferorte: online nur bestätigte (im Testmodus alle) */
  var zones = ((D.delivery && D.delivery.zones) || []).map(function (z) {
    return { id: z.id, name: z.name, minOrder: toCents(z.minOrder), fee: toCents(z.fee), places: z.places || [] };
  });
  var places = [];
  if (D.delivery && D.delivery.delivery !== false) zones.forEach(function (z, zi) {
    z.places.forEach(function (p) { if (p.confirmed || TEST) places.push({ name: p.name, zip: p.zip, zone: zi }); });
  });

  /* ---------------- Header / Navigation ---------------- */
  var header = $(".site-header");
  var navToggle = $(".nav-toggle");
  var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 10); };
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  function setNav(open) {
    document.body.classList.toggle("nav-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Menü schließen" : "Menü öffnen");
  }
  navToggle.addEventListener("click", function () { setNav(!document.body.classList.contains("nav-open")); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setNav(false); });
  window.addEventListener("resize", function () { if (window.innerWidth > 960) setNav(false); });

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -6% 0px" });
    $$(".reveal").forEach(function (el) { io.observe(el); });
  } else { $$(".reveal").forEach(function (el) { el.classList.add("is-in"); }); }

  /* ---------------- Öffnungszeiten (Europe/Berlin) ----------------
     Wochenplan mit Zeitfenstern, Sonderöffnungszeiten (exceptions), Betriebsferien (holidays),
     kurzfristige Schließungen (closures), manuelle Bestellpause (pause), Bestellschluss je Bestellart. */
  var DAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  var DAYS_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  var H = D.hours;
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  var toMin = function (t) { var p = String(t).split(":"); return +p[0] * 60 + (+p[1] || 0); };
  var fmtMin = function (m) { return pad(Math.floor(m / 60)) + ":" + pad(m % 60); };
  var modeKey = function (m) { return m === "Lieferung" ? "delivery" : "pickup"; };
  function zonedNow() {
    try {
      var o = {};
      new Intl.DateTimeFormat("en-GB", { timeZone: H.timezone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
        .formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; });
      return { date: o.year + "-" + o.month + "-" + o.day, day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(o.weekday), min: (+o.hour % 24) * 60 + +o.minute };
    } catch (e) { var d = new Date(); return { date: d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()), day: d.getDay(), min: d.getHours() * 60 + d.getMinutes() }; }
  }
  function addDays(date, n) {
    var p = date.split("-"), d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
    return { date: d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()), day: d.getUTCDay() };
  }
  /* Plan eines Kalendertags: Betriebsferien > Sonderöffnungszeit > Wochenplan */
  function daySchedule(date, day) {
    var hol = (H.holidays || []).filter(function (f) { return date >= f.from && date <= f.to; })[0];
    if (hol) return { slots: [], reason: "holiday", note: hol.note || "Betriebsferien" };
    var ex = (H.exceptions || []).filter(function (a) { return a.date === date; })[0], slots, until = null;
    if (ex) {
      if (ex.closed) return { slots: [], reason: "exception", note: ex.note || "Geschlossen" };
      slots = (ex.times || []).map(function (s) { return [toMin(s[0]), toMin(s[1])]; });
      if (ex.orderUntil) until = toMin(ex.orderUntil);
    } else slots = ((H.week || {})[String(day)] || []).map(function (s) { return [toMin(s[0]), toMin(s[1])]; });
    if (!slots.length) return { slots: [], reason: ex ? "exception" : "restday", note: ex ? (ex.note || "Geschlossen") : "Ruhetag" };
    var last = Math.max.apply(null, slots.map(function (s) { return s[1]; }));
    var cut = function (m) { var c = until !== null ? until : (H.orderUntil && H.orderUntil[m] ? toMin(H.orderUntil[m]) : last); return Math.min(c, last); };
    return { slots: slots, lastClose: last, cutoff: { pickup: cut("pickup"), delivery: cut("delivery") }, reason: ex ? "exception" : "regular", note: ex ? (ex.note || "") : "" };
  }
  function closureAt(date, min) {
    var stamp = date + "T" + fmtMin(min);
    return (H.closures || []).filter(function (s) { return stamp >= s.from && stamp < s.to; })[0] || null;
  }
  /* Nächster Beginn eines Zeitfensters (für „öffnet …“) */
  function nextOpening(n) {
    for (var add = 0; add <= 42; add++) {
      var day = add === 0 ? { date: n.date, day: n.day } : addDays(n.date, add), plan = daySchedule(day.date, day.day);
      for (var i = 0; i < plan.slots.length; i++) {
        var st = plan.slots[i][0];
        if (add === 0 && st <= n.min) continue;
        if (closureAt(day.date, st)) continue;
        return { day: day.day, date: day.date, min: st, add: add };
      }
    }
    return null;
  }
  function describeNext(x) {
    if (!x) return "";
    var p = x.date.split("-");
    return (x.add === 0 ? "heute" : x.add === 1 ? "morgen" : x.add < 7 ? DAYS[x.day] : "am " + p[2] + "." + p[1] + ".") + " um " + fmtMin(x.min) + " Uhr";
  }
  var cutText = function (plan) {
    return plan.cutoff.pickup === plan.cutoff.delivery ? "Bestellungen bis " + fmtMin(plan.cutoff.pickup) + " Uhr"
      : "Lieferung bis " + fmtMin(plan.cutoff.delivery) + ", Abholung bis " + fmtMin(plan.cutoff.pickup) + " Uhr";
  };
  function status() {
    var n = zonedNow(), plan = daySchedule(n.date, n.day), closure = closureAt(n.date, n.min);
    var inSlot = plan.slots.some(function (s) { return n.min >= s[0] && n.min < s[1]; });
    var open = inSlot && !closure, paused = !!(H.pause && H.pause.active);
    var ordering = open && !paused && plan.slots.length && n.min < Math.max(plan.cutoff.pickup, plan.cutoff.delivery), text, short;
    var curEnd = open ? plan.slots.filter(function (s) { return n.min >= s[0] && n.min < s[1]; })[0][1] : 0;
    if (!LIVE && !TEST) {                                       // Eröffnung in Vorbereitung
      var od = OP.openingDate ? OP.openingDate.split("-") : null;
      short = "Eröffnung in Vorbereitung";
      text = od ? "Eröffnung am " + od[2] + "." + od[1] + "." + od[0] + " – die Speisekarte ist schon online" : "Eröffnung in Vorbereitung – die Speisekarte ist schon online";
      return { open: false, ordering: false, day: n.day, now: n, plan: plan, text: text, short: short, pre: true };
    }
    if (open && paused) { short = "Geöffnet"; text = H.pause.note || "Gerade nehmen wir keine Online-Bestellungen an – gerne telefonisch."; }
    else if (open && ordering) { short = "Jetzt geöffnet"; text = "Jetzt geöffnet · " + cutText(plan); }
    else if (open) { short = "Jetzt geöffnet"; text = "Geöffnet bis " + fmtMin(curEnd) + " Uhr · Bestellschluss für heute vorbei"; }
    else {
      var nx = nextOpening(n), rest = !plan.slots.length || plan.reason === "holiday";
      short = closure ? "Vorübergehend geschlossen" : rest ? (plan.reason === "restday" ? "Heute Ruhetag" : plan.note) : "Derzeit geschlossen";
      text = (closure ? (closure.note || "Vorübergehend geschlossen") : rest ? (plan.reason === "restday" ? "Heute Ruhetag" : plan.note) : "Geschlossen") + (nx ? " · öffnet " + describeNext(nx) : "");
    }
    return { open: open, ordering: ordering, day: n.day, now: n, plan: plan, text: text, short: short, paused: paused, closure: closure };
  }
  function renderStatus() {
    var s = status();
    $$("[data-open-dot]").forEach(function (el) { el.classList.toggle("is-open", s.open); el.classList.toggle("is-closed", !s.open); });
    $$("[data-open-status]").forEach(function (el) { el.textContent = s.short + " · " + R.cityShort; });
    $$("[data-open-status-long]").forEach(function (el) { el.textContent = s.text; });
    $$("[data-hours-list]").forEach(function (list) {
      list.innerHTML = [1, 2, 3, 4, 5, 6, 0].map(function (d) {
        var today = d === s.day, plan = today ? s.plan : null;
        var slots = today ? plan.slots.map(function (x) { return fmtMin(x[0]) + "–" + fmtMin(x[1]); }) : ((H.week || {})[String(d)] || []).map(function (x) { return x[0] + "–" + x[1]; });
        var closed = !slots.length;
        var label = closed ? (today && plan.reason !== "restday" ? plan.note : "Ruhetag") : slots.join(", ") + " Uhr";
        return '<li class="' + (today ? "is-today " : "") + (closed ? "is-closed" : "") + '"><span>' + DAYS[d] + "</span><span>" + esc(label) + "</span></li>";
      }).join("");
    });
    /* Sonderöffnungszeiten und Ferien der nächsten drei Wochen */
    $$("[data-hours-special]").forEach(function (el) {
      var out = [];
      for (var a = 0; a <= 21; a++) {
        var d = a === 0 ? { date: s.now.date, day: s.now.day } : addDays(s.now.date, a), plan = daySchedule(d.date, d.day);
        if (plan.reason === "regular" || plan.reason === "restday") continue;
        var p = d.date.split("-");
        out.push(DAYS_SHORT[d.day] + ", " + p[2] + "." + p[1] + ".: " + (plan.slots.length ? plan.slots.map(function (x) { return fmtMin(x[0]) + "–" + fmtMin(x[1]); }).join(", ") + " Uhr" : "geschlossen") + (plan.note ? " (" + plan.note + ")" : ""));
      }
      el.hidden = !out.length; el.textContent = out.length ? "Abweichende Zeiten: " + out.join(" · ") : "";
    });
  }
  renderStatus(); setInterval(renderStatus, 60000);

  /* ---------------- Kategorie-Karten (Anzahl, ab-Preis) ---------------- */
  $$("[data-cat-card]").forEach(function (card) {
    var list = items.filter(function (i) { return i.category === card.getAttribute("data-cat-card"); });
    var meta = $("[data-cat-meta]", card);
    if (meta && list.length) {
      var min = Math.min.apply(null, list.map(minPrice));
      meta.textContent = list.length + (list.length === 1 ? " Gericht" : " Gerichte") + " · ab " + money(min);
    }
  });

  /* ---------------- Gericht-Darstellung ---------------- */
  function codeList(codes, legend) {
    return codes.map(function (c) { var t = legend[c]; return t ? '<abbr title="' + esc(t) + '">' + esc(c) + "</abbr>" : esc(c); }).join(", ");
  }
  function allergenHtml(it) {
    if (it.codesCheck) return '<span class="allergens allergens-check">Allergene &amp; Zusatzstoffe auf Anfrage</span>';
    var p = [];
    if (it.allergens.length) p.push("Allergene: " + codeList(it.allergens, LEG.allergens || {}));
    if (it.additives.length) p.push("Zusatzstoffe: " + codeList(it.additives, LEG.additives || {}));
    return p.length ? '<span class="allergens">' + p.join(" · ") + "</span>" : "";
  }
  /* Grundpreis je Liter (PAngV) – nur bei bekannter Füllmenge */
  var perLitre = function (p) { return p.ml ? money(Math.round(p.price * 1000 / p.ml)) + "/l" : ""; };
  function priceHtml(it) {
    if (it.prices.length === 1) return money(it.prices[0].price) + (it.prices[0].label ? "<small>" + esc(it.prices[0].label) + "</small>" : "");
    return "<small>ab</small>" + money(minPrice(it));
  }
  function dishHtml(it, withCat) {
    var tags = it.tags.map(function (t) {
      return '<span class="tag ' + (/veg/.test(t) ? "tag-veg" : /scharf/.test(t) ? "tag-hot" : "") + '">' + esc(t) + "</span>";
    }).join("");
    if (withCat) tags = '<span class="tag">' + esc(catById[it.category].name) + "</span>" + tags;
    var al = allergenHtml(it);
    if (it.pfand) al = '<span class="pfand-note">zzgl. ' + money(it.pfand) + " Pfand</span>" + al;
    else if (it.pfand === 0 && it.category === "getraenke") al = '<span class="pfand-note">ohne Pfand</span>' + al;
    if (!it.orderable) al += '<span class="allergens allergens-check">' + PHONE_ONLY + "</span>";
    var lit = it.prices.filter(function (p) { return p.ml; }).length;
    var variants = it.prices.length > 1 || lit
      ? '<span class="variants-line">' + it.prices.map(function (p) { return (it.prices.length > 1 ? esc(p.label) + " " + money(p.price) : "") + (p.ml ? (it.prices.length > 1 ? " (" + perLitre(p) + ")" : perLitre(p)) : ""); }).join(" · ") + "</span>" : "<span></span>";
    return '<article class="dish">' +
      '<h3 class="dish-title">' + (it.nr ? '<span class="dish-nr" aria-label="Nummer ' + esc(it.nr) + '">' + esc(it.nr) + "</span>" : "") + esc(it.name) + "</h3>" +
      '<div class="dish-price">' + priceHtml(it) + "</div>" +
      (it.description ? '<p class="dish-desc">' + esc(it.description) + "</p>" : "") +
      ((tags || al) ? '<div class="dish-meta">' + tags + al + "</div>" : "") +
      '<div class="dish-foot">' + variants + (it.orderable
        ? '<button type="button" class="add-btn" data-add="' + it._id + '" aria-label="' + esc(it.name) + ' hinzufügen">Hinzufügen</button>'
        : '<button type="button" class="add-btn" data-add="' + it._id + '" aria-disabled="true" aria-label="' + esc(it.name) + ': ' + PHONE_ONLY + '">Telefonisch</button>') + "</div>" +
      "</article>";
  }
  function onAddClick(e) {
    var b = e.target.closest("[data-add]"); if (!b) return;
    var it = itemById[b.getAttribute("data-add")];
    if (!it.orderable) { toast(PHONE_ONLY + ": " + R.phoneDisplay); return; }
    if (it.prices.length === 1 && !it.groups.length) addToCart(it, 0, {}, 1, "");
    else openItem(it);
  }

  // Kategorieseite
  $$("[data-menu-list]").forEach(function (el) {
    var cat = el.getAttribute("data-menu-list");
    el.innerHTML = items.filter(function (i) { return i.category === cat; }).map(function (i) { return dishHtml(i); }).join("");
    el.addEventListener("click", onAddClick);
    var cur = $('.chips [aria-current="page"]');
    if (cur && cur.scrollIntoView) { var chips = cur.closest(".chips"); chips.scrollLeft = cur.offsetLeft - chips.clientWidth / 2 + cur.clientWidth / 2; }
  });

  // Scrollspy: aktive Kategorie in der Chip-Leiste der Gesamtkarte
  var spy = $("[data-scrollspy]");
  if (spy && "IntersectionObserver" in window) {
    var chipFor = {};
    $$("a", spy).forEach(function (a) { chipFor[a.getAttribute("href").slice(1)] = a; });
    var setActive = function (id) {
      $$("a", spy).forEach(function (a) { a.removeAttribute("aria-current"); });
      var a = chipFor[id]; if (!a) return;
      a.setAttribute("aria-current", "true");
      spy.scrollTo({ left: a.offsetLeft - spy.clientWidth / 2 + a.clientWidth / 2, behavior: "smooth" });
    };
    var spyIo = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: "-35% 0px -60% 0px" });
    $$(".menu-cat[id]").forEach(function (sec) { spyIo.observe(sec); });
  }

  // Suche (Übersichtsseite)
  var searchEl = $("[data-menu-search]");
  if (searchEl) {
    var results = $("[data-search-results]"), overview = $("[data-cat-overview]"), clearEl = $("[data-search-clear]");
    var matches = function (it, q) {
      if (/^\d+[a-z]?$/.test(q) && norm(it.nr) === q) return 2;
      var hay = norm([it.nr, it.name, it.description, it.tags.join(" "), catById[it.category].name, it.prices.map(function (p) { return p.label; }).join(" ")].join(" "));
      return q.split(/\s+/).every(function (w) { return hay.indexOf(w) > -1; }) ? 1 : 0;
    };
    var run = function () {
      var q = norm(searchEl.value).trim();
      clearEl.hidden = !q;
      if (!q) { results.hidden = true; overview.hidden = false; return; }
      var exact = items.filter(function (i) { return matches(i, q) === 2; });
      var found = exact.length ? exact : items.filter(function (i) { return matches(i, q); });
      results.hidden = false; overview.hidden = !!found.length;
      results.innerHTML = found.length
        ? "<h2>" + found.length + " Treffer für „" + esc(searchEl.value.trim()) + "“</h2><div class=\"menu-items\">" + found.map(function (i) { return dishHtml(i, true); }).join("") + "</div>"
        : "<h2>Keine Treffer für „" + esc(searchEl.value.trim()) + "“ – wählen Sie eine Kategorie:</h2>";
      try { history.replaceState(null, "", q ? "?q=" + encodeURIComponent(searchEl.value.trim()) : location.pathname); } catch (e) { /* file:// */ }
    };
    var t;
    searchEl.addEventListener("input", function () { clearTimeout(t); t = setTimeout(run, 120); });
    $("[data-search-form]").addEventListener("submit", function (e) { e.preventDefault(); run(); });
    clearEl.addEventListener("click", function () { searchEl.value = ""; run(); searchEl.focus(); });
    results.addEventListener("click", onAddClick);
    var q0 = new URLSearchParams(location.search).get("q");
    if (q0) { searchEl.value = q0; run(); }
  }

  // Legende
  $$("[data-legend-slot]").forEach(function (slot) {
    var a = LEG.allergens || {}, z = LEG.additives || {};
    var html = "<h3>Allergene</h3>" + Object.keys(a).map(function (k) { return "<div><strong>" + esc(k) + "</strong> – " + esc(a[k]) + "</div>"; }).join("") +
      "<h3>Zusatzstoffe</h3>" + Object.keys(z).map(function (k) { return "<div><strong>" + esc(k) + "</strong> – " + esc(z[k]) + "</div>"; }).join("");
    var notes = (LEG.notes || []).slice();
    slot.innerHTML = '<details class="legend"><summary>Allergene &amp; Zusatzstoffe – Legende</summary><div class="legend-grid">' + html +
      '<div class="legend-notes">' + notes.map(function (n) { return "<p>" + esc(n) + "</p>"; }).join("") +
      '<p><a href="' + ROOT + 'allergene.html">Alle Gerichte mit Allergenen und Zusatzstoffen auf einen Blick</a></p></div></div></details>' +
      (D.menuSource ? '<p class="menu-source">' + esc(D.menuSource) + "</p>" : "");
  });

  /* ---------------- Lieferkonditionen ---------------- */
  var placesOf = function (z) {
    var ok = z.places.filter(function (p) { return p.confirmed; }).map(function (p) { return p.name; });
    return ok.length ? ok.join(", ") : "";
  };
  $$("[data-zone-pills]").forEach(function (ul) {
    ul.innerHTML = zones.map(function (z) {
      return "<li><span>" + esc(z.name) + (placesOf(z) ? " · " + esc(placesOf(z)) : "") + "</span><strong>ab " + money(z.minOrder) + "</strong></li>";
    }).join("");
  });
  $$("[data-delivery-table]").forEach(function (box) {
    box.innerHTML = '<table class="delivery-table"><caption class="visually-hidden">Liefergebiete mit Mindestbestellwert und Lieferkosten</caption><thead><tr><th scope="col">Liefergebiet</th><th scope="col">Mindestbestellwert</th><th scope="col">Lieferkosten</th></tr></thead><tbody>' +
      zones.map(function (z) {
        return "<tr><td><strong>" + esc(z.name) + "</strong>" + (placesOf(z) ? "<br>" + esc(placesOf(z)) : '<br><span class="fine">Orte werden vor der Eröffnung bestätigt</span>') +
          '</td><td data-label="Mindestbestellwert"><strong>ab ' + money(z.minOrder) + '</strong></td><td data-label="Lieferkosten">' + money(z.fee) + "</td></tr>";
      }).join("") + "</tbody></table>";
  });
  $$("[data-delivery-notes]").forEach(function (ul) {
    ul.innerHTML = (D.delivery.notes || []).map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("");
  });

  /* ---------------- Dialoge ---------------- */
  function openDialog(d) { if (typeof d.showModal === "function") { if (!d.open) d.showModal(); } else d.setAttribute("open", ""); document.body.style.overflow = "hidden"; }
  function closeDialog(d) { if (typeof d.close === "function") d.close(); else d.removeAttribute("open"); }
  $$("dialog").forEach(function (d) {
    d.addEventListener("close", function () { if (!$("dialog[open]")) document.body.style.overflow = ""; });
    d.addEventListener("click", function (e) { if (e.target === d || e.target.closest("[data-close]")) closeDialog(d); });
  });

  /* Herunterziehen schließt Drawer/Sheets (Touch). Gezogen wird am Kopf oder – wenn der Inhalt
     ganz oben steht – auch im Inhalt. Kurzer Zug oder langsames Loslassen: Drawer springt zurück. */
  function swipeToClose(d, scrollerSel, enabled) {
    if (!d || d._swipe) return; d._swipe = true;
    var startY = 0, dy = 0, t0 = 0, dragging = false, armed = false, fromHead = false;
    var scroller = function () { return $(scrollerSel, d) || d; };
    d.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1 || (enabled && !enabled())) { armed = false; return; }
      armed = true; dragging = false; dy = 0; t0 = Date.now(); startY = e.touches[0].clientY;
      fromHead = !!e.target.closest(".drawer-grip, .drawer-head, .sheet-head");
    }, { passive: true });
    d.addEventListener("touchmove", function (e) {
      if (!armed) return;
      var y = e.touches[0].clientY - startY;
      if (!dragging) {
        if (y > 8 && (fromHead || scroller().scrollTop <= 0) && !e.target.closest("select, textarea, input[type=range]")) {
          dragging = true; d.style.transition = "none"; d.style.animation = "none";
        } else { if (Math.abs(y) > 8) armed = false; return; }
      }
      if (e.cancelable) e.preventDefault();
      dy = Math.max(0, y - 8); d.style.transform = "translateY(" + dy + "px)";
    }, { passive: false });
    var end = function () {
      if (!dragging) { armed = false; return; }
      dragging = armed = false;
      var fast = dy / Math.max(1, Date.now() - t0) > 0.5;
      d.style.transition = "transform .24s cubic-bezier(.2,.8,.2,1)";
      if (dy > Math.min(140, d.offsetHeight * 0.25) || (fast && dy > 40)) {
        d.style.transform = "translateY(100%)";
        setTimeout(function () { closeDialog(d); d.style.transform = d.style.transition = d.style.animation = ""; }, 240);
      } else {
        d.style.transform = "";
        setTimeout(function () { d.style.transition = d.style.animation = ""; }, 260);
      }
    };
    d.addEventListener("touchend", end); d.addEventListener("touchcancel", end);
  }
  var isSheetMobile = function () { return window.matchMedia("(max-width: 640px)").matches; };   // Sheets sind nur dort Drawer von unten

  /* ---------------- Gericht-Dialog ---------------- */
  var itemDialog = $("#item-dialog"), itemForm = $("[data-item-form]"), cur = null, curQty = 1;
  swipeToClose(itemDialog, ".sheet-inner", isSheetMobile);
  function optPrice(o) { return o.price || 0; }
  function readSelection() {
    var sel = {};
    cur.groups.forEach(function (gid) { sel[gid] = $$('input[data-g="' + gid + '"]:checked', itemForm).map(function (x) { return +x.value; }); });
    return sel;
  }
  function variantIdx() { return +((itemForm.querySelector("input[name=variant]:checked") || {}).value || 0); }
  function selectionSum(it, sel) {
    var sum = 0;
    it.groups.forEach(function (gid) { (sel[gid] || []).forEach(function (i) { var o = GROUPS[gid].options[i]; if (o) sum += optPrice(o); }); });
    return sum;
  }
  function updateItemPrice() {
    var v = variantIdx(), sum = cur.prices[v].price + selectionSum(cur, readSelection());
    $$("[data-opt-price]", itemForm).forEach(function (el) {
      var p = el.getAttribute("data-opt-price").split(":"), pr = optPrice(GROUPS[p[0]].options[+p[1]]);
      el.textContent = pr ? "+ " + money(pr) : "";
    });
    $("[data-qty]", itemForm).textContent = curQty;
    var miss = minMissing(), addBtn = $("[data-item-add]", itemForm);
    addBtn.textContent = miss ? "Noch " + miss.n + " " + unitOf(miss) + " wählen" : (editLine ? "Übernehmen · " : "Hinzufügen · ") + money(sum * curQty);
    addBtn.setAttribute("aria-disabled", miss ? "true" : "false");
  }
  function unitOf(m) { var g = GROUPS[m.gid]; return m.n === 1 ? (g.unitOne || g.unit || "Option") : (g.unit || "Optionen"); }
  // Pflichtauswahl (min), z. B. 4 Beläge bei der Party-Pizza
  function minMissing() {
    for (var i = 0; i < cur.groups.length; i++) {
      var gid = cur.groups[i], g = GROUPS[gid]; if (!g.min) continue;
      var n = $$('input[data-g="' + gid + '"]:checked', itemForm).length;
      if (n < g.min) return { gid: gid, n: g.min - n };
    }
    return null;
  }
  var optCodes = function (o) { return o.codes.length ? ' <small class="opt-codes">(' + esc(o.codes.join(", ")) + ")</small>" : ""; };
  var editLine = null;                                   // Warenkorb-Zeile, die gerade angepasst wird
  function openItem(it, line) {
    if (!itemDialog) return;
    cur = it; editLine = line || null; curQty = line ? line.qty : 1;
    $("[data-item-nr]", itemForm).textContent = it.nr ? "Nr. " + it.nr : "";
    $("[data-item-title]", itemForm).textContent = it.name;
    $("[data-item-desc]", itemForm).textContent = it.description + (it.pfand ? (it.description ? " · " : "") + "zzgl. " + money(it.pfand) + " Pfand je Stück" : "");
    $("[data-item-note]", itemForm).value = line ? (line.note || "") : "";
    $("[data-item-variants]", itemForm).hidden = it.prices.length < 2;
    $("[data-variant-list]", itemForm).innerHTML = it.prices.map(function (p, i) {
      return '<label class="opt"><input type="radio" name="variant" value="' + i + '"' + (i === 0 ? " checked" : "") + "><span>" + esc(p.label || "Standard") +
        (p.ml ? ' <small class="opt-codes">' + perLitre(p) + "</small>" : "") + '</span><span class="opt-price">' + money(p.price) + "</span></label>";
    }).join("");
    $("[data-item-opts]", itemForm).innerHTML = it.groups.map(function (gid) {
      var g = GROUPS[gid], one = g.type === "one";
      // Zusatz-Kategorie als aufklappbarer Bereich; die Kopfzeile zeigt die aktuelle Auswahl
      return '<details class="opt-group" data-group="' + gid + '"' + (g.min && !line ? " open" : "") + '><summary><span class="opt-sum-head"><span class="opt-sum-title">' + esc(g.label) + ((one && !g.optional) || g.min ? "" : " (optional)") + "</span>" +
        (g.max ? ' <span class="opt-max" data-max-hint="' + gid + '">0 von ' + g.max + " gewählt</span>" : "") +
        '</span><span class="opt-sum-sel" data-sel-hint="' + gid + '"></span></summary><div class="opt-list" role="group" aria-label="' + esc(g.label) + '">' +
        g.options.map(function (o, i) {
          return '<label class="opt"><input type="' + (one ? "radio" : "checkbox") + '" name="g-' + gid + '" data-g="' + gid + '" value="' + i + '"' + (one && i === 0 ? " checked" : "") +
            "><span>" + esc(o.name) + optCodes(o) + '</span><span class="opt-price" data-opt-price="' + gid + ":" + i + '"></span></label>';
        }).join("") + "</div></details>";
    }).join("");
    if (line) {                                          // bisherige Auswahl vorbelegen
      var vr = itemForm.querySelector('input[name=variant][value="' + line.v + '"]'); if (vr) vr.checked = true;
      it.groups.forEach(function (gid) {
        var chosen = (line.sel && line.sel[gid]) || [];
        $$('input[data-g="' + gid + '"]', itemForm).forEach(function (x) { x.checked = chosen.indexOf(+x.value) > -1; });
        if (GROUPS[gid].type === "one" && !chosen.length) { var f = $('input[data-g="' + gid + '"]', itemForm); if (f) f.checked = true; }
      });
    }
    enforceMax();
    updateItemPrice();
    openDialog(itemDialog);
  }
  function enforceMax() {
    if (!cur) return;
    cur.groups.forEach(function (gid) {
      var max = GROUPS[gid].max; if (!max) return;
      var boxes = $$('input[data-g="' + gid + '"]', itemForm);
      var n = boxes.filter(function (b) { return b.checked; }).length;
      boxes.forEach(function (b) { b.disabled = !b.checked && n >= max; b.closest(".opt").classList.toggle("is-disabled", b.disabled); });
      var hint = $('[data-max-hint="' + gid + '"]', itemForm);
      if (hint) hint.textContent = n + " von " + max + " gewählt";
    });
    cur.groups.forEach(function (gid) {                    // Auswahl in der zugeklappten Kopfzeile anzeigen
      var names = $$('input[data-g="' + gid + '"]:checked', itemForm).map(function (b) { return GROUPS[gid].options[+b.value].name; });
      var el = $('[data-sel-hint="' + gid + '"]', itemForm);
      if (el) { el.textContent = names.length ? names.join(", ") : "keine Auswahl"; el.classList.toggle("is-empty", !names.length); }
    });
  }
  if (itemForm) {
    itemForm.addEventListener("change", function () { enforceMax(); updateItemPrice(); });
    $("[data-qty-minus]", itemForm).addEventListener("click", function () { curQty = Math.max(1, curQty - 1); updateItemPrice(); });
    $("[data-qty-plus]", itemForm).addEventListener("click", function () { curQty = Math.min(MAXQ, curQty + 1); updateItemPrice(); });
    itemForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var miss = minMissing();
      if (miss) {                                        // Pflichtauswahl noch unvollständig
        var grp = $('[data-group="' + miss.gid + '"]', itemForm); grp.open = true;
        grp.scrollIntoView({ block: "nearest", behavior: "smooth" });
        toast("Bitte noch " + miss.n + " " + unitOf(miss) + " wählen");
        return;
      }
      var note = clean($("[data-item-note]", itemForm).value, 120);
      if (editLine && cart.indexOf(editLine) > -1) {      // Zeile im Warenkorb ersetzen
        replaceLine(editLine, variantIdx(), readSelection(), curQty, note); toast("Änderung übernommen");
      } else addToCart(cur, variantIdx(), readSelection(), curQty, note);
      editLine = null;
      closeDialog(itemDialog);
    });
  }

  /* ---------------- Warenkorb (alle Seiten) ----------------
     Datensparsam: Im localStorage liegt nur die Gerichtsauswahl (läuft nach 12 Stunden ab).
     Name, Telefon, Adresse und Anmerkung bleiben nur im sessionStorage dieses Tabs
     und werden beim Schließen des Tabs bzw. über „Warenkorb leeren“ gelöscht.
     Eigene Schlüssel – getrennt von MINAR und anderen Websites. */
  var CART_KEY = "shahi-cart-v1", FORM_KEY = "shahi-form-v1", CART_TTL = (OP.cartHours || 12) * 3600 * 1000;
  var sess = {
    get: function (k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* gesperrt */ } },
    del: function (k) { try { sessionStorage.removeItem(k); } catch (e) { /* gesperrt */ } }
  };
  var lsDel = function (k) { try { localStorage.removeItem(k); } catch (e) { /* gesperrt */ } };
  /* ---------- Bestellreferenz: SHA-A-YYYYMM-XXXXXXXX (Abholung) / SHA-L-… (Lieferung) ----------
     Gehört zum aktiven Bestellentwurf (= Warenkorb) und wird mit ihm im localStorage gehalten:
     bleibt bei Neuladen, Seitenwechsel, Mengen-/Extra-/Zeitänderung, Bon und erneutem WhatsApp-Öffnen gleich;
     auch ein duplizierter Tab zeigt denselben Entwurf. Neu erzeugt wird sie erst für einen neuen Entwurf:
     nach „Neue Bestellung beginnen“ bzw. „Warenkorb und Angaben löschen“, wenn der Warenkorb leer war
     oder nach Ablauf (12 h ohne Änderung). Jahr/Monat werden bei der Erstellung festgelegt (Europe/Berlin),
     das Kürzel A/L folgt der aktuellen Bestellart. Ohne zentrale Datenbank ist die Nummer sehr
     wahrscheinlich, aber nicht garantiert einmalig – sie ist keine Bestellnummer des Restaurants. */
  var REF_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";       // 32 Zeichen, ohne 0/O/1/I
  var REF_RE = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/;
  function secureRefId() {
    var c = window.crypto;
    if (!c || typeof c.getRandomValues !== "function") throw new Error("Sichere Zufallserzeugung nicht verfügbar");
    var b = c.getRandomValues(new Uint8Array(8)), out = "";
    for (var i = 0; i < 8; i++) out += REF_CHARS.charAt(b[i] & 31);   // 256 = 8 × 32 → exakt gleichverteilt
    return out;
  }
  function berlinYM(date) {
    var p = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit" }).formatToParts(date || new Date());
    var get = function (t) { return p.filter(function (x) { return x.type === t; })[0].value; };
    return get("year") + get("month");
  }
  var ref = null, refError = false;
  function newRef() {
    try { ref = { id: secureRefId(), ym: berlinYM() }; refError = false; }
    catch (e) { ref = null; refError = true; }                // keine unsichere Ersatznummer
  }
  function refFor(m) { return ref ? "SHA-" + (m === "Lieferung" ? "L" : "A") + "-" + ref.ym + "-" + ref.id : ""; }
  window.SHAHI_REF = { generate: secureRefId, ym: berlinYM, chars: REF_CHARS };   // für automatisierte Tests

  /* Ungültige, doppelte oder nicht (mehr) freigegebene Auswahl entfernen */
  function sanitizeSel(it, sel) {
    var out = {};
    it.groups.forEach(function (gid) {
      var g = GROUPS[gid], chosen = (sel && Array.isArray(sel[gid])) ? sel[gid] : [];
      chosen = chosen.map(Number).filter(function (i, k, a) { return i >= 0 && i < g.options.length && Math.floor(i) === i && a.indexOf(i) === k; }).sort(function (a, b) { return a - b; });
      if (g.type === "one") chosen = chosen.slice(0, 1);
      if (g.max) chosen = chosen.slice(0, g.max);
      out[gid] = chosen;
    });
    return out;
  }
  function selValid(it, sel) {
    return it.groups.every(function (gid) {
      var g = GROUPS[gid], n = (sel[gid] || []).length;
      return !((g.type === "one" && n !== 1) || (g.min && n < g.min));
    });
  }
  function loadCart() {
    var raw = store.get(CART_KEY), lines = [];
    if (raw && raw.t && Date.now() - raw.t < CART_TTL) {
      lines = raw.lines || [];
      if (raw.ref && REF_RE.test(raw.ref.id) && /^\d{6}$/.test(raw.ref.ym)) ref = { id: raw.ref.id, ym: raw.ref.ym };
    }
    else if (raw) lsDel(CART_KEY);
    var out = [];
    lines.forEach(function (l) {
      var it = itemById[l.id];
      if (!it || !it.orderable || !it.prices[l.v] || !(l.qty > 0)) return;
      var sel = sanitizeSel(it, l.sel);
      if (!selValid(it, sel)) return;
      var line = { _id: it._id, nr: it.nr, name: it.name, v: l.v, sel: sel, qty: Math.min(MAXQ, Math.floor(l.qty)), note: clean(l.note, 120) };
      line.key = lineKey(it, line.v, line.sel, line.note);
      var twin = out.filter(function (x) { return x.key === line.key; })[0];          // doppelte Positionen zusammenführen
      if (twin) twin.qty = Math.min(MAXQ, twin.qty + line.qty); else out.push(line);
    });
    return out;
  }
  function lineKey(it, v, sel, note) { return it._id + "|" + v + "|" + JSON.stringify(sel) + "|" + String(note || "").trim(); }
  var cart = loadCart();
  if (!cart.length) ref = null;
  else if (!ref) { newRef(); if (ref) saveCart(); }

  /* Steueranteile einer Einheit in Cent je Satz (Speisen 7 %, Getränke 19 %; Kombiangebote aufgeteilt) */
  var RATES = TX.rates || { food: 7, drinks: 19 };
  function taxUnit(it, unit) {
    var out = {}, t = it.tax;
    if (t === "getraenke") out[RATES.drinks] = unit;
    else if (t && typeof t === "object" && t.split) {          // Kombiangebot (Speise + Getränk)
      var d = t.drinkShare == null ? null : toCents(t.drinkShare);
      if (d === null) out.offen = unit;
      else { d = Math.min(d, unit); out[RATES.drinks] = d; if (unit - d) out[RATES.food] = unit - d; }
    } else out[RATES.food] = unit;
    return out;
  }

  /* Zentrale Berechnung – gilt für Warenkorb, Bon und WhatsApp-Nachricht (ganze Cent) */
  function lineCalc(l) {
    var it = itemById[l._id], v = l.v, unit = it.prices[v].price, details = [];
    if (it.prices[v].label) details.push({ k: "Variante", t: it.prices[v].label });
    it.groups.forEach(function (gid) {
      var g = GROUPS[gid], chosen = (l.sel[gid] || []).map(function (i) { return g.options[i]; }).filter(Boolean);
      chosen.forEach(function (o) { unit += optPrice(o); });
      chosen = chosen.filter(function (o) { return !o.neutral; });   // z. B. „ohne Beilage“ nicht extra aufführen
      if (!chosen.length) return;
      details.push({ k: g.short || g.label, t: chosen.map(function (o) { var p = optPrice(o); return o.name + (p ? " (+" + money(p) + ")" : ""); }).join(", ") });
    });
    if (l.note && l.note.trim()) details.push({ k: "Hinweis", t: l.note.trim() });
    return { it: it, qty: l.qty, unit: unit, total: unit * l.qty, pfandUnit: it.pfand || 0, pfand: (it.pfand || 0) * l.qty, details: details, tax: taxUnit(it, unit) };
  }
  /* Enthaltene Umsatzsteuer: Pfand wie Getränk, Lieferkosten anteilig nach Warenwert je Satz (Nebenleistung).
     Die Steuer wird aus den Bruttobeträgen herausgerechnet – es wird nichts aufgeschlagen. */
  function taxBreakdown(calcs, pfand, fee) {
    var goods = {}, total = 0, gross = {};
    calcs.forEach(function (c) { Object.keys(c.tax).forEach(function (k) { goods[k] = (goods[k] || 0) + c.tax[k] * c.qty; }); });
    Object.keys(goods).forEach(function (k) { total += goods[k]; gross[k] = goods[k]; });
    if (pfand) gross[RATES.drinks] = (gross[RATES.drinks] || 0) + pfand;
    if (fee && total > 0) {
      var keys = Object.keys(goods), alloc = {}, used = 0, parts = keys.map(function (k) {
        var exact = fee * goods[k] / total, fl = Math.floor(exact); alloc[k] = fl; used += fl; return { k: k, rem: exact - fl };
      });
      parts.sort(function (a, b) { return b.rem - a.rem; });
      for (var i = 0; used < fee; i++, used++) alloc[parts[i % parts.length].k] += 1;
      keys.forEach(function (k) { gross[k] += alloc[k]; });
    } else if (fee) gross[RATES.food] = (gross[RATES.food] || 0) + fee;
    var buckets = Object.keys(gross).filter(function (k) { return k !== "offen" && gross[k] > 0; }).map(Number).sort(function (a, b) { return a - b; })
      .map(function (rate) { var g = gross[rate], net = Math.round(g * 100 / (100 + rate)); return { rate: rate, gross: g, tax: g - net }; });
    return { buckets: buckets, open: gross.offen || 0, shown: TX.status === "bestaetigt" && TX.smallBusiness === false && TX.show === true && !gross.offen };
  }
  function totals() {
    var t = { goods: 0, pfand: 0, count: 0 }, calcs = cart.map(lineCalc);
    calcs.forEach(function (c, i) { t.goods += c.total; t.pfand += c.pfand; t.count += cart[i].qty; });
    t.delivery = !!linesEl && mode() === "Lieferung";
    t.zone = t.delivery ? currentZone() : null;
    t.fee = t.zone ? t.zone.fee : 0;
    t.feeOpen = t.delivery && !t.zone;                     // Ort noch nicht gewählt
    t.grand = t.goods + t.pfand + t.fee;
    t.tax = taxBreakdown(calcs, t.pfand, t.fee);
    return t;
  }
  function feeText(t) { return !t.delivery ? "entfällt (Abholung)" : t.zone ? money(t.fee) : "nach Wahl des Lieferorts"; }
  function grandText(t) { return money(t.grand) + (t.feeOpen ? " zzgl. Lieferkosten" : ""); }
  function grandHtml(t) { return money(t.grand) + (t.feeOpen ? '<small class="sum-note">zzgl. Lieferkosten</small>' : ""); }

  function saveCart() {
    if (!cart.length) { lsDel(CART_KEY); ref = null; return; }   // leerer Warenkorb beendet den Entwurf
    if (!ref) newRef();
    store.set(CART_KEY, { t: Date.now(), ref: ref, lines: cart.map(function (l) { return { id: l._id, v: l.v, sel: l.sel, qty: l.qty, note: l.note }; }) });
  }
  function addToCart(it, v, sel, qty, note) {
    if (!it.orderable) { toast(PHONE_ONLY); return; }
    sel = sanitizeSel(it, sel); note = clean(note, 120);
    var key = lineKey(it, v, sel, note);
    var ex = cart.filter(function (l) { return l.key === key; })[0];
    if (ex) ex.qty = Math.min(MAXQ, ex.qty + qty);
    else cart.push({ key: key, _id: it._id, nr: it.nr, name: it.name, v: v, sel: sel, qty: Math.min(MAXQ, qty), note: note });
    saveCart(); renderBadge(); renderCartPage();
    var added = cart.filter(function (l) { return l.key === key; })[0];   // Auswahl auch in der Bestätigung zeigen
    var info = added ? lineCalc(added).details.map(function (d) { return d.t; }).join(" · ") : "";
    toast(qty + " × " + it.name + (info ? " (" + (info.length > 90 ? info.slice(0, 88) + " …" : info) + ")" : "") + " im Warenkorb");
    $$(".cart-count").forEach(function (el) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); });
  }
  function replaceLine(line, v, sel, qty, note) {
    var it = itemById[line._id];
    sel = sanitizeSel(it, sel); note = clean(note, 120);
    var key = lineKey(it, v, sel, note);
    var twin = cart.filter(function (l) { return l !== line && l.key === key; })[0];
    if (twin) { twin.qty = Math.min(MAXQ, twin.qty + qty); cart.splice(cart.indexOf(line), 1); }   // keine doppelten Positionen
    else { line.v = v; line.sel = sel; line.qty = qty; line.note = note; line.key = key; }
    saveCart(); renderBadge(); renderCartPage();
  }
  function renderBadge() {
    var t = totals();
    $$("[data-cart-count]").forEach(function (el) { el.textContent = t.count; if (el.classList.contains("cart-count")) el.hidden = !t.count; });
    $$("[data-cart-total]").forEach(function (el) { el.textContent = money(t.goods + t.pfand); });
    $$("[data-cart-fab]").forEach(function (el) { el.hidden = !t.count; });
  }
  // Synchronisierung zwischen Tabs
  window.addEventListener("storage", function (e) { if (e.key === CART_KEY) location.reload(); });

  /* ---------------- Bestellseite ---------------- */
  var linesEl = $("[data-cart-lines]");
  var F = {};
  function mode() { return ($("[data-mode]:checked") || {}).value || "Abholung"; }
  function currentPlace() { if (!F.place) return null; return places.filter(function (x) { return x.name === F.place.value; })[0] || null; }
  function currentZone() { var p = currentPlace(); return p ? zones[p.zone] : null; }
  function saveForm() { sess.set(FORM_KEY, { name: F.name.value, phone: F.phone.value, address: F.address.value, address2: F.address2.value, place: F.place.value, note: F.note.value, mode: mode() }); }
  var TRASH = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-3 6h12l-1 12H7L6 9Zm4 2v8h1.5v-8H10Zm3.5 0v8H15v-8h-1.5Z"/></svg>';
  var sumRow = function (k, v, cls) { return '<div class="' + (cls || "") + '"><dt>' + k + "</dt><dd>" + v + "</dd></div>"; };

  function renderCartPage() {
    if (!linesEl) return;
    var t = totals();
    $("[data-cart-empty]").hidden = !!cart.length;
    $("[data-cart-body]").hidden = !cart.length;
    $$("[data-cart-count-label]").forEach(function (el) { el.textContent = t.count + " Artikel"; });
    linesEl.innerHTML = cart.map(function (l, idx) {
      var c = lineCalc(l);
      return '<li class="cl" data-line="' + idx + '">' +
        '<div class="cl-main"><p class="cl-title"><span class="cl-qty">' + l.qty + " ×</span>" +
        (l.nr ? '<span class="cl-nr">Nr. ' + esc(l.nr) + "</span>" : "") + '<span class="cl-name">' + esc(c.it.name) + "</span></p>" +
        (c.details.length ? '<ul class="cl-config">' + c.details.map(function (d) {
          return "<li" + (d.k === "Hinweis" ? ' class="cl-note"' : "") + ">" + (d.k === "Variante" ? "" : "<span>" + esc(d.k) + ":</span> ") + esc(d.t) + "</li>";
        }).join("") + "</ul>" : "") +
        '<p class="cl-unit">' + money(c.unit) + " / Stück" + (c.pfandUnit ? " · zzgl. " + money(c.pfandUnit) + " Pfand" : "") + "</p></div>" +
        '<strong class="cl-price">' + money(c.total) + "</strong>" +
        '<div class="cl-ctrl"><div class="pill-qty" role="group" aria-label="Menge ' + esc(c.it.name) + '">' +
        '<button type="button" data-l-minus aria-label="' + (l.qty > 1 ? "Eins weniger" : esc(c.it.name) + " entfernen") + '">' + (l.qty > 1 ? "−" : TRASH) + "</button>" +
        '<output aria-live="polite">' + l.qty + '</output><button type="button" data-l-plus aria-label="Eins mehr"' + (l.qty >= MAXQ ? " disabled" : "") + ">+</button></div>" +
        '<button type="button" class="cl-btn" data-l-edit>Ändern</button>' +
        '<button type="button" class="cl-btn cl-btn-remove" data-l-remove>Entfernen</button></div></li>';
    }).join("");
    updateCheckout();
  }

  /* Bestellarten nach Uhrzeit (Europe/Berlin): innerhalb eines Zeitfensters und vor dem Bestellschluss
     der Bestellart. Vor der Eröffnung, ohne Freischaltung, bei Bestellpause, Schließung, Ruhetag oder
     nach Bestellschluss beides aus – ausgegraut und durchgestrichen. Keine Vorbestellungen. */
  var ORDER_WA = TEST ? R.testWhatsappNumber : R.whatsappNumber;
  function deliveryPossible() { return D.delivery && D.delivery.delivery !== false && places.length > 0; }
  function modeAvailable(m) {
    if (m === "Lieferung" && !deliveryPossible()) return false;
    if (TEST) return true;
    if (!ORDERING_ON) return false;
    var s = status();
    if (!s.open || s.paused) return false;
    return s.now.min < s.plan.cutoff[modeKey(m)];
  }
  function anyModeAvailable() { return modeAvailable("Abholung") || modeAvailable("Lieferung"); }
  function closedText() {
    if (!TEST && !LIVE) return OP.preOpeningText || "Wir bereiten gerade die Eröffnung vor – bestellen können Sie, sobald wir geöffnet haben.";
    if (!ORDERING_ON) return "Die Online-Bestellung wird gerade freigeschaltet. Bitte bestellen Sie bis dahin telefonisch unter " + R.phoneDisplay + ".";
    var s = status();
    if (s.open && s.paused) return (H.pause.note || "Gerade nehmen wir keine Online-Bestellungen an.") + " Telefonisch erreichen Sie uns unter " + R.phoneDisplay + ".";
    var nx = nextOpening(s.now);
    if (s.open) return "Der Bestellschluss für heute ist vorbei" + (nx ? " – wir öffnen wieder " + describeNext(nx) : "") + ". Dann können Sie wieder bestellen.";
    return "Wir haben gerade geschlossen" + (nx ? " – wir öffnen " + describeNext(nx) : "") + ". Dann können Sie wieder bestellen.";
  }
  function applyDeliveryCutoff() {
    var info = $("[data-delivery-off]"), radios = $$("[data-mode]"); if (!radios.length) return;
    var avail = {};
    radios.forEach(function (r) {
      var on = modeAvailable(r.value); avail[r.value] = on;
      r.disabled = !on; r.closest("label").classList.toggle("is-off", !on);
    });
    var checked = $("[data-mode]:checked");
    if (checked && !avail[checked.value]) {
      checked.checked = false;
      var alt = radios.filter(function (r) { return avail[r.value]; })[0]; if (alt) alt.checked = true;
    }
    if (!info) return;
    var msg = "";
    if (!avail.Abholung && !avail.Lieferung) msg = closedText();
    else if (!avail.Lieferung) {
      if (!deliveryPossible()) msg = "Online-Lieferungen sind möglich, sobald unsere Liefergebiete bestätigt sind. Bitte bestellen Sie eine Lieferung bis dahin telefonisch unter " + R.phoneDisplay + " – Abholung ist online möglich.";
      else { var p = status().plan; msg = "Lieferungen nehmen wir bis " + fmtMin(p.cutoff.delivery) + " Uhr an. Jetzt ist nur noch Abholung bis " + fmtMin(p.cutoff.pickup) + " Uhr möglich."; }
    }
    info.hidden = !msg; info.textContent = msg;
  }

  /* Prüfung vor Übersicht und vor WhatsApp – immer mit aktueller Uhrzeit */
  var triedSend = false;
  var phoneOk = function (v) { var d = v.replace(/\D/g, ""); return !/[^0-9+\s\/().\-]/.test(v) && d.length >= 7 && d.length <= 15; };
  function requiredMissing() {
    if (!F.name) return [];
    var del = mode() === "Lieferung", out = [], street = F.address.value.trim();
    if (clean(F.name.value).length < 2) out.push({ el: F.name, msg: "Bitte Namen angeben" });
    if (!phoneOk(F.phone.value.trim())) out.push({ el: F.phone, msg: F.phone.value.trim() ? "Bitte gültige Telefonnummer angeben" : "Bitte Telefonnummer angeben" });
    if (del && !F.place.value) out.push({ el: F.place, msg: "Bitte Lieferort wählen" });
    if (del && !street) out.push({ el: F.address, msg: "Bitte Lieferadresse angeben" });
    else if (del && !(/[A-Za-zÄÖÜäöüß]/.test(street) && /\d/.test(street))) out.push({ el: F.address, msg: "Bitte Straße und Hausnummer angeben" });
    return out;
  }
  function problems() {
    var out = [];
    if (!cart.length) out.push({ msg: "Der Warenkorb ist leer" });
    if (!anyModeAvailable()) { out.push({ msg: "Bestellung derzeit nicht möglich", long: closedText() }); return out; }
    if (!modeAvailable(mode())) out.push({ msg: mode() + " ist gerade nicht möglich" });
    if (refError) out.push({ msg: "Bestellreferenz nicht verfügbar", long: "Ihr Browser kann keine sichere Bestellreferenz erzeugen. Bitte nutzen Sie einen aktuellen Browser oder bestellen Sie telefonisch unter " + R.phoneDisplay + "." });
    var t = totals();                                        // Mindestbestellwert sperrt die Bestellung (nur Warenwert)
    if (t.zone && t.goods < t.zone.minOrder) out.push({ el: F.place, msg: "Mindestbestellwert " + money(t.zone.minOrder) + " – noch " + money(t.zone.minOrder - t.goods) });
    return out.concat(requiredMissing());
  }
  function markInvalid() {
    var bad = requiredMissing().map(function (m) { return m.el; });
    [F.name, F.phone, F.place, F.address].forEach(function (el) {
      if (!el) return;
      var invalid = triedSend && bad.indexOf(el) > -1;
      el.setAttribute("aria-invalid", invalid ? "true" : "false");
      el.closest(".field").classList.toggle("is-invalid", invalid);
    });
  }

  function updateCheckout() {
    if (!linesEl) return;
    applyDeliveryCutoff();
    var t = totals(), delivery = t.delivery;
    $("[data-address-field]").hidden = !delivery;
    $("[data-place-field]").hidden = !delivery;
    $("[data-address2-field]").hidden = !delivery;
    $("[data-place-hint]").hidden = !delivery;
    $("[data-cart-sums]").innerHTML = sumRow("Warenwert", money(t.goods)) +
      (t.pfand ? sumRow("Getränkepfand", money(t.pfand)) : "") +
      (delivery ? sumRow("Lieferkosten", feeText(t)) : "") +
      sumRow(GRAND_LABEL, grandHtml(t), "is-grand");
    $$("[data-grand]").forEach(function (el) { el.innerHTML = grandHtml(t); });
    var minEl = $("[data-cart-min]");
    minEl.classList.remove("is-ok"); minEl.hidden = true;
    if (t.zone) {
      minEl.hidden = false;
      if (t.goods < t.zone.minOrder) minEl.textContent = "Mindestbestellwert für " + F.place.value + ": " + money(t.zone.minOrder) + " Warenwert (noch " + money(t.zone.minOrder - t.goods) + "). Pfand und Lieferkosten zählen nicht dazu. Die Bestellung ist möglich, sobald er erreicht ist.";
      else { minEl.classList.add("is-ok"); minEl.textContent = "Mindestbestellwert für " + F.place.value + " (" + money(t.zone.minOrder) + ") erreicht."; }
    }
    renderRef();
    var closedEl = $("[data-cart-closed]"), open = anyModeAvailable();
    closedEl.hidden = open; if (!open) closedEl.textContent = closedText();
    var p = problems(), go = $("[data-to-summary]"), hint = $("[data-checkout-hint]");
    go.setAttribute("aria-disabled", p.length ? "true" : "false");
    go.classList.toggle("is-closed", !open);
    hint.textContent = p.length ? (p[0].long || p[0].msg) : "Noch wird nichts gesendet – im nächsten Schritt prüfen Sie Ihre Bestellübersicht.";
    hint.classList.toggle("is-warn", !!p.length && (triedSend || !open));
  }

  function renderRef() {
    var nr = refFor(mode());
    $$("[data-ref-nr]").forEach(function (el) { el.textContent = nr; });
    var box = $("[data-ref-box]"); if (box) box.classList.toggle("is-error", refError);
    var err = $("[data-ref-error]"); if (err) err.hidden = !refError;
    var cp = $("[data-ref-copy]"); if (cp) cp.hidden = !nr;
  }

  /* Wunschzeit: „so schnell wie möglich“ oder heute im Zeitraster, frühestens nach der Vorbereitungszeit
     der Bestellart, innerhalb der Zeitfenster und bis zur spätesten Wunschzeit */
  var timeLost = "";
  function fillTimes() {
    var sel = F.time; if (!sel) return;
    var keep = sel.value, m = mode(), k = modeKey(m), s = status(), n = s.now, plan = s.plan;
    var lead = (H.lead && H.lead[k]) || 30, raster = H.slot || 15, grp = [];
    var start = Math.ceil((n.min + lead) / raster) * raster;
    var opts = ['<option value="asap">So schnell wie möglich</option>'];
    if (TEST) {                                              // Test: die nächsten vier Stunden wählbar
      for (var x = start; x < Math.min(start + 240, 24 * 60); x += raster) grp.push(fmtMin(x));
    } else if (modeAvailable(m)) {
      var latest = Math.min(H.latestWish && H.latestWish[k] ? toMin(H.latestWish[k]) : plan.lastClose, plan.lastClose);
      for (var t = start; t <= latest; t += raster) {
        if (plan.slots.some(function (sl) { return t > sl[0] && t <= sl[1]; })) grp.push(fmtMin(t));
      }
    }
    if (grp.length) opts.push('<optgroup label="Heute zu einer bestimmten Uhrzeit">' + grp.map(function (v) { return '<option value="' + v + '">Heute, ' + v + " Uhr</option>"; }).join("") + "</optgroup>");
    else opts.push('<option value="" disabled>Heute keine späteren Zeiten mehr</option>');
    sel.innerHTML = opts.join("");
    if (keep && keep !== "asap" && !sel.querySelector('option[value="' + keep + '"]:not([disabled])')) timeLost = keep;
    sel.value = keep && sel.querySelector('option[value="' + keep + '"]:not([disabled])') ? keep : "asap";
    var lost = $("[data-time-lost]");
    if (lost) { lost.hidden = !timeLost; lost.textContent = timeLost ? "Die gewählte Uhrzeit " + timeLost + " Uhr ist nicht mehr möglich – bitte neu wählen." : ""; }
  }
  function refresh() { fillTimes(); updateCheckout(); markInvalid(); }

  /* Zahlung und Steuer – Texte aus menu-data.js */
  var CASH_ONLY = Array.isArray(PAY.methods) && PAY.methods.length === 1 && /^bar$/i.test(PAY.methods[0]);
  var GRAND_LABEL = CASH_ONLY ? "Insgesamt bar" : "Insgesamt";
  function payLine(del) {
    if (CASH_ONLY) return "Barzahlung bei " + (del ? "Lieferung" : "Abholung");
    if (PAY.note) return PAY.note;
    if (Array.isArray(PAY.methods) && PAY.methods.length) return PAY.methods.join(", ");
    return "noch nicht festgelegt";
  }

  /* Bestellübersicht (Bon) und WhatsApp-Nachricht – aus denselben Daten */
  function orderData() {
    var t = totals(), m = mode(), del = m === "Lieferung", pl = del ? currentPlace() : null;
    return {
      t: t, mode: m, delivery: del, name: clean(F.name.value, 80), phone: clean(F.phone.value, 24),
      address: del ? [clean(F.address.value, 140), clean(F.address2.value, 100), pl ? pl.zip + " " + pl.name : F.place.value].filter(Boolean).join(", ") : "",
      when: F.time.value && F.time.value !== "asap" ? "heute, " + F.time.value + " Uhr" : "so schnell wie möglich",
      note: clean(F.note.value, 300), lines: cart.map(lineCalc), ref: refFor(m)
    };
  }
  var plain = function (s) { return String(s).replace(/[\u00a0\u202f]/g, " "); };   // geschützte Leerzeichen (Währung) → normale
  function taxLines(t) {
    if (TX.smallBusiness === true && TX.status === "bestaetigt") return ["Gemäß § 19 UStG wird keine Umsatzsteuer berechnet."];
    if (t.tax.shown) return ["darin enthaltene USt.: " + t.tax.buckets.map(function (b) { return b.rate + " % " + money(b.tax); }).join(", ")];
    return [];
  }
  function buildMessage() {
    var o = orderData(), t = o.t, L = [];
    if (TEST) L.push("*** TESTBESTELLUNG – bitte nicht zubereiten ***", "");
    L.push(R.name.toUpperCase() + " – BESTELLUNG", "", "Bestellreferenz: " + o.ref, "Bestellart: " + o.mode, "Name: " + o.name, "Telefon: " + o.phone);
    if (o.delivery) L.push("Lieferadresse: " + o.address);
    L.push("Wunschzeit: " + o.when, "", "BESTELLUNG", "");
    o.lines.forEach(function (c) {
      L.push(c.qty + " × " + (c.it.nr ? "Nr. " + c.it.nr + " " : "") + c.it.name + " – " + money(c.total) + (c.qty > 1 ? " (je " + money(c.unit) + ")" : ""));
      c.details.forEach(function (d) { L.push("- " + d.k + ": " + d.t); });
      if (c.pfandUnit) L.push("- Pfand: " + c.qty + " × " + money(c.pfandUnit));
      L.push("");
    });
    if (o.note) L.push("Anmerkung: " + o.note, "");
    L.push("Warenwert: " + money(t.goods), "Liefergebühr: " + feeText(t), "Pfand: " + money(t.pfand), "GESAMTBETRAG: " + grandText(t));
    L.push.apply(L, taxLines(t)); L.push("");
    L.push("Zahlungsart: " + payLine(o.delivery), "");
    L.push("Ich möchte die aufgeführten Artikel zu den angegebenen Konditionen verbindlich bestellen. Mir ist bekannt, dass der Vertrag erst durch die ausdrückliche Annahme von " + R.name + " zustande kommt" +
      (CASH_ONLY ? " und die Bezahlung bar bei " + (o.delivery ? "Lieferung" : "Abholung") + " erfolgt." : "."));
    return plain(L.join("\n"));
  }
  var waUrl = function (msg) { return "https://wa.me/" + ORDER_WA + "?text=" + encodeURIComponent(msg); };
  var LONG_MSG = OP.messageWarnLength || 3500;
  var bonDialog = $("#bon-dialog"), bonMsg = "";
  function renderBon(alertMsg) {
    var o = orderData(), t = o.t, now = new Date();
    var meta = [["Bestellart", o.mode], ["Name", o.name], ["Telefon", o.phone]];
    if (o.delivery) meta.push(["Lieferadresse", o.address]);
    meta.push(["Wunschzeit", o.when + " (unverbindlich)"]);
    if (o.note) meta.push(["Anmerkung", o.note]);
    $("[data-bon-ref]", bonDialog).textContent = o.ref;
    $("[data-bon-meta]", bonDialog).innerHTML = meta.map(function (r) { return sumRow(esc(r[0]), esc(r[1])); }).join("");
    $("[data-bon-lines]", bonDialog).innerHTML = o.lines.map(function (c) {
      return '<li><div class="bon-line"><span class="bon-q">' + c.qty + ' ×</span><span class="bon-n">' + (c.it.nr ? "<small>Nr. " + esc(c.it.nr) + "</small> " : "") + esc(c.it.name) + '</span><span class="bon-p">' + money(c.total) + "</span></div>" +
        '<ul class="bon-sub">' + c.details.map(function (d) { return "<li>" + esc(d.k) + ": " + esc(d.t) + "</li>"; }).join("") +
        "<li>je " + money(c.unit) + (c.pfandUnit ? " · Pfand " + c.qty + " × " + money(c.pfandUnit) : "") + "</li></ul></li>";
    }).join("");
    $("[data-bon-sums]", bonDialog).innerHTML = sumRow("Warenwert", money(t.goods)) + sumRow("Liefergebühr", feeText(t)) +
      sumRow("Getränkepfand", money(t.pfand)) + sumRow("Gesamtbetrag" + (CASH_ONLY ? " – bar zu zahlen" : ""), grandHtml(t), "is-grand") +
      taxLines(t).map(function (x) { return sumRow("", esc(x)); }).join("");
    $("[data-bon-stamp]", bonDialog).textContent = "Übersicht erstellt am " + now.toLocaleDateString("de-DE", { timeZone: H.timezone }) + " um " +
      now.toLocaleTimeString("de-DE", { timeZone: H.timezone, hour: "2-digit", minute: "2-digit" }) + " Uhr · Übersicht, keine Bestätigung";
    bonMsg = buildMessage();
    var send = $("[data-bon-send]", bonDialog);
    send.href = waUrl(bonMsg); send.setAttribute("aria-disabled", "false");
    if (!alertMsg && bonMsg.length > LONG_MSG) alertMsg = "Ihre Bestellung ist sehr umfangreich. Sollte WhatsApp die Nachricht nicht vollständig übernehmen, nutzen Sie bitte „Bestelltext kopieren“ und fügen Sie ihn in WhatsApp ein – oder bestellen Sie telefonisch unter " + R.phoneDisplay + ".";
    var al = $("[data-bon-alert]", bonDialog); al.hidden = !alertMsg; al.textContent = alertMsg || "";
    $("[data-bon-opened]", bonDialog).hidden = true;
    $("[data-new-order]", bonDialog).hidden = true;
  }
  function toSummary() {
    triedSend = true; refresh();
    var p = problems();
    if (p.length) { var f = p.filter(function (x) { return x.el; })[0]; if (f) f.el.focus(); return; }
    if (!drinksAsked && !hasDrink() && orderableDrinks().length) { openDrinks(); return; }
    renderBon(); openDialog(bonDialog);
  }

  if (linesEl && TEST) {
    var testNr = "+" + ORDER_WA.replace(/^49/, "49 ");
    var tb = document.createElement("p"); tb.className = "test-banner"; tb.setAttribute("role", "note");
    tb.innerHTML = "<strong>Testmodus aktiv:</strong> Bestellanfragen gehen an " + esc(testNr) + " (nicht an das Restaurant) und sind unabhängig von den Öffnungszeiten möglich.";
    $(".order-main").insertBefore(tb, $(".order-main").firstChild);
    var tb2 = tb.cloneNode(true); $(".bon-actions", bonDialog).insertBefore(tb2, $(".bon-actions", bonDialog).firstChild);
  }
  if (linesEl) {
    F = { name: $("[data-f-name]"), phone: $("[data-f-phone]"), address: $("[data-f-address]"), address2: $("[data-f-address2]"), time: $("[data-f-time]"), note: $("[data-f-note]"), place: $("[data-f-place]") };
    F.place.innerHTML = '<option value="">Bitte wählen …</option>' + places.slice().sort(function (a, b) { return a.name.localeCompare(b.name, "de"); }).map(function (p) {
      var z = zones[p.zone];
      return '<option value="' + esc(p.name) + '">' + esc(p.name) + " (ab " + money(z.minOrder) + ", Lieferkosten " + money(z.fee) + ")</option>";
    }).join("");                                         // nur bestätigte Liefergebiete – kein „anderer Ort“
    var saved = sess.get(FORM_KEY) || {};
    ["name", "phone", "address", "address2", "place", "note"].forEach(function (k) { if (saved[k]) F[k].value = saved[k]; });
    if (F.place.selectedIndex < 0) F.place.value = "";
    if (saved.mode) $$("[data-mode]").forEach(function (r) { r.checked = r.value === saved.mode; });
    applyDeliveryCutoff(); fillTimes();
    setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) refresh(); });
    window.addEventListener("focus", refresh);

    linesEl.addEventListener("click", function (e) {
      var li = e.target.closest("[data-line]"); if (!li) return;
      var l = cart[+li.getAttribute("data-line")]; if (!l) return;
      if (e.target.closest("[data-l-minus]")) { l.qty -= 1; if (l.qty < 1) { cart.splice(cart.indexOf(l), 1); toast(l.name + " entfernt"); } }
      else if (e.target.closest("[data-l-plus]")) l.qty = Math.min(MAXQ, l.qty + 1);
      else if (e.target.closest("[data-l-remove]")) { cart.splice(cart.indexOf(l), 1); toast(l.name + " entfernt"); }
      else if (e.target.closest("[data-l-edit]")) { openItem(itemById[l._id], l); return; }
      else return;
      saveCart(); renderBadge(); renderCartPage();
    });
    ["input", "change"].forEach(function (ev) {
      $("[data-cart-body]").addEventListener(ev, function (e) {
        if (!e.target.matches("[data-f-name],[data-f-phone],[data-f-address],[data-f-address2],[data-f-time],[data-f-note],[data-f-place],[data-mode]")) return;
        if (e.target.matches("[data-mode]")) fillTimes();
        if (e.target.matches("[data-f-time]")) { timeLost = ""; fillTimes(); }
        saveForm(); updateCheckout(); markInvalid();
      });
    });
    function newOrder() {
      cart = []; saveCart(); sess.del(FORM_KEY);
      ["name", "phone", "address", "address2", "note"].forEach(function (k) { F[k].value = ""; }); F.place.value = "";
      triedSend = false; drinksAsked = false; renderBadge(); renderCartPage(); markInvalid();
    }
    $("[data-cart-clear]").addEventListener("click", function () { newOrder(); toast("Warenkorb und Angaben gelöscht"); });
    $("[data-new-order]", bonDialog).addEventListener("click", function () {
      closeDialog(bonDialog); newOrder(); toast("Neue Bestellung – sie erhält eine neue Bestellreferenz");
      location.href = ROOT + "speisekarte/index.html";        // von jeder Seitentiefe aus korrekt (Drawer)
    });
    var copyText = function (txt, el, ok, fail) {
      var done = function () { toast(ok); };
      var fallback = function () {
        var ta = document.createElement("textarea"); ta.value = txt; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
        (el || document.body).appendChild(ta); ta.select();
        try { document.execCommand("copy") ? done() : toast(fail); } catch (e) { toast(fail); }
        ta.remove();
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, fallback); else fallback();
    };
    $("[data-ref-copy]").addEventListener("click", function () {
      var nr = refFor(mode()); if (!nr) return;
      copyText(nr, this.parentNode, "Bestellreferenz " + nr + " kopiert", "Bitte Nummer markieren und kopieren");
    });
    $("[data-to-summary]").addEventListener("click", toSummary);

    /* Bestellübersicht drucken / als PDF speichern (nur der Bon, siehe @media print) */
    $("[data-bon-print]", bonDialog).addEventListener("click", function () {
      document.documentElement.classList.add("print-bon");
      window.print();
      setTimeout(function () { document.documentElement.classList.remove("print-bon"); }, 500);
    });
    /* Bestelltext kopieren – Ausweg bei sehr langen Nachrichten oder ohne WhatsApp auf diesem Gerät */
    $("[data-bon-copy]", bonDialog).addEventListener("click", function () {
      var now = buildMessage(); if (now !== bonMsg) { renderBon("Ihre Übersicht wurde aktualisiert. Bitte prüfen und erneut kopieren."); return; }
      copyText(now, $(".bon-actions", bonDialog), "Bestelltext kopiert – in WhatsApp einfügen und an " + R.whatsappDisplay + " senden", "Kopieren nicht möglich – bitte telefonisch bestellen");
    });

    /* „Weiter zu WhatsApp“: unmittelbar vorher erneut prüfen (Uhrzeit, Öffnungsstatus, Angaben).
       Hat sich etwas geändert, wird die Übersicht aktualisiert statt eine veraltete Nachricht zu öffnen. */
    $("[data-bon-send]", bonDialog).addEventListener("click", function (e) {
      var before = bonMsg; refresh();
      var p = problems();
      if (p.length) {
        e.preventDefault(); this.setAttribute("aria-disabled", "true");
        var al = $("[data-bon-alert]", bonDialog); al.hidden = false;
        al.textContent = (p[0].long || p[0].msg) + (p[0].long ? "" : " – bitte im Warenkorb korrigieren.");
        return;
      }
      var now = buildMessage();
      if (now !== before) { e.preventDefault(); renderBon("Ihre Übersicht wurde aktualisiert (z. B. Uhrzeit oder Verfügbarkeit). Bitte prüfen und erneut auf „Weiter zu WhatsApp“ tippen."); return; }
      this.href = waUrl(now);
      $("[data-bon-alert]", bonDialog).hidden = true;
      $("[data-bon-opened]", bonDialog).hidden = false;     // neutraler Hinweis – keine Erfolgsmeldung
      $("[data-new-order]", bonDialog).hidden = false;
    });
  }

  /* ---------------- Warenkorb als Drawer von unten (cartDrawer in menu-data.js) ---------------- */
  var drawer = $("#cart-drawer");
  if (drawer && R.cartDrawer) {
    swipeToClose(drawer, ".drawer-inner");
    var openDrawer = function (e) {
      if (e) e.preventDefault();
      refresh(); openDialog(drawer);
      var t = $(".drawer-inner", drawer); if (t) t.scrollTop = 0;
    };
    $$(".cart-link, [data-cart-fab]").forEach(function (a) {
      a.addEventListener("click", openDrawer);
      a.setAttribute("aria-haspopup", "dialog");
    });
    if (location.hash === "#warenkorb") openDrawer();
  }

  /* ---------------- Getränke-Abfrage vor der Übersicht ---------------- */
  var drinksAsked = false, drinkDialog = null;
  var DRINK_CAT = "getraenke";
  function hasDrink() { return cart.some(function (l) { return itemById[l._id].category === DRINK_CAT; }); }
  function orderableDrinks() { return items.filter(function (i) { return i.category === DRINK_CAT && i.orderable && !i.groups.length; }); }
  function openDrinks() {
    var drinks = orderableDrinks();
    if (!drinks.length) { drinksAsked = true; toSummary(); return; }
    if (!drinkDialog) {
      drinkDialog = document.createElement("dialog");
      drinkDialog.className = "sheet sheet-drinks"; drinkDialog.setAttribute("aria-labelledby", "drinks-title");
      drinkDialog.innerHTML = '<div class="sheet-inner"><div class="sheet-head"><div><p class="eyebrow">Fast geschafft</p><h2 id="drinks-title">Noch etwas zu trinken?</h2></div>' +
        '<button class="icon-btn sheet-close" type="button" data-close aria-label="Schließen">×</button></div>' +
        '<ul class="drink-list">' + drinks.map(function (d) {
          return '<li class="drink" data-drink="' + d._id + '"><div class="drink-name">' + esc(d.name) +
            '<small class="drink-pfand">' + (d.pfand ? "zzgl. " + money(d.pfand) + " Pfand" : "ohne Pfand") + "</small>" +
            '<span class="drink-added" data-added hidden></span></div>' +
            '<div class="drink-sizes">' + d.prices.map(function (p, i) {
              return '<button type="button" class="drink-size" data-v="' + i + '">' + (p.label ? esc(p.label) + " · " : "") + money(p.price) + "</button>";
            }).join("") + "</div></li>";
        }).join("") + "</ul>" +
        '<div class="sheet-foot drink-foot"><button type="button" class="btn btn-link" data-drinks-skip>Ohne Getränk weiter</button>' +
        '<button type="button" class="btn btn-primary btn-grow" data-drinks-go>Weiter zur Übersicht</button></div></div>';
      document.body.appendChild(drinkDialog);
      swipeToClose(drinkDialog, ".sheet-inner", isSheetMobile);
      drinkDialog.addEventListener("click", function (e) {
        if (e.target === drinkDialog || e.target.closest("[data-close]")) { closeDialog(drinkDialog); return; }
        var b = e.target.closest(".drink-size");
        if (b) {
          var li = b.closest("[data-drink]"), it = itemById[li.getAttribute("data-drink")];
          addToCart(it, +b.getAttribute("data-v"), {}, 1, "");
          var tag = $("[data-added]", li), n = (+tag.getAttribute("data-n") || 0) + 1;
          tag.setAttribute("data-n", n); tag.textContent = n + " × hinzugefügt"; tag.hidden = false;
          b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
          return;
        }
        if (e.target.closest("[data-drinks-skip]") || e.target.closest("[data-drinks-go]")) {
          drinksAsked = true; closeDialog(drinkDialog); toSummary();
        }
      });
      drinkDialog.addEventListener("close", function () { if (!$("dialog[open]")) document.body.style.overflow = ""; });
    }
    $$("[data-added]", drinkDialog).forEach(function (t) { t.hidden = true; t.setAttribute("data-n", 0); });
    openDialog(drinkDialog);
  }

  /* ---------------- Fixierte Buttons über der Footer-Leiste halten ---------------- */
  (function () {
    var bar = $(".footer-bottom"); if (!bar) return;
    var root = document.documentElement, raf = 0;
    var lift = function () {
      raf = 0;
      var visible = Math.max(0, window.innerHeight - bar.getBoundingClientRect().top);
      root.style.setProperty("--fab-lift", Math.round(visible) + "px");
    };
    var req = function () { if (!raf) raf = requestAnimationFrame(lift); };
    window.addEventListener("scroll", req, { passive: true });
    window.addEventListener("resize", req);
    lift();
  })();

  /* ---------------- Seiten-CTA (rechts fixiert) ---------------- */
  var cta = $("[data-side-cta]");
  if (cta) {
    var tab = $(".side-cta-tab", cta);
    var setCta = function (open) { cta.classList.toggle("is-open", open); tab.setAttribute("aria-expanded", String(open)); };
    tab.addEventListener("click", function (e) { e.stopPropagation(); setCta(!cta.classList.contains("is-open")); });
    document.addEventListener("click", function (e) { if (!cta.contains(e.target)) setCta(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setCta(false); });
    // erst nach kurzem Scrollen bzw. 1,2 s einblenden – stört den ersten Eindruck nicht
    var showCta = function () { cta.classList.add("is-visible"); };
    setTimeout(showCta, 1200);
    window.addEventListener("scroll", function () { if (window.scrollY > 120) showCta(); }, { passive: true });
  }

  renderBadge();
  renderCartPage();

  /* ---------------- Toast & Jahr ---------------- */
  var toastEl = $("[data-toast]"), toastT;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg; toastEl.classList.add("is-visible");
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove("is-visible"); }, 2400);
  }
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
