# Freigabeliste vor dem Livegang

Stand 16.11.2026. **B** = vom Betreiber zu bestätigen/liefern · **R** = rechtlich zu prüfen (keine Rechtsberatung durch die Agentur) · **S** = mit Steuerberatung · **T** = technischer Schritt der Agentur.
Einzelpunkte je Gericht stehen automatisch aktuell in [`PRUEFPUNKTE-SPEISEKARTE.md`](PRUEFPUNKTE-SPEISEKARTE.md) (58 Punkte, davon 18 sperrend).

Die Website erzwingt Teile dieser Liste selbst: Im Modus `geoeffnet` bleibt die Online-Bestellung gesperrt, solange Betreibername, Rechtsform, E-Mail, Zahlungsarten oder der Umsatzsteuer-Status fehlen. Gerichte und Optionen mit sperrenden Prüfpunkten sind nur telefonisch bestellbar, unbestätigte Lieferorte nicht wählbar.
Alle Felder stehen in `public/assets/js/menu-data.js`.

## 1. Betreiber und Impressum (B, R)

| # | Punkt | Feld |
|---|---|---|
| 1.1 | Vollständiger Name des Inhabers bzw. der Firma | `restaurant.owner` |
| 1.2 | Rechtsform, bei Gesellschaften Vertretungsberechtigte | `restaurant.legalForm`, `.representative` |
| 1.3 | E-Mail-Adresse (Pflicht im Impressum) und E-Mail-Anbieter (Datenschutz) | `restaurant.email` |
| 1.4 | Handelsregister, USt-IdNr., Wirtschafts-IdNr. – nur soweit vorhanden | `.register`, `.vatId`, `.economicId` |
| 1.5 | Aufsichtsbehörde – nur falls Zulassung nötig (R) | `.supervisoryAuthority` |
| 1.6 | Verbraucherstreitbeilegung nach § 36 VSBG, soweit erforderlich (R) | `.disputeResolution` |

## 2. Öffnungszeiten, Kontakt (B)

| # | Punkt |
|---|---|
| 2.1 | Zeiten laut Flyer bestätigen: Mo, Mi, Do 16:30–22:30 · Fr–So 11:00–22:30 · Di Ruhetag → `hours.confirmed.times = true` |
| 2.2 | Bestellannahmeschluss 22:15 Uhr (beide Bestellarten gleich? MINAR trennt Lieferung/Abholung) |
| 2.3 | Vorbereitungszeiten 20 Min. Abholung / 30 Min. Lieferung und späteste Wunschzeit 22:30 |
| 2.4 | Feiertage, Heiligabend/Silvester, Betriebsferien eintragen, sobald bekannt |
| 2.5 | Welche der drei Festnetznummern wofür (07351 347 04 00 / 03 / 04)? WhatsApp 0179 69 500 47 als Bestellnummer bestätigen |
| 2.6 | Eröffnungsdatum (`operation.openingDate`) – keines erfunden |
| 2.7 | Dine-in? Die Website nennt nur Abholung und Lieferservice (Flyer/Konfiguration). Falls es Sitzplätze gibt: Texte ergänzen |
| 2.8 | Google-Maps-Link prüfen; Google-Unternehmensprofil anlegen, Bewertungslink eintragen |

## 3. Liefergebiet und Bestellannahme (B)

| # | Punkt |
|---|---|
| 3.1 | Zone „Biberach“: nur Kernstadt oder alle Stadtteile (Rißegg, Mettenberg, Ringschnait, Stafflangen)? |
| 3.2 | „bis 7 km“ / „7 bis 12 km“: Luftlinie oder Fahrstrecke, ab Bachgasse 17? |
| 3.3 | Vorgeschlagene 15 Orte bestätigen/ergänzen → `confirmed: true`. Ohne Bestätigung ist online nur Abholung möglich. |
| 3.4 | Zahlungsarten (bar? Karte bei Lieferung?) → `payment.methods` |
| 3.5 | WhatsApp-Annahme: Gerät/Business-Konto, Reaktionszeit, Schnellantworten einrichten (`WHATSAPP-SCHNELLANTWORTEN.md`), Umgang mit Doppelanfragen (gleiche Referenz) und Änderungen (§ 150 Abs. 2 BGB) |
| 3.6 | Löschfristen für WhatsApp-Chats und Bestelldaten, Zugriffe (Datenschutz) |
| 3.7 | Bezugspunkt der Lieferzeit „20–90 Minuten ab Annahme der Bestellung“ (Text wie MINAR) bestätigen |

## 4. Speisekarte (B)

Details: [`PRUEFPUNKTE-SPEISEKARTE.md`](PRUEFPUNKTE-SPEISEKARTE.md). Schwerpunkte:

| # | Punkt |
|---|---|
| 4.1 | Preis Nr. 23 Chickenburgerle (im Foto verdeckt, 6,00 € angenommen) |
| 4.2 | Pfand je Getränk (Flyer nennt keins; 0,25 € angenommen, Ayran unbekannt) – **sperrt alle Getränke** im Normalbetrieb |
| 4.3 | „Extra Zusatz“ und „Beilage dazu“ für alle Burger 20–39? Allergene der Extras |
| 4.4 | Party-Pizza Nr. 136: Belagliste (Vorschlag hinterlegt) – sperrt |
| 4.5 | Menü Nr. 73: enthaltenes Getränk, Pfand, Steueraufteilung – sperrt |
| 4.6 | Allergenkennzeichnung: Lücken und Widersprüche (z. B. Garnelen ohne B, Calamari mit D statt N); Legende ohne I (Sellerie) und M (Lupinen) |
| 4.7 | Red Bull: Füllmenge, Koffeinhinweis nach LMIV |
| 4.8 | „Minar“ im SHAHI-Flyer: Nr. 98 „Dönerteller Minar überbacken“, Nr. 158 „Minar Gewürzmischung“ – Namen so lassen? (Website übernimmt den Flyer wörtlich) |
| 4.9 | Döner-Soßen: MINAR bietet eine Soßenauswahl an; der SHAHI-Flyer nennt keine – derzeit nur Hinweisfeld. Gewünscht? |
| 4.10 | Eigene Fotos der Gerichte und des Ladens (Bildrechte) – bis dahin Illustrationen |

## 5. Steuer (S)

| # | Punkt |
|---|---|
| 5.1 | Regelbesteuerung oder Kleinunternehmer (§ 19 UStG) → `tax.status = "bestaetigt"`, `tax.smallBusiness` |
| 5.2 | Speisen 7 %, Getränke 19 % (seit 01.01.2026); Ayran ggf. 7 % (Milchanteil) → dann `tax: "speisen"` beim Ayran |
| 5.3 | Lieferkosten anteilig nach Warenwert je Satz, Pfand wie Getränk – bestätigen |
| 5.4 | Enthaltene USt. in Übersicht und Nachricht ausweisen? (`tax.show`) – die Website ersetzt keinen Kassenbeleg |

## 6. Rechtliche Freigabe (R)

| # | Punkt |
|---|---|
| 6.1 | **Absendehandlung wie MINAR („Weiter zu WhatsApp“ + Hinweis):** Die bisherige SHAHI-Website nutzte die Schaltfläche „Zahlungspflichtig bestellen“. Auftragsgemäß gilt jetzt der MINAR-Ablauf. MINAR selbst bewertet die Button-Lösung (§ 312j Abs. 3/4 BGB, BGH 09.10.2025 – I ZR 159/24) als **offen** – für SHAHI ebenso klären. |
| 6.2 | §§ 312i, 312j BGB, Art. 246a/246c EGBGB: Informationspflichten, Zugangsbestätigung, Vertragstextspeicherung – Umsetzung auf `bestellinformationen.html` und im Warenkorb prüfen |
| 6.3 | Widerrufsrecht/Ausnahmen (§ 312g Abs. 2 BGB), ggf. Widerrufsfunktion (§ 356a BGB) – Platzhalter |
| 6.4 | PAngV: Endpreise, Pfand separat, Grundpreis je Liter (umgesetzt), Lieferkosten |
| 6.5 | Datenschutzerklärung: GitHub als Hoster (Drittland, Auftragsverarbeitung), WhatsApp, Speicherfristen, E-Mail-Anbieter |
| 6.6 | LMIV/LMIDV: Allergeninformation vor Vertragsschluss (Karte, Dialog, `allergene.html`) und bei Lieferung (Betrieb) |
| 6.7 | Barrierefreiheitsstärkungsgesetz (Kleinstunternehmen-Ausnahme?), Verpackungsrecht (Mehrwegangebot, Registrierung) |
| 6.8 | Cookie-Banner: nicht erforderlich (keine Cookies, kein Tracking, nur technisch notwendige Browser-Speicherung) – bestätigen |

## 7. Livegang (T)

1. Punkte 1–6 erledigt, Werte eingetragen, sperrende Prüfpunkte gelöscht.
2. Testbestellung im Testmodus an eine interne Nummer, danach `testMode: false`.
3. `operation.mode = "geoeffnet"`, nach Freigabe `operation.indexable = true`; `node tools/build.mjs`; `python3 tests/e2e.py`.
4. Workflow „Veröffentlichen“, Domain verknüpfen ([`HOSTING-UND-DOMAIN.md`](HOSTING-UND-DOMAIN.md)), HTTPS erzwingen.
5. Datenschutz um Domain/DNS ergänzen; Google-Profil verknüpfen.
