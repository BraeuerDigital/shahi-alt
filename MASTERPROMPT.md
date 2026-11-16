# MASTERPROMPT FÜR CLAUDE
## SHAHI Küche – Exakter Nachbau des MINAR-Designsystems

### DEINE ROLLE

Du agierst als Senior Frontend Developer, UI/UX Engineer, Webarchitekt und Spezialist für technische Migrationen bestehender Websites.

Du arbeitest an einem realen Kundenprojekt der Digitalagentur **Bräuer.Digital**.

Das Projekt heißt **SHAHI Küche Biberach**.

Wir haben bereits eine eigenständige SHAHI-Website entwickelt. Die bisherige gestalterische Richtung soll nun vollständig durch das bereits vorhandene MINAR-Design ersetzt werden.

**DEIN AUFTRAG: Übertrage das bestehende MINAR-Designsystem so originalgetreu wie technisch möglich auf SHAHI Küche.**

Es handelt sich ausdrücklich nicht um einen neuen kreativen Designauftrag.

Du sollst kein neues Design entwerfen, keine eigenen Farbkombinationen entwickeln und nicht versuchen, die MINAR-Optik neu zu interpretieren.

**MINAR ist ab sofort unsere verbindliche Designreferenz.**

---

# 1. VERBINDLICHE REFERENZ

### Originalprojekt MINAR Küche

GitHub-Repository:

https://github.com/BraeuerDigital/minar

Branch: `main`

Veröffentlichter Quellcode: `public/`

Bestehende Website:

https://braeuerdigital.github.io/minar/index.html

Analysiere zuerst den vollständigen aktuellen MINAR-Quellcode.

Die maßgeblichen Dateien sind insbesondere:

- `public/assets/css/styles.css`
- `public/assets/js/app.js`
- `public/assets/js/fx.js`
- `public/assets/js/menu-data.js`
- `public/assets/js/logo-anim.js`
- `tools/build.mjs`
- `public/index.html`
- `public/bestellen.html`
- `public/speisekarte/`
- `public/lieferservice.html`
- `public/ueber-uns.html`
- `public/kontakt.html`
- `public/impressum.html`
- `public/datenschutz.html`

Lies außerdem:

- `README.md`
- `PRUEFLISTE.md`
- `docs/ABSCHLUSSBERICHT.md`
- `docs/COMPLIANCE-CHECK.md`

Prüfe den tatsächlich vorhandenen Stand im Repository. Verwende keine früheren, inzwischen überholten Versionen.

Falls sich der Stand seit Erstellung dieses Auftrags verändert hat, gilt grundsätzlich der aktuelle freigegebene MINAR-Stand.

**Arbeite möglichst mit den echten MINAR-Komponenten und CSS-Definitionen statt mit einer visuellen Nachahmung.**

Falls du nicht auf den Originalquellcode zugreifen kannst, fordere den Projektordner an. Erfinde keine vermeintlich exakte MINAR-Version.

---

# 2. OBERSTE PRIORITÄT – DESIGNIDENTITÄT

Die neue SHAHI-Website muss optisch so aufgebaut sein, dass sofort erkennbar ist, dass sie dasselbe Designsystem wie MINAR verwendet.

### Originalgetreu übernehmen

- Gesamtes Farbkonzept
- Typografiesystem
- Seitengrids
- Inhaltsbreiten
- Abstände
- Header
- Topbar
- Navigation
- Mobile Navigation
- Footer
- Hero-Architektur
- Hintergrundgestaltung
- Farbverläufe
- Schatten und Licht
- Border-Radius und Blattformen
- Buttons
- Hover-Zustände
- Animationen
- Kategorie-Karten
- Produktkarten
- Formulare
- Warenkorb
- Checkout
- Bestellübersicht
- Übergänge zwischen Sektionen
- Responsive Breakpoints

Die bestehende MINAR-Seite nutzt ein bereits ausgearbeitetes Designsystem mit aufeinander abgestimmten Farben, Licht- und Bewegungseffekten.

Dieses Designsystem ist die maßgebliche Quelle.

**Keine eigenmächtige Umgestaltung.**

Die originalen MINAR-Farbvariablen und Gestaltungselemente sollen grundsätzlich unverändert übernommen werden.

### Was angepasst werden darf

Ausschließlich notwendige Anpassungen für:

- SHAHI-Branding
- SHAHI-Logo
- Restaurantnamen
- Restaurantfotos
- Speisekarteninhalte
- Abweichende Kategorien
- Unterschiedliche Textlängen
- Rechtlich erforderliche Inhalte
- Betriebsspezifische Bestellfunktionen
- Technische Fehlerbehebungen

Auch bei diesen Anpassungen muss das ursprüngliche Designsystem erhalten bleiben.

---

# 3. BESTEHENDE SHAHI-WEBSITE

Untersuche zunächst die aktuell erstellte SHAHI-Website.

Sie enthält möglicherweise bereits:

- Vollständig digitalisierte Speisekartendaten
- Produktvarianten
- Preisangaben
- Restaurantinformationen
- Bilder
- Logo-Dateien
- Rechtliche Seiten
- Konfigurationen
- Bestellfunktionen

**Diese Inhalte dürfen nicht verloren gehen.**

Erstelle vor Änderungen eine nachvollziehbare Sicherung des aktuellen SHAHI-Stands.

Anschließend:

1. Analysiere die bestehende Dateistruktur.
2. Identifiziere sämtliche weiterhin benötigten Inhalte.
3. Vergleiche die Architektur mit MINAR.
4. Übernimm die MINAR-Design- und Komponentenstruktur.
5. Migriere die SHAHI-Inhalte.
6. Entferne die nicht mehr benötigte bisherige SHAHI-Designimplementierung.
7. Verhindere CSS-Konflikte, doppelte Komponenten und parallele Warenkorbsysteme.

### Wichtig

Du darfst die bestehende SHAHI-Website grundlegend restrukturieren.

Das bisherige Design muss nicht erhalten bleiben.

Bestehende korrekte Daten und funktionierende Logik sollen jedoch übernommen werden, sofern dies technisch sinnvoll ist.

Das MINAR-Originalrepository bleibt vollständig unangetastet.

Änderungen erfolgen ausschließlich im SHAHI-Projekt.

---

# 4. MARKENANPASSUNG

Die Restaurantidentität lautet:

**SHAHI Küche**

Standort:

Bachgasse 17  
88400 Biberach an der Riß

Zukünftige Domain:

https://www.shahi-biberach.de

Die bestehende SHAHI-Logo-Datei soll verwendet werden, soweit sie im Projekt vorhanden ist.

Verändere das Logo nicht ohne Notwendigkeit.

Falls verschiedene Logo-Versionen erforderlich sind, erstelle technisch passende Varianten auf Grundlage des vorhandenen Logos.

### Nicht übernehmen

- MINAR-Schriftzug
- MINAR-Tierlogo
- MINAR-spezifische Logoanimation
- MINAR-Kontaktdaten
- MINAR-Adresse
- MINAR-Öffnungszeiten
- MINAR-Liefergebiete
- MINAR-Preise
- MINAR-Speisekarte
- MINAR-Inhaberdaten
- MINAR-Umsatzsteuer-ID
- MINAR-spezifische Rechtstexte

Alle technischen und inhaltlichen Referenzen auf MINAR müssen im SHAHI-Projekt überprüft werden.

### Logoanimation

Die MINAR-Website verwendet eine individuelle animierte Logoinszenierung.

Prüfe, ob sich deren technische Mechanismen für SHAHI wiederverwenden lassen.

Die Animation soll sich in Dauer, Inszenierung und visueller Qualität an MINAR orientieren, aber auf das tatsächliche SHAHI-Logo abgestimmt werden.

Keine Übernahme des MINAR-Tiermotivs.

Keine verzerrten oder beschädigten Logoformen.

---

# 5. STARTSEITE – ORIGINALGETREUER NACHBAU

Orientiere dich unmittelbar an der aktuellen MINAR-Startseite.

Übernimm deren:

- Topbar
- Header-Struktur
- Navigation
- Hero-Layout
- Größenverhältnisse
- Animationskonzept
- Hintergründe
- Typografische Hierarchie
- Button-Komponenten
- Kategorienpräsentation
- Restaurantvorstellung
- Lieferdienst-Sektion
- Öffnungszeiten
- Abschluss-CTA
- Footer

Jede Sektion soll bezüglich Layout, Abständen, Farben und interaktivem Verhalten der MINAR-Vorlage entsprechen.

Passe lediglich die Inhalte auf SHAHI an.

Wo SHAHI zusätzliche gastronomische Kategorien benötigt, erweitere das bestehende MINAR-Kartensystem im selben Stil.

Keine neuen gestalterischen Kartentypen erfinden.

---

# 6. ANIMATIONEN UND INTERAKTIONEN

Übernimm die funktionierenden Mechanismen aus dem MINAR-Projekt.

Insbesondere:

### Buttons

- Magnetische Bewegung
- Lichteffekte
- Dynamische Hover-Übergänge
- Animierte Beschriftung
- Originale Farbübergänge
- Originales Timing

### Navigation

- Sticky Header
- Scrollabhängiges Header-Verhalten
- Animierter Navigationsindikator
- Mobile Menüanimation
- Aktive Navigationszustände

### Kategorien und Produktkarten

- 3D-Tilt-Effekte
- Spotlight
- Hover-Transformationen
- Rahmenanimationen
- Scroll-Reveal-Effekte

### Weitere Elemente

- Scroll-Fortschrittsanzeige
- Animierte Sektionen
- Hintergrundelemente
- Bestehende Interaktionsdetails

Nutze dafür bevorzugt die vorhandene `fx.js` und die zugehörigen CSS-Regeln.

Berücksichtige weiterhin `prefers-reduced-motion`.

Auf Touchgeräten dürfen Hover-Effekte die Bedienung nicht behindern.

**Keine funktionsfähige MINAR-Animation ohne sachlichen Grund entfernen.**

---

# 7. SPEISEKARTE – GLEICHE UI, SHAHI-DATEN

Das digitale Speisekartensystem soll dem von MINAR entsprechen.

Übernimm:

- Kategorienübersicht
- Kategorieseiten
- Suchfunktion
- Kategorie-Sprungleiste
- Scrollspy
- Produktkarten
- Artikelnummern
- Produktbeschreibungen
- Preis- und Variantendarstellung
- Allergeninformationen
- Zusatzstoffinformationen
- Zusatzoptionen
- Hinzufügen-zum-Warenkorb-Funktion

### Inhalt

Verwende ausschließlich die aktuelle Speisekarte von SHAHI Küche.

Die bereits digitalisierten SHAHI-Produktdaten sind zu erhalten und mit den aktuellen Flyerbildern abzugleichen.

Jedes Gericht muss korrekt übernommen werden.

Dazu gehören:

- Artikelnummern
- Namen
- Beschreibungen
- Preise
- Größen
- Zutaten
- Varianten
- Zusätze
- Soßen
- Allergene
- Zusatzstoffe
- Pfandinformationen

Keine Produktinformationen von MINAR übernehmen.

### Datenarchitektur

Nutze möglichst die bewährte zentrale Datenstruktur aus `menu-data.js`.

Falls die bestehende SHAHI-Datenstruktur bereits vollständiger ist, migriere sie verlustfrei in ein geeignetes gemeinsames Format.

Wichtig ist, dass der Betreiber zukünftig Preise, Gerichte, Öffnungszeiten und Lieferbedingungen an zentraler Stelle ändern kann.

---

# 8. WARENKORB – EXAKT WIE MINAR

Übernimm den aktuellen MINAR-Warenkorb als gestalterische und funktionale Grundlage.

Insbesondere:

- Dunkles Warenkorbdesign
- Artikelübersicht
- Mengensteuerung
- Variantenanzeige
- Produkthinweise
- Bearbeiten-Funktion
- Entfernen-Funktion
- Einzelpreise
- Positionspreise
- Zwischensumme
- Lieferkosten
- Pfand
- Gesamtbetrag
- Button „Weiter zur Übersicht“

### Warenkorb-Drawer

MINAR verwendet einen optionalen Warenkorb-Drawer, der über das Warenkorb-Symbol geöffnet werden kann.

Übernimm diese Funktion einschließlich Animation und responsivem Verhalten.

Der Drawer muss auf Mobilgeräten einwandfrei funktionieren.

### Funktionalität

- Kein Datenverlust beim Navigieren
- Keine doppelten Produktpositionen durch Fehler
- Korrekte Behandlung unterschiedlicher Varianten
- Centgenaue Preisberechnung
- Persistenter Warenkorb
- Keine Speicherung personenbezogener Kontaktdaten im dauerhaft gespeicherten Warenkorb

Verwende für SHAHI eigene Storage-Schlüssel, sodass die Warenkörbe beider Restaurants vollständig getrennt bleiben.

---

# 9. CHECKOUT – EXAKT WIE MINAR

Übertrage die bestehende MINAR-Bestellstrecke.

Der Ablauf lautet:

**Speisekarte → Warenkorb → Bestellangaben → Bestellübersicht → WhatsApp**

### Bestellübersicht

Übernimm die originale Bon-Gestaltung von MINAR.

Die Übersicht soll enthalten:

- SHAHI Küche
- Restaurantadresse
- Bestellanfrage-Referenz
- Bestellart
- Name
- Telefonnummer
- Lieferadresse, falls erforderlich
- Wunschzeit
- Sämtliche Produkte
- Mengen
- Varianten
- Soßen
- Extras
- Produktbezogene Hinweise
- Warenwert
- Lieferkosten
- Pfand
- Gesamtsumme
- Zahlungsinformation
- Button zum Ändern der Bestellung
- WhatsApp-Weiterleitung

Bewahre die klare und gut lesbare Bon-Darstellung bei.

### WhatsApp

Verwende die SHAHI-WhatsApp-Nummer laut Flyer:

0179 69 500 47

Der Ablauf muss dem MINAR-System entsprechen.

Die Website bereitet eine Nachricht vollständig vor.

Der Kunde öffnet WhatsApp und muss die Nachricht selbst versenden.

Der Restaurantbetreiber bestätigt die Anfrage anschließend individuell.

Die Website darf keine erfolgreiche Übermittlung oder Annahme behaupten, bevor diese tatsächlich erfolgt ist.

### Referenznummer

Verwende das MINAR-Konzept mit SHAHI-Präfix:

Abholung: `SHA-A-YYYYMM-XXXXXXXX`

Lieferung: `SHA-L-YYYYMM-XXXXXXXX`

Die Referenz bleibt während derselben Anfrage konstant.

Verwende sichere Zufallswerte.

Baue die Referenz in Warenkorb, Bestellübersicht und WhatsApp-Nachricht ein.

---

# 10. LIEFERUNG UND ABHOLUNG

Die SHAHI-Lieferbedingungen unterscheiden sich von MINAR.

Verwende die Bedingungen des aktuellen SHAHI-Flyers:

| Lieferbereich | Mindestbestellwert | Liefergebühr |
|---|---:|---:|
| Biberach | 15,00 € | 1,00 € |
| Bis 7 km | 25,00 € | 2,00 € |
| 7 bis 12 km | 45,00 € | 3,00 € |

Implementiere diese Werte in das bestehende MINAR-Liefersystem.

Entfernungen dürfen nicht nur anhand einer ungeprüften Postleitzahl geschätzt werden.

Falls eine automatische Distanzprüfung nicht zuverlässig verfügbar ist, verwende eine überprüfbare, konfigurierbare Liefergebietsliste und dokumentiere offene Ortszuordnungen.

Die Webseite darf keine Lieferung in nicht freigegebene Gebiete versprechen.

### Abholung

Keine Lieferkosten.

### Lieferung

Lieferkosten, Mindestbestellwert und Kundenadresse müssen korrekt verarbeitet werden.

Die bestehende MINAR-Darstellung soll erhalten bleiben.

---

# 11. ÖFFNUNGSZEITEN UND ERÖFFNUNGSMODUS

SHAHI Küche ist ein neuer Betrieb.

Die Website soll vor der Eröffnung bereits online sein können.

Verwende die Öffnungszeiten aus dem aktuellen SHAHI-Flyer.

Zusätzlich implementiere:

- Vor-Eröffnungsmodus
- Normalbetrieb
- Manuelle Bestellpause
- Ruhetage
- Bestellannahmeschluss
- Sonderöffnungszeiten
- Mindestvorbereitungszeiten
- Zeitzone `Europe/Berlin`

Im Vor-Eröffnungsmodus ist die Speisekarte sichtbar, aber es können keine Bestellanfragen ausgelöst werden.

Die spätere Freischaltung muss über eine zentrale Konfiguration erfolgen.

Die Anzeige für geöffnet/geschlossen soll im MINAR-Stil dargestellt werden.

---

# 12. UMSATZSTEUER UND PREISANGABEN

Übernimm die bewährte MINAR-Darstellung der Preise, aber berechne die Umsatzsteuer für SHAHI anhand der zutreffenden Rechtslage und der steuerlichen Situation des Betreibers.

Berücksichtige insbesondere:

- Grundsätzlich 7 % für entsprechend begünstigte Speisen
- Grundsätzlich 19 % für regulär besteuerte Getränke
- Etwaige gesetzliche Ausnahmen
- Kombiangebote
- Liefergebühren
- Pfandbeträge
- Kleinunternehmerregelung, falls einschlägig

Die Steuerkategorie muss pro Artikel oder Leistung korrekt definiert werden.

Kunden sehen Bruttopreise.

Lieferkosten und Pfand sind vor dem Absenden gesondert auszuweisen.

Keine Umsatzsteuer pauschal auf den gesamten Warenkorb aufschlagen.

Bei unklarer steuerlicher Einordnung einen Freigabepunkt dokumentieren, statt unbelegte Angaben zu übernehmen.

---

# 13. RECHTLICHE SEITEN UND PFLICHTANGABEN

Übernimm die visuelle Gestaltung der rechtlichen MINAR-Seiten, jedoch niemals deren betriebsspezifischen Inhalt ungeprüft.

Erstelle für SHAHI eigenständige:

- Impressumsseite
- Datenschutzerklärung
- Erforderliche Bestell- und Verbraucherinformationen
- Liefer- und Zahlungsbedingungen
- Gegebenenfalls weitere gesetzlich erforderliche Informationen

### Impressum

Nach den einschlägigen gesetzlichen Vorschriften, insbesondere § 5 DDG.

Fehlende Angaben des tatsächlichen SHAHI-Betreibers als Platzhalter kennzeichnen.

### Datenschutz

An die tatsächliche technische Umsetzung und das tatsächliche Hosting anpassen.

Berücksichtige Warenkorb, Browser-Speicherung, WhatsApp und Kontaktmöglichkeiten.

Keine MINAR-Datenschutzerklärung lediglich umbenennen.

### Bestellstrecke

Prüfe insbesondere §§ 312i, 312j BGB, Verbraucherinformationen und die rechtliche Einordnung der WhatsApp-Bestellannahme.

### Lebensmittelkennzeichnung

Alle relevanten Allergene und Zusatzstoffe müssen zugänglich sein.

### Cookies

Keine unnötigen Trackingdienste einführen.

Ein Consent-Banner ist nur dann erforderlich, wenn die tatsächlich eingesetzten Technologien dies verlangen.

### Rechtliche Freigabe

Kennzeichne alle Punkte, die vor Veröffentlichung vom Betreiber oder einer fachkundigen Stelle freigegeben werden müssen.

Keine erfundenen rechtlichen Angaben und keine pauschale Garantie der Rechtssicherheit.

---

# 14. TECHNISCHE ARCHITEKTUR

Orientiere dich an der bestehenden MINAR-Architektur.

Bevorzugt:

- HTML
- CSS
- Vanilla JavaScript
- Statische Seitengenerierung
- Zentrale Produktdaten
- Zentrale Restaurantkonfiguration
- Keine unnötigen Frameworks
- Keine Datenbank, solange nicht erforderlich
- Kein kostenpflichtiges Backend
- Keine unnötigen externen Bibliotheken

Nutze möglichst dieselbe Komponentenarchitektur wie MINAR.

Der vorhandene Build-Prozess darf entsprechend angepasst werden.

### Wichtig zum Hosting

MINAR ist inzwischen technisch für Cloudflare Pages vorbereitet.

SHAHI soll nicht allein wegen des MINAR-Nachbaus automatisch auf einen anderen Hostinganbieter umgestellt werden.

Behalte die für SHAHI aktuell gewählte Hostingstrategie bei und prüfe die notwendigen Anpassungen für die Domain:

`shahi-biberach.de`

Keine Änderungen an DNS oder produktiven Deployments ohne ausdrückliche Freigabe.

---

# 15. FEHLER UND VERBESSERUNGEN

Du darfst technische Fehler aus MINAR beheben, sofern sie auch SHAHI betreffen würden.

Beispielsweise:

- Fehlerhafte Warenkorbzustände
- Ungültige Produktoptionen
- Doppelte Event-Listener
- Mobilprobleme
- Falsche Preisberechnung
- Fehlerhafte Pfade
- Unvollständige Formularvalidierung
- Probleme bei langen WhatsApp-Nachrichten
- Sicherheitsprobleme
- Barrierefreiheitsprobleme

Aber:

**Technische Verbesserungen dürfen nicht zu einer eigenmächtigen visuellen Neugestaltung führen.**

Die originale MINAR-Optik soll erhalten bleiben.

---

# 16. VERBINDLICHE VISUELLE ABNAHME

Vergleiche MINAR und SHAHI direkt miteinander.

Erstelle nach Möglichkeit Screenshots beider Websites bei identischen Viewportgrößen:

- 390 px – Smartphone
- 768 px – Tablet
- 1440 px – Desktop

Prüfe dabei:

1. Header-Höhe
2. Logo-Platzierung
3. Navigationsabstände
4. Hero-Proportionen
5. Hintergrundfarben und Verläufe
6. Typografie und Schriftgrößen
7. Button-Styling
8. Karten-Design
9. Hover-Zustände
10. Animationen
11. Abschnittsabstände
12. Warenkorb
13. Bestellübersicht
14. Footer
15. Mobile Navigation

Die Screenshots sollen optisch möglichst übereinstimmen, sobald die unvermeidbaren Unterschiede bei Logo, Textlängen und Produktanzahl berücksichtigt sind.

Abweichungen müssen sachlich begründet sein.

---

# 17. FUNKTIONALE ABNAHME

Teste anschließend das gesamte SHAHI-Bestellsystem.

Mindestens:

- Alle Kategorien aufrufbar
- Sämtliche Produktpreise korrekt
- Suche funktioniert
- Varianten auswählbar
- Zusatzoptionen korrekt
- Warenkorb-Drawer funktioniert
- Mengenänderungen korrekt
- Artikel können bearbeitet werden
- Lieferkosten korrekt
- Mindestbestellwerte korrekt
- Pfandberechnung korrekt
- Gesamtsumme korrekt
- Abholung korrekt
- Lieferung korrekt
- Öffnungszeiten korrekt
- Eröffnungsmodus funktioniert
- Bestellnummer bleibt identisch
- WhatsApp-Nachricht vollständig
- Keine automatische WhatsApp-Übermittlung
- Rechtliche Seiten verlinkt
- Keine MINAR-Restaurantdaten verblieben
- Keine JavaScript-Fehler
- Mobile Darstellung funktionsfähig

Teste insbesondere auch Mischbestellungen aus Speisen und Getränken.

---

# 18. ARBEITSANWEISUNG

Arbeite wie ein erfahrener Entwickler, der eine bestehende hochwertige Website als technische Grundlage für einen zweiten Standort beziehungsweise eine verwandte Marke verwendet.

### Phase 1 – Analyse

Untersuche das bestehende SHAHI-Projekt und das vollständige aktuelle MINAR-Repository.

Identifiziere die übertragbaren Dateien, Komponenten und Funktionen.

### Phase 2 – Sicherung

Sichere den bisherigen SHAHI-Projektstand.

Verändere das MINAR-Original nicht.

### Phase 3 – Designmigration

Ersetze das bestehende SHAHI-Design durch das originale MINAR-Designsystem.

Übertrage sämtliche benötigten CSS-Regeln, Komponenten und Animationen.

### Phase 4 – Datenmigration

Integriere die vollständigen SHAHI-Produktdaten und Restaurantinformationen.

Entferne sämtliche verbliebenen MINAR-spezifischen Daten aus der SHAHI-Website.

### Phase 5 – Funktionsmigration

Übernimm das Warenkorb-, Checkout-, Öffnungszeiten- und WhatsApp-System.

Passe es an die SHAHI-Lieferbedingungen an.

### Phase 6 – Rechtliches

Überprüfe sämtliche rechtlich relevanten Websitebestandteile.

Übernehme nur allgemein wiederverwendbare technische und gestalterische Strukturen.

### Phase 7 – Tests

Teste Design, Funktionen, Responsivität, Bestellabläufe und rechtliche Pflichtinformationen.

### Phase 8 – Abschluss

Dokumentiere:

- Welche Komponenten von MINAR übernommen wurden
- Welche SHAHI-spezifischen Anpassungen vorgenommen wurden
- Welche Fehler behoben wurden
- Welche Funktionen getestet wurden
- Welche Angaben noch bestätigt werden müssen
- Welche Punkte vor dem Livegang freizugeben sind

---

# 19. ABSOLUTE VERBOTE

- Kein neues, frei erfundenes Design
- Keine eigenmächtigen Farbänderungen
- Keine neue Typografie ohne technische Notwendigkeit
- Kein Ersatz vorhandener MINAR-Animationen durch vereinfachte Standardanimationen
- Kein Verlust von SHAHI-Produktdaten
- Keine Übernahme der MINAR-Kontaktdaten
- Keine Übernahme der MINAR-Speisekarte
- Keine erfundenen Preise
- Keine erfundenen Betreiberangaben
- Keine funktionslosen Buttons
- Keine unvollständigen Bestellprozesse
- Kein Überschreiben des MINAR-Repositories
- Kein produktives Deployment ohne Freigabe
- Keine kosmetische Pseudo-Migration, bei der nur ähnliche Farben verwendet werden

---

# 20. ABSCHLIESSENDE ANWEISUNG

Das Ziel ist nicht:

„Erstelle eine Website, die von MINAR inspiriert ist.“

Das Ziel lautet:

**„Nimm die bestehende MINAR-Website als verbindliche Design- und Funktionsgrundlage und übertrage sie möglichst originalgetreu auf SHAHI Küche Biberach.“**

Die beiden Websites sollen sich wie Mitglieder derselben professionell entwickelten Websitefamilie anfühlen.

Die Kundenerfahrung, das Design, die Interaktionen, die Animationen und die technischen Abläufe sollen übereinstimmen.

Unterschiede bestehen ausschließlich dort, wo sie durch die jeweilige Restaurantidentität, die Speisekarte, die gesetzlichen Anforderungen oder die betrieblichen Bedingungen erforderlich sind.

Prioritäten:

1. **Originalgetreue MINAR-Optik**
2. **Vollständige SHAHI-Inhalte**
3. **Zuverlässige Bestellfunktionen**
4. **Korrekte rechtliche und steuerliche Umsetzung**
5. **Saubere, langfristig wartbare Architektur**

Beginne unmittelbar mit der Analyse der beiden Projekte.

Setze die Migration anschließend tatsächlich im Code um.

**Liefere kein reines Konzept, sondern die vollständig umgebaute SHAHI-Website.**