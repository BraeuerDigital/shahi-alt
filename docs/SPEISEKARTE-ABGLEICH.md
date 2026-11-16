# Abgleich Speisekarte ↔ SHAHI-Flyer

Stand 16.11.2026 · Quelle: zwei Fotos des gedruckten SHAHI-Küche-Flyers (IMG_2049, IMG_2050, vom Auftraggeber am 16.11.2026 übermittelt; nicht im Repository) · Prüfgegenstand: `public/assets/js/menu-data.js`

Jede Position wurde in voller Bildauflösung mit den Daten verglichen: Artikelnummer, Name, Beschreibung, Preis(e), Größen, Allergen- und Zusatzstoffkennzeichnung, Kategorie-Hinweise, Extras.

## Ergebnis: vollständig – 166 von 166 Positionen

| Kategorie (Flyer) | Nummern laut Flyer | Positionen | Abgleich |
|---|---|---|---|
| Salate | 01–12, 14 | 13 | ✓ inkl. „Wahl: mit Essig und Öl oder Joghurtsoße (C, G)“ |
| Burger | 20–30, 34–39 | 17 | ✓ inkl. „Alle mit grüner Salat, Tomaten, Gurken und Zwiebeln“ |
| Extra Zusatz (zu Burgern) | – | 6 Optionen | ✓ Pommes/Wedges +3,50 · Jalapeños/Röstzwiebeln +0,50 · Spiegelei/Käse +1,00 · Fleisch-Pattie +5,00 · Käsespätzle +7,00 |
| Potatoes | 40–46 | 7 | ✓ klein/groß |
| Fingerfood | 50–54, 56, 57, 59–66 | 15 | ✓ |
| Party Platten | 70–73 | 4 | ✓ 2 Pers./4 Pers. |
| Dips | 80–85, 87, 88 | 8 | ✓ |
| Döner | 90–96, 96a | 8 | ✓ |
| Überbacken | 97, 98, 98a, 98b, 99, 99a | 6 | ✓ |
| Pizza (30 cm) | 100–126, 128, 129, 129a, 131–134, 134a | 35 | ✓ „Alle Pizzas mit Tomatensoße und Käse“ |
| Party Pizza (40 × 60 cm) | 135, 136 | 2 | ✓ „mit vier Belägen nach Wahl“ |
| Nudeln | 139–149, 151–153 | 14 | ✓ „Spaghetti oder Penne“, „auch überbacken (+2,50 €) G“ |
| Indische und pakistanische Gerichte | 155–158, 160–164, 166, 167 | 11 | ✓ „Alle Gerichte mit Reis“ |
| Vegetarische Gerichte | 170–173 | 4 | ✓ |
| Schnitzel und Steak | 180–184 | 5 | ✓ „Alle Schnitzel vom Putenfleisch mit Pommes“ |
| Dessert | 190–193 | 4 | ✓ |
| Getränke | – | 13 | ✓ Ayran 0,25 l 1,50 · Mineralwasser 0,5 l 2,00 · Multivitamin 0,5 l 2,50 · Coca-Cola, Cola Light, Cola Zero, Fanta, Mezzo Mix, Uludağ, Sprite 0,33/0,5/1,0 l 2,25/2,50/3,50 · Eistee, Apfelsaft 1,0 l 4,50 · Red Bull 3,00 |

Weitere Flyerangaben, ebenfalls übernommen: Öffnungszeiten (Di Ruhetag · Mo, Mi, Do 16:30–22:30 · Fr, Sa, So 11:00–22:30), Bestellannahme bis 22:15 Uhr, Mindestbestellwert und Lieferkosten (Biberach ab 15 € / 1,00 € · bis 7 km ab 25 € / 2,00 € · 7–12 km ab 45 € / 3,00 €), Hinweis bei nicht erreichtem Mindestbestellwert, Lieferzeit 20–90 Minuten, „Lieferung ohne Teller, Besteck & Dekoration“, Legende der Allergene (A–H, J, K, L, N, O) und Zusatzstoffe (1–9), Hinweise zu Käse und Hackfleisch/Schinken, Adresse, WhatsApp 0179 69 500 47, Telefon 07351 347 04 00/03/04, Website www.shahi-biberach.de, „Abholung und Lieferservice“, Logo (Tier vor der Sonne, Halbmond mit Stern, Schriftzug „SHAHI Küche“).

Nicht auf die Website übernommen: „Für Druckfehler keine Haftung!“ (Druckhinweis) und „Alle Fotos sind Beispiele.“ (die Website zeigt keine Fotos, sondern gekennzeichnete Illustrationen).

## Schreibweisen

Offensichtliche Druckfehler sind auf der Website korrigiert; die Flyer-Schreibweise steht jeweils im Feld `flyerName`:
Griechischer (Salat) · Schwäbische Teller → Schwäbischer Teller · Salamone → Salmone · Vegetarische Burger → Vegetarischer Burger · Chesse → Cheese-Garnelen Burger · Rosti → Rösti · Fisch Paniert · Kartoffel Tasche → Kartoffeltasche · Coctail Dip → Cocktail Dip · BBQ Soße · Sweet Chili Soße · Ketchup/Majo/Remoulade → Mayo · B.B.Q Teller → BBQ Teller · Gambaretti → Gamberetti · Party Pizza → Party-Pizza · Arrabiata → Arrabbiata · Quattro Formaggie → Quattro Formaggi · Hawai → Hawaii · Uludag → Uludağ.

Unverändert wie im Flyer (Freigabepunkt 4.8): Nr. 98 „Dönerteller Minar überbacken“ und Nr. 158 „… Minar Gewürzmischung …“.

## Offene inhaltliche Punkte (nicht im Flyer geklärt)

Weiterhin in [`PRUEFPUNKTE-SPEISEKARTE.md`](PRUEFPUNKTE-SPEISEKARTE.md): Preis Nr. 23 (im ersten Foto teilweise verdeckt, im neuen Foto ebenfalls angeschnitten: 6,0… – 6,00 € angenommen), Nr. 24/25 Sternchen ohne Erklärung, fehlende oder widersprüchliche Kennzeichnungen (u. a. 99, 99a, 116, 129a, 131–134a, Filo Pastry Shrimps, Garnelen/Krabben ohne B, Calamari D statt N), Pfand je Getränk (im Flyer nicht genannt), Füllmenge Red Bull, Getränk im Menü Nr. 73, Belagliste Party-Pizza.
