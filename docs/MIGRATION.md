# Migration: bisherige SHAHI-Website → MINAR-Designsystem

Stand 16.11.2026. Sicherung des Ausgangszustands: Branch `sicherung/shahi-vor-minar-2026-11-16` (= `BraeuerDigital/shahi@439c4df`, unverändert). Das Repository `BraeuerDigital/minar` wurde nur gelesen.

## 1. Was von wo stammt

| Bereich | Quelle | Umgang |
|---|---|---|
| `public/assets/css/styles.css` | MINAR `public/assets/css/styles.css` | 1:1 übernommen; nur Umbenennungen (`--minar-*` → `--shahi-*`, `.minar-logo-anim` → `.shahi-logo-anim`, Hintergrund-Schriftzug „SHAHI“, Logo-Höhe) und der Block „SHAHI – notwendige Anpassungen“ am Ende. Farbwerte unverändert. |
| `public/assets/js/fx.js` | MINAR | unverändert (nur Kopfkommentar) |
| `public/assets/js/app.js` | MINAR `app.js` | Struktur, Markup-Erzeugung, Drawer, Bon, Getränke-Abfrage, Wischgesten, Referenzlogik übernommen; ergänzt um SHAHI-Logik (siehe 3.) |
| `public/assets/js/logo-anim.js` | MINAR `logo-anim.js` | 1:1 (nur Selektor `.shahi-logo-anim`) |
| `public/assets/logo/shahi-logo-anim.svg` | MINAR `tools/logo_anim.py` + `tools/paths.json` | Flyer-Logo = MINAR-Logo; Schriftzug „SHAHI“ und Unterzeile über `tools/logo/schriftzug.py` |
| `tools/build.mjs` | MINAR `tools/build.mjs` | gleiche Bausteine und Klassen; Inhalte, Rechtstexte, SHAHI-Seiten, Datenprüfung ergänzt |
| `public/assets/js/menu-data.js` | SHAHI `data/menu.json` + `data/config.json` | verlustfrei in das MINAR-Format übertragen (`tools/migration/shahi-v1-zu-menu-data.mjs`) |
| Logo (Kopf, Fuß, Bon, Favicon) | SHAHI `assets/img/logo.svg` | unverändert in Form und Farbe; Varianten durch `tools/logo/logo.py` |
| Illustrationen | SHAHI `assets/img/illustrationen.svg` | als Einzeldateien `public/assets/images/illu/*.svg` |
| Favicons (PNG) | SHAHI `assets/img/favicon-32.png`, `apple-touch-icon.png` | übernommen |
| Rechtstext-Entwürfe | MINAR-Aufbau + SHAHI-Entwürfe | neu zusammengeführt, auf GitHub Pages und SHAHI-Daten angepasst |
| WhatsApp-Schnellantworten | MINAR `docs/` | auf SHAHI angepasst |

Nicht übernommen von MINAR: Schriftzug „MINAR“, Fotos (Gastraum, Theke, Gerichte), Kontaktdaten, Adresse, Öffnungszeiten, Liefergebiete, Preise, Speisekarte, Inhaber- und Steuerdaten, Rechtstexte, Cloudflare-Dateien (`_headers`), Google-Bewertungslink.

## 2. Entfernte bisherige SHAHI-Implementierung

`assets/css/shahi.css`, `assets/js/{app,core,view}.js`, `assets/fonts/` (Fraunces nur noch als Werkzeug in `tools/logo/`), `assets/img/og-image.png`, `logo-192/512.png`, `site.webmanifest`, `sitemap.xml`, `tools/{arch,render-assets,report}.mjs`, `tests/*.mjs`, `data/*.json`, alle bisherigen HTML-Seiten (`lieferung.html`, `restaurant.html` → `lieferservice.html`, `ueber-uns.html`/`kontakt.html`). Es gibt **ein** Warenkorbsystem (MINAR), **ein** Stylesheet und **eine** Datenquelle. Die bisherigen Adressen waren nicht veröffentlicht (keine Domain, `noindex`) – Weiterleitungen sind nicht nötig.

Übernommene Logik aus der bisherigen SHAHI-Website (`core.js`), weil MINAR sie nicht hat: Öffnungszeiten mit mehreren Zeitfenstern je Tag, Sonderöffnungszeiten, Betriebsferien, kurzfristige Schließungen, Bestellpause, Bestellschluss je Bestellart, Vorbereitungszeit je Bestellart, Eröffnungsmodus, Livegang-Schutz, sperrende Prüfpunkte, Steueraufteilung, Lieferorte mit Bestätigung, Grundpreis je Liter.

## 3. Datenabbildung (verlustfrei)

| SHAHI (`menu.json` / `config.json`) | `menu-data.js` |
|---|---|
| `produkte[].id, nr, kategorie, name, beschreibung` | `items[].id, nr, cat, name, desc` |
| `nameLautFlyer` | `flyerName` |
| `preisCent` / `varianten[{name, preisCent, volumenMl}]` | `prices: [9.4]` / `[["0,5 l", 2.5, 500]]` |
| `allergene`, `zusatzstoffe` | `codes: "A,G,6,7"` (Reihenfolge wie Flyer) |
| `optionen` (Produkt) bzw. Kategorie-`optionen` | `opts` je Gericht |
| `merkmale` | `tags` |
| `pfandCent` (null = unbekannt) | `pfand` in € (null bleibt null) |
| `steuer` | `tax` (Kategorie Getränke: `tax: "getraenke"`; Menü 73: `{ split: true, drinkShare: null }`) |
| `pruefen[{feld, hinweis, sperrt}]` | `checks[{field, note, blocks}]` |
| `optionsgruppen` (`typ eine/mehrere`, `optional`, `min`, `max`, `kurz`, Optionen mit `preisCent`, Kennzeichnung, `neutral`) | `optionGroups` (`type one/many`, `optional`, `min`, `max`, `short`, `price`, `codes`, `neutral`) |
| `kategorien[{id, name, beschreibung, illustration, seo}]` | `categories[{id, slug, name, desc, img, imgAlt, seo}]` |
| `legende` | `legend` |
| `betrieb`, `freigabe`, `bestellung`, `website` | `operation` |
| `restaurant`, `betreiber` | `restaurant` (Betreiberfelder `owner`, `legalForm`, `email`, `vatId` …) |
| `oeffnungszeiten` | `hours` |
| `lieferung.zonen` + `lieferung.orte` | `delivery.zones[].places[]` |
| `zahlung`, `steuer` | `payment`, `tax` |

Kontrolle der Migration (Skriptausgabe): Kategorien 16/16 · Gerichte 166/166 · Preissumme 184.355/184.355 Cent · Prüfpunkte 58/58 · Lieferorte 15/15.

Nicht übernommen, weil die MINAR-Architektur es nicht vorsieht: Filter „vegetarisch/scharf“ (die Suche findet beides), Open-Graph-/Schema.org-Daten und Sitemap (MINAR hat sie nicht; nach dem Livegang ergänzbar), automatisch erzeugte Kategorie-Kacheln auf der Startseite (MINAR zeigt dort Galerie und Laufband).

## 4. MINAR-Updates später übertragen

CSS: Änderungen aus MINAR mit `sed 's/--minar-/--shahi-/g; s/minar-logo-anim/shahi-logo-anim/g'` übernehmen; der SHAHI-Block am Dateiende bleibt. `fx.js` kann direkt ersetzt werden. Bei `app.js` und `build.mjs` die SHAHI-Abschnitte (Kommentare „SHAHI“, Öffnungszeiten, Steuer, Prüfpunkte) beachten.
