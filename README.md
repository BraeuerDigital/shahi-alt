# SHAHI Küche – Website

Statische Multi-Page-Website für **SHAHI Küche**, Bachgasse 17, 88400 Biberach an der Riß.
Lieferservice · Abholung. Künftige Domain: `www.shahi-biberach.de` (noch **nicht** verknüpft).

Design und Technik sind ein **originalgetreuer Nachbau des MINAR-Designsystems** (`BraeuerDigital/minar`, Stand 16.11.2026): gleiche CSS-Komponenten, gleiche Animationen, gleicher Warenkorb, gleiche Bestellstrecke. Angepasst sind nur SHAHI-Logo, Inhalte, Speisekarte, Betriebsbedingungen und Rechtstexte – Details in [`docs/ABSCHLUSSBERICHT.md`](docs/ABSCHLUSSBERICHT.md).

HTML, CSS und Vanilla JavaScript – keine Frameworks, keine Datenbank, kein Backend, keine externen Dienste oder Schriften.
Hosting: **GitHub Pages** (wie bisher bei SHAHI), Veröffentlichung nur manuell – siehe [`docs/HOSTING-UND-DOMAIN.md`](docs/HOSTING-UND-DOMAIN.md).

> **Status: Vor-Eröffnungsmodus.** Die Speisekarte ist sichtbar, Bestellanfragen sind gesperrt. Vor dem Livegang fehlen Betreiberangaben, Zahlungsarten, Steuerstatus, bestätigte Liefergebiete und die rechtliche Freigabe – siehe [`docs/FREIGABELISTE.md`](docs/FREIGABELISTE.md). Alle Seiten sind `noindex`.

## Seiten

| URL | Inhalt |
|-----|--------|
| `index.html` | Startseite (Hero mit animiertem Logo, Vorstellung, Galerie, Lieferservice, Öffnungszeiten, CTA) |
| `speisekarte/index.html` | komplette Speisekarte mit Kategorie-Sprungleiste, Scrollspy und Suche (`?q=` möglich) |
| `speisekarte/<kategorie>.html` | 16 Kategorieseiten, z. B. `pizza.html`, `burger.html`, `doener.html` |
| `bestellen.html` | Warenkorb „Deine Bestellung“, Angaben, Bestellübersicht im Bon-Stil, WhatsApp |
| `lieferservice.html` | Entfernungszonen, Mindestbestellwerte, Lieferkosten, Zeiten |
| `ueber-uns.html`, `kontakt.html` | Vorstellung; Adresse, Telefon, WhatsApp, Öffnungszeiten, Google-Maps-Link |
| `bestellinformationen.html` | Bestell- und Verbraucherinformationen inkl. Liefer- und Zahlungsbedingungen (Entwurf) |
| `allergene.html` | Allergene und Zusatzstoffe aller Gerichte (auch ohne JavaScript lesbar) |
| `impressum.html`, `datenschutz.html` | Entwürfe mit markierten Platzhaltern |
| `404.html` | Fehlerseite (am Domain-Stamm) |

## Struktur

```text
├── public/                       ← wird veröffentlicht
│   ├── *.html, speisekarte/*.html  erzeugte Seiten (nicht von Hand bearbeiten)
│   └── assets/
│       ├── css/styles.css        MINAR-Designsystem 1:1 + Block „SHAHI – notwendige Anpassungen“
│       ├── js/menu-data.js       ALLE Inhalte: Betrieb, Restaurant, Zeiten, Lieferzonen, Zahlung, Steuer, Gerichte
│       ├── js/app.js             Navigation, Öffnungsstatus, Speisekarte, Suche, Warenkorb, Bon, WhatsApp
│       ├── js/fx.js              Interaktions-Effekte (unverändert von MINAR)
│       ├── js/logo-anim.js       Logo-Intro der Startseite
│       ├── logo/                 SHAHI-Logo-Varianten, Favicons
│       └── images/illu/          eigene Illustrationen (bis Fotos vorliegen)
├── tools/
│   ├── build.mjs                 Seitengenerator + Datenprüfung + Prüfpunkte-Liste
│   ├── logo/logo.py              erzeugt die Logo-Varianten aus dem SHAHI-Logo
│   └── migration/                einmalige Übernahme der bisherigen SHAHI-Daten
├── tests/
│   ├── e2e.py                    Browser-Tests (85 Prüfungen)
│   └── vergleich.py              Screenshots MINAR ↔ SHAHI → docs/abnahme/
├── docs/                         Abschlussbericht, Freigaben, Pflege, Hosting, Migration, Tests
├── index.html, .nojekyll         Weiterleitung nach public/ (nur Vorschau „Deploy from a branch“)
└── MASTERPROMPT.md               Auftrag
```

## Inhalte pflegen

**Preise und Gerichte:** nur `public/assets/js/menu-data.js` bearbeiten – die Seiten lesen die Daten beim Aufruf. Danach zur Kontrolle `node tools/build.mjs` (prüft die Daten, erzeugt die Allergenübersicht neu).

**Öffnungszeiten, Lieferzonen, Zahlung, Betreiber, Eröffnung, Seitentexte oder neue Kategorie:** `menu-data.js` bzw. `tools/build.mjs` anpassen und neu erzeugen:

```bash
node tools/build.mjs
```

(Node.js ≥ 16, keine Pakete nötig.) Anleitung für den Betrieb: [`docs/BETRIEB-UND-PFLEGE.md`](docs/BETRIEB-UND-PFLEGE.md).

Aufbau eines Gerichts (wie MINAR, erweitert um ID, Füllmenge, Steuerart und Prüfpunkte):

```js
{ id: "burger-hamburgerle", nr: "20", cat: "burger", name: "Hamburgerle",
  desc: "100 g Rindfleisch-Patty und Smoky Cocktailsoße",
  prices: [5.5],                       // oder [["klein", 4.9], ["groß", 6.9]], Getränke [["0,5 l", 2.5, 500]]
  codes: "A,C,G,F,J,6,7,8",            // Buchstaben = Allergene, Zahlen = Zusatzstoffe
  opts: ["burger-beilage", "burger-extras"] }
// Getränke: pfand: 0.25 (null = unbekannt → online nicht bestellbar)
// checks: [{ field, note, blocks: true }] = offener Prüfpunkt; blocks sperrt im Normalbetrieb die Online-Bestellung
```

## Eröffnung

`operation.mode` in `menu-data.js`:

- `"vor-eroeffnung"` – Speisekarte sichtbar, Warenkorb zum Ausprobieren, **keine** Bestellübersicht/WhatsApp.
- `"geoeffnet"` – Normalbetrieb. Die Online-Bestellung schaltet sich aber erst frei, wenn Betreibername, Rechtsform, E-Mail, Zahlungsarten und Umsatzsteuer-Status eingetragen sind (Livegang-Schutz).

Bestellpause, Sonderöffnungszeiten, Betriebsferien und kurzfristige Schließungen stehen unter `hours`.

## Bestellablauf (WhatsApp)

1. Gerichte in der Speisekarte wählen und konfigurieren (Größe, Beilage, Extras, Beläge, Hinweis).
2. Warenkorb „Deine Bestellung“ (Seite oder Drawer): Menge (− / +, bei 1 entfernt „−“ die Position), „Ändern“, „Entfernen“.
3. Abholung oder Lieferung (nur bestätigte Orte), Angaben, Wunschzeit („so schnell wie möglich“ oder heute im 15-Min.-Raster, Vorlauf 20 Min. Abholung / 30 Min. Lieferung).
4. „Weiter zur Übersicht“ (ggf. vorher Getränke-Abfrage) → Bestellübersicht im Bon-Stil.
5. „Weiter zu WhatsApp“ öffnet WhatsApp mit der Nachricht an 0179 69 500 47; der Kunde sendet selbst. Keine Erfolgsmeldung – SHAHI bestätigt individuell. Ausweg: „Bestelltext kopieren“.

Berechnung zentral in `app.js` (`lineCalc`, `totals`, `taxBreakdown`) in **ganzen Cent**: Warenwert, Getränkepfand, Lieferkosten je Zone; Mindestbestellwert zählt nur den Warenwert. Steuer: Speisen 7 %, Getränke 19 %, Pfand wie Getränk, Lieferkosten anteilig – wird nur ausgewiesen, wenn der Steuerstatus bestätigt und `tax.show` gesetzt ist; aufgeschlagen wird nie etwas.

Bestellreferenz `SHA-A-YYYYMM-XXXXXXXX` (Abholung) bzw. `SHA-L-…` (Lieferung): 8 Zeichen aus `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` via `crypto.getRandomValues()`, stabil für den Bestellentwurf. Datensparsamkeit: localStorage `shahi-cart-v1` nur Gerichtsauswahl (12 h), sessionStorage `shahi-form-v1` Kontaktangaben (endet mit dem Tab).

## Designgrundlage

Unverändert das MINAR-Designsystem „Future Edition“ (Orange/Grün): Farbvariablen (`--shahi-*`, Werte identisch zu `--minar-*`), Blattform-Ecken, Buttons mit Licht-Spot/Lichtstreif/Roll-Label/Magnet, sich kreuzende Laufbänder, Outline-Schriftzug im Hintergrund („SHAHI“), Kategorie-Karten mit Tilt, Gerichte mit Spotlight, gleitender Navigations-Indikator, Scroll-Fortschritt, Scrollspy. Effekte werden bei „Bewegung reduzieren“ und auf Touch-Geräten reduziert.

Das Logo bleibt das bestehende SHAHI-Logo (Spitzbogen mit „S“) in seinen Originalfarben; `tools/logo/logo.py` erzeugt daraus Kopf-, Fuß-, Bon-, Favicon- und Animationsvarianten.

## Logo-Intro (Startseite)

Gleicher Mechanismus wie bei MINAR (ein `requestAnimationFrame`-Loop): Bogen → Innenlinie zeichnet sich → „S“ → Turmspitze → SHAHI (gestaffelt) → Küche, danach Lichtstreif über den Bogen und kurzer Akzent der Turmspitze. Gesamt ca. 3,4 s, keine Schleife, danach exakt das statische Logo. Ohne JavaScript oder bei „Bewegung reduzieren“ sofort statisch. Dateien: `public/assets/logo/shahi-logo-anim.svg` (inline eingesetzt), `public/assets/js/logo-anim.js`.

## Lokal ansehen und testen

```bash
cd public && python3 -m http.server 8000      # → http://localhost:8000
node tools/build.mjs                           # Seiten erzeugen, Daten prüfen
pip install playwright pillow && playwright install chromium
python3 tests/e2e.py                           # 85 Browser-Prüfungen
python3 tests/vergleich.py /pfad/zu/minar/public   # Screenshots MINAR ↔ SHAHI
```

## Sicherung des vorherigen Stands

Der bisherige SHAHI-Stand (eigenes Design, `BraeuerDigital/shahi@439c4df`) liegt unverändert im Branch **`sicherung/shahi-vor-minar-2026-11-16`**. Das MINAR-Repository wurde nicht verändert.
