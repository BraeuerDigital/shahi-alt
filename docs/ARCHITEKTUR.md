# Architektur

## Grundsätze

- Statisch auslieferbar, ohne Server, Datenbank, Paketmanager oder API-Schlüssel. Hosting kostenlos über GitHub Pages.
- Inhalte (JSON) getrennt von Darstellung (CSS), Rechenregeln (`core.js`) und Oberfläche (`app.js`).
- Eine Rechenquelle: `core.js` berechnet Preise, Steuer, Liefergebiet, Zeiten, Referenz und Nachricht – identisch im Browser und in den Tests.
- Progressive Verbesserung: Die Speisekarte steht vollständig im HTML (Suchmaschinen, ohne JavaScript). Mit JavaScript lädt der Browser die aktuellen JSON-Daten und rendert Karte, Status und Bestellstrecke.
- Keine vermeintlich sichere Admin-Oberfläche im Browser. Änderungen laufen über Git (Versionsgeschichte, Rücknahme jederzeit möglich).

## Ablauf im Browser

```text
HTML (vorab erzeugt) ──► core.js + view.js + app.js
                           │
                           ├─ fetch data/config.json + data/menu.json  (cache: no-cache → stets aktuell)
                           ├─ validateMenu → bei Fehlern keine Online-Bestellung
                           ├─ siteMode: pre | live | test,  launchBlockers → Livegang-Schutz
                           ├─ Status/Öffnungszeiten (Europe/Berlin, alle 30 s)
                           ├─ Speisekarte, Suche, Filter, Gericht-Dialog
                           ├─ Warenkorb  ⇄ localStorage „shahi-warenkorb-v1“ (nur Auswahl, 12 h)
                           └─ Bestellstrecke ⇄ sessionStorage „shahi-angaben-v1“ (Formular, Tab)
                                 └─ buildMessage → https://wa.me/<Nummer>?text=…  (Kunde sendet selbst)
```

## Datenmodell (Auszug)

- **Produkt:** `id` (technisch, eindeutig) · `nr` (Artikelnummer) · `name` · `beschreibung` · `kategorie` · `varianten[{id,name,preisCent,volumenMl}]` · `optionen[gruppenId]` · `allergene[]` · `zusatzstoffe[]` · `steuer` · `pfandCent` · `bild` · `verfuegbar` · `merkmale[]` · `pruefen[]`.
- **Optionsgruppe:** `typ` eine/mehrere · `min`/`max` · `optional` · Optionen mit `preisCent`, `allergene`, `zusatzstoffe`, `neutral`.
- **Warenkorbzeile:** `{ p: produktId, v: variantenId, s: { gruppe: [optionIds] }, n: hinweis, q: menge }` – Schlüssel aus Produkt, Variante, sortierter Auswahl und Hinweis: identische Konfigurationen werden zusammengeführt.
- **Referenz:** `SHA-A|L-YYYYMM-XXXXXXXX`; 8 Zeichen aus 32 Symbolen (ohne 0/O/1/I) per `crypto.getRandomValues()` = 40 Bit. Bei 10.000 Bestellungen im Monat liegt die Wahrscheinlichkeit einer Doppelung bei etwa 1 : 22.000. Ohne zentrale Datenbank ist absolute Eindeutigkeit nicht garantierbar; ohne sichere Zufallsquelle wird keine Ersatznummer erzeugt (Bestellung dann gesperrt). Jahr/Monat und Zufallsteil entstehen beim ersten Artikel und bleiben bis „Neue Bestellung“, Leeren oder Ablauf gleich; A/L folgt der Bestellart.

## Erweiterungen (vorbereitet, nicht simuliert)

| Erweiterung | Ansatz |
|---|---|
| **Bestellbon drucken (manuell)** | Die WhatsApp-Nachricht ist bon-tauglich aufgebaut. Für einen Druck aus dem Browser: Druck-CSS für `.receipt` ist angelegt (`@media print`). |
| **Bondrucker (ESC/POS) / automatische Bestellannahme** | Erfordert einen Empfänger mit Server oder ein Gerät im Laden. Vorgesehene Schnittstelle: `core.buildMessage()` liefert den Text; eine Funktion `orderPayload()` (gleiche Daten wie `orderObject()` in `app.js`) kann als JSON an einen künftigen Endpunkt gesendet werden (z. B. Serverless-Funktion, die druckt und eine Zugangsbestätigung schickt). Kosten/Abhängigkeiten vorab klären. |
| **Bestellverwaltung** | Wie oben: zentraler Endpunkt + geschützter Zugang (echte Authentifizierung serverseitig, nicht im Browser). Dann auch systemweit eindeutige Bestellnummern. |
| **Produkt vorübergehend deaktivieren** | schon möglich: `"verfuegbar": false` in `menu.json` |
| **Angebote/Aktionen** | neues Produkt in einer Kategorie „Angebote“ oder Varianten mit Aktionspreis; Steuerkategorie beachten |
| **Zusätzliche Zahlungsarten / Online-Zahlung** | `zahlung.arten` für die Anzeige; Online-Zahlung erfordert Zahlungsdienstleister, Checkout-Anpassung und neue Rechtstexte |
| **Lieferbedingungen** | `lieferung.zonen` und `orte` frei konfigurierbar; weitere Zonen werden automatisch angezeigt (die Ring-Grafik zeigt die ersten drei) |
| **Wartungsmodus** | `betrieb.modus = "vor-eroeffnung"` (Karte sichtbar, Bestellung aus) oder `bestellpause.aktiv` |
| **Vorbestellungen** | `oeffnungszeiten.vorbestellungen` ist vorhanden, die Logik dafür bewusst nicht aktiviert (Freigabe des Betreibers nötig) |

## Sicherheit

- Alle Ausgaben werden HTML-escaped (`view.esc`), Eingaben gesäubert und längenbegrenzt (`core.clean`). Die WhatsApp-Nachricht ist reiner Text, korrekt URL-kodiert.
- Keine Geheimnisse im Repository. Keine Formulare, die Daten an Dritte senden. Keine externen Skripte → keine Lieferkettenrisiken im Browser.
- Hinweis: GitHub Pages erlaubt keine eigenen HTTP-Sicherheitsheader (CSP). Da keine externen Ressourcen eingebunden sind, ist das Risiko gering; bei einem späteren Wechsel zu einem Hoster mit Header-Konfiguration eine strikte CSP ergänzen.
