# Betrieb und Pflege

Alle Inhalte, die sich ändern, liegen in zwei Dateien: `data/menu.json` (Speisekarte) und `data/config.json` (Betrieb). Layout und Programmcode müssen dafür nicht angefasst werden.

**Ablauf bei jeder Änderung**

1. Datei bearbeiten (auf GitHub direkt im Browser über den Stift oder lokal im Editor).
2. `node tools/build.mjs` – prüft die Daten (bei Fehlern bricht der Build mit einer verständlichen Meldung ab) und erzeugt alle Seiten neu.
3. `node --test tests/unit.test.mjs` – Rechenregeln und Daten prüfen.
4. Committen und pushen. GitHub Pages veröffentlicht innerhalb weniger Minuten.

Die Seiten laden `menu.json` und `config.json` im Browser frisch nach. Eine direkt auf GitHub gespeicherte Preisänderung wirkt deshalb auch ohne Build sofort in Speisekarte, Warenkorb und Bestellung. Der Build sollte trotzdem folgen, damit die vorab erzeugten Seiten (für Suchmaschinen und Besucher ohne JavaScript) übereinstimmen – die GitHub-Prüfung (`.github/workflows/pruefung.yml`) meldet, wenn er fehlt.

JSON ist streng: Anführungszeichen `"…"`, Komma zwischen Einträgen, kein Komma nach dem letzten Eintrag. Beträge stehen immer in **Cent** (`1090` = 10,90 €).

## Speisekarte (`data/menu.json`)

### Preis ändern

```json
{ "id": "pizza-salami", "nr": "106", "kategorie": "pizza", "name": "Salami", "preisCent": 940, ... }
```

`preisCent` anpassen. Bei Größen den Preis in `varianten` ändern:

```json
"varianten": [ { "id": "klein", "name": "klein", "preisCent": 490 }, { "id": "gross", "name": "groß", "preisCent": 690 } ]
```

### Gericht hinzufügen

```json
{ "id": "pizza-tonno-spezial", "nr": "127", "kategorie": "pizza", "name": "Tonno Spezial",
  "beschreibung": "mit Thunfisch, Zwiebeln und Peperoni", "preisCent": 1090,
  "allergene": ["A", "D", "G"], "zusatzstoffe": [], "merkmale": [] }
```

| Feld | Bedeutung |
|---|---|
| `id` | technische, eindeutige Kennung (Kleinbuchstaben, Ziffern, Bindestriche). **Nie ändern**, solange Kunden das Gericht im Warenkorb haben könnten. Ist nicht die Artikelnummer. |
| `nr` | Artikelnummer laut Karte, Text (z. B. `"96a"`). Muss eindeutig sein. Getränke ohne Nummer: Feld weglassen. |
| `kategorie` | `id` einer Kategorie |
| `preisCent` oder `varianten` | ein Preis oder Größen (`volumenMl` bei Getränken für den Grundpreis je Liter) |
| `optionen` | Optionsgruppen (sonst gelten die der Kategorie, z. B. Dressing bei Salaten) |
| `allergene`, `zusatzstoffe` | Kennzeichnung exakt wie auf der Karte (Buchstaben bzw. Ziffern aus der Legende) |
| `merkmale` | `"vegetarisch"`, `"scharf"` – nur, wenn die Karte es so sagt |
| `steuer` | Standard aus der Kategorie (`speisen` 7 % / `getraenke` 19 %). Kombiangebote: `{ "typ": "aufteilung", "getraenkeAnteilCent": 250 }` |
| `pfandCent` | Getränkepfand je Stück (`25`, `0` = ohne Pfand, `null` = noch unklar → nicht bestellbar) |
| `verfuegbar` | `false` blendet „Hinzufügen“ aus (z. B. vorübergehend ausverkauft) |
| `bild` | für spätere eigene Fotos vorgesehen |
| `pruefen` | offene Punkte: `{ "feld": "preis", "hinweis": "…", "sperrt": true }`. Sperrende Punkte machen das Gericht im Live-Betrieb nicht bestellbar. Nach Klärung den Eintrag löschen. |
| `nameLautFlyer` | Originalschreibweise, falls korrigiert (nur Dokumentation) |

### Optionsgruppen (Größen, Beilagen, Extras)

```json
"nudel-ueberbacken": { "label": "Überbacken", "typ": "mehrere", "optionen": [
  { "id": "ueberbacken", "name": "überbacken", "preisCent": 250, "allergene": ["G"] } ] }
```

`typ: "eine"` = genau eine Auswahl (erste ist vorausgewählt), `typ: "mehrere"` = beliebig viele, `min`/`max` begrenzen. `optional: true` bei `eine` bedeutet: Gruppe darf ausgeblendet werden (z. B. „ohne Beilage“). `neutral: true` bei einer Option (z. B. „ohne Beilage“) – erscheint nicht im Warenkorb. Allergene/Zusatzstoffe einer Option werden bei Auswahl zur Kennzeichnung des Gerichts hinzugefügt.

## Betrieb (`data/config.json`)

### Eröffnung schalten

```json
"betrieb": { "modus": "geoeffnet", ... }
```

`"vor-eroeffnung"`: Karte sichtbar, keine Bestellung, Eröffnungshinweis. `"geoeffnet"`: Warenkorb und Bestellung aktiv – **aber nur, wenn** Betreibername, Rechtsform, E-Mail, Zahlungsarten und der Steuerstatus eingetragen sind. Sonst erscheint „Online-Bestellung ist gerade nicht verfügbar“ und in der Browser-Konsole steht, was fehlt.

### Öffnungszeiten, Sonderzeiten, Pausen

```json
"woche": { "1": [["16:30", "22:30"]], "2": [], ... }     // 0 = Sonntag … 6 = Samstag; [] = Ruhetag; mehrere Zeitfenster möglich
"bestellschluss": "22:15",
"ausnahmen": [
  { "datum": "2026-12-24", "geschlossen": true, "hinweis": "Heiligabend geschlossen" },
  { "datum": "2026-12-31", "zeiten": [["11:00", "18:00"]], "bestellschluss": "17:30", "hinweis": "Silvester verkürzt" }
],
"betriebsferien": [ { "von": "2027-01-04", "bis": "2027-01-10", "hinweis": "Betriebsferien" } ],
"schliessungen": [ { "von": "2026-11-20T18:00", "bis": "2026-11-20T19:30", "hinweis": "Vorübergehend geschlossen" } ],
"bestellpause": { "aktiv": true, "hinweis": "Gerade sehr viel los – bitte rufen Sie uns an." },
"vorlaufMinuten": { "abholung": 20, "lieferung": 30 },
"spaetesteWunschzeit": { "abholung": "22:30", "lieferung": "22:30" },
"vorbestellungen": false
```

Alle Zeiten gelten in Europe/Berlin, Sommer- und Winterzeit werden automatisch berücksichtigt. **Hinweis:** Eine Änderung an `config.json` ist nach dem Push erst nach dem Veröffentlichen durch GitHub (meist 1–2 Minuten) wirksam. Für eine sofortige Pause bleibt das Telefon/WhatsApp der schnellste Weg.

### Liefergebiet

```json
"zonen": [ { "id": "biberach", "name": "Biberach", "mindestbestellwertCent": 1500, "lieferkostenCent": 100 }, ... ],
"orte":  [ { "name": "Warthausen", "plz": "88447", "zone": "bis7", "bestaetigt": true }, ... ]
```

Kunden wählen ihren Ort aus der Liste; die PLZ wird geprüft. Nur Orte mit `"bestaetigt": true` erscheinen im Checkout und auf der Seite „Lieferung & Abholung“. Ist kein Ort bestätigt, ist nur Abholung möglich. `"aktiv": false` schaltet die Lieferung ganz ab.

### Telefonnummern

`restaurant.telefon[]`: `anzeige`, `nummer` (international), `zweck` (z. B. „Bestellungen“), `sichtbar`. Die erste sichtbare Nummer ist die Hauptnummer (Anrufen-Button, Hinweise).

### Steuer, Zahlung, Rechtsmodell

```json
"steuer": { "status": "bestaetigt", "kleinunternehmer": false, "saetze": { "speisen": 7, "getraenke": 19 }, "ausweisen": true },
"zahlung": { "arten": ["Barzahlung"], "hinweis": "bar bei Abholung bzw. Lieferung" },
"bestellung": { "rechtsmodell": "verbindlich" }
```

### Testmodus (vor dem Livegang oder nach Änderungen)

```json
"testmodus": { "aktiv": true, "whatsappNummer": "49151XXXXXXXX" }
```

Bestellungen gehen dann an die Testnummer, sind als TEST markiert und unabhängig von Öffnungszeiten und Betreiberangaben möglich (Prüfpunkte gelten weiter). Banner auf der Bestellseite. **Danach unbedingt wieder `"aktiv": false`** – am besten nur lokal oder auf einem eigenen Branch testen.
