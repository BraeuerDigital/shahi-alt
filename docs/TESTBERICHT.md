# Testbericht

Stand: 15.11.2026 · Umgebung: Node 22, Chrome (headless) über Playwright 1.63, lokaler Server mit GitHub-Pages-Verhalten (Verzeichnis → index.html, unbekannte Pfade → 404.html mit Status 404). Rechner-Zeitzone im Browser bewusst **UTC**, damit die Umrechnung nach Europe/Berlin geprüft wird. Uhrzeiten über `page.clock` fest eingestellt.

**Ergebnis: 35 von 35 Tests bestanden** (23 Unit-Tests, 12 Browser-Tests). Wiederholbar mit:

```bash
node --test tests/unit.test.mjs
node --test tests/e2e.test.mjs        # benötigt Playwright + Chromium
```

Für Live-Szenarien setzen die Browser-Tests eine vollständig freigegebene Konfiguration (Testdaten für Betreiber, Zahlung, Steuer, bestätigte Orte und Prüfpunkte) nur im Test ein – die Daten im Repository bleiben unverändert im Vor-Eröffnungsmodus.

## Speisekarte

| Prüfung | Ergebnis |
|---|---|
| alle Flyerprodukte vorhanden: 153 Gerichte + 13 Getränke, Anzahl je Kategorie wie Flyer | ✔ |
| Preise: 97 Stichproben über alle Kategorien + alle Variantenpreise (Potatoes, Platten, Softdrinks) | ✔ |
| keine doppelten internen IDs, keine doppelten Artikelnummern, Buchstabenzusätze (96a, 98a/b, 99a, 129a, 134a) | ✔ |
| IDs sind keine Artikelnummern | ✔ |
| Allergene/Zusatzstoffe zugeordnet, nur Codes aus der Legende; Lücken/Widersprüche als „wird geprüft“ | ✔ |
| Suche nach Nummer (96a), Begriff (Butter Chicken), Umlaut-Varianten (duerum), Filter vegetarisch | ✔ |
| Datenvalidierung bricht den Build bei Fehlern ab | ✔ |

## Warenkorb

| Prüfung | Ergebnis |
|---|---|
| einzelnes Produkt, mehrere verschiedene, mehrere identische (Salami 2 × → eine Zeile, Menge 2) | ✔ |
| gleiches Produkt mit verschiedenen Varianten getrennt (Pommes klein/groß) | ✔ |
| Preisänderung durch Extras live im Dialog ((11,50 + 3,50 + 1,00) × 2 = 32,00 €) | ✔ |
| Menge erhöhen/verringern, Entfernen, Ändern (Variante ändern → verschmilzt mit identischer Zeile) | ✔ |
| Warenkorb bleibt beim Seitenwechsel und Neuladen erhalten | ✔ |
| Cent-Rechnung ohne Gleitkommafehler, Formatierung „1.234,56 €“ | ✔ |
| ungültige/manipulierte Auswahl wird bereinigt; Pflichtauswahl (4 Beläge) erzwungen; Menge 1–50 | ✔ |
| localStorage enthält keine Namen, Telefonnummern oder Adressen | ✔ |

## Lieferung und Abholung

| Prüfung | Ergebnis |
|---|---|
| Biberach 15 €/1 €, bis 7 km 25 €/2 €, 7–12 km 45 €/3 € | ✔ |
| knapp unter Mindestbestellwert (14,99 €, 24,99 €, 44,99 €) gesperrt mit Fehlbetrag; genau auf dem Wert (15,00 €, 45,00 €) erlaubt | ✔ |
| Pfand und Lieferkosten zählen nicht zum Mindestbestellwert | ✔ |
| Bestellstrecke Lieferung: 14,30 € → „es fehlen noch 0,70 €“; nach Ergänzung 15,30 € + 1,00 € = 16,30 € | ✔ |
| Adresse ohne Hausnummer, PLZ passt nicht zum Ort, Ort außerhalb → Fehlermeldung | ✔ |
| nur bestätigte Orte wählbar; ohne bestätigte Orte ist Lieferung deaktiviert (Abholung bleibt) | ✔ |
| Abholung: keine Adresse, keine Lieferkosten, Adressschritt übersprungen | ✔ |

## Zeitsteuerung (Europe/Berlin)

| Prüfung | Ergebnis |
|---|---|
| geöffnet (Mo 18:00), vor Öffnung (Mo 16:00), Bestellschluss (22:15), geschlossen (22:31) | ✔ |
| Dienstag Ruhetag mit Hinweis „wieder morgen ab 16:30 Uhr“ | ✔ |
| Sommerzeit (01.07.), Winterzeit (18.11.), beide Umstellungstage (29.03., 25.10.) | ✔ |
| Referenzmonat nach Berliner Zeit (31.12. 23:30 UTC → 202701) | ✔ |
| Sonderöffnung am Ruhetag, geschlossener Feiertag, Betriebsferien, kurzfristige Schließung (mit „heute ab 19:00“), Bestellpause | ✔ |
| Wunschzeiten: 15-Min.-Raster, Vorlauf 20/30 Min., späteste 22:30, keine Vorbestellung | ✔ |
| im Browser: Ruhetag und nach Bestellschluss → Banner, Übersicht gesperrt; Sommerzeit geöffnet | ✔ |
| Vor-Eröffnungsmodus: Karte sichtbar, keine Bestellbuttons, kein Warenkorb, Hinweis auf Eröffnung | ✔ |
| Live-Modus ohne Betreiberangaben: Bestellung gesperrt (Livegang-Schutz) | ✔ |

## WhatsApp

| Prüfung | Ergebnis |
|---|---|
| Empfänger `https://wa.me/491796950047` (0179 69 500 47 international) | ✔ |
| Nachricht enthält Restaurant, Referenz, Bestellart, Name, Telefon, Adresse, Fahrerhinweis, Wunschzeit, Artikelnummern, Produkte, Mengen, Varianten, Extras, Einzelpreise, Warenwert, Lieferkosten, Pfand, Gesamt, Anmerkung | ✔ |
| keine geschützten Leerzeichen, korrekte URL-Kodierung (Hin- und Rückkodierung identisch) | ✔ |
| Abholung/Lieferung korrekt gekennzeichnet (SHA-A/SHA-L) | ✔ |
| Referenz in Übersicht, Seitenleiste, Nachricht und Hinweis nach dem Öffnen identisch; bleibt beim erneuten Öffnen gleich; „Neue Bestellung“ erzeugt neue | ✔ |
| Klick öffnet WhatsApp in neuem Fenster, Website bleibt offen, keine automatische Übermittlung, keine Erfolgsbehauptung | ✔ |
| Testmodus: Testnummer, Kennzeichnung „TEST“ | ✔ |
| 100.000 Referenzen: Format korrekt, alle 32 Zeichen genutzt, χ²-Test unauffällig, ohne `crypto` keine Ersatznummer | ✔ |
| Fallback „Bestelltext kopieren“ + Telefon vorhanden; Warnhinweis bei sehr langen Nachrichten | ✔ (Funktion vorhanden, Kopieren nicht automatisiert getestet) |

## Umsatzsteuer und Pfand

| Prüfung | Ergebnis |
|---|---|
| reine Speisen (Salami 9,40 € → 7 %: 0,61 €) | ✔ |
| reine Getränke (2 × Cola 0,33 l → 19 %: 0,80 €) | ✔ |
| Mischbestellung mit Extras, Pfand und Lieferkosten: 7 % 1,72 €, 19 % 0,90 €; Summe der Brutto-Anteile = Gesamtsumme (keine Doppelaufschläge) | ✔ |
| Kombiangebot ohne festgelegte Aufteilung → kein Steuerausweis; mit Aufteilung korrekt getrennt | ✔ |
| Kleinunternehmer: kein Steuerausweis, Hinweis § 19 UStG | ✔ |
| unbestätigter Steuerstatus: kein Ausweis | ✔ |
| Pfand je Getränk, nicht bei Speisen; unklares Pfand (Ayran) sperrt die Bestellung des Artikels im Live-Betrieb | ✔ |

## Technik, Darstellung, Barrierefreiheit

| Prüfung | Ergebnis |
|---|---|
| 26 Seiten bei 320, 390, 768 und 1440 px: keine JavaScript-Fehler, kein seitliches Scrollen | ✔ (zwei Fehler gefunden und behoben: Liefertabelle und eine lange Überschrift bei 320 px) |
| keine einzige Anfrage an fremde Server beim Laden aller Seiten | ✔ |
| alle internen Links, Skripte, Stylesheets, Bilder, Sprite-Referenzen erreichbar; 404-Seite mit Status 404 | ✔ |
| je Seite genau eine h1, `lang="de"`, alle Formularfelder beschriftet, keine Buttons ohne Namen | ✔ |
| „Bewegung reduzieren“: Titel-Animation läuft nicht | ✔ |
| Build reproduzierbar (GitHub-Prüfung vergleicht erzeugte Seiten) | ✔ lokal; Workflow selbst noch nicht auf GitHub gelaufen |

## Nicht getestet / offen

- **Echte Geräte:** iPhone (Safari), Android (Chrome), WhatsApp-App und WhatsApp Web mit realer Übergabe – vor dem Livegang mit dem Testmodus an eine interne Nummer durchführen.
- **Screenreader** (VoiceOver, TalkBack, NVDA) und vollständige WCAG-Prüfung (z. B. mit axe) – nur Basisprüfungen automatisiert.
- **Live-Adresse auf GitHub Pages** und der GitHub-Workflow (kein Zugriff aus der Testumgebung; Pages muss im Repository eingeschaltet werden).
- **Domain** – bewusst nicht verknüpft.
- Firefox und Safari-Engine nicht automatisiert (nur Chromium).
- Rechtliche Prüfung der Texte und der Bestellstrecke (siehe Freigabeliste).
- Inhaltliche Richtigkeit aller Preise gegen den Originalflyer durch den Betreiber (Stichprobe automatisiert, Gesamtabgleich manuell empfohlen anhand der Allergenübersicht, die alle Gerichte tabellarisch listet).
