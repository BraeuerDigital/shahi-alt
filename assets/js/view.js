/* =====================================================================
   SHAHI Küche – HTML-Bausteine der Speisekarte
   Wird vom Seitengenerator (tools/build.mjs) UND im Browser (app.js)
   verwendet, damit statische und dynamische Darstellung identisch sind.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./core.js"));
  else root.ShahiView = factory(root.ShahiCore);
})(typeof self !== "undefined" ? self : this, function (C) {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function icon(name, cls) {
    return '<svg class="ico' + (cls ? " " + cls : "") + '" aria-hidden="true" focusable="false"><use href="#i-' + name + '"></use></svg>';
  }

  function illu(base, name, cls) {
    return '<svg class="illu' + (cls ? " " + cls : "") + '" viewBox="0 0 120 120" aria-hidden="true" focusable="false"><use href="' + base + 'assets/img/illustrationen.svg#' + esc(name) + '"></use></svg>';
  }

  function codeSpan(codes, legend) {
    return codes.map(function (c) {
      return '<abbr title="' + esc(legend[c] || c) + '">' + esc(c) + "</abbr>";
    }).join(" ");
  }

  /** Kurzzeile mit Allergen- und Zusatzstoffkennzeichnung */
  function codesHtml(p, leg) {
    var parts = [];
    if (p.allergene.length) parts.push('<span class="codes-a"><span class="codes-l">Allergene</span> ' + codeSpan(p.allergene, leg.allergene) + "</span>");
    if (p.zusatzstoffe.length) parts.push('<span class="codes-z"><span class="codes-l">Zusatzstoffe</span> ' + codeSpan(p.zusatzstoffe, leg.zusatzstoffe) + "</span>");
    var check = p.pruefen.some(function (x) { return x.feld === "allergene"; });
    if (!parts.length && !check) return "";
    return '<span class="codes">' + (parts.join("") || '<span class="codes-none">keine Angabe</span>') +
      (check ? '<span class="codes-check" title="Kennzeichnung wird vom Restaurant noch geprüft">wird geprüft</span>' : "") + "</span>";
  }

  /** Ausführliche Allergenliste (Detailansicht, Allergenseite) */
  function codesLong(allergene, zusatzstoffe, leg) {
    var out = "";
    if (allergene.length) out += "<p><strong>Allergene:</strong> " + allergene.map(function (c) { return esc(c) + " – " + esc(leg.allergene[c] || ""); }).join("; ") + "</p>";
    if (zusatzstoffe.length) out += "<p><strong>Zusatzstoffe:</strong> " + zusatzstoffe.map(function (c) { return esc(c) + " – " + esc(leg.zusatzstoffe[c] || ""); }).join("; ") + "</p>";
    if (!out) out = "<p>Für dieses Gericht ist im Flyer keine Kennzeichnung angegeben. Das bedeutet nicht, dass es frei von Allergenen ist – bitte fragen Sie bei Unverträglichkeiten nach.</p>";
    return out;
  }

  function tagsHtml(p) {
    return p.merkmale.map(function (m) {
      return '<span class="tag tag-' + esc(m) + '">' + (m === "vegetarisch" ? icon("leaf") : m === "scharf" ? icon("chili") : "") + esc(m) + "</span>";
    }).join("");
  }

  function priceHtml(p) {
    if (p.varianten.length === 1) return C.euro(p.varianten[0].preisCent);
    return '<small>ab</small> ' + C.euro(C.minPriceCent(p));
  }

  function variantsLine(p) {
    if (p.varianten.length < 2 && !p.varianten[0].volumenMl) return "";
    return '<p class="dish-variants">' + p.varianten.map(function (v) {
      var gp = C.unitPriceText(v);
      return '<span>' + esc(v.name) + (v.name ? " " : "") + C.euro(v.preisCent) + (gp ? ' <small>(' + gp + ")</small>" : "") + "</span>";
    }).join("") + "</p>";
  }

  /**
   * Gericht in der Liste.
   * ctx = { idx, config, mode: "pre"|"live"|"test", ordering: bool, base, showCategory }
   */
  function dishHtml(p, ctx) {
    var leg = ctx.idx.legende;
    var st = C.productState(p, ctx.idx, ctx.config);
    var canAdd = ctx.ordering && st.orderable;
    var pf = "";
    if (p.kategorie === "getraenke" || p.pfandCent) {
      pf = p.pfandCent ? '<span class="pfand">zzgl. ' + C.euro(p.pfandCent) + " Pfand</span>" : (p.pfandCent === null ? '<span class="pfand">Pfand wird noch angegeben</span>' : '<span class="pfand">ohne Pfand</span>');
    }
    var meta = (ctx.showCategory ? '<span class="tag tag-cat">' + esc(ctx.idx.catById[p.kategorie].name) + "</span>" : "") + tagsHtml(p) + codesHtml(p, leg) + pf;
    var btnLabel = canAdd ? esc(p.name) + (p.nr ? " (Nr. " + esc(p.nr) + ")" : "") + " auswählen" : esc(p.name) + " – Details";
    return '<article class="dish' + (st.orderable ? "" : " is-unavailable") + '" id="p-' + esc(p.id) + '" data-product="' + esc(p.id) + '">' +
      '<div class="dish-main">' +
        '<h3 class="dish-name">' + (p.nr ? '<span class="dish-nr"><span class="vh">Nr. </span>' + esc(p.nr) + "</span>" : "") + '<span class="dish-title">' + esc(p.name) + "</span></h3>" +
        (p.beschreibung ? '<p class="dish-desc">' + esc(p.beschreibung) + "</p>" : "") +
        variantsLine(p) +
        (meta ? '<p class="dish-meta">' + meta + "</p>" : "") +
        (ctx.ordering && !st.orderable ? '<p class="dish-note">' + esc(st.reason) + "</p>" : "") +
      "</div>" +
      '<div class="dish-side">' +
        '<p class="dish-price">' + priceHtml(p) + "</p>" +
        '<button type="button" class="dish-btn' + (canAdd ? " is-add" : "") + '" data-open="' + esc(p.id) + '" aria-label="' + btnLabel + '">' +
          (canAdd ? icon("plus") : icon("info")) + "</button>" +
      "</div>" +
    "</article>";
  }

  function categoryHtml(cat, products, ctx, opts) {
    opts = opts || {};
    var h = opts.headingLevel || 2;
    return '<section class="menu-cat" id="' + esc(cat.id) + '" aria-labelledby="h-' + esc(cat.id) + '">' +
      '<header class="menu-cat-head">' + illu(ctx.base, cat.illustration, "menu-cat-illu") +
        "<div><h" + h + ' id="h-' + esc(cat.id) + '">' + esc(cat.name) + "</h" + h + ">" +
        (cat.beschreibung ? "<p>" + esc(cat.beschreibung) + "</p>" : "") + "</div></header>" +
      '<div class="dish-list">' + products.map(function (p) { return dishHtml(p, ctx); }).join("") + "</div>" +
    "</section>";
  }

  function legendHtml(leg) {
    var a = Object.keys(leg.allergene).map(function (k) { return "<li><b>" + esc(k) + "</b> " + esc(leg.allergene[k]) + "</li>"; }).join("");
    var z = Object.keys(leg.zusatzstoffe).map(function (k) { return "<li><b>" + esc(k) + "</b> " + esc(leg.zusatzstoffe[k]) + "</li>"; }).join("");
    return '<div class="legend-grid"><div><h3>Allergene</h3><ul class="legend-list">' + a + '</ul></div><div><h3>Zusatzstoffe</h3><ul class="legend-list">' + z + "</ul></div></div>" +
      '<div class="legend-notes">' + (leg.hinweise || []).map(function (n) { return "<p>" + esc(n) + "</p>"; }).join("") + "</div>";
  }

  return { esc: esc, icon: icon, illu: illu, codesHtml: codesHtml, codesLong: codesLong, tagsHtml: tagsHtml, priceHtml: priceHtml, dishHtml: dishHtml, categoryHtml: categoryHtml, legendHtml: legendHtml };
});
