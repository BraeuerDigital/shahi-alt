# Betrieb und Pflege

Alle Inhalte stehen in **einer** Datei: `public/assets/js/menu-data.js`. Nach jeder Änderung:

```bash
node tools/build.mjs        # prüft die Daten (bricht bei Fehlern ab) und erzeugt die Seiten neu
python3 tests/e2e.py        # optional: Browser-Tests
```

Dann committen und – nach Freigabe – den Workflow „Veröffentlichen“ starten.

## Eröffnung schalten

```js
operation: { mode: "vor-eroeffnung", openingDate: null, … }
```

1. `openingDate: "2026-12-01"` setzen, sobald der Termin feststeht (Anzeige „Eröffnung am 01.12.2026“).
2. Zur Eröffnung `mode: "geoeffnet"`. **Die Online-Bestellung bleibt trotzdem gesperrt**, bis eingetragen sind: `restaurant.owner`, `restaurant.legalForm`, `restaurant.email`, `payment.methods` und `tax.status: "bestaetigt"` mit `tax.smallBusiness: true/false`. Die fehlenden Punkte stehen in der Browser-Konsole.
3. Gerichte/Optionen mit sperrenden Prüfpunkten (`checks` mit `blocks: true`) bleiben im Normalbetrieb „nur telefonisch“, bis der Punkt bestätigt und der Eintrag gelöscht ist. Liste: `docs/PRUEFPUNKTE-SPEISEKARTE.md`.

## Testbestellung vor dem Livegang

```js
restaurant: { testMode: true, testWhatsappNumber: "4917612345678", … }
```

Im Testmodus gehen Bestellungen an die Testnummer, sind unabhängig von Öffnungszeiten und Eröffnungsmodus möglich und als „TESTBESTELLUNG“ markiert; ein Hinweis steht im Warenkorb. Danach unbedingt `testMode: false`.

## Öffnungszeiten

```js
hours: {
  week: { "1": [["16:30", "22:30"]], "2": [], … },      // 0 = Sonntag … 6 = Samstag, [] = Ruhetag, mehrere Fenster möglich
  orderUntil: { pickup: "22:15", delivery: "22:15" },  // Bestellannahmeschluss
  lead: { pickup: 20, delivery: 30 },                   // Mindestvorbereitungszeit (Minuten)
  latestWish: { pickup: "22:30", delivery: "22:30" },   // späteste Wunschzeit
  slot: 15,                                             // Raster der Wunschzeit
  exceptions: [], holidays: [], closures: [],
  pause: { active: false, note: "" }
}
```

| Fall | Eintrag |
|---|---|
| Feiertag geschlossen | `exceptions: [{ date: "2026-12-25", closed: true, note: "1. Weihnachtsfeiertag" }]` |
| Sonderöffnungszeit | `{ date: "2026-12-31", times: [["11:00", "18:00"]], orderUntil: "17:30", note: "Silvester" }` |
| Betriebsferien | `holidays: [{ from: "2027-01-07", to: "2027-01-20", note: "Betriebsferien" }]` |
| kurzfristig zu | `closures: [{ from: "2026-12-01T18:00", to: "2026-12-01T20:00", note: "Technische Störung" }]` |
| zu viel los | `pause: { active: true, note: "Gerade sehr viel los – bitte telefonisch bestellen." }` |

Alle Zeiten gelten in `Europe/Berlin` (Sommer-/Winterzeit automatisch). Abweichende Tage der nächsten drei Wochen erscheinen unter der Öffnungszeiten-Tabelle. Nach dem Bestätigen der Zeiten `confirmed.times` usw. auf `true` setzen.

## Liefergebiete

```js
zones: [{ id: "biberach", name: "Biberach", minOrder: 15, fee: 1, places: [{ name: "Biberach-Rißegg", zip: "88400", confirmed: false }, …] }, …]
```

Mindestbestellwert und Lieferkosten laut Flyer (Biberach 15 €/1 €, bis 7 km 25 €/2 €, 7–12 km 45 €/3 €). **Online wählbar sind nur Orte mit `confirmed: true`.** Die vorgeschlagene Ortsliste (15 Orte) ist vom Betreiber zu prüfen; eine automatische Entfernungsberechnung gibt es bewusst nicht. Ist kein Ort bestätigt, ist online nur Abholung möglich (Hinweis im Warenkorb).

## Preise und Gerichte

Siehe Aufbau im Kopf von `menu-data.js`. Preise in Euro (`9.4`), gerechnet wird intern in Cent. `id` nie ändern (Warenkorb-Bezug). Neue Kategorie → `categories` ergänzen, `node tools/build.mjs`.

## Zahlung und Steuer

```js
payment: { methods: ["bar"], note: null }                  // z. B. ["bar", "Karte bei Lieferung"], note = eigener Satz
tax: { status: "bestaetigt", smallBusiness: false, show: false, … }
```

- `methods: ["bar"]` → Texte wie bei MINAR („Zahlung ausschließlich bar …“, „Insgesamt bar zu zahlen“).
- Regelbesteuerung → „inkl. gesetzlicher Umsatzsteuer“; Kleinunternehmer → Hinweis nach § 19 UStG.
- `show: true` → enthaltene USt. (7 %/19 %, Pfand wie Getränk, Lieferkosten anteilig) in Bon und Nachricht. Das Menü Nr. 73 braucht dafür `tax: { split: true, drinkShare: <Getränkeanteil in €> }`.

## Google-Bewertung

`restaurant.googleReviewUrl` mit dem Link aus dem Google-Unternehmensprofil („Um Rezensionen bitten“) füllen, `node tools/build.mjs`. Leer = Bewertungsbereich ausgeblendet.

## Logo

Logo des SHAHI-Flyers (wie MINAR, Schriftzug „SHAHI“). Neu erzeugen nur bei Änderungen an den Formen:
`python3 tools/logo/schriftzug.py && python3 tools/logo/compose.py && python3 tools/logo/logo_anim.py && node tools/build.mjs`.
Die SVG-Dateien nicht von Hand ändern.
