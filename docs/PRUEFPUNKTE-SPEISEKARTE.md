# Prüfpunkte der Speisekarte

Automatisch erzeugt aus `data/menu.json` (Stand der Daten: 2026-11-15). Nicht von Hand bearbeiten – nach Änderungen `node tools/build.mjs` ausführen.

**58 offene Prüfpunkte**, davon **18 sperrend**: Im Modus „geoeffnet“ sind die betroffenen Produkte bzw. Optionen online nicht bestellbar, bis der Prüfpunkt nach Bestätigung durch den Betreiber im Produkt gelöscht wird (Schalter `freigabe.sperrePruefpunkte` in `data/config.json`).

So wird ein Punkt erledigt: Angabe mit dem Betreiber klären → Wert in `data/menu.json` korrigieren → den Eintrag im Feld `pruefen` des Produkts (bzw. der Optionsgruppe) löschen → `node tools/build.mjs` → `node --test tests/unit.test.mjs`.

## Preise (1)

| Wo | Hinweis | sperrt |
|---|---|---|
| Nr. 23 Chickenburgerle | Preis im Foto teilweise durch Lichtreflex verdeckt („6,0…“). 6,00 € angenommen – bitte bestätigen. | **ja** |

## Pfand (13)

| Wo | Hinweis | sperrt |
|---|---|---|
| Ayran | Pfand hängt von der Verpackung ab (Kunststoffflasche: 0,25 € Pfand; Becher mit Siegelfolie: kein Pfand). Bitte Verpackung angeben. | **ja** |
| Mineralwasser | Pfand nicht im Flyer. 0,25 € Einwegpfand angenommen (Kunststoffflasche/Dose) – Verpackung bestätigen. | **ja** |
| Multivitamin | Pfand nicht im Flyer. 0,25 € Einwegpfand angenommen – Verpackung bestätigen. | **ja** |
| Coca-Cola | Pfand nicht im Flyer. 0,25 € Einwegpfand angenommen – Verpackung und Verfügbarkeit aller Größen bestätigen. | **ja** |
| Cola Light | Pfand nicht im Flyer. 0,25 € Einwegpfand angenommen – Verpackung und Verfügbarkeit aller Größen bestätigen. | **ja** |
| Cola Zero | Pfand nicht im Flyer. 0,25 € Einwegpfand angenommen – Verpackung und Verfügbarkeit aller Größen bestätigen. | **ja** |
| Fanta | Pfand nicht im Flyer. 0,25 € Einwegpfand angenommen – Verpackung und Verfügbarkeit aller Größen bestätigen. | **ja** |
| Mezzo Mix | Pfand nicht im Flyer. 0,25 € Einwegpfand angenommen – Verpackung und Verfügbarkeit aller Größen bestätigen. | **ja** |
| Uludağ | Pfand nicht im Flyer. 0,25 € Einwegpfand angenommen – Verpackung und Verfügbarkeit aller Größen bestätigen. | **ja** |
| Sprite | Pfand nicht im Flyer. 0,25 € Einwegpfand angenommen – Verpackung und Verfügbarkeit aller Größen bestätigen. | **ja** |
| Eistee | Pfand nicht im Flyer. 0,25 € Einwegpfand angenommen – Verpackung und Sorte bestätigen. | **ja** |
| Apfelsaft | Pfand nicht im Flyer. 0,25 € Einwegpfand angenommen – Verpackung bestätigen. | **ja** |
| Red Bull | Pfand nicht im Flyer. 0,25 € Einwegpfand angenommen (Dose) – bestätigen. | **ja** |

## Varianten und Zusammensetzung (2)

| Wo | Hinweis | sperrt |
|---|---|---|
| Nr. 73 Menü für 1 Person | Welches Getränk (Sorte, Größe) ist im Menü enthalten bzw. wählbar? Fällt dafür Pfand an? | **ja** |
| Red Bull | Füllmenge fehlt im Flyer (für den Grundpreis je Liter nötig). | nein |

## Optionen und Extras (3)

| Wo | Hinweis | sperrt |
|---|---|---|
| Optionsgruppe burger-beilage | Der Block „Extra Zusatz“ steht im Flyer direkt unter den Burgern. Bitte bestätigen, dass Pommes/Wedges (+3,50 €) für alle Burger 20–39 gelten. | **ja** |
| Optionsgruppe burger-extras | Gültigkeit der Extras für alle Burger 20–39 bestätigen. Im Flyer stehen für die Extras keine Allergen-/Zusatzstoffkennzeichnungen (z. B. Spiegelei, Käse, Käsespätzle) – bitte ergänzen. | **ja** |
| Optionsgruppe partypizza-belaege | Der Flyer nennt „vier Beläge nach Wahl“, aber keine Belagliste. Vorschlag: Beläge aus der Pizzakarte ohne Fisch/Meeresfrüchte (Nr. 136 ist nicht mit D gekennzeichnet). Liste und Kennzeichnung (z. B. Oliven „9“) bitte bestätigen. | **ja** |

## Umsatzsteuer (2)

| Wo | Hinweis | sperrt |
|---|---|---|
| Nr. 73 Menü für 1 Person | Kombiangebot aus Speisen (7 %) und Getränk (19 %): Aufteilungsmethode und Getränkeanteil mit der Steuerberatung festlegen. | nein |
| Ayran | Ayran als Milcherzeugnis: bei Abholung/Lieferung ggf. 7 % statt 19 % – mit Steuerberatung klären. | nein |

## Allergen- und Zusatzstoffkennzeichnung (30)

| Wo | Hinweis | sperrt |
|---|---|---|
| Nr. 06 Casa Nova | Enthält laut Beschreibung Mozzarella, ist aber nicht mit G (Milch) gekennzeichnet. | nein |
| Nr. 09 Schwäbischer Teller | Enthält laut Beschreibung Ei und Käse, ist aber nicht mit C (Ei) und G (Milch) gekennzeichnet. | nein |
| Nr. 10 Chicken Salat | Im Flyer ohne Kennzeichnung. | nein |
| Nr. 12 Lahori Salat | Chicken Wings (Nr. 64) sind mit A, C, G gekennzeichnet, der Lahori Salat nur mit A, 7. | nein |
| Nr. 38 Chicken und Garnelen Burger | Garnelen sind Krebstiere – keine Kennzeichnung B im Flyer. | nein |
| Nr. 39 Cheese-Garnelen Burger | Im Flyer ohne Kennzeichnung (enthält u. a. Garnelen/Krebstiere, Käse, Brötchen). | nein |
| Nr. 56 Chili Cheese Nuggets | Enthält laut Name Käse, ist aber nicht mit G (Milch) gekennzeichnet. | nein |
| Nr. 63 Calamari Fritti | Calamari sind Weichtiere – gekennzeichnet ist D (Fisch), nicht N (Weichtiere). | nein |
| Nr. 66 Filo Pastry Shrimps | Im Flyer ohne Kennzeichnung (Shrimps = Krebstiere, Teig = Gluten). | nein |
| Nr. 73 Menü für 1 Person | Im Flyer ohne Gesamtkennzeichnung. Enthaltene Einzelprodukte: Nr. 20/21/23, 50, 51, 52, 54, 64, Pommes, Getränk. | nein |
| Nr. 99 Istanbul überbacken | Im Flyer ohne Kennzeichnung (enthält u. a. Penne, Sahnesoße, Drehspieß). | nein |
| Nr. 99a Schwäbische überbacken | Im Flyer ohne Kennzeichnung (enthält u. a. Sahnesoße und Edamer). | nein |
| Nr. 116 Hackfleisch | Im Flyer ohne Kennzeichnung (alle Pizzas mit Teig und Käse). | nein |
| Nr. 120 Gamberetti | Krabben sind Krebstiere – gekennzeichnet ist D (Fisch), nicht B (Krebstiere). | nein |
| Nr. 121 Frutti di Mare | Meeresfrüchte enthalten meist Krebs- und/oder Weichtiere – gekennzeichnet ist nur D (Fisch). | nein |
| Nr. 124 Vera | Enthält laut Beschreibung Ei, ist aber nicht mit C (Ei) gekennzeichnet. | nein |
| Nr. 129a Calzone vegi | Im Flyer ohne Kennzeichnung (Teig, Käse, Oliven). | nein |
| Nr. 131 Sardellen | Im Flyer ohne Kennzeichnung (Sardellen = Fisch, Teig, Käse, Oliven). | nein |
| Nr. 132 Artischocke | Im Flyer ohne Kennzeichnung (alle Pizzas mit Teig und Käse). | nein |
| Nr. 133 Paprika | Im Flyer ohne Kennzeichnung (alle Pizzas mit Teig und Käse). | nein |
| Nr. 134 Caprese | Im Flyer ohne Kennzeichnung (Teig, Käse, Mozzarella). | nein |
| Nr. 134a Oliven | Im Flyer ohne Kennzeichnung (Teig, Käse; Oliven sonst mit „9“ gekennzeichnet). | nein |
| Nr. 143 Brokkoli | Sahnesoße, aber keine Kennzeichnung G (Milch). | nein |
| Nr. 145 Vegetarisch | Tomatensahnesoße, aber keine Kennzeichnung G (Milch). | nein |
| Nr. 152 Gamberoni | Krabben sind Krebstiere – gekennzeichnet ist D (Fisch), nicht B (Krebstiere). | nein |
| Nr. 153 Frutti di Mare | Meeresfrüchte enthalten meist Krebs- und/oder Weichtiere – gekennzeichnet ist nur D (Fisch). | nein |
| Nr. 182 Hawaii | Mit Käse überbacken, aber keine Kennzeichnung G (Milch). | nein |
| Nr. 183 Diabolo | Mit Edamer und Cheddar, aber keine Kennzeichnung G (Milch). | nein |
| Nr. 190 Brownie | Brownie ohne Kennzeichnung A (Gluten) – bitte prüfen. | nein |
| Red Bull | Ohne Kennzeichnung O (Koffein). Bei Energydrinks ist der Hinweis „Erhöhter Koffeingehalt …“ (LMIV) vorgeschrieben – bitte ergänzen. | nein |

## Namen, Beschreibungen, Kennzeichen (7)

| Wo | Hinweis | sperrt |
|---|---|---|
| Nr. 24 Hamburger XXL | Im Flyer steht ein Sternchen (*) hinter dem Namen, ohne Erläuterung. | nein |
| Nr. 25 Cheeseburger XXL | Im Flyer steht ein Sternchen (*) hinter dem Namen, ohne Erläuterung. | nein |
| Nr. 70 Fingerfood Platte | Beschreibung im Foto teilweise durch Lichtreflex verdeckt („Putenschnitz…“, „Chicken Wi…“, „Kro…“) und sinngemäß ergänzt. | nein |
| Nr. 71 Burger Platte | Name und Beschreibung im Foto teilweise durch Lichtreflex verdeckt („Burger …e“, „Hamburge… …er Chicken Burger“) und sinngemäß ergänzt. | nein |
| Nr. 98 Dönerteller Minar überbacken | Der SHAHI-Flyer nennt das Gericht „Dönerteller Minar überbacken“ – Name so beibehalten oder anpassen? Welcher Dip ist enthalten? | nein |
| Nr. 155 Naan | Die Kategorie trägt den Hinweis „Alle Gerichte mit Reis“ – gilt das auch für Naan (vermutlich nicht)? | nein |
| Nr. 158 Shahi Chicken Cheese Masala | Der SHAHI-Flyer nennt hier eine „Minar Gewürzmischung“ – so beibehalten oder anpassen? | nein |

## Schreibweisen gegenüber dem Flyer korrigiert (21)

Auf der Website steht die korrigierte Schreibweise; die Originalschreibweise ist im Feld `nameLautFlyer` dokumentiert.

| Nr. | Flyer | Website |
|---|---|---|
| 07 | Griechischer | Griechischer Salat |
| 09 | Schwäbische Teller | Schwäbischer Teller |
| 14 | Salamone | Salmone |
| 37 | Vegetarische Burger | Vegetarischer Burger |
| 39 | Chesse - Garnelen Burger | Cheese-Garnelen Burger |
| 46 | Rosti | Rösti |
| 61 | Fisch Paniert | Fisch paniert |
| 65 | Kartoffel Tasche | Kartoffeltasche |
| 80 | Coctail Dip | Cocktail Dip |
| 81 | Hot Coctail Dip | Hot Cocktail Dip |
| 84 | BBQ Soße | BBQ-Soße |
| 85 | Sweet Chili Soße | Sweet-Chili-Soße |
| 88 | Ketchup/Majo/Remoulade | Ketchup / Mayo / Remoulade |
| 98a | B.B.Q Teller überbacken | BBQ Teller überbacken |
| 120 | Gambaretti | Gamberetti |
| 135 | Party Pizza Margherita | Party-Pizza Margherita |
| 136 | Party Pizza | Party-Pizza |
| 141 | Arrabiata | Arrabbiata |
| 147 | Quattro Formaggie | Quattro Formaggi |
| 182 | Hawai | Hawaii |
| – | Uludag | Uludağ |

## Liefergebiet: unbestätigte Orte (15)

Vorschlag, nicht verifiziert. Nur Orte mit `"bestaetigt": true` sind im Checkout wählbar und werden öffentlich genannt.

| Ort | PLZ | vorgeschlagene Zone |
|---|---|---|
| Biberach an der Riß | 88400 | Biberach |
| Biberach-Rißegg | 88400 | Biberach |
| Biberach-Mettenberg | 88400 | Biberach |
| Biberach-Ringschnait | 88400 | Biberach |
| Biberach-Stafflangen | 88400 | Biberach |
| Warthausen | 88447 | bis 7 km |
| Mittelbiberach | 88441 | bis 7 km |
| Ummendorf | 88444 | bis 7 km |
| Hochdorf | 88454 | 7 bis 12 km |
| Maselheim | 88437 | 7 bis 12 km |
| Schemmerhofen | 88433 | 7 bis 12 km |
| Attenweiler | 88448 | 7 bis 12 km |
| Steinhausen an der Rottum | 88416 | 7 bis 12 km |
| Ingoldingen | 88456 | 7 bis 12 km |
| Eberhardzell | 88436 | 7 bis 12 km |

## Livegang-Sperre (zentral)

Solange einer dieser Punkte fehlt, bleibt die Online-Bestellung auch im Modus „geoeffnet“ gesperrt:

- Name des Betreibers (Impressum) fehlt
- Rechtsform (Impressum) fehlt
- E-Mail-Adresse (Impressum) fehlt
- Zahlungsarten fehlen
- Umsatzsteuer-Status (Regelbesteuerung oder § 19 UStG) nicht bestätigt
