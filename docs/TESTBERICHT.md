# Testbericht

Stand 16.11.2026 · Headless Chrome (Playwright 1.63) gegen `public/` über einen lokalen Server · Uhrzeit im Browser simuliert (Europe/Berlin).
Ausführen: `node tools/build.mjs && python3 tests/e2e.py` · Ergebnisdatei: [`tests/ergebnis.json`](../tests/ergebnis.json).

**Ergebnis: 86 von 86 Prüfungen bestanden.**

Für den Normalbetrieb werden die Daten nur im Test ergänzt (Betreiberangaben, Zahlung bar, Steuerstatus, bestätigte Lieferorte; in C/D/F/G zusätzlich alle Prüfpunkte als bestätigt). Teil B und E prüfen die echten, migrierten Daten.

## Funktionsprüfungen

### A. Seiten und Links

- ✅ 27 Seiten ohne JavaScript-Fehler
- ✅ keine externen Anfragen beim Seitenaufruf
- ✅ alle 54 internen Links und Dateien erreichbar
- ✅ keine MINAR-Restaurantdaten in Seiten und app.js

### B. Vor-Eröffnungsmodus

- ✅ Status „Eröffnung in Vorbereitung“
- ✅ Speisekarte sichtbar, Gericht in den Warenkorb
- ✅ Warenkorb-Drawer öffnet
- ✅ Bestellarten gesperrt
- ✅ Hinweis: Bestellung ab Eröffnung
- ✅ keine Bestellübersicht / kein WhatsApp im Vor-Eröffnungsmodus
- ✅ keine Fehler

### C. Bestellung im Normalbetrieb (Montag 18:00)

- ✅ Status geöffnet, Bestellschluss 22:15
- ✅ Dialogpreis Burger 10,00 €
- ✅ Party-Pizza: Pflichtauswahl 4 Beläge
- ✅ ohne 4 Beläge nicht hinzufügbar
- ✅ 5. Belag gesperrt (max 4)
- ✅ Grundpreis je Liter bei Getränken
- ✅ 5 Positionen (Salami zusammengeführt)
- ✅ Salami Menge 2
- ✅ Warenwert 66,80 €
- ✅ Pfand 0,25 € separat
- ✅ Gesamt Abholung 67,05 €
- ✅ Referenz SHA-A-YYYYMM-XXXXXXXX
- ✅ Menge + aktualisiert Summe
- ✅ Bearbeiten übernimmt Variante
- ✅ Pflichtfelder werden markiert
- ✅ Bestellübersicht (Bon) öffnet
- ✅ Bon: SHAHI, Adresse, Referenz
- ✅ Bon: Positionen mit Extras und Pfand
- ✅ Bon: Gesamt bar 67,05 €
- ✅ WhatsApp-Link an 0179 69 500 47
- ✅ Nachricht vollständig
- ✅ keine geschützten Leerzeichen in der Nachricht
- ✅ „Weiter zu WhatsApp“ öffnet nur wa.me (kein Versand durch die Website)
- ✅ neutraler Hinweis, keine Erfolgsmeldung
- ✅ localStorage ohne Name/Telefon
- ✅ Formular nur im sessionStorage
- ✅ keine MINAR-Schlüssel
- ✅ Referenz nach Neuladen identisch
- ✅ Lieferung: SHA-L mit gleicher Kennung
- ✅ Liefergebühr bis 7 km: 2,00 €
- ✅ Gesamt Lieferung 69,05 €
- ✅ Hausnummer wird verlangt
- ✅ Lieferadresse mit PLZ und Ort
- ✅ Liefergebühr in der Nachricht
- ✅ „Neue Bestellung“ leert Warenkorb und führt zur Speisekarte
- ✅ neue Bestellung → neue Referenz
- ✅ Mindestbestellwert 15 € sperrt (7,90 €)
- ✅ Getränke-Abfrage bei Bestellung ohne Getränk
- ✅ danach Bestellübersicht
- ✅ keine Fehler im Bestellablauf

### D. Öffnungszeiten

- ✅ Dienstag: Ruhetag, öffnet morgen 16:30
- ✅ Montag 16:00: geschlossen, öffnet heute 16:30
- ✅ Montag 22:20: Bestellschluss vorbei
- ✅ Freitag 11:05: geöffnet
- ✅ Sommerzeit (MESZ) Montag 18:00: geöffnet
- ✅ Sonderöffnungszeit: geschlossen mit Hinweis
- ✅ Betriebsferien: nächste Öffnung danach
- ✅ Bestellpause sperrt beide Bestellarten
- ✅ Bestellpause: Hinweis
- ✅ Wunschzeit Abholung: ab 18:30 (20 Min. Vorlauf, 15-Min.-Raster) bis 22:30
- ✅ Wunschzeit Lieferung: ab 18:30 (30 Min. Vorlauf)
- ✅ nach Bestellschluss keine Bestellung

### E. Sperrende Prüfpunkte (Normalbetrieb, Daten wie migriert)

- ✅ Getränke mit offenem Pfand-Prüfpunkt: nur telefonisch
- ✅ Burger: nicht freigegebene Extras ausgeblendet, Burger bestellbar
- ✅ Party-Pizza mit offener Belagliste: nur telefonisch
- ✅ ohne Impressum/Zahlungsarten/Steuerstatus keine Online-Bestellung

### F. Umsatzsteuer

- ✅ Abholung: enthaltene USt. 7 % 4,11 €, 19 % 0,68 €
- ✅ Lieferung: Liefergebühr anteilig, USt. 7 % 4,23 €, 19 % 0,70 €
- ✅ keine Umsatzsteuer aufgeschlagen (Gesamt unverändert brutto)

### G. Lange Nachrichten, Bestellreferenz

- ✅ lange Nachricht: Warnung und Kopier-Ausweg
- ✅ 20.000 Referenzen: Format korrekt, keine Doppelung
- ✅ … nur gültige Position, Menge begrenzt auf 50, Optionen bereinigt

### H. Mobile Darstellung

- ✅ 390 px: kein seitliches Scrollen auf 27 Seiten
- ✅ 390 px: Menü öffnet
- ✅ 390 px: Warenkorb-Drawer über Schaltfläche
- ✅ 390 px: keine Fehler
- ✅ 768 px: kein seitliches Scrollen auf 27 Seiten
- ✅ 768 px: Menü öffnet
- ✅ 768 px: Warenkorb-Drawer über Schaltfläche
- ✅ 768 px: keine Fehler

### I. Logo-Intro

- ✅ „Bewegung reduzieren“: statisches Logo ohne Intro
- ✅ Intro läuft
- ✅ Intro (wie MINAR, 5,5 s) endet in der Original-Silhouette
- ✅ Logo-Schriftzug SHAHI (5 Buchstaben), Unterzeile ohne „Restaurant“
- ✅ keine Fehler

## Visuelle Abnahme MINAR ↔ SHAHI

`python3 tests/vergleich.py /pfad/zu/minar/public` erzeugt Gegenüberstellungen bei identischen Viewports (390, 768, 1440 px) in [`abnahme/`](abnahme/): Startseite (oben und ganze Seite), Kategorieseite Pizza, Warenkorb, Bestellübersicht (Bon), Warenkorb-Drawer, mobile Navigation. Beide Seiten zeigen dieselbe simulierte Zeit (Montag 18:00) und einen vergleichbaren Warenkorb.

| # | Prüfpunkt | Ergebnis |
|---|---|---|
| 1 | Header-Höhe | identisch (Topbar + Kopfzeile, `--header-h` unverändert) |
| 2 | Logo-Platzierung | identisch; SHAHI-Logo ist kompakter (Seitenverhältnis 2,6 : 1 statt 4,2 : 1), gleiche Höhe 52/44/38 px |
| 3 | Navigationsabstände | identisch, gleitender Indikator wie MINAR |
| 4 | Hero-Proportionen | identisch (gleiches Logo-SVG-Format, gleiche Größe) |
| 5 | Hintergrundfarben und Verläufe | identisch (Aurora, Raster, Halo, rotierender Ring, Laufbänder); Hintergrund-Schriftzug „SHAHI“ |
| 6 | Typografie und Schriftgrößen | identisch (Systemschriften, keine neue Schrift; Fraunces nur als Pfade im Logo) |
| 7 | Button-Styling | identisch (Blattform, Licht-Spot, Lichtstreif, Roll-Label, Magnet) |
| 8 | Karten-Design | identisch (Gerichte, Service-Liste, Kontakt- und Zonenkarten) |
| 9 | Hover-Zustände | identisch (`fx.js` unverändert) |
| 10 | Animationen | identisch, auch das Logo-Intro (Tierfigur, 5,5 s); Schriftzug „SHAHI“ |
| 11 | Abschnittsabstände | identisch |
| 12 | Warenkorb | identisch (dunkle Karte, Referenz, Mengensteuerung, Ändern/Entfernen, Summen) |
| 13 | Bestellübersicht | identisch (Bon-Gestaltung); zusätzlicher Textlink „Bestelltext kopieren“ |
| 14 | Footer | identisch; helles Logo für den dunklen Grund, ohne E-Mail-Zeile (keine Adresse vorhanden), zusätzliche Links „Bestellinfos · Allergene“ |
| 15 | Mobile Navigation | identisch |

Begründete Abweichungen: siehe [`ABSCHLUSSBERICHT.md`](ABSCHLUSSBERICHT.md), Abschnitt C.

## Nicht getestet

Echtes Absenden in WhatsApp (keine echten Bestellungen; der Test fängt `wa.me` ab), echte Mobilgeräte (iOS Safari, Android Chrome), Druckdialog, Veröffentlichung auf GitHub Pages, Domain, Google-Links im Internet (Testumgebung ohne Internetzugriff).
