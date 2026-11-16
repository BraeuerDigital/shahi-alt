# Hosting und Domain

**Hosting bleibt wie bisher bei SHAHI: GitHub Pages.** MINAR ist inzwischen für Cloudflare Pages vorbereitet – das wurde für SHAHI bewusst **nicht** übernommen (keine Cloudflare-Dateien wie `_headers`, keine Umstellung). Übernommen ist nur die Ordnerstruktur von MINAR: Die Website liegt in `public/`.

**Nichts ist veröffentlicht oder verknüpft:** kein Pages-Deployment, keine `CNAME`-Datei, keine DNS-Änderung. Alle Seiten tragen `noindex`, `robots.txt` sperrt alles, bis `operation.indexable` auf `true` gestellt und neu erzeugt wird.

## 1. Interne Vorschau (ohne Domain)

Zwei Wege, beide nur durch den Repo-Inhaber in den Einstellungen auszulösen:

**a) Empfohlen – Workflow „Veröffentlichen“ (stellt `public/` als Seitenstamm bereit):**
1. Repository → **Settings** → **Pages** → *Build and deployment* → Source: **GitHub Actions**.
2. **Actions** → **Veröffentlichen** → **Run workflow** (läuft nur manuell, nie automatisch beim Push).
3. Die Seite erscheint unter `https://braeuerdigital.github.io/shahi-alt/`. Prüfen: Startseite, Speisekarte, Kategorie, `bestellen.html`, Impressum.

**b) Schnellvorschau – „Deploy from a branch“, Branch `main`, Ordner `/ (root)`:** Die Datei `index.html` im Repo-Stamm leitet nach `public/index.html` weiter (wie bei MINAR). Die 404-Seite ist dabei nicht aktiv.

Hinweis 404: `public/404.html` nutzt absolute Pfade (`/assets/…`) und ist für den Domain-Stamm gedacht. Unter der Projektadresse `…github.io/shahi-alt/` erscheint sie ungestylt – das betrifft nur die Vorschau.

## 2. Sicherheit ohne HTTP-Header

GitHub Pages kann keine eigenen HTTP-Header setzen. Deshalb enthält jede Seite eine **Content-Security-Policy als Meta-Tag** (nur eigene Skripte, Bilder, Styles; keine fremden Server) und `referrer`-Richtlinie. HTTPS wird von GitHub Pages erzwungen („Enforce HTTPS“ nach Domain-Verknüpfung aktivieren). Clickjacking-Schutz (`frame-ancestors`) ist per Meta-Tag nicht möglich – vertretbar, da die Website keine Formulare mit Wirkung absendet.

## 3. Domain `www.shahi-biberach.de` verknüpfen – erst nach Freigabe

Voraussetzung: Domain registriert, Betreiber hat Zugriff auf die DNS-Einstellungen, Freigabeliste erledigt. **Keine dieser Schritte wurde ausgeführt.**

1. Domain bei GitHub verifizieren (schützt vor Übernahme): Organisation *BraeuerDigital* → Settings → Pages → *Add a domain* → TXT-Eintrag beim DNS-Anbieter → *Verify*.
2. DNS beim Anbieter der Domain (Werte vorher mit der GitHub-Dokumentation „Managing a custom domain for your GitHub Pages site“ abgleichen):

   | Typ | Name | Wert |
   |---|---|---|
   | A | @ | 185.199.108.153 · 185.199.109.153 · 185.199.110.153 · 185.199.111.153 |
   | AAAA | @ | 2606:50c0:8000::153 · 2606:50c0:8001::153 · 2606:50c0:8002::153 · 2606:50c0:8003::153 |
   | CNAME | www | braeuerdigital.github.io |

3. Repository → Settings → Pages → *Custom domain*: `www.shahi-biberach.de` → Save (bei Workflow-Deployment ist keine `CNAME`-Datei nötig). DNS-Check abwarten, dann **Enforce HTTPS**.
4. In `public/assets/js/menu-data.js`: `operation.indexable = true` (erst nach rechtlicher Freigabe), `node tools/build.mjs`, committen, Workflow „Veröffentlichen“ starten.
5. Datenschutzerklärung um Domain-/DNS-Anbieter und die Grundlage der Drittlandübermittlung an GitHub ergänzen.

## 4. Prüfung bei jedem Push

`.github/workflows/pruefung.yml`: Datenprüfung und Seitengenerierung, JavaScript-Syntax, Suche nach MINAR-Restaurantdaten. Die Browser-Tests (`tests/e2e.py`) laufen über *Run workflow* auf Anforderung.
