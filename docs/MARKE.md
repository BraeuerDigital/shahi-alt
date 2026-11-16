# Markenidentität SHAHI Küche

## Idee

„Shahi“ steht im Urdu und Persischen für „königlich“. Die Marke übersetzt das nicht in Gold-und-Bordeaux-Prunk, sondern in eine klare, fröhliche Straßenküchen-Sprache: **das Spitzbogenfenster** (Jharokha) als Rahmen für das Essen, **kräftiges Shahi-Blau** als Bühne und **Ringelblumen-Gelb** – die Farbe der Blütengirlanden – für alles, was man anklicken oder probieren soll. Die gezackte Kante zwischen den Bereichen erinnert an Fransenborten und an einen Kassenbon.

Die Karte reicht von Schwaben (Käsespätzle-Burger) über Istanbul (Döner) und Neapel (Pizza) bis Lahore (Lahori Salat, Pindi Express). Deshalb lautet die Leitzeile der Startseite **„Von Pizza bis Palak.“** – die Wortpaare wechseln (Döner/Donut, Burger/Butter Chicken, Calzone/Curry) und führen direkt zu den Gerichten.

## Logo

- **Bildmarke:** Spitzbogenfenster in Ringelblume mit feiner Innenlinie, darin ein „S“, darüber ein roter Punkt als Turmspitze (Finial).
- **Wortmarke:** „SHAHI“ in Fraunces 600, gesperrt; darunter „Küche“ in der Systemschrift.
- Dateien: `assets/img/logo.svg` (mit eingebetteter Schrift, für Druck/Weitergabe), `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`, `logo-192.png`, `logo-512.png`, `og-image.png`. PNGs neu erzeugen: `tools/render-assets.mjs`.
- Auf Blau: Bogen gelb, „S“ blau. Auf Weiß: Bogen blau, „S“ gelb. Mindestgröße der Bildmarke ca. 24 px Höhe; Schutzraum = Breite des Finial-Punkts × 2.
- Das bisherige Flyer-Logo (Ziege vor Sonne) wurde nicht übernommen: Es ist identisch mit dem Logo der MINAR Küche und erfüllt den Auftrag einer eigenständigen Identität nicht. Für den Druck neuer Flyer kann das neue Logo verwendet werden.

## Farben

| Name | Wert | Einsatz |
|---|---|---|
| Shahi-Blau | `#22307A` | Kopf- und Fußzeile, Bühnen, Überschriften, Text-Akzente |
| Shahi-Blau tief | `#18225A` | Text auf Gelb, Hover |
| Ringelblume | `#FFB320` | Bogen, Hauptbuttons, aktive Zustände |
| Ringelblume hell | `#FFE6A8` | Hinweise, Hervorhebung „heute“ |
| Chili | `#E0352B` / Text `#B8261D` | Finial, Icons, Fehler, „scharf“ |
| Minze | `#E4F2EA` | helle Flächen, Kategorie-Bögen |
| Pistazie | `#2F7A55` | „vegetarisch“, Bestätigung |
| Tinte | `#1A1D3D` | Fließtext |

Kontraste: Weiß auf Shahi-Blau ca. 11:1, Shahi-Blau tief auf Ringelblume ca. 8:1, Fließtext auf Weiß über 15:1 (WCAG AA erfüllt).

## Schrift

- **Fraunces 600** (SIL OFL 1.1, lokal eingebunden, 18 KB) für Überschriften und Wortmarke – weiche, leicht verspielte Serifen, gut lesbar groß.
- **Systemschrift** (San Francisco, Segoe UI, Roboto …) für Text, Preise und Bedienelemente – schnell, scharf, ohne Ladezeit. Preise mit Tabellenziffern.

## Formen und Bilder

- Spitzbogen als Maske für Kategorie-Kacheln, Hero, Dialog-Symbol; gezackte Kante unter Kopfbereichen, über der Fußzeile und am Bon.
- **16 eigene Illustrationen** (`assets/img/illustrationen.svg`): Pizza, Party-Pizza, Burger, Döner, Curry, vegetarisches Curry, Pommes, Fingerfood, Partyplatte, Dips, Auflauf, Pasta, Salat, Schnitzel, Donut, Getränk. Einheitlich: Linien in Shahi-Blau, Flächen aus der Palette.
- **Keine Stockfotos.** Sobald eigene Fotos der Gerichte vorliegen, kann je Produkt `bild` gesetzt werden; der Hinweis „Fotos sind Beispiele“ aus dem Flyer entfällt damit.
- Icons: eigene, linienbasierte Symbole im Seitensprite (`tools/build.mjs`, `ICONS`).

## Bewegung

Eine einzige automatische Bewegung: das Wortpaar im Titel (stoppt nach drei Runden, anhaltbar, entfällt bei „Bewegung reduzieren“). Alles andere reagiert nur auf Handlungen: Dialoge gleiten herein, das Warenkorb-Symbol springt beim Hinzufügen kurz.
