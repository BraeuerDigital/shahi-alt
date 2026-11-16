# Freigabeliste vor dem Livegang

Stand: 15.11.2026. Legende: **B** = vom Betreiber zu bestätigen/liefern · **R** = rechtlich zu prüfen · **T** = technischer Schritt der Agentur.
Einzelpunkte je Gericht (Preise, Pfand, Allergene, Schreibweisen) stehen automatisch aktuell in [`PRUEFPUNKTE-SPEISEKARTE.md`](PRUEFPUNKTE-SPEISEKARTE.md).

Die Website erzwingt Teile dieser Liste selbst: Im Modus `geoeffnet` bleibt die Online-Bestellung gesperrt, solange Betreibername, Rechtsform, E-Mail, Zahlungsarten oder der Umsatzsteuer-Status fehlen. Produkte mit sperrenden Prüfpunkten sind nicht bestellbar, unbestätigte Lieferorte nicht wählbar.

## 1. Betreiber und Impressum (B, R)

| # | Punkt | Feld in `data/config.json` |
|---|---|---|
| 1.1 | Vollständiger Name des Inhabers bzw. Firma laut Gewerbeanmeldung/Register | `betreiber.name` |
| 1.2 | Rechtsform (Einzelunternehmen, GbR, GmbH …), bei Gesellschaften Vertretungsberechtigte | `betreiber.rechtsform`, `betreiber.vertretung` |
| 1.3 | E-Mail-Adresse (Pflicht im Impressum) | `betreiber.email` |
| 1.4 | Handelsregister (falls eingetragen), USt-IdNr. (falls vorhanden), Wirtschafts-IdNr. (falls zugeteilt) | `betreiber.handelsregister`, `.ustId`, `.wirtschaftsId` |
| 1.5 | Aufsichtsbehörde – nur falls für die Tätigkeit eine Zulassung nötig ist (R) | `betreiber.aufsichtsbehoerde` |
| 1.6 | Angabe zur Verbraucherstreitbeilegung nach § 36 VSBG, soweit erforderlich (R). Kein Link zur abgeschalteten EU-OS-Plattform. | `betreiber.verbraucherstreitbeilegung` |
| 1.7 | Inhaltlich Verantwortlicher (§ 18 Abs. 2 MStV) – nur bei redaktionellen Inhalten (R) | `betreiber.inhaltlichVerantwortlich` |

**Ohne vollständiges Impressum die Seite nicht öffentlich bewerben.** Die GitHub-Pages-Adresse ist bis dahin nur zur internen Abstimmung gedacht (alle Seiten `noindex`).

## 2. Kontakt und Öffnungszeiten (B)

| # | Punkt |
|---|---|
| 2.1 | Öffnungszeiten laut Flyer bestätigen (Mo, Mi, Do 16:30–22:30; Di Ruhetag; Fr–So 11:00–22:30), dann `oeffnungszeiten._bestaetigt.zeiten = true` (erst dann erscheinen sie in den strukturierten Daten für Google) |
| 2.2 | Bestellannahmeschluss 22:15 Uhr bestätigen |
| 2.3 | Vorlaufzeiten (vorgeschlagen: Abholung 20 Min., Lieferung 30 Min.) und späteste Wunschzeit (22:30) bestätigen |
| 2.4 | Feiertage, Heiligabend/Silvester, Betriebsferien – sobald bekannt in `ausnahmen`/`betriebsferien` eintragen |
| 2.5 | Welche der drei Festnetznummern wofür? (`restaurant.telefon[].zweck`, `sichtbar`); WhatsApp 0179 69 500 47 als Bestellnummer bestätigen |
| 2.6 | Eröffnungsdatum, sobald fest (`betrieb.eroeffnungsdatum`) – es wurde keines erfunden |
| 2.7 | Google-Maps-Link prüfen (führt derzeit zur Adresssuche, da noch kein Unternehmensprofil existiert) |

## 3. Liefergebiet und Bestellung (B)

| # | Punkt |
|---|---|
| 3.1 | Was zählt als Zone „Biberach“ – nur Kernstadt oder alle Stadtteile (Rißegg, Mettenberg, Ringschnait, Stafflangen)? |
| 3.2 | „bis 7 km“ / „7–12 km“: Luftlinie oder Fahrstrecke? Gemessen ab Bachgasse 17? |
| 3.3 | Vorgeschlagene Ortsliste (15 Orte, siehe Prüfpunkte) bestätigen, ergänzen, korrigieren → je Ort `"bestaetigt": true`. Eine automatische Entfernungsberechnung wurde bewusst nicht eingebaut. |
| 3.4 | Zahlungsarten (bar? Karte bei Lieferung?) → `zahlung.arten`, `zahlung.hinweis` |
| 3.5 | Wer nimmt WhatsApp-Bestellungen an (WhatsApp oder WhatsApp Business, welches Gerät), wie schnell wird bestätigt, wie wird mit Doppelanfragen umgegangen (gleiche Referenz = gleiche Bestellung)? |
| 3.6 | Löschfristen für WhatsApp-Chats und Bestelldaten; wer hat Zugriff? (für die Datenschutzerklärung) |

## 4. Speisekarte (B)

Details: [`PRUEFPUNKTE-SPEISEKARTE.md`](PRUEFPUNKTE-SPEISEKARTE.md). Schwerpunkte:

| # | Punkt |
|---|---|
| 4.1 | Preis Nr. 23 Chickenburgerle (im Foto verdeckt, 6,00 € angenommen) |
| 4.2 | Pfand je Getränk und Verpackung (Flyer nennt kein Pfand; Ayran Becher oder Flasche?) |
| 4.3 | „Extra Zusatz“ (Pommes/Wedges +3,50 €, Jalapeños/Röstzwiebeln +0,50 €, Spiegelei/Käse +1,00 €, Fleisch-Patty +5,00 €, Käsespätzle +7,00 €): gilt für alle Burger 20–39? Allergene der Extras? |
| 4.4 | Party-Pizza Nr. 136 „vier Beläge nach Wahl“: welche Beläge? (Vorschlag aus der Pizzakarte hinterlegt) |
| 4.5 | Menü Nr. 73: welches Getränk ist enthalten, Pfand, Steueraufteilung |
| 4.6 | Allergenkennzeichnung: 15 Gerichte ohne Kennzeichnung, mehrere Widersprüche (z. B. Garnelen/Krabben ohne B, Calamari mit D statt N, Käse/Ei/Sahne ohne G/C). Legende enthält kein I (Sellerie) und kein M (Lupinen) – bestätigen, dass keines der Gerichte sie enthält. |
| 4.7 | Red Bull: Füllmenge, Koffein-Kennzeichnung und Pflichthinweis „Erhöhter Koffeingehalt …“ |
| 4.8 | Sternchen bei Nr. 24/25 ohne Erklärung |
| 4.9 | „Minar“ im SHAHI-Flyer: Nr. 98 „Dönerteller Minar überbacken“, Nr. 158 „Minar Gewürzmischung“ – so lassen? |
| 4.10 | „Alle Gerichte mit Reis“ – gilt das auch für Naan (155/156) und für die vegetarischen Gerichte 170–173? |
| 4.11 | Döner-Soßen: Soll eine Soßenauswahl angeboten werden? (derzeit freies Hinweisfeld, keine erfundenen Optionen) |

## 5. Steuer (B mit Steuerberatung)

| # | Punkt |
|---|---|
| 5.1 | Regelbesteuerung oder Kleinunternehmer (§ 19 UStG)? → `steuer.kleinunternehmer`, `steuer.status = "bestaetigt"`. Davon hängt der Preishinweis („inkl. USt.“ bzw. „gemäß § 19 UStG keine USt.“) ab. |
| 5.2 | Speisen 7 %, Getränke 19 % (Stand seit 01.01.2026). Ayran als Milcherzeugnis bei Abholung/Lieferung ggf. 7 %. |
| 5.3 | Lieferkosten als Nebenleistung anteilig nach Warenwert je Steuersatz; Pfand wie das Getränk – bestätigen. |
| 5.4 | Soll die enthaltene Steuer in Übersicht und Nachricht ausgewiesen werden? (`steuer.ausweisen`) Die Website ersetzt keinen Kassenbeleg. |
| 5.5 | Notiz auf dem Foto neben dem Flyer („MwSt. au… → 7 %“) – vermutlich „außer Haus 7 %“; mit 5.2 abgleichen. |

## 6. Rechtliche Freigabe (R)

Begründung und Optionen: [`RECHTLICHES.md`](RECHTLICHES.md).

| # | Punkt |
|---|---|
| 6.1 | **Bestellmodell und Schaltfläche (§ 312j Abs. 3 BGB):** Voreinstellung ist der vorsichtige Weg „Zahlungspflichtig bestellen“ mit Annahme durch Bestätigung des Restaurants. Alternative `rechtsmodell: "anfrage"` nur nach anwaltlicher Prüfung (bloße Umbenennung genügt nicht). |
| 6.2 | Informationspflichten §§ 312i, 312j Abs. 1/2 BGB, Art. 246a/246c EGBGB – Platzierung und Vollständigkeit prüfen |
| 6.3 | Widerrufsrecht: Ausnahmen nach § 312g Abs. 2 BGB (schnell verderbliche Speisen) und Getränke in Flaschen/Dosen; falls ein Widerrufsrecht besteht: Widerrufsbelehrung und Widerrufsfunktion nach § 356a BGB (seit 19.06.2026) |
| 6.4 | Preisangaben (PAngV): Pfand separat, Grundpreis je Liter bei Getränken (umgesetzt), Lieferkosten |
| 6.5 | Datenschutzerklärung: GitHub als Hoster (Drittlandübermittlung, Auftragsverarbeitung), WhatsApp/Meta, Speicherfristen |
| 6.6 | LMIV/LMIDV: Allergeninformation im Fernabsatz vor Vertragsschluss (umgesetzt) und bei Lieferung (Betrieb) |
| 6.7 | AGB: nicht zwingend, nicht erstellt. Falls gewünscht, passend zum WhatsApp-Ablauf anwaltlich erstellen lassen. |
| 6.8 | Barrierefreiheitsstärkungsgesetz: Ausnahme für Kleinstunternehmen (< 10 Beschäftigte, ≤ 2 Mio. € Umsatz) prüfen; die Website ist unabhängig davon an WCAG 2.2 AA ausgerichtet |
| 6.9 | Verpackungsrecht: Registrierung/Systembeteiligung für Serviceverpackungen, Mehrwegangebotspflicht bzw. Ausnahme für kleine Betriebe (VerpackG; seit 12.08.2026 teilweise VerpackDG – prüfen) |

## 7. Medien und Marke (B)

| # | Punkt |
|---|---|
| 7.1 | Neues Logo/Markenzeichen freigeben (eigene Gestaltung; das Flyer-Logo mit der Ziege wurde bewusst nicht übernommen) |
| 7.2 | Eigene Fotos der Gerichte und des Ladens liefern (Bildrechte bestätigen). Bis dahin: eigene Illustrationen, keine Stockfotos. Produkte haben ein Feld `bild` für spätere Fotos. |

## 8. Technische Schritte zum Livegang (T)

1. Alle B/R-Punkte erledigt, Werte in `data/config.json` und `data/menu.json` eingetragen, sperrende Prüfpunkte gelöscht.
2. `betrieb.modus` auf `"geoeffnet"`, `website.indexierbar` auf `true`.
3. `node tools/build.mjs`, `node --test tests/unit.test.mjs`, Browser-Tests.
4. Testbestellung im Testmodus an eine interne Nummer (siehe `BETRIEB-UND-PFLEGE.md`), danach Testmodus aus.
5. Domain verknüpfen ([`GITHUB-PAGES-UND-DOMAIN.md`](GITHUB-PAGES-UND-DOMAIN.md)), HTTPS erzwingen, Datenschutzerklärung um Registrar/DNS ergänzen.
6. Google-Unternehmensprofil einrichten und verifizieren.
