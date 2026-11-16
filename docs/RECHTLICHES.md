# Rechtliche Einordnung und Freigabepunkte

Technische Einordnung durch die Agentur, **keine Rechtsberatung**. Alle Punkte vor dem Livegang von einer Fachperson prüfen lassen. Recherchestand: 15.11.2026.

## 1. Bestellmodell: Anfrage oder verbindliche Bestellung? (§§ 312i, 312j BGB) – Freigabepunkt

**Ablauf technisch:** Die Website stellt eine Nachricht zusammen und öffnet WhatsApp. Erst der Kunde sendet sie ab; das Restaurant bestätigt individuell. Über die Website selbst wird nichts übertragen.

**Einordnung:** Inhaltlich gibt der Kunde mit der Nachricht ein Angebot zum Kauf bestimmter Speisen zu bestimmten Preisen ab; das Restaurant nimmt mit der Bestätigung an. Die Bestellung wird auf der Website strukturiert vorbereitet. Ob die Ausnahme für Verträge „ausschließlich durch individuelle Kommunikation“ (§ 312i Abs. 2, § 312j Abs. 5 BGB) greift, ist bei einer website-gestützten Bestellstrecke zweifelhaft. Eine bloße Umbenennung in „Anfrage“ würde daran nichts ändern.

**Umsetzung (Voreinstellung `bestellung.rechtsmodell = "verbindlich"`):** vorsichtiger Weg –
- Schaltfläche **„Zahlungspflichtig bestellen“** (§ 312j Abs. 3 BGB), darunter der Hinweis, dass WhatsApp geöffnet wird und erst das Absenden dort die Bestellung übermittelt;
- Nachricht beginnt mit „Bestellung“ und endet mit „Ich bestelle zahlungspflichtig und bitte um Bestätigung.“;
- unmittelbar vor der Schaltfläche: alle Positionen mit Varianten und Extras, Einzel- und Gesamtpreise, Lieferkosten, Pfand, Gesamtbetrag, Zahlungsart, Wunschzeit (§ 312j Abs. 2 BGB);
- Lieferbeschränkungen (Liefergebiet, Mindestbestellwert, Bestellzeiten) und Zahlungsarten auf „Lieferung & Abholung“, „Bestellinformationen“ und am Beginn der Bestellstrecke (§ 312j Abs. 1 BGB);
- technische Schritte bis zum Vertragsschluss, Korrekturmöglichkeiten („Ändern“, „Zurück“), Vertragssprache, Speicherung des Vertragstexts: Seite „Bestell- & Verbraucherinformationen“ (§ 312i Abs. 1, Art. 246c EGBGB);
- Zugangsbestätigung (§ 312i Abs. 1 Nr. 3 BGB): erfolgt durch die individuelle Bestätigung per WhatsApp – **im Betrieb sicherstellen, dass jede Bestellung zeitnah bestätigt oder abgelehnt wird**;
- keine Erfolgsmeldung auf der Website; der Hinweis nach dem Öffnen sagt ausdrücklich, dass die Bestellung erst mit der Bestätigung angenommen ist.

**Alternative `"anfrage"`:** Schaltfläche „Bestellanfrage senden“, Nachricht „Bestellanfrage“. Nur nach anwaltlicher Freigabe verwenden.

## 2. Widerrufsrecht und Widerrufsfunktion

- Für schnell verderbliche Speisen besteht nach § 312g Abs. 2 Nr. 2 BGB in der Regel kein Widerrufsrecht. Für verschlossene Getränke ist das nicht selbstverständlich.
- Seit 19.06.2026 gilt die Pflicht zur elektronischen Widerrufsfunktion (§ 356a BGB n. F.) für online geschlossene Fernabsatzverträge, **sofern** ein Widerrufsrecht besteht.
- Auf der Website steht derzeit ein markierter Platzhalter; es wurde keine Ausnahme behauptet. Fachlich klären: Informationen zum (Nicht-)Bestehen des Widerrufsrechts, ggf. Widerrufsbelehrung und Widerrufsfunktion.

## 3. Preisangaben (PAngV)

- Gesamtpreise in Euro je Gericht; Pfand getrennt neben dem Preis („zzgl. 0,25 € Pfand“) und separat in Warenkorb, Übersicht und Nachricht.
- Grundpreis je Liter bei Getränken mit bekannter Füllmenge (Red Bull: Füllmenge fehlt).
- Hinweis zur Umsatzsteuer hängt vom Steuerstatus ab: „inklusive gesetzlicher Umsatzsteuer“ bzw. „gemäß § 19 UStG keine Umsatzsteuer“ – bis zur Bestätigung neutral („Alle Preise in Euro“) und im Live-Betrieb gesperrt.
- Lieferkosten je Zone vor der Bestellung sichtbar.

## 4. Umsatzsteuer

- Seit 01.01.2026: Speisen 7 % (auch Restaurant- und Verpflegungsleistungen), Getränke grundsätzlich 19 %; bei Abholung/Lieferung für Milch und Milchmischgetränke mit mindestens 75 % Milchanteil 7 %.
- Technisch: Steuersatz je Produkt; Bruttopreise, die enthaltene Steuer wird je Satz aus der Summe herausgerechnet (keine Aufschläge, keine pauschale Rechnung auf den ganzen Warenkorb). Pfand wie das Getränk, Lieferkosten anteilig nach Warenwert je Satz. Kombiangebote (Menü 73) werden erst nach festgelegter Aufteilung ausgewiesen.
- Kleinunternehmer (§ 19 UStG): kein Steuerausweis, eigener Preishinweis.
- Die Website ersetzt keinen Kassenbeleg (Kassensicherungsverordnung bleibt Sache des Betriebs).

## 5. Lebensmittelinformation (LMIV, LMIDV)

- Allergene und Zusatzstoffe stehen bei jedem Gericht in der Karte, ausführlich im Gericht-Dialog, auf einer eigenen Übersichtsseite (kein PDF) und werden bei gewählten Extras ergänzt.
- Fernabsatz: Die Information ist vor Vertragsschluss verfügbar (Karte, Dialog, Link in der Übersicht). Bei Lieferung muss sie auch zum Zeitpunkt der Lieferung verfügbar sein (Betrieb: z. B. Hinweis auf die Allergenseite oder Aushang/Beileger).
- Keine Aussagen wie „allergenfrei“. Fehlende Kennzeichnung wird ausdrücklich nicht als „frei von“ dargestellt.
- Widersprüche und Lücken der Flyer-Kennzeichnung sind als „wird geprüft“ sichtbar und in der Prüfliste aufgeführt. Legende ohne I (Sellerie) und M (Lupinen) – bestätigen lassen.
- Energydrink: Pflichthinweis „Erhöhter Koffeingehalt. Für Kinder und schwangere oder stillende Frauen nicht empfohlen.“ prüfen und ergänzen.

## 6. Datenschutz und Cookies (DSGVO, TDDDG)

**Technische Bestandsaufnahme:**

| Technologie | Zweck | Einwilligung |
|---|---|---|
| localStorage `shahi-warenkorb-v1` | Warenkorbauswahl, Referenz, Zeitstempel – **keine** Personendaten; Ablauf 12 h | nicht erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG, vom Nutzer gewünschte Funktion) |
| sessionStorage `shahi-angaben-v1` | Formulareingaben für die Dauer des Tabs | nicht erforderlich |
| Cookies, Tracking, Analyse, Pixel, Fingerprinting | – | keine vorhanden |
| externe Schriften, Skripte, Karten, Videos | – | keine; alle Dateien vom eigenen Hoster |
| Links zu WhatsApp, Google Maps | erst nach Klick | Hinweis in der Datenschutzerklärung; vor WhatsApp zusätzlicher Hinweis in der Bestellübersicht |

**Ergebnis:** Nach technischer Einschätzung ist **kein Cookie-Banner** erforderlich und daher keiner eingebaut. Das ändert sich, sobald z. B. eine eingebettete Karte, Webanalyse oder fremde Schriften hinzukommen.

**Offen:** Grundlage der Drittlandübermittlung bei GitHub (Hosting) und WhatsApp/Meta, Auftragsverarbeitung, konkrete Löschfristen, Rolle von WhatsApp. Die Datenschutzerklärung ist ein Entwurf mit markierten Platzhaltern.

## 7. Impressum (§ 5 DDG)

Eigene Seite, von jeder Seite aus verlinkt. Fehlende Angaben sind als rote Platzhalter markiert; es wurden keine Inhaber-, Register- oder Steuerdaten erfunden. Kein Link zur EU-OS-Plattform (am 20.07.2025 abgeschaltet). Hinweis nach § 36 VSBG nur, soweit erforderlich (Platzhalter).

## 8. Weitere Punkte

- **AGB:** nicht gesetzlich zwingend, nicht erstellt. Wenn gewünscht, passend zum WhatsApp-Ablauf erstellen lassen.
- **Barrierefreiheitsstärkungsgesetz:** Dienstleistungen von Kleinstunternehmen (< 10 Beschäftigte und ≤ 2 Mio. € Jahresumsatz oder Bilanzsumme) sind ausgenommen. Unabhängig davon orientiert sich die Website an WCAG 2.2 AA (Tastatur, Fokus, Kontraste, Labels, reduzierte Bewegung, Screenreader-Texte).
- **Verpackungsrecht:** Registrierung im Verpackungsregister bzw. vorlizenzierte Serviceverpackungen, Mehrwegangebotspflicht oder Ausnahme für kleine Betriebe; seit 12.08.2026 teils neue Vorschriften (VerpackDG) – prüfen.
- **Rechte an Medien:** Logo, Icons und Illustrationen sind Eigenentwicklungen für dieses Projekt. Schrift Fraunces: SIL Open Font License 1.1 (Lizenzdatei liegt bei). Keine Stockfotos, keine Flyer-Fotos verwendet. Künftige Fotos nur mit geklärten Rechten.
- **Keine erfundenen Inhalte:** keine Bewertungen, Auszeichnungen, Social-Media-Konten, Eröffnungsdaten oder Lieferzeitgarantien. Die Lieferzeit 20–90 Minuten ist als unverbindlicher Richtwert gekennzeichnet.
