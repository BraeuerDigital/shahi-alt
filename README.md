# SHAHI Küche Biberach – Website

Website mit digitaler Speisekarte, Warenkorb und WhatsApp-Bestellstrecke für **SHAHI Küche**, Bachgasse 17, 88400 Biberach an der Riß.
Umsetzung: Bräuer.Digital · Stand: 15.11.2026

> **Status: Vor-Eröffnungsmodus, nicht produktionsreif freigegeben.**
> Die Website ist technisch vollständig und getestet. Vor dem öffentlichen Betrieb fehlen Betreiberangaben (Impressum), Zahlungsarten, der Umsatzsteuer-Status und die rechtliche Prüfung – siehe [`docs/FREIGABELISTE.md`](docs/FREIGABELISTE.md). Die Domain `shahi-biberach.de` ist **bewusst nicht verknüpft**.

## Auf einen Blick

| Bereich | Stand |
|---|---|
| Speisekarte: 153 Gerichte + 13 Getränke aus beiden Flyerfotos, Preise, Varianten, Allergene, Zusatzstoffe | umgesetzt und getestet |
| Suche (Name, Zutat, Nummer), Filter vegetarisch/scharf, Kategorieseiten mit eigener SEO | umgesetzt und getestet |
| Warenkorb (Varianten, Extras, Hinweise, Mengen, Ändern, Entfernen, Zusammenführen, Cent-genaue Rechnung) | umgesetzt und getestet |
| Bestellstrecke Warenkorb → Bestellart → Adresse → Kontakt → Wunschzeit → Übersicht → WhatsApp | umgesetzt und getestet |
| Liefergebiet, Mindestbestellwert, Lieferkosten, Pfand, Steueraufteilung 7 %/19 % | umgesetzt und getestet – Orte, Pfand, Steuerstatus **vom Betreiber zu bestätigen** |
| Öffnungszeiten Europe/Berlin inkl. Sommer-/Winterzeit, Bestellschluss, Ausnahmen, Ferien, Pausen | umgesetzt und getestet – Zeiten laut Flyer **vorläufig** |
| Eröffnungsmodus (vor Eröffnung / geöffnet) über eine Zeile in `data/config.json` | umgesetzt und getestet |
| Livegang-Schutz: ohne Impressum, Zahlungsarten, Steuerstatus keine Online-Bestellung | umgesetzt und getestet |
| Impressum, Datenschutz, Bestell- und Verbraucherinformationen, Allergenübersicht | Entwürfe mit markierten Platzhaltern – **rechtlich zu prüfen** |
| SEO: Meta, Canonical, Open Graph, Schema.org `Restaurant`, Sitemap, robots | technisch vorbereitet – `noindex` bis zur Freigabe |
| Bondrucker, Bestellverwaltung, Online-Zahlung | für spätere Erweiterung vorgesehen ([`docs/ARCHITEKTUR.md`](docs/ARCHITEKTUR.md)) |

## Technik

Statische Website ohne Server, Datenbank, Framework oder externe Dienste: HTML, CSS, Vanilla JavaScript. Keine Cookies, kein Tracking, keine fremden Schriften oder Skripte – daher kein Cookie-Banner (Begründung in [`docs/RECHTLICHES.md`](docs/RECHTLICHES.md)). Hosting: GitHub Pages.

```text
├── index.html, lieferung.html, restaurant.html, bestellen.html,      ← erzeugte Seiten
│   allergene.html, bestellinformationen.html, impressum.html,           (nicht von Hand bearbeiten)
│   datenschutz.html, 404.html, speisekarte/*.html
├── data/
│   ├── config.json      ← Betrieb, Öffnungszeiten, Lieferung, Kontakt, Betreiber, Steuer, Bestellung
│   └── menu.json        ← Speisekarte: Kategorien, Optionsgruppen, Produkte, Legende
├── assets/
│   ├── css/shahi.css    ← Designsystem
│   ├── js/core.js       ← Rechenregeln (Preise, Steuer, Liefergebiet, Zeiten, Referenz, Nachricht) – in Node testbar
│   ├── js/view.js       ← HTML-Bausteine der Speisekarte (Build und Browser identisch)
│   ├── js/app.js        ← Oberfläche: Menü, Suche, Dialoge, Warenkorb, Bestellstrecke
│   ├── fonts/           ← Fraunces 600 (SIL OFL 1.1, Lizenz liegt bei)
│   └── img/             ← Logo, Favicons, Illustrationen (eigene Gestaltung), OG-Bild
├── tools/build.mjs      ← Seitengenerator (+ report.mjs für die Prüfliste)
├── tools/render-assets.mjs ← PNG-Icons/OG-Bild neu erzeugen (nur bei Gestaltungsänderungen)
├── tests/               ← Unit-Tests (node:test) und Browser-Tests (Playwright)
└── docs/                ← Anleitungen, Freigabeliste, Testbericht, Recht, Marke
```

## Lokal ansehen

```bash
python3 -m http.server 8000      # im Repository-Ordner → http://localhost:8000
```

Ein lokaler Server ist nötig (Speisekarte und Illustrationen werden nachgeladen); ein Doppelklick auf die HTML-Datei reicht nicht.

## Ändern, bauen, testen

```bash
node tools/build.mjs                          # Seiten, Sitemap, Prüfliste neu erzeugen (Node ≥ 18, keine Pakete)
node --test tests/unit.test.mjs               # 23 Unit-Tests der Rechenregeln und Daten
npm install --no-save playwright && npx playwright install chromium
node --test tests/e2e.test.mjs                # 12 Browser-Tests (mobil/desktop, Bestellstrecke, Zeiten)
```

- **Preise und Gerichte:** [`docs/BETRIEB-UND-PFLEGE.md`](docs/BETRIEB-UND-PFLEGE.md) – Kurzfassung: `data/menu.json` bearbeiten, `node tools/build.mjs`, Tests, committen.
- **Eröffnung schalten:** in `data/config.json` `"modus": "vor-eroeffnung"` → `"geoeffnet"` (wirkt erst, wenn die Livegang-Angaben vollständig sind).
- **Veröffentlichen und Domain:** [`docs/GITHUB-PAGES-UND-DOMAIN.md`](docs/GITHUB-PAGES-UND-DOMAIN.md).

## Bestellablauf

1. Gericht wählen; Größe, Beilage, Extras, Hinweis im Dialog. Preis aktualisiert sich bei jeder Änderung.
2. Warenkorb: gleiche Konfiguration wird zusammengefasst, abweichende Varianten bleiben getrennt. Gespeichert wird nur die Auswahl (localStorage, 12 h); Name, Telefon und Adresse nur für die Sitzung (sessionStorage).
3. Abholung oder Lieferung. Lieferung nur in bestätigten Orten; Mindestbestellwert zählt den Warenwert ohne Pfand und Lieferkosten; fehlender Betrag wird angezeigt.
4. Kontakt, Wunschzeit („so schnell wie möglich“ oder heute im 15-Minuten-Raster mit Vorlauf). Keine Vorbestellung außerhalb der Bestellzeiten.
5. Übersicht im Bon-Stil mit Referenz `SHA-A-YYYYMM-XXXXXXXX` (Abholung) bzw. `SHA-L-…` (Lieferung), alles korrigierbar.
6. „Zahlungspflichtig bestellen“ öffnet WhatsApp (`wa.me/491796950047`) mit der fertigen Nachricht. Gesendet wird erst durch den Kunden; die Website behauptet keinen Erfolg. Das Restaurant bestätigt individuell.

Vor dem Öffnen von WhatsApp wird mit der aktuellen Uhrzeit erneut geprüft (lange offener Tab). Fallback: Bestelltext kopieren, Telefon.

## Dokumentation

| Datei | Inhalt |
|---|---|
| [`docs/FREIGABELISTE.md`](docs/FREIGABELISTE.md) | alles, was der Betreiber bestätigen bzw. rechtlich geprüft werden muss |
| [`docs/PRUEFPUNKTE-SPEISEKARTE.md`](docs/PRUEFPUNKTE-SPEISEKARTE.md) | automatisch erzeugte Liste der offenen Punkte je Gericht |
| [`docs/SPEISEKARTE-ERFASSUNG.md`](docs/SPEISEKARTE-ERFASSUNG.md) | wie die Flyer ausgelesen wurden, Auffälligkeiten, Interpretationen |
| [`docs/BETRIEB-UND-PFLEGE.md`](docs/BETRIEB-UND-PFLEGE.md) | Preise, Gerichte, Öffnungszeiten, Pausen, Liefergebiet, Testmodus |
| [`docs/GITHUB-PAGES-UND-DOMAIN.md`](docs/GITHUB-PAGES-UND-DOMAIN.md) | Veröffentlichung und spätere Verknüpfung mit `shahi-biberach.de` |
| [`docs/RECHTLICHES.md`](docs/RECHTLICHES.md) | technische Einordnung der Rechtsfragen und Freigabepunkte (keine Rechtsberatung) |
| [`docs/TESTBERICHT.md`](docs/TESTBERICHT.md) | durchgeführte Tests, Ergebnisse, offene Punkte |
| [`docs/MARKE.md`](docs/MARKE.md) | Markenidentität: Logo, Farben, Schrift, Formen, Illustrationen |
| [`docs/ARCHITEKTUR.md`](docs/ARCHITEKTUR.md) | Aufbau, Datenmodell, Erweiterungen (Bondrucker, Verwaltung, Zahlung) |
| [`docs/GOOGLE-UNTERNEHMENSPROFIL.md`](docs/GOOGLE-UNTERNEHMENSPROFIL.md) | vorbereitete Angaben für die manuelle Einrichtung |
