/* =====================================================================
   SHAHI Küche – Logo-Intro (Startseite)
   ---------------------------------------------------------------------
   Technik und Aufbau-Phase wie beim Logo-Intro von MINAR (ein
   requestAnimationFrame-Loop, keine Bibliothek, gestaffelter Aufbau mit
   denselben Easing-Kurven und Zeitabständen). Die MINAR-Tierfigur und
   deren Sprung entfallen; stattdessen läuft am Ende ein Lichtstreif über
   den Spitzbogen und die Turmspitze setzt einen Akzent.

   Phase A  Logo-Aufbau     0,0 – 2,2 s  Bogen → Innenlinie (zeichnet sich) → „S“
                                         → Turmspitze → SHAHI (Buchstaben gestaffelt) → Küche
   Phase B  Akzent          2,3 – 3,4 s  Lichtstreif über den Bogen, Turmspitze federt kurz
   Phase C  Endpose         ab 3,4 s     exakt das statische Logo, danach völlig still

   Läuft bei jedem Aufruf/Neuladen von vorne. Fallback: prefers-reduced-motion
   oder ohne JavaScript → sofort statisches Logo.
   SVG: public/assets/logo/shahi-logo-anim.svg (erzeugt von tools/logo/logo.py,
   von tools/build.mjs inline eingesetzt).
   ===================================================================== */
(function () {
  "use strict";
  var svg = document.querySelector(".shahi-logo-anim");
  if (!svg || !window.requestAnimationFrame) return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;                                           // statisches Logo bleibt stehen

  var $ = function (s) { return svg.querySelector(s); };

  /* ---------------- Easing (wie MINAR) ---------------- */
  var E = {
    lin:   function (t) { return t; },
    sine:  function (t) { return -(Math.cos(Math.PI * t) - 1) / 2; },
    inOut: function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    out:   function (t) { return 1 - Math.pow(1 - t, 3); },
    back:  function (t) { var c = 1.70158, d = c + 1; return 1 + d * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  };
  var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };

  /* ---------------- Phase A: Logo-Aufbau ---------------- */
  function box(el) { var b = el.getBBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }
  var build = [];
  function reveal(el, start, dur, kind) { if (el) build.push({ el: el, s: start, d: dur, k: kind, c: box(el) }); }
  reveal($(".lg-arch"), 0, 800, "grow");
  reveal($(".lg-s"), 800, 600, "rise");
  reveal($(".lg-finial"), 950, 600, "rise");
  Array.prototype.forEach.call(svg.querySelectorAll(".lg-letter"), function (el, i) { reveal(el, 1150 + i * 75, 560, "lift"); });
  reveal($(".lg-kueche"), 1650, 560, "lift");

  /* Innenlinie zeichnet sich (statt der MINAR-Linien, die in die Breite wachsen) */
  var line = $(".lg-line"), LINE = [450, 750];
  if (line) { line.setAttribute("pathLength", "1"); line.setAttribute("stroke-dasharray", "1 1"); }

  function applyBuild(t) {
    for (var i = 0; i < build.length; i++) {
      var b = build[i], p = clamp01((t - b.s) / b.d), e = E.out(p), tr = "";
      if (b.k === "grow") tr = "translate(" + b.c.x + " " + b.c.y + ") scale(" + (0.9 + 0.1 * e) + ") translate(" + -b.c.x + " " + -b.c.y + ")";
      else if (b.k === "rise") tr = "translate(0 " + (10 * (1 - e)) + ")";
      else if (b.k === "lift") tr = "translate(0 " + (26 * (1 - e)) + ")";
      b.el.setAttribute("opacity", e);
      if (p >= 1) b.el.removeAttribute("transform"); else b.el.setAttribute("transform", tr);
    }
    if (line) {
      var lp = E.inOut(clamp01((t - LINE[0]) / LINE[1]));
      line.setAttribute("stroke-dashoffset", (1 - lp).toFixed(4));
      line.setAttribute("opacity", Math.min(1, lp * 4));
    }
  }

  /* ---------------- Phase B: Lichtstreif und Turmspitze ---------------- */
  var shine = $(".lg-shine"), SHINE = [2300, 1000], SW = 0;
  if (shine) { var mb = $(".lg-arch").getBoundingClientRect(), sb = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal; SW = sb.width ? (mb.width / sb.width) * vb.width + 260 : 480; }
  var finial = $(".lg-finial"), FIN = [2600, 520], fc = finial ? box(finial) : null;
  function applyAccent(t) {
    if (shine) {
      var p = clamp01((t - SHINE[0]) / SHINE[1]);
      shine.setAttribute("opacity", p <= 0 || p >= 1 ? 0 : Math.sin(Math.PI * p).toFixed(3));
      shine.setAttribute("transform", "translate(" + (E.inOut(p) * SW).toFixed(1) + " 0) skewX(-18)");
    }
    if (finial && t >= FIN[0]) {
      var q = clamp01((t - FIN[0]) / FIN[1]), s = 1 + 0.22 * Math.sin(Math.PI * E.out(q));
      if (q >= 1) finial.removeAttribute("transform");
      else finial.setAttribute("transform", "translate(" + fc.x + " " + fc.y + ") scale(" + s.toFixed(3) + ") translate(" + -fc.x + " " + -fc.y + ")");
    }
  }
  var END = 3400;

  /* ---------------- Start ---------------- */
  // Ausgangszustand sofort setzen (Skript steht direkt hinter dem SVG → vor dem ersten Zeichnen)
  applyBuild(0); applyAccent(0);
  svg.classList.add("is-intro");

  var t0 = null;
  function frame(now) {
    if (t0 === null) t0 = now;
    var t = now - t0;
    applyBuild(t); applyAccent(t);
    if (t < END) { requestAnimationFrame(frame); return; }
    // Phase C: alle Hilfstransformationen entfernen → exakt das statische Logo, völlig still
    build.forEach(function (b) { b.el.removeAttribute("transform"); b.el.removeAttribute("opacity"); });
    if (line) ["pathLength", "stroke-dasharray", "stroke-dashoffset", "opacity"].forEach(function (a) { line.removeAttribute(a); });
    if (shine) shine.setAttribute("opacity", "0");
    if (finial) finial.removeAttribute("transform");
    svg.classList.remove("is-intro"); svg.classList.add("is-done");
  }
  function go() { requestAnimationFrame(function () { requestAnimationFrame(frame); }); }
  // erst starten, wenn die Seite sichtbar ist („erster sichtbarer Aufruf“)
  if (document.visibilityState === "hidden") {
    document.addEventListener("visibilitychange", function onVis() {
      if (document.visibilityState !== "hidden") { document.removeEventListener("visibilitychange", onVis); go(); }
    });
  } else go();
})();
