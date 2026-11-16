# SHAHI Küche – Abschlussbericht: Nachbau des MINAR-Designsystems

Stand 16.11.2026 · Repository `BraeuerDigital/shahi-alt`, Branch `main` · Auftrag: [`MASTERPROMPT.md`](../MASTERPROMPT.md)
Referenz: `BraeuerDigital/minar@baa0875` (nur gelesen, nicht verändert) · Ausgangszustand SHAHI: Branch `sicherung/shahi-vor-minar-2026-11-16` (= `BraeuerDigital/shahi@439c4df`)

> **Status:** technisch fertig und getestet (86/86 Browser-Prüfungen, Karte vollständig mit dem Flyer abgeglichen), **Vor-Eröffnungsmodus**, nicht veröffentlicht, keine Domain, `noindex`. Vor dem Livegang: [`FREIGABELISTE.md`](FREIGABELISTE.md).

## A. Von MINAR übernommene Komponenten

| Bereich | Übernahme |
|---|---|
| Designsystem `styles.css` | vollständig, Farbwerte unverändert (Variablen nur von `--minar-*` in `--shahi-*` umbenannt) |
| Typografie, Grids, Inhaltsbreiten, Abstände, Breakpoints | unverändert |
| Topbar, Header, Navigation mit gleitendem Indikator, Sticky-/Scroll-Verhalten, mobile Navigation | unverändert (Markup aus `build.mjs`) |
| Hero: Aurora, Raster, Halo, rotierender Ring, Outline-Schriftzug, Laufbänder, Hero-Proportionen | unverändert; Schriftzug „SHAHI“ |
| Buttons: Blattform, Licht-Spot, Lichtstreif, Roll-Label, Magnet, Farbwechsel, Timing | unverändert (`fx.js` 1:1) |
| Karten: 3D-Tilt, Spotlight, Hover-Rahmen, Scroll-Reveal, Scroll-Fortschritt | unverändert |
| Startseite: Intro mit Service-Liste, Galerie, Lieferdienst-Bühne, Öffnungszeiten-Karte, CTA-Band, Footer mit Swoosh, Seiten-CTA, Warenkorb-Schaltfläche | gleiche Sektionen in gleicher Reihenfolge |
| Speisekarte: Gesamtkarte mit Chip-Leiste und Scrollspy, Suche (auch nach Nummer), Kategorieseiten mit Blätter-Navigation, Gericht-Karten mit Nummer, Preis, Varianten, Allergenen, Zusatzstoffen, Tags, Pfand, Gericht-Dialog mit Varianten, Pflichtauswahl, Extras, Hinweis, Menge | unverändert |
| Warenkorb (Seite und Drawer mit Wischgeste), Bestellreferenz, Mengensteuerung, Ändern/Entfernen, Summen, Getränke-Abfrage | unverändert |
| Checkout: Bestellart, Lieferort, Angaben, Wunschzeit, „So funktioniert Ihre Bestellung“, Bon, „Weiter zu WhatsApp“, neutraler Hinweis nach dem Öffnen, „Neue Bestellung beginnen“, Druck/PDF | unverändert (Texte mit SHAHI-Daten) |
| Logo-Intro der Startseite: SVG-Aufbau, Gelenk-Rig der Tierfigur, `logo-anim.js`, Zeiten, Posen, Endpose | 1:1 (Nachtrag 16.11.2026 auf Wunsch des Auftraggebers); Schriftzug „SHAHI“ statt „MINAR“ wie auf dem SHAHI-Flyer |
| Rechtliche Seiten: Gestaltung (`page-legal`, `prose legal`) | übernommen, Inhalte neu für SHAHI |
| Seitengenerator, Datenformat `menu-data.js`, Ordner `public/`, Weiterleitung im Repo-Stamm | übernommen |

## B. SHAHI-spezifische Anpassungen

1. **Marke:** überall das Logo des SHAHI-Flyers, das dem MINAR-Logo bis auf den Schriftzug entspricht: Kopfzeile (horizontal), Fußzeile, Bon (Emblem), Favicon – Dateien, Formate und Größen wie MINAR (`tools/logo/compose.py`). Das Spitzbogen-Logo der bisherigen Website wird nicht mehr verwendet (liegt im Sicherungs-Branch).
2. **Logo-Intro:** MINAR-Animation 1:1 mit dem Flyer-Logo von SHAHI (das bis auf den Schriftzug dem MINAR-Logo entspricht): Schriftzug „SHAHI“ aus den Original-Buchstabenformen („A“, „I“ original, „H“ aus zwei „I“, „S“ aus Bookman Demi in Originalstärke, `tools/logo/schriftzug.py`), Unterzeile „— LIEFERSERVICE • ABHOLUNG —“ (ohne „Restaurant“), Ablauf und Dauer (5,5 s) wie MINAR.
3. **Inhalte:** vollständige SHAHI-Speisekarte (16 Kategorien, 166 Positionen, Varianten, Extras, Beläge, Allergene, Zusatzstoffe, Pfand, Prüfpunkte) verlustfrei migriert ([`MIGRATION.md`](MIGRATION.md)); Adresse, drei Festnetznummern, WhatsApp 0179 69 500 47; Texte für Abholung und Lieferservice.
4. **Öffnungszeiten:** Mo, Mi, Do 16:30–22:30 · Fr–So 11:00–22:30 · Di Ruhetag, Bestellschluss 22:15, Vorlauf 20/30 Min., Europe/Berlin; zusätzlich Sonderöffnungszeiten, Betriebsferien, kurzfristige Schließungen, manuelle Bestellpause.
5. **Eröffnungsmodus:** Vor-Eröffnung (Karte sichtbar, keine Bestellanfragen) und Normalbetrieb über `operation.mode`; Livegang-Schutz bei fehlenden Pflichtangaben; sperrende Prüfpunkte („nur telefonisch“) im Normalbetrieb.
6. **Lieferung:** Entfernungszonen laut Flyer (Biberach 15 €/1 €, bis 7 km 25 €/2 €, 7–12 km 45 €/3 €) im MINAR-Liefersystem; Orte nur nach Bestätigung wählbar, Lieferadresse mit PLZ; keine Zusage für unbestätigte Gebiete.
7. **Preise und Steuer:** Rechnung in ganzen Cent; Steuerart je Artikel (Speisen 7 %, Getränke 19 %, Kombiangebot aufteilbar), Pfand wie Getränk, Lieferkosten anteilig; Ausweis nur nach Bestätigung (`tax.show`), nie Aufschlag; Grundpreis je Liter bei Getränken.
8. **Zahlung:** datengetrieben (`payment`); bis zur Bestätigung neutraler Hinweis, bei „bar“ exakt die MINAR-Texte.
9. **Referenz:** `SHA-A/L-YYYYMM-XXXXXXXX`, eigene Speicherschlüssel `shahi-cart-v1` / `shahi-form-v1` (getrennt von MINAR).
10. **Rechtliches:** Impressum (§ 5 DDG) und Datenschutz (GitHub Pages, Browser-Speicherung, WhatsApp, Maps) mit markierten Platzhaltern; neue Seiten „Bestell- & Verbraucherinformationen“ (inkl. Liefer- und Zahlungsbedingungen) und „Allergene & Zusatzstoffe“ im MINAR-Stil.
11. **Hosting:** GitHub Pages beibehalten; manueller Workflow „Veröffentlichen“, CSP als Meta-Tag ([`HOSTING-UND-DOMAIN.md`](HOSTING-UND-DOMAIN.md)).

## C. Begründete visuelle Abweichungen von MINAR

| Abweichung | Grund |
|---|---|
| Schriftzug „SHAHI“ in allen Logos, Unterzeile ohne „Restaurant“ im Logo-Intro | Restaurantname laut Flyer; Angebot laut Flyer: Abholung und Lieferservice |
| Illustrationen statt Fotos (Galerie, Kategorieköpfe, „Über uns“), vollständig sichtbar im gleichen Rahmen, Hinweis „Illustration – kein Produktfoto“ | keine SHAHI-Fotos vorhanden; MINAR-Fotos zeigen das MINAR-Restaurant und dürfen nicht verwendet werden |
| Kategoriebild auf allen 16 Kategorieseiten (MINAR: 5) | für jede SHAHI-Kategorie gibt es eine Illustration; gleiche Komponente |
| Topbar-Claim „Lieferservice · Abholung · Biberach“, Service-Karte „In der Bachgasse 17“ statt „Im Restaurant“ | Restaurantbetrieb mit Sitzplätzen ist nicht belegt (Freigabe 2.7) |
| Lieferzonen als Entfernungszonen statt Ortslisten | SHAHI-Flyer staffelt nach Entfernung |
| Zusatzzeile „Abweichende Zeiten“ in der Öffnungszeiten-Karte (nur wenn vorhanden) | Sonderöffnungszeiten |
| „Telefonisch“-Schaltfläche (zurückgenommen) bei Gerichten mit offenem Prüfpunkt – nur im Normalbetrieb | keine ungeprüften Angaben verkaufen |
| Kennzeichnung bei Optionen, Grundpreis je Liter | LMIV/PAngV |
| Link „Bestelltext kopieren“ im Bon | Ausweg bei langen Nachrichten (Fehlerbehebung) |
| Footer-Links „Bestellinfos · Allergene“, Kontaktzeile Adresse statt E-Mail | zusätzliche Pflichtseiten; noch keine E-Mail-Adresse |
| Keine Google-Bewertungsbox | noch kein SHAHI-Profil; erscheint automatisch mit Link |

## D. Behobene Fehler (betreffen MINAR ebenso)

1. **„Neue Bestellung beginnen“ im Warenkorb-Drawer auf Unterseiten** führte zu `speisekarte/speisekarte/index.html` (404) – jetzt Pfad vom Seitenstamm.
2. **Gespeicherter Warenkorb wurde ungeprüft übernommen:** ungültige oder doppelte Optionen, mehrere Werte bei Einzelauswahl, Überschreiten von Höchstzahlen, zu große Mengen – jetzt bereinigt, unvollständige Pflichtauswahl verworfen, doppelte Positionen zusammengeführt.
3. **Gleitkommarechnung** (Rundung je Position) – jetzt durchgehend ganze Cent.
4. **Lange WhatsApp-Nachrichten:** Warnung und „Bestelltext kopieren“ als Ausweg.
5. **Formularvalidierung:** Lieferadresse ohne Hausnummer und einstellige Namen wurden akzeptiert; Steuer-/unsichtbare Zeichen werden aus allen Eingaben entfernt.
6. **Sicherheit:** Content-Security-Policy als Meta-Tag (GitHub Pages setzt keine Header); keine Inline-Skripte.
7. **Kopieren der Referenz:** robusterer Rückfall ohne Clipboard-API.
8. Doppelte Event-Listener wurden geprüft – keine gefunden (Dialog-Listener werden einmalig gebunden, Wischgesten mit Schutz gegen Mehrfachbindung).

## E. Getestete Funktionen

86 automatisierte Browser-Prüfungen, alle bestanden ([`TESTBERICHT.md`](TESTBERICHT.md)): alle Seiten/Links, keine JS-Fehler, keine externen Anfragen, keine MINAR-Restaurantdaten, Vor-Eröffnungsmodus, Mischbestellung Speisen + Getränke (Varianten, Beilage, Extras, Pflichtauswahl, Pfand), Bearbeiten, Mengen, Zusammenführen, Abholung, Lieferung mit Gebühr und PLZ, Mindestbestellwert, Getränke-Abfrage, Referenz (stabil, A/L, neu bei neuer Bestellung, 20.000 ohne Doppelung), WhatsApp-Nachricht vollständig und ohne automatischen Versand, Datensparsamkeit, Öffnungszeiten (Ruhetag, vor Öffnung, Bestellschluss, Sommerzeit, Ausnahme, Ferien, Pause, Wunschzeiten), sperrende Prüfpunkte, Livegang-Schutz, Steueraufteilung Abholung/Lieferung, lange Nachrichten, 390/768 px ohne seitliches Scrollen, Menü, Drawer, Logo-Intro. Visueller Vergleich bei 390/768/1440 px in [`abnahme/`](abnahme/). Abgleich aller 166 Positionen mit den Flyerfotos: [`SPEISEKARTE-ABGLEICH.md`](SPEISEKARTE-ABGLEICH.md).

## F. Noch zu bestätigen

Betreiberdaten, E-Mail, Zahlungsarten, Steuerstatus, Liefergebiete (15 Orte), Öffnungs- und Vorbereitungszeiten, Eröffnungsdatum, 58 Prüfpunkte der Speisekarte (18 sperrend: u. a. Pfand aller Getränke, Burger-Extras/-Beilage, Party-Pizza-Beläge, Menü 73), „Minar“ in zwei Gerichtsnamen des SHAHI-Flyers, Fotos – vollständig in [`FREIGABELISTE.md`](FREIGABELISTE.md) und [`PRUEFPUNKTE-SPEISEKARTE.md`](PRUEFPUNKTE-SPEISEKARTE.md).

## G. Vor dem Livegang freizugeben

1. Rechtliche Freigabe der Bestellstrecke, insbesondere die von MINAR übernommene Absendehandlung „Weiter zu WhatsApp“ (§ 312j Abs. 3/4 BGB – bei MINAR ebenfalls offen; die bisherige SHAHI-Website nutzte „Zahlungspflichtig bestellen“).
2. Impressum, Datenschutzerklärung, Bestell- und Verbraucherinformationen (Widerrufsrecht/Ausnahmen, Streitbeilegung).
3. Steuerstatus und Steuersätze (Ayran, Pfand, Lieferkosten, Menü 73).
4. Allergenkennzeichnung.
5. Testbestellung im Testmodus, danach Eröffnungsmodus umschalten.
6. Veröffentlichung (Workflow „Veröffentlichen“), Domain `shahi-biberach.de` und DNS – **nur mit ausdrücklicher Freigabe**.
