/* =====================================================================
   SHAHI Küche – Oberfläche (alle Seiten)
   Navigation · Status · Speisekarte · Suche · Gericht-Dialog · Warenkorb
   · Bestellstrecke bis WhatsApp. Rechenregeln: core.js, HTML-Bausteine: view.js
   ===================================================================== */
(function () {
  "use strict";
  var C = window.ShahiCore, V = window.ShahiView;
  var doc = document, root = doc.documentElement;
  var BASE = root.getAttribute("data-base") || "";
  var VERSION = root.getAttribute("data-version") || "";
  root.classList.add("js");

  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  var esc = V.esc, icon = V.icon, euro = C.euro;

  /* ---------------- Navigation (auch ohne Daten) ---------------- */
  (function nav() {
    var t = $(".nav-toggle"), label = $("[data-nav-label]");
    if (!t) return;
    function set(open) {
      doc.body.classList.toggle("nav-open", open);
      t.setAttribute("aria-expanded", String(open));
      if (label) label.textContent = open ? "Menü schließen" : "Menü öffnen";
    }
    t.addEventListener("click", function () { set(!doc.body.classList.contains("nav-open")); });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") set(false); });
    $$(".main-nav a").forEach(function (a) { a.addEventListener("click", function () { set(false); }); });
    window.addEventListener("resize", function () { if (window.innerWidth >= 900) set(false); });
  })();
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------------- Toast ---------------- */
  var toastEl = $("[data-toast]"), toastT;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("is-visible");
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove("is-visible"); }, 2800);
  }

  /* ---------------- Speicher (fehlertolerant) ---------------- */
  function storage(kind) {
    return {
      get: function (k) { try { return JSON.parse(window[kind].getItem(k)); } catch (e) { return null; } },
      set: function (k, v) { try { window[kind].setItem(k, JSON.stringify(v)); } catch (e) { /* gesperrt */ } },
      del: function (k) { try { window[kind].removeItem(k); } catch (e) { /* gesperrt */ } }
    };
  }
  var LS = storage("localStorage"), SS = storage("sessionStorage");
  var CART_KEY = "shahi-warenkorb-v1", FORM_KEY = "shahi-angaben-v1";

  /* ---------------- Daten laden ---------------- */
  function getJson(p) {
    return fetch(BASE + p + "?v=" + VERSION, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(p + ": HTTP " + r.status);
      return r.json();
    });
  }
  Promise.all([getJson("data/config.json"), getJson("data/menu.json")])
    .then(function (res) { start(res[0], res[1]); })
    .catch(function (e) {
      console.error("Daten konnten nicht geladen werden:", e);
      var off = $("[data-checkout-off]");
      if (off) off.querySelector("h2").textContent = "Die Bestellfunktion ist gerade nicht erreichbar";
    });

  /* =====================================================================
     Start
     ===================================================================== */
  function start(config, menu) {
    var check = C.validateMenu(menu);
    if (check.errors.length) console.error("Speisekarte fehlerhaft – Online-Bestellung deaktiviert:", check.errors);
    var idx = C.normalizeMenu(menu);
    var MODE = C.siteMode(config);
    var blockers = MODE === "live" ? C.launchBlockers(config) : [];
    if (blockers.length) console.warn("SHAHI: Online-Bestellung gesperrt, es fehlt:", blockers);
    var ORDERING = C.onlineOrderingEnabled(config) && !check.errors.length;
    var TEST = MODE === "test";
    var WA_NUMBER = TEST ? config.betrieb.testmodus.whatsappNummer : config.restaurant.whatsapp.nummer;
    var MAX_QTY = config.bestellung.maxMengeProPosition || 50;
    var TTL = (config.bestellung.warenkorbGueltigStunden || 12) * 3600 * 1000;
    var VERBINDLICH = config.bestellung.rechtsmodell !== "anfrage";
    root.setAttribute("data-mode", MODE);

    /* ---------- Status & Öffnungszeiten ---------- */
    function renderStatus() {
      var st = C.orderingStatus(new Date(), config);
      var pill = $("[data-status-pill]"), short = $("[data-status-short]");
      if (pill) {
        pill.classList.remove("is-open", "is-closed");
        if (MODE === "pre") short.textContent = "Eröffnung in Vorbereitung";
        else {
          pill.classList.add(st.canOrder ? "is-open" : "is-closed");
          short.textContent = st.canOrder ? "Jetzt geöffnet" : st.grund === "ruhetag" ? "Heute Ruhetag" : "Geschlossen";
        }
      }
      $$("[data-status-long]").forEach(function (el) {
        el.textContent = MODE === "pre" ? "Die Öffnungszeiten gelten ab der Eröffnung." : st.text;
      });
      $$("[data-hours] li").forEach(function (li) { li.classList.toggle("is-today", +li.getAttribute("data-wd") === st.now.wd); });
      return st;
    }
    renderStatus();
    setInterval(renderStatus, 30000);

    if (MODE !== "pre") {
      $$("[data-opening-note], [data-opening-inline]").forEach(function (el) { el.hidden = true; });
    } else if (config.betrieb.eroeffnungsdatum) {
      $$("[data-opening-text]").forEach(function (el) { el.textContent = "Eröffnung: " + config.betrieb.eroeffnungsdatum + ". " + config.betrieb.vorEroeffnungText; });
    }
    var st0 = config.steuer || {};
    $$("[data-price-note]").forEach(function (el) {
      if (st0.status !== "bestaetigt") return;
      el.textContent = st0.kleinunternehmer ? "Alle Preise sind Endpreise in Euro. Gemäß § 19 UStG wird keine Umsatzsteuer berechnet. Getränke zuzüglich Pfand, soweit angegeben; bei Lieferung zuzüglich Lieferkosten."
        : "Alle Preise in Euro inklusive gesetzlicher Umsatzsteuer. Getränke zuzüglich Pfand, soweit angegeben; bei Lieferung zuzüglich Lieferkosten.";
    });

    /* ---------- Speisekarte aus den aktuellen Daten ---------- */
    var listCtx = { idx: idx, config: config, mode: MODE, ordering: ORDERING, base: BASE };
    function productsOf(cat) { return idx.products.filter(function (p) { return p.kategorie === cat; }); }
    $$("[data-menu-list]").forEach(function (el) {
      var key = el.getAttribute("data-menu-list");
      if (key === "alle") el.innerHTML = idx.categories.map(function (c) { return V.categoryHtml(c, productsOf(c.id), listCtx); }).join("");
      else if (idx.catById[key]) el.innerHTML = V.categoryHtml(Object.assign({}, idx.catById[key], { beschreibung: "" }), productsOf(key), listCtx);
    });
    if (location.hash && location.hash.length > 1) {
      var target = doc.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) setTimeout(function () { target.scrollIntoView({ block: "start" }); }, 30);
    }

    /* Orte im Liefergebiet (nur bestätigte) */
    var placesEl = $("[data-places]");
    if (placesEl) {
      var conf = (config.lieferung.orte || []).filter(function (o) { return o.bestaetigt === true; });
      if (conf.length) placesEl.innerHTML = '<ul class="place-list">' + conf.map(function (o) {
        return "<li>" + esc(o.name) + ' <span class="small">' + esc(o.plz) + "</span> – " + esc((C.zoneById(config, o.zone) || {}).name || "") + "</li>";
      }).join("") + '</ul><p class="small">Ihr Ort fehlt? Rufen Sie uns an – wir sagen Ihnen, ob wir liefern.</p>';
    }

    /* ---------- Suche & Filter ---------- */
    var searchEl = $("[data-search]");
    if (searchEl) {
      var resultsEl = $("[data-search-results]"), listEl = $('[data-menu-list="alle"]');
      var filters = {};
      var run = function () {
        var q = searchEl.value.trim();
        var active = Object.keys(filters).filter(function (k) { return filters[k]; });
        if (!q && !active.length) { resultsEl.hidden = true; resultsEl.innerHTML = ""; listEl.hidden = false; return; }
        var found = q ? C.searchProducts(idx.products, q, idx.catById) : idx.products.slice();
        found = found.filter(function (p) { return active.every(function (f) { return p.merkmale.indexOf(f) > -1; }); });
        var label = (q ? "„" + esc(q) + "“" : "") + (active.length ? (q ? ", " : "") + active.join(", ") : "");
        resultsEl.innerHTML = found.length
          ? "<h2>" + found.length + " Treffer für " + label + '</h2><div class="dish-list">' + found.map(function (p) { return V.dishHtml(p, Object.assign({ showCategory: true }, listCtx)); }).join("") + "</div>"
          : "<h2>Keine Treffer für " + label + '</h2><p>Versuchen Sie einen anderen Begriff oder eine Nummer, z. B. „Butter Chicken“ oder „106“. <button type="button" class="btn btn-text" data-search-reset>Suche zurücksetzen</button></p>';
        resultsEl.hidden = false;
        listEl.hidden = !!found.length;
        try { history.replaceState(null, "", q ? "?q=" + encodeURIComponent(q) : location.pathname); } catch (e) { /* file:// */ }
      };
      var deb;
      searchEl.addEventListener("input", function () { clearTimeout(deb); deb = setTimeout(run, 140); });
      $("[data-search-form]").addEventListener("submit", function (e) { e.preventDefault(); run(); searchEl.blur(); });
      $$("[data-filter]").forEach(function (b) {
        b.addEventListener("click", function () {
          var f = b.getAttribute("data-filter"); filters[f] = !filters[f];
          b.setAttribute("aria-pressed", String(!!filters[f])); run();
        });
      });
      resultsEl.addEventListener("click", function (e) {
        if (e.target.closest("[data-search-reset]")) { searchEl.value = ""; Object.keys(filters).forEach(function (k) { filters[k] = false; }); $$("[data-filter]").forEach(function (b) { b.setAttribute("aria-pressed", "false"); }); run(); searchEl.focus(); }
      });
      var q0 = new URLSearchParams(location.search).get("q");
      if (q0) { searchEl.value = q0.slice(0, 80); run(); }
    }

    /* ---------- Scrollspy der Kategorieleiste ---------- */
    var rail = $("[data-rail]");
    if (rail && "IntersectionObserver" in window && $('a[href^="#"]', rail)) {
      var links = {};
      $$("a", rail).forEach(function (a) { links[a.getAttribute("href").slice(1)] = a; });
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          $$("a", rail).forEach(function (a) { a.removeAttribute("aria-current"); });
          var a = links[en.target.id]; if (!a) return;
          a.setAttribute("aria-current", "true");
          var ul = a.closest("ul");
          ul.scrollTo({ left: a.offsetLeft - ul.clientWidth / 2 + a.clientWidth / 2, behavior: "smooth" });
        });
      }, { rootMargin: "-30% 0px -65% 0px" });
      $$(".menu-cat[id]").forEach(function (s) { spy.observe(s); });
    } else if (rail) {
      var cur = $("[aria-current]", rail);
      if (cur) { var ul2 = cur.closest("ul"); ul2.scrollLeft = cur.offsetLeft - ul2.clientWidth / 2 + cur.clientWidth / 2; }
    }

    /* ---------- Startseite: Wortpaare ---------- */
    heroRotation();

    /* =================================================================
       Warenkorb
       ================================================================= */
    var cart = loadCart();
    var refError = false;

    function loadCart() {
      var raw = LS.get(CART_KEY), out = { lines: [], ref: null };
      if (!raw || typeof raw !== "object") return out;
      if (!raw.t || Date.now() - raw.t > TTL) { LS.del(CART_KEY); return out; }
      var lost = 0;
      (Array.isArray(raw.lines) ? raw.lines : []).forEach(function (l) {
        var priced = l && C.priceLine(l, idx, config);
        if (!priced) { lost++; return; }
        var line = { p: l.p, v: l.v, s: priced.sel, n: priced.note, q: priced.qty };
        var key = C.lineKey(line), twin = out.lines.filter(function (x) { return C.lineKey(x) === key; })[0];
        if (twin) twin.q = Math.min(MAX_QTY, twin.q + line.q); else out.lines.push(line);
      });
      if (raw.ref && C.REF_ID_RE.test(raw.ref.id) && /^\d{6}$/.test(raw.ref.ym)) out.ref = { id: raw.ref.id, ym: raw.ref.ym };
      if (lost) setTimeout(function () { toast(lost === 1 ? "Ein Artikel ist nicht mehr verfügbar und wurde entfernt." : lost + " Artikel sind nicht mehr verfügbar und wurden entfernt."); }, 600);
      if (out.lines.length && !out.ref) out.ref = newRef();
      return out;
    }
    function newRef() {
      try { refError = false; return { id: C.randomRefId(window.crypto), ym: C.yearMonth(new Date(), config.oeffnungszeiten.zeitzone) }; }
      catch (e) { refError = true; return null; }
    }
    function saveCart() {
      if (!cart.lines.length) { LS.del(CART_KEY); cart.ref = null; return; }
      if (!cart.ref) cart.ref = newRef();
      LS.set(CART_KEY, { t: Date.now(), ref: cart.ref, lines: cart.lines });
    }
    function pricedLines() {
      return cart.lines.map(function (l) { return C.priceLine(l, idx, config); });
    }
    function addLine(line) {
      var key = C.lineKey(line), twin = cart.lines.filter(function (x) { return C.lineKey(x) === key; })[0];
      if (twin) twin.q = Math.min(MAX_QTY, twin.q + line.q); else cart.lines.push(line);
      saveCart(); cartChanged();
    }
    function replaceLine(i, line) {
      var key = C.lineKey(line);
      var twinIdx = -1;
      cart.lines.forEach(function (x, j) { if (j !== i && C.lineKey(x) === key) twinIdx = j; });
      if (twinIdx > -1) { cart.lines[twinIdx].q = Math.min(MAX_QTY, cart.lines[twinIdx].q + line.q); cart.lines.splice(i, 1); }
      else cart.lines[i] = line;
      saveCart(); cartChanged();
    }
    function cartCount() { return cart.lines.reduce(function (s, l) { return s + l.q; }, 0); }

    /* Synchronisierung zwischen Tabs */
    window.addEventListener("storage", function (e) {
      if (e.key !== CART_KEY) return;
      cart = loadCart(); cartChanged();
    });

    var listeners = [];
    function cartChanged() { renderBadge(); renderDrawer(); listeners.forEach(function (fn) { fn(); }); }

    function renderBadge() {
      var n = cartCount();
      $$("[data-cart-count]").forEach(function (el) { el.textContent = n; el.hidden = !n; });
      $$("[data-cart-open]").forEach(function (b) {
        b.hidden = !ORDERING;
        if (b.classList.contains("cart-btn")) b.setAttribute("aria-label", "Warenkorb öffnen, " + n + " Artikel");
      });
      var route = $("[data-bar-route]");
      if (route) route.hidden = ORDERING;
    }
    function bump() { $$(".cart-count, .bar-count").forEach(function (el) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }); }

    /* ---------- Dialog-Helfer ---------- */
    function openDialog(d) {
      if (!d) return;
      if (typeof d.showModal === "function") { if (!d.open) d.showModal(); } else d.setAttribute("open", "");
      doc.body.style.overflow = "hidden";
    }
    function closeDialog(d) { if (!d) return; if (typeof d.close === "function") d.close(); else d.removeAttribute("open"); }
    $$("dialog").forEach(function (d) {
      d.addEventListener("close", function () { if (!$("dialog[open]")) doc.body.style.overflow = ""; });
      d.addEventListener("click", function (e) {
        if (e.target === d || e.target.closest("[data-close]")) closeDialog(d);
      });
    });

    /* =================================================================
       Gericht-Dialog
       ================================================================= */
    var itemDlg = $("#item-dialog"), itemForm = $("[data-item-form]");
    var cur = null, curState = null, curQty = 1, editIndex = -1;

    function selectedFromForm() {
      var sel = {};
      curState.groups.forEach(function (gid) {
        sel[gid] = $$('input[data-g="' + gid + '"]:checked', itemForm).map(function (x) { return x.value; });
      });
      return sel;
    }
    function variantFromForm() {
      var r = $('input[name="variant"]:checked', itemForm);
      return r ? r.value : cur.varianten[0].id;
    }
    function currentLine() {
      return { p: cur.id, v: variantFromForm(), s: C.sanitizeSelection(selectedFromForm(), curState.groups, idx.groups), n: C.clean($("[data-item-note]", itemForm).value, 200), q: curQty };
    }

    function openItem(id, lineIndex) {
      var p = idx.productById[id];
      if (!p || !itemDlg) return;
      cur = p; curState = C.productState(p, idx, config);
      editIndex = typeof lineIndex === "number" ? lineIndex : -1;
      var line = editIndex > -1 ? cart.lines[editIndex] : null;
      curQty = line ? line.q : 1;
      var canOrder = ORDERING && curState.orderable;
      var cat = idx.catById[p.kategorie];
      $("[data-item-illu]", itemDlg).setAttribute("href", BASE + "assets/img/illustrationen.svg#" + p.illustration);
      $("[data-item-nr]", itemDlg).textContent = (p.nr ? "Nr. " + p.nr + " · " : "") + cat.name;
      $("[data-item-title]", itemDlg).textContent = p.name;
      var desc = [p.beschreibung, cat.beschreibung].filter(Boolean).map(function (t) { return /[.!?)]$/.test(t) ? t : t + "."; }).join(" ");
      if (p.kategorie === "getraenke" || p.pfandCent) desc += (desc ? " " : "") + (p.pfandCent ? "Zuzüglich " + euro(p.pfandCent) + " Pfand je Stück." : p.pfandCent === null ? "Pfand wird noch angegeben." : "Ohne Pfand.");
      $("[data-item-desc]", itemDlg).textContent = desc;

      var vBox = $("[data-item-variants]", itemDlg);
      if (p.varianten.length > 1) {
        vBox.innerHTML = '<fieldset class="opt-group"><legend>' + esc(C.variantLabel(p)) + '</legend><div class="opt-list">' + p.varianten.map(function (v, i) {
          var gp = C.unitPriceText(v);
          var checked = line ? line.v === v.id : i === 0;
          return '<label class="opt"><input type="radio" name="variant" value="' + esc(v.id) + '"' + (checked ? " checked" : "") + (canOrder ? "" : " disabled") + "><span>" + esc(v.name) + (gp ? ' <small class="small">' + gp + "</small>" : "") + '</span><span class="opt-price">' + euro(v.preisCent) + "</span></label>";
        }).join("") + "</div></fieldset>";
      } else vBox.innerHTML = p.varianten[0].volumenMl ? '<p class="small">' + esc(p.varianten[0].name) + " – " + C.unitPriceText(p.varianten[0]) + "</p>" : "";

      var groupIds = canOrder ? curState.groups : p.optionen;
      $("[data-item-groups]", itemDlg).innerHTML = groupIds.map(function (gid) {
        var g = idx.groups[gid], one = g.typ === "eine";
        var chosen = line && line.s[gid] ? line.s[gid] : (one ? [g.optionen[0].id] : []);
        var hint = one ? "" : g.min ? "genau " + g.min : g.max ? "bis zu " + g.max : "optional";
        return '<fieldset class="opt-group" data-group="' + esc(gid) + '"><legend><span>' + esc(g.label) + '</span><small data-hint="' + esc(gid) + '">' + esc(hint) + '</small></legend><div class="opt-list' + (g.optionen.length > 8 ? " opt-grid" : "") + '">' +
          g.optionen.map(function (o) {
            return '<label class="opt"><input type="' + (one ? "radio" : "checkbox") + '" name="g-' + esc(gid) + '" data-g="' + esc(gid) + '" value="' + esc(o.id) + '"' + (chosen.indexOf(o.id) > -1 ? " checked" : "") + (canOrder ? "" : " disabled") + "><span>" + esc(o.name) + '</span><span class="opt-price">' + (o.preisCent ? "+ " + euro(o.preisCent) : "") + "</span></label>";
          }).join("") + "</div></fieldset>";
      }).join("");

      $("[data-item-note]", itemForm).value = line ? line.n : "";
      $("[data-item-note-wrap]", itemDlg).hidden = !canOrder;
      $("[data-item-foot]", itemDlg).hidden = !canOrder;
      var info = $("[data-item-info]", itemDlg);
      info.hidden = canOrder;
      info.textContent = MODE === "pre" ? "Bestellen können Sie ab der Eröffnung. Bis dahin: alle Preise und Allergene zum Nachlesen." : !ORDERING ? "Online-Bestellung ist gerade nicht verfügbar. Gerne nehmen wir Ihre Bestellung telefonisch auf: " + config.restaurant.telefon[0].anzeige + "." : curState.reason;
      $("[data-item-submit]", itemDlg).setAttribute("data-mode", editIndex > -1 ? "edit" : "add");
      updateItem();
      openDialog(itemDlg);
    }

    function updateItem() {
      if (!cur) return;
      // Höchstanzahl durchsetzen
      curState.groups.forEach(function (gid) {
        var g = idx.groups[gid]; if (!g.max || g.typ === "eine") return;
        var boxes = $$('input[data-g="' + gid + '"]', itemForm);
        var n = boxes.filter(function (b) { return b.checked; }).length;
        boxes.forEach(function (b) { if (!ORDERING || !curState.orderable) return; b.disabled = !b.checked && n >= g.max; b.closest(".opt").classList.toggle("is-disabled", b.disabled); });
        var hint = $('[data-hint="' + gid + '"]', itemForm);
        if (hint) { hint.textContent = n + " von " + (g.min || g.max) + " gewählt"; hint.classList.toggle("is-done", !!g.min && n === g.min); }
      });
      var line = currentLine(), priced = C.priceLine(line, idx, config);
      var allergene = priced ? priced.allergene : cur.allergene, zus = priced ? priced.zusatzstoffe : cur.zusatzstoffe;
      var checkNote = cur.pruefen.some(function (x) { return x.feld === "allergene"; }) ? '<p class="small">Die Kennzeichnung dieses Gerichts wird vom Restaurant noch geprüft. Bitte fragen Sie bei Allergien nach.</p>' : "";
      var groupCheck = curState.groups.some(function (g) { return (idx.groups[g].pruefen || []).length; }) ? '<p class="small">Für einige Extras liegen noch keine Allergenangaben vor.</p>' : "";
      $("[data-item-allergens]", itemDlg).innerHTML = V.codesLong(allergene, zus, idx.legende) + checkNote + groupCheck;
      $("[data-qty]", itemDlg).textContent = curQty;
      $("[data-qty-minus]", itemDlg).disabled = curQty <= 1;
      $("[data-qty-plus]", itemDlg).disabled = curQty >= MAX_QTY;
      var btn = $("[data-item-submit]", itemDlg);
      if (!priced) { btn.textContent = "Nicht verfügbar"; btn.setAttribute("aria-disabled", "true"); return; }
      var err = priced.selectionErrors[0];
      if (err) { btn.textContent = err.missing > 1 ? "Noch " + err.missing + " auswählen" : err.msg; btn.setAttribute("aria-disabled", "true"); }
      else { btn.textContent = (editIndex > -1 ? "Übernehmen · " : "Hinzufügen · ") + euro(priced.totalCent); btn.setAttribute("aria-disabled", "false"); }
    }

    if (itemForm) {
      itemForm.addEventListener("change", updateItem);
      $("[data-item-note]", itemForm).addEventListener("input", function () { /* Preis unverändert */ });
      $("[data-qty-minus]", itemForm).addEventListener("click", function () { curQty = Math.max(1, curQty - 1); updateItem(); });
      $("[data-qty-plus]", itemForm).addEventListener("click", function () { curQty = Math.min(MAX_QTY, curQty + 1); updateItem(); });
      itemForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!ORDERING || !curState.orderable) return;
        var line = currentLine(), priced = C.priceLine(line, idx, config);
        if (!priced) return;
        if (priced.selectionErrors.length) {
          var g = $('[data-group="' + priced.selectionErrors[0].group + '"]', itemForm);
          if (g) g.scrollIntoView({ block: "nearest", behavior: "smooth" });
          toast(priced.selectionErrors[0].msg);
          return;
        }
        line.s = priced.sel; line.n = priced.note;
        if (editIndex > -1 && cart.lines[editIndex]) { replaceLine(editIndex, line); toast("Änderung übernommen"); }
        else {
          addLine(line); bump();
          var info = priced.details.filter(function (d) { return d.label !== "Hinweis"; }).map(function (d) { return d.text; }).join(", ");
          toast(line.q + " × " + cur.name + (info ? " (" + (info.length > 70 ? info.slice(0, 68) + " …" : info) + ")" : "") + " im Warenkorb");
        }
        closeDialog(itemDlg);
      });
    }
    doc.addEventListener("click", function (e) {
      var b = e.target.closest("[data-open]");
      if (b) { e.preventDefault(); openItem(b.getAttribute("data-open")); }
    });

    /* =================================================================
       Warenkorb-Drawer
       ================================================================= */
    var cartDlg = $("#cart-dialog");
    function linesHtml(priced, opts) {
      if (!priced.length) return '<div class="empty"><p>Ihr Warenkorb ist leer.</p><p><a class="btn btn-gold" href="' + BASE + 'speisekarte/index.html">Gerichte auswählen</a></p></div>';
      return '<ul class="cl-list">' + priced.map(function (c, i) {
        if (!c) return "";
        var warn = !c.orderable ? '<p class="cl-warn">' + esc(c.reason) + " – bitte entfernen.</p>" : c.selectionErrors.length ? '<p class="cl-warn">' + esc(c.selectionErrors[0].msg) + " – bitte über „Ändern“ ergänzen.</p>" : "";
        return '<li class="cl" data-line="' + i + '">' +
          '<div><p class="cl-title">' + (c.product.nr ? '<span class="dish-nr">' + esc(c.product.nr) + "</span>" : "") + esc(c.product.name) + "</p>" +
          (c.details.length ? '<ul class="cl-details">' + c.details.map(function (d) { return "<li><span>" + esc(d.label) + ":</span> " + esc(d.text) + "</li>"; }).join("") + "</ul>" : "") +
          '<p class="cl-unit">' + euro(c.unitCent) + " je Stück" + (c.pfandUnitCent ? ", zzgl. " + euro(c.pfandUnitCent) + " Pfand" : "") + "</p></div>" +
          '<strong class="cl-price">' + euro(c.totalCent) + "</strong>" + warn +
          '<div class="cl-ctrl"><div class="qty" role="group" aria-label="Menge ' + esc(c.product.name) + '">' +
            '<button type="button" class="qty-btn" data-l-minus aria-label="' + (c.qty > 1 ? "Eins weniger" : esc(c.product.name) + " entfernen") + '">' + icon(c.qty > 1 ? "minus" : "trash") + "</button>" +
            "<output>" + c.qty + "</output>" +
            '<button type="button" class="qty-btn" data-l-plus aria-label="Eins mehr"' + (c.qty >= MAX_QTY ? " disabled" : "") + ">" + icon("plus") + "</button></div>" +
          (c.product.optionen.length || c.product.varianten.length > 1 || true ? '<button type="button" class="btn btn-text btn-small" data-l-edit>' + icon("pencil") + " Ändern</button>" : "") +
          '<button type="button" class="btn btn-text btn-small" data-l-remove>' + icon("trash") + " Entfernen</button></div></li>";
      }).join("") + "</ul>";
    }
    function sumsHtml(t, opts) {
      opts = opts || {};
      var rows = [["Warenwert", euro(t.goodsCent)]];
      if (t.pfandCent) rows.push(["Pfand", euro(t.pfandCent)]);
      if (opts.withFee && t.delivery) rows.push(["Lieferkosten", t.zone ? euro(t.feeCent) : "nach Wahl des Orts"]);
      var grand = opts.withFee ? t.totalCent : t.goodsCent + t.pfandCent;
      return rows.map(function (r) { return "<div><dt>" + r[0] + "</dt><dd>" + r[1] + "</dd></div>"; }).join("") +
        '<div class="is-grand"><dt>' + (opts.withFee ? "Gesamt" : "Zwischensumme") + "</dt><dd>" + euro(grand) + "</dd></div>" +
        (!opts.withFee ? '<div class="is-sub"><dt>Lieferkosten und Mindestbestellwert folgen im nächsten Schritt.</dt><dd></dd></div>' : "");
    }
    function handleLineClick(e, after) {
      var li = e.target.closest("[data-line]"); if (!li) return;
      var i = +li.getAttribute("data-line"), l = cart.lines[i]; if (!l) return;
      var name = (idx.productById[l.p] || {}).name || "Artikel";
      if (e.target.closest("[data-l-minus]")) { if (l.q > 1) l.q -= 1; else { cart.lines.splice(i, 1); toast(name + " entfernt"); } }
      else if (e.target.closest("[data-l-plus]")) l.q = Math.min(MAX_QTY, l.q + 1);
      else if (e.target.closest("[data-l-remove]")) { cart.lines.splice(i, 1); toast(name + " entfernt"); }
      else if (e.target.closest("[data-l-edit]")) { openItem(l.p, i); return; }
      else return;
      saveCart(); cartChanged();
      if (after) after();
    }
    function renderDrawer() {
      if (!cartDlg) return;
      var priced = pricedLines().filter(Boolean);
      var t = C.totals(priced, config, {});
      $("[data-cart-lines]", cartDlg).innerHTML = linesHtml(pricedLines());
      $("[data-cart-sums]", cartDlg).innerHTML = priced.length ? sumsHtml(t) : "";
      $("[data-cart-sub]", cartDlg).textContent = t.count ? t.count + " Artikel" : "";
      var go = $("[data-to-checkout]", cartDlg);
      go.hidden = !priced.length;
    }
    if (cartDlg) {
      $("[data-cart-lines]", cartDlg).addEventListener("click", function (e) { handleLineClick(e); });
      $$("[data-cart-open]").forEach(function (b) {
        b.addEventListener("click", function () {
          if ($("[data-checkout]") && !$("[data-checkout]").hidden) { goStep("warenkorb"); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
          renderDrawer(); openDialog(cartDlg);
        });
      });
    }

    renderBadge();
    renderDrawer();

    /* =================================================================
       Bestellstrecke (bestellen.html)
       ================================================================= */
    var checkoutGoStep = null;
    function goStep(s) { if (checkoutGoStep) checkoutGoStep(s); }
    var co = $("[data-checkout]");
    if (co) checkout();

    function checkout() {
      var off = $("[data-checkout-off]");
      if (!ORDERING) {
        if (MODE === "live") {
          off.querySelector("h2").textContent = "Online-Bestellung ist gerade nicht verfügbar";
          off.querySelector("p").textContent = "Bitte bestellen Sie telefonisch – wir nehmen Ihre Bestellung gern auf.";
        }
        return;
      }
      off.hidden = true; co.hidden = false;
      if (TEST) {
        var tb = $("[data-test-banner]");
        tb.hidden = false;
        tb.textContent = "Testmodus aktiv: Bestellungen gehen an +" + WA_NUMBER + " (nicht an das Restaurant), sind als TEST markiert und unabhängig von den Öffnungszeiten möglich.";
      }
      var F = Object.assign({ art: "", ort: "", strasse: "", plz: "", fahrerHinweis: "", name: "", telefon: "", notiz: "", zeitart: "asap", zeit: "asap" }, SS.get(FORM_KEY) || {});
      var STEPS = ["warenkorb", "art", "adresse", "kontakt", "zeit", "uebersicht"];
      var LABELS = { warenkorb: "Warenkorb", art: "Bestellart", adresse: "Adresse", kontakt: "Kontakt", zeit: "Wunschzeit", uebersicht: "Übersicht" };
      var step = SS.get(FORM_KEY + "-schritt") || "warenkorb";
      var errors = {}, lastMessage = "", sent = false;

      function activeSteps() { return STEPS.filter(function (s) { return s !== "adresse" || F.art === "lieferung"; }); }
      function save() { SS.set(FORM_KEY, F); SS.set(FORM_KEY + "-schritt", step); }
      function places() { return C.deliveryPlaces(config); }
      function deliveryAvailable() { return places().length > 0; }
      function status() { return TEST ? { canOrder: true, text: "", grund: "offen" } : C.orderingStatus(new Date(), config); }
      function times(art) { return C.wishTimes(new Date(), art || F.art || "abholung", config); }

      /* Formular <-> Zustand */
      var fields = $$("[data-f]", co);
      function fillForm() {
        var sel = $('[data-f="ort"]', co);
        sel.innerHTML = '<option value="">Bitte wählen …</option>' + places().slice().sort(function (a, b) { return a.name.localeCompare(b.name, "de"); }).map(function (o) {
          var z = C.zoneById(config, o.zone);
          return '<option value="' + esc(o.name) + '">' + esc(o.name) + " (" + esc(o.plz) + ") – ab " + euro(z.mindestbestellwertCent) + ", Lieferung " + euro(z.lieferkostenCent) + "</option>";
        }).join("");
        fields.forEach(function (el) {
          var k = el.getAttribute("data-f");
          if (el.type === "radio") el.checked = F[k] === el.value;
          else if (k !== "zeit") el.value = F[k] || "";
        });
        fillTimes();
      }
      function fillTimes() {
        var sel = $('[data-f="zeit"]', co), list = times();
        sel.innerHTML = list.length ? list.map(function (t) { return '<option value="' + t + '">Heute, ' + t + " Uhr</option>"; }).join("") : '<option value="" disabled>Heute keine Uhrzeit mehr wählbar</option>';
        if (F.zeitart === "uhrzeit" && list.indexOf(F.zeit) > -1) sel.value = F.zeit;
        else if (F.zeitart === "uhrzeit" && list.length && F.zeit !== "asap") { sel.value = list[0]; }
        $("[data-time-field]", co).hidden = F.zeitart !== "uhrzeit";
        var uz = $('[data-f="zeitart"][value="uhrzeit"]', co);
        uz.disabled = !list.length;
        $("[data-asap-note]", co).textContent = F.art === "lieferung" ? "Lieferung je nach Entfernung in etwa 20–90 Minuten (Richtwert)." : "Wir sagen Ihnen bei der Bestätigung, wann Ihr Essen bereit ist.";
      }
      co.addEventListener("input", onField);
      co.addEventListener("change", onField);
      function onField(e) {
        var el = e.target.closest("[data-f]"); if (!el) return;
        var k = el.getAttribute("data-f");
        if (el.type === "radio") { if (!el.checked) return; F[k] = el.value; } else F[k] = el.value;
        if (k === "ort") { var pl = C.placeByName(config, F.ort); if (pl) { F.plz = pl.plz; $('[data-f="plz"]', co).value = pl.plz; } }
        if (k === "art" || k === "zeitart") fillTimes();
        if (k === "zeitart") F.zeit = F.zeitart === "uhrzeit" ? ($('[data-f="zeit"]', co).value || "") : "asap";
        if (errors[k]) { delete errors[k]; showErrors(); }
        save(); renderAll();
      }

      /* Prüfungen je Schritt */
      function cartProblems() {
        var p = pricedLines();
        if (!cart.lines.length) return "Ihr Warenkorb ist leer.";
        if (p.some(function (c) { return !c || !c.orderable; })) return "Ein Artikel ist online nicht bestellbar – bitte entfernen Sie ihn.";
        if (p.some(function (c) { return c.selectionErrors.length; })) return "Bei einem Artikel fehlt noch eine Auswahl – bitte über „Ändern“ ergänzen.";
        if (refError || !cart.ref) return "Ihr Browser kann keine sichere Bestell-Referenz erzeugen. Bitte nutzen Sie einen aktuellen Browser oder bestellen Sie telefonisch.";
        return "";
      }
      function stepErrors(s) {
        var all = C.validateCheckout(effectiveForm(), config, times());
        var e = {};
        var pick = { art: ["art"], adresse: ["ort", "strasse", "plz", "fahrerHinweis"], kontakt: ["name", "telefon", "notiz"], zeit: ["zeit"] }[s] || [];
        pick.forEach(function (k) { if (all[k]) e[k] = all[k]; });
        if (s === "art" && F.art === "lieferung" && !deliveryAvailable()) e.art = "Lieferung ist online gerade nicht möglich. Bitte wählen Sie Abholung oder rufen Sie uns an.";
        if (s === "adresse" && !e.ort) {
          var t = sums();
          if (t.zone && t.minMissingCent > 0) e.ort = "Mindestbestellwert für " + F.ort + ": " + euro(t.zone.mindestbestellwertCent) + " Warenwert – es fehlen noch " + euro(t.minMissingCent) + ". Lieferkosten und Pfand zählen nicht dazu.";
        }
        return e;
      }
      function effectiveForm() { return Object.assign({}, F, { zeit: F.zeitart === "uhrzeit" ? F.zeit : "asap" }); }
      function sums() { return C.totals(pricedLines().filter(Boolean), config, { art: F.art, ort: F.ort }); }

      function showErrors() {
        $$("[data-err]", co).forEach(function (p) {
          var k = p.getAttribute("data-err"), msg = errors[k];
          p.hidden = !msg; p.textContent = msg || "";
          var input = $('[data-f="' + k + '"]', co);
          if (input && input.type !== "radio") { input.setAttribute("aria-invalid", msg ? "true" : "false"); if (msg) input.setAttribute("aria-describedby", p.id || (p.id = "err-" + k)); else input.removeAttribute("aria-describedby"); }
        });
      }

      /* Navigation */
      function goStep(s) {
        if (activeSteps().indexOf(s) < 0) s = "warenkorb";
        step = s; save();
        $$("[data-step]", co).forEach(function (sec) { sec.hidden = sec.getAttribute("data-step") !== s; });
        renderAll();
        var h = $('[data-step="' + s + '"] h2', co);
        if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
        var top = co.getBoundingClientRect().top + window.scrollY - 90;
        if (window.scrollY > top) window.scrollTo({ top: top, behavior: "smooth" });
      }
      checkoutGoStep = goStep;
      co.addEventListener("click", function (e) {
        if (e.target.closest("[data-next]")) next();
        else if (e.target.closest("[data-back]")) { var a = activeSteps(); goStep(a[Math.max(0, a.indexOf(step) - 1)]); }
        else if (e.target.closest("[data-goto]")) goStep(e.target.closest("[data-goto]").getAttribute("data-goto"));
        else if (e.target.closest("[data-checkout-lines]")) handleLineClick(e);
      });
      function next() {
        if (step === "warenkorb") {
          var cp = cartProblems();
          if (cp) { toast(cp); return; }
        } else {
          errors = stepErrors(step); showErrors();
          if (Object.keys(errors).length) {
            var first = $('[data-f="' + Object.keys(errors)[0] + '"]', co);
            if (first) first.focus();
            return;
          }
        }
        if (step === "zeit") {
          var st = status();
          if (!st.canOrder) { errors = { zeit: "Wir haben gerade geschlossen – " + (st.text || "") }; showErrors(); return; }
        }
        var a = activeSteps(); goStep(a[Math.min(a.length - 1, a.indexOf(step) + 1)]);
      }

      /* Darstellung */
      function renderAll() {
        if (!cart.lines.length && step !== "warenkorb" && !sent) step = "warenkorb";
        var a = activeSteps(), pos = a.indexOf(step);
        $("[data-stepper]", co).innerHTML = a.map(function (s, i) {
          return '<li class="' + (i < pos ? "is-done" : i === pos ? "is-current" : "") + '"' + (i === pos ? ' aria-current="step"' : "") + ">" + LABELS[s] + "</li>";
        }).join("");
        $$("[data-step]", co).forEach(function (sec) { sec.hidden = sec.getAttribute("data-step") !== step; });

        var priced = pricedLines();
        $("[data-checkout-lines]", co).innerHTML = cart.lines.length ? linesHtml(priced) : "";
        $("[data-checkout-empty]", co).hidden = !!cart.lines.length;
        $('[data-step="warenkorb"] [data-next]', co).hidden = !cart.lines.length;

        // Bestellart
        var delOk = deliveryAvailable();
        var delRadio = $('[data-f="art"][value="lieferung"]', co);
        delRadio.disabled = !delOk;
        if (!delOk && F.art === "lieferung") { F.art = ""; delRadio.checked = false; }
        var artInfo = $("[data-art-info]", co);
        artInfo.hidden = delOk;
        artInfo.className = "info is-warn";
        artInfo.textContent = delOk ? "" : "Lieferung ist online gerade nicht möglich – die Liefergebiete werden noch festgelegt. Abholung geht, oder rufen Sie uns an: " + config.restaurant.telefon[0].anzeige + ".";

        var t = sums();
        var zi = $("[data-zone-info]", co);
        if (F.art === "lieferung" && t.zone) {
          zi.hidden = false;
          if (t.minMissingCent > 0) { zi.className = "info is-warn"; zi.textContent = "Liefergebiet " + t.zone.name + ": Mindestbestellwert " + euro(t.zone.mindestbestellwertCent) + ", Lieferkosten " + euro(t.zone.lieferkostenCent) + ". Es fehlen noch " + euro(t.minMissingCent) + " Warenwert (ohne Pfand und Lieferkosten)."; }
          else { zi.className = "info"; zi.textContent = "Liefergebiet " + t.zone.name + ": Mindestbestellwert erreicht. Lieferkosten " + euro(t.zone.lieferkostenCent) + "."; }
        } else zi.hidden = true;

        // Seitenleiste
        $("[data-side-sums]", co).innerHTML = sumsHtml(t, { withFee: true });
        $("[data-ref]", co).textContent = cart.ref ? C.formatRef(F.art || "abholung", cart.ref.ym, cart.ref.id) : "–";

        // Geschlossen?
        var st = status(), cb = $("[data-closed-banner]", co);
        cb.hidden = st.canOrder;
        if (!st.canOrder) cb.textContent = st.grund === "pause" ? st.text : "Gerade nehmen wir keine Bestellungen an. " + st.text + ". Ihren Warenkorb behalten wir so lange.";

        if (step === "uebersicht") renderReceipt();
      }

      function orderObject() {
        var priced = pricedLines().filter(Boolean), s = C.totals(priced, config, { art: F.art, ort: F.ort });
        return {
          ref: C.formatRef(F.art, cart.ref.ym, cart.ref.id), art: F.art, name: F.name, telefon: F.telefon,
          strasse: F.strasse, plz: F.plz, ort: F.ort, fahrerHinweis: F.fahrerHinweis,
          zeit: F.zeitart === "uhrzeit" ? F.zeit : "asap", notiz: F.notiz, priced: priced, sums: s, test: TEST
        };
      }
      function finalProblems() {
        var cp = cartProblems(); if (cp) return { msg: cp, step: "warenkorb" };
        var st = status(); if (!st.canOrder) return { msg: "Gerade nehmen wir keine Bestellungen an. " + st.text + "." };
        var order = ["art", "adresse", "kontakt", "zeit"];
        for (var i = 0; i < order.length; i++) {
          if (activeSteps().indexOf(order[i]) < 0) continue;
          var e = stepErrors(order[i]), k = Object.keys(e)[0];
          if (k) return { msg: e[k], step: order[i] };
        }
        return null;
      }

      function renderReceipt() {
        var prob = finalProblems();
        var al = $("[data-send-alert]", co);
        if (prob && prob.step) { goStep(prob.step); errors = stepErrors(prob.step); showErrors(); return; }
        var o = orderObject(), t = o.sums, del = o.art === "lieferung";
        var R = config.restaurant;
        var dl = function (rows) { return "<dl>" + rows.map(function (r) { return "<dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd>"; }).join("") + "</dl>"; };
        var html = '<div class="receipt-head"><b>' + esc(R.name.toUpperCase()) + "</b>" + esc(R.strasse) + ", " + esc(R.plz) + " Biberach<br><span class=\"receipt-ref\">" + esc(o.ref) + "</span></div>";
        html += '<div class="receipt-sec"><h3>Bestellart <button type="button" data-goto="art">Ändern</button></h3>' + dl([["Art", del ? "Lieferung" : "Abholung"]].concat(del ? [["Adresse", o.strasse + ", " + o.plz + " " + o.ort]].concat(o.fahrerHinweis ? [["Hinweis Fahrer", o.fahrerHinweis]] : []) : [["Abholung", R.strasse + ", " + R.plz + " " + R.ort]])) + (del ? '<p class="small"><button type="button" class="btn btn-text btn-small" data-goto="adresse">Adresse ändern</button></p>' : "") + "</div>";
        html += '<div class="receipt-sec"><h3>Kontakt <button type="button" data-goto="kontakt">Ändern</button></h3>' + dl([["Name", o.name], ["Telefon", o.telefon]].concat(o.notiz ? [["Anmerkung", o.notiz]] : [])) + "</div>";
        html += '<div class="receipt-sec"><h3>Wunschzeit <button type="button" data-goto="zeit">Ändern</button></h3>' + dl([["Zeit", o.zeit === "asap" ? "so schnell wie möglich" : "heute, " + o.zeit + " Uhr"]]) + "</div>";
        html += '<div class="receipt-sec"><h3>Artikel <button type="button" data-goto="warenkorb">Ändern</button></h3>' + o.priced.map(function (c) {
          return '<div class="r-line"><b>' + c.qty + " × " + (c.product.nr ? "Nr. " + esc(c.product.nr) + " " : "") + esc(c.product.name) + '</b><span class="r-price">' + euro(c.totalCent) + "</span><ul>" +
            c.details.map(function (d) { return "<li>" + esc(d.label) + ": " + esc(d.text) + "</li>"; }).join("") +
            (c.qty > 1 ? "<li>je " + euro(c.unitCent) + "</li>" : "") + (c.pfandUnitCent ? "<li>Pfand " + c.qty + " × " + euro(c.pfandUnitCent) + "</li>" : "") + "</ul></div>";
        }).join("") + "</div>";
        var sumRows = [["Warenwert", euro(t.goodsCent)]];
        if (del) sumRows.push(["Lieferkosten", euro(t.feeCent)]);
        if (t.pfandCent) sumRows.push(["Pfand", euro(t.pfandCent)]);
        html += '<div class="receipt-sec"><dl class="sums">' + sumRows.map(function (r) { return "<div><dt>" + r[0] + "</dt><dd>" + r[1] + "</dd></div>"; }).join("") +
          '<div class="is-grand"><dt>Gesamt</dt><dd>' + euro(t.totalCent) + "</dd></div></dl>" +
          (t.tax.ausweisbar ? '<p class="tax-note">Darin enthaltene Umsatzsteuer: ' + t.tax.buckets.map(function (b) { return b.rate + " %: " + euro(b.taxCent); }).join(", ") + "</p>" : t.tax.kleinunternehmer ? '<p class="tax-note">Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.</p>' : "") +
          (config.zahlung.hinweis ? '<p class="tax-note">Zahlung: ' + esc(config.zahlung.hinweis) + "</p>" : "") + "</div>";
        $("[data-receipt]", co).innerHTML = html;

        var btnLabel = VERBINDLICH ? "Zahlungspflichtig bestellen" : "Bestellanfrage senden";
        $("[data-send-label]", co).textContent = btnLabel;
        $("[data-legal-box]", co).innerHTML =
          "<p><strong>So geht es weiter:</strong> „" + btnLabel + "“ öffnet WhatsApp mit dieser " + (VERBINDLICH ? "Bestellung" : "Bestellanfrage") + ". Erst wenn Sie die Nachricht dort absenden, geht sie an uns. " + (VERBINDLICH ? "Damit geben Sie eine verbindliche Bestellung ab; der Vertrag kommt zustande, wenn wir sie per WhatsApp bestätigen." : "Wir bestätigen Ihre Anfrage per WhatsApp.") + "</p>" +
          "<p>Allergene finden Sie bei jedem Gericht und in der <a href=\"" + BASE + "allergene.html\" target=\"_blank\" rel=\"noopener\">Allergenübersicht</a>. Weitere Informationen: <a href=\"" + BASE + "bestellinformationen.html\" target=\"_blank\" rel=\"noopener\">Bestell- &amp; Verbraucherinformationen</a>.</p>" +
          "<p>Datenschutz: Mit dem Öffnen von WhatsApp verlassen Sie unsere Website. Ihre Bestellangaben einschließlich Name, Telefonnummer und gegebenenfalls Adresse werden dabei im Link an WhatsApp übergeben. Mehr dazu in der <a href=\"" + BASE + "datenschutz.html\" target=\"_blank\" rel=\"noopener\">Datenschutzerklärung</a>.</p>";

        lastMessage = C.buildMessage(o, config);
        var send = $("[data-send]", co);
        send.href = C.whatsappUrl(WA_NUMBER, lastMessage);
        $("[data-message-preview]", co).value = lastMessage;
        var warnLen = config.bestellung.nachrichtWarnLaenge || 3500;
        al.hidden = !(prob || lastMessage.length > warnLen);
        al.textContent = prob ? prob.msg : lastMessage.length > warnLen ? "Ihre Bestellung ist sehr umfangreich. Falls WhatsApp nicht den ganzen Text übernimmt, nutzen Sie unten „Bestelltext kopieren“." : "";
        send.setAttribute("aria-disabled", prob ? "true" : "false");
        $("[data-sent-ref]", co).textContent = o.ref;
      }

      /* Senden – unmittelbar vorher mit aktueller Uhrzeit neu prüfen */
      $("[data-send]", co).addEventListener("click", function (e) {
        var al = $("[data-send-alert]", co);
        var prob = finalProblems();
        if (prob) {
          e.preventDefault();
          al.hidden = false; al.textContent = prob.msg;
          if (prob.step) { goStep(prob.step); errors = stepErrors(prob.step); showErrors(); }
          return;
        }
        var msg = C.buildMessage(orderObject(), config);
        if (msg !== lastMessage) {
          e.preventDefault(); renderReceipt();
          al.hidden = false; al.textContent = "Ihre Übersicht wurde aktualisiert. Bitte prüfen Sie sie und tippen Sie erneut auf „" + (VERBINDLICH ? "Zahlungspflichtig bestellen" : "Bestellanfrage senden") + "“.";
          return;
        }
        this.href = C.whatsappUrl(WA_NUMBER, msg);
        sent = true;
        $("[data-sent]", co).hidden = false;
        $("[data-send-label]", co).textContent = "WhatsApp erneut öffnen";
      });
      $("[data-copy-message]", co).addEventListener("click", function () {
        var txt = lastMessage || $("[data-message-preview]", co).value;
        var done = function () { toast("Bestelltext kopiert – fügen Sie ihn in WhatsApp ein."); };
        var fallback = function () { var ta = $("[data-message-preview]", co); ta.focus(); ta.select(); try { doc.execCommand("copy"); done(); } catch (err) { toast("Bitte markieren und kopieren Sie den Text."); } };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, fallback); else fallback();
      });
      function resetAll(msg) {
        cart.lines = []; saveCart(); SS.del(FORM_KEY); SS.del(FORM_KEY + "-schritt");
        F = { art: "", ort: "", strasse: "", plz: "", fahrerHinweis: "", name: "", telefon: "", notiz: "", zeitart: "asap", zeit: "asap" };
        sent = false; errors = {}; showErrors();
        $("[data-sent]", co).hidden = true;
        fillForm(); cartChanged(); goStep("warenkorb"); toast(msg);
      }
      $("[data-new-order]", co).addEventListener("click", function () { resetAll("Neue Bestellung – sie erhält eine neue Referenz."); });
      var clearBtn = $("[data-clear-all]", co), clearArmed = 0;
      clearBtn.addEventListener("click", function () {
        if (Date.now() - clearArmed < 4000) { clearArmed = 0; clearBtn.lastChild.textContent = " Warenkorb und Angaben löschen"; resetAll("Warenkorb und Angaben gelöscht"); return; }
        clearArmed = Date.now(); clearBtn.lastChild.textContent = " Wirklich alles löschen? Nochmals tippen";
        setTimeout(function () { if (clearArmed && Date.now() - clearArmed >= 4000) clearBtn.lastChild.textContent = " Warenkorb und Angaben löschen"; }, 4100);
      });

      listeners.push(renderAll);
      fillForm();
      goStep(step);
      setInterval(function () { fillTimes(); renderAll(); }, 30000);
      doc.addEventListener("visibilitychange", function () { if (!doc.hidden) { fillTimes(); renderAll(); } });
    }
    /* Testschnittstelle für automatisierte Tests */
    window.SHAHI = { idx: idx, config: config, cart: function () { return JSON.parse(JSON.stringify(cart)); }, mode: MODE, ordering: ORDERING };
    root.setAttribute("data-ready", "true");
  }

  /* =====================================================================
     Startseite: wechselnde Wortpaare im Titel
     ===================================================================== */
  function heroRotation() {
    var title = $("[data-hero-title]");
    if (!title) return;
    var a = $('[data-word="a"]', title), b = $('[data-word="b"]', title), use = $("[data-hero-illu]"), illu = use && use.closest(".hero-illu");
    var pairs = [
      ["Pizza", "speisekarte/pizza.html", "Palak", "speisekarte/index.html?q=Palak", "pizza"],
      ["Döner", "speisekarte/doener.html", "Donut", "speisekarte/dessert.html#p-dessert-donut", "doener"],
      ["Burger", "speisekarte/burger.html", "Butter Chicken", "speisekarte/indisch.html#p-indisch-butter-chicken", "burger"],
      ["Calzone", "speisekarte/index.html?q=Calzone", "Curry", "speisekarte/index.html?q=Curry", "curry"]
    ];
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    var i = 0, rounds = 0, timer = null, paused = false;
    var btn = $("[data-hero-pause]");
    function show(n) {
      var p = pairs[n];
      [a, b].forEach(function (w) { w.classList.add("is-out"); });
      if (illu) illu.classList.add("is-out");
      setTimeout(function () {
        a.textContent = p[0]; a.href = BASE + p[1]; b.textContent = p[2]; b.href = BASE + p[3];
        if (use) use.setAttribute("href", BASE + "assets/img/illustrationen.svg#" + p[4]);
        [a, b].forEach(function (w) { w.classList.remove("is-out"); w.classList.add("is-in"); void w.offsetWidth; w.classList.remove("is-in"); });
        if (illu) illu.classList.remove("is-out");
      }, 360);
    }
    function tick() {
      if (paused) return;
      i = (i + 1) % pairs.length;
      if (i === 0) rounds++;
      show(i);
      if (rounds >= 3) stop(true);
    }
    function startT() { timer = setInterval(tick, 3400); }
    function stop(final) { clearInterval(timer); timer = null; if (final && btn) btn.hidden = true; }
    startT();
    if (btn) {
      btn.hidden = false;
      btn.addEventListener("click", function () {
        paused = !paused;
        btn.innerHTML = icon(paused ? "play" : "pause") + "<span>" + (paused ? "Wechsel fortsetzen" : "Wechsel anhalten") + "</span>";
      });
    }
    title.addEventListener("mouseenter", function () { paused = true; });
    title.addEventListener("mouseleave", function () { if (btn && /fortsetzen/.test(btn.textContent)) return; paused = false; });
    title.addEventListener("focusin", function () { paused = true; });
  }
})();
