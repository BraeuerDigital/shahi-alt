# Veröffentlichung über GitHub Pages und spätere Domain

Die Website liegt vollständig im Stammverzeichnis des Repositorys `BraeuerDigital/shahi` und braucht keinen Build auf GitHub. Alle Pfade sind relativ – sie funktioniert unter `https://braeuerdigital.github.io/shahi/` genauso wie später unter `https://www.shahi-biberach.de/`.

**Die Domain ist bewusst nicht verknüpft:** keine `CNAME`-Datei, keine DNS-Änderung. Die Seiten tragen `noindex`, bis `website.indexierbar` auf `true` gestellt wird.

## 1. GitHub Pages einschalten

1. Repository → **Settings** → **Pages**.
2. *Build and deployment* → Source: **Deploy from a branch**.
3. Branch: **main**, Ordner: **/ (root)** → **Save**.
4. Nach 1–2 Minuten ist die Seite unter `https://braeuerdigital.github.io/shahi/` erreichbar (Link erscheint oben auf der Pages-Seite).
5. Prüfen: Startseite, Speisekarte, eine Kategorie, `bestellen.html`, Impressum, eine nicht existierende Adresse (→ eigene 404-Seite).

Die Datei `.nojekyll` sorgt dafür, dass GitHub die Dateien unverändert ausliefert. Der Ordner `docs/` ist nur Dokumentation – nicht als Pages-Quelle auswählen.

> Datenschutz: Solange die Website über GitHub Pages läuft, verarbeitet GitHub die Zugriffsdaten (IP-Adresse). Das ist in der Datenschutzerklärung beschrieben; die Grundlage der Drittlandübermittlung ist noch zu ergänzen (Freigabeliste 6.5).

## 2. Domain `shahi-biberach.de` verknüpfen (später, nach Freigabe)

Voraussetzung: Domain ist registriert und der Betreiber hat Zugriff auf die DNS-Einstellungen.

1. **Domain bei GitHub verifizieren** (empfohlen, schützt vor Übernahme): GitHub-Organisation *BraeuerDigital* → Settings → Pages → *Add a domain* → TXT-Eintrag beim DNS-Anbieter setzen → *Verify*.
2. **DNS beim Anbieter der Domain:**

   | Typ | Name | Wert |
   |---|---|---|
   | A | @ | 185.199.108.153 |
   | A | @ | 185.199.109.153 |
   | A | @ | 185.199.110.153 |
   | A | @ | 185.199.111.153 |
   | AAAA | @ | 2606:50c0:8000::153 |
   | AAAA | @ | 2606:50c0:8001::153 |
   | AAAA | @ | 2606:50c0:8002::153 |
   | AAAA | @ | 2606:50c0:8003::153 |
   | CNAME | www | braeuerdigital.github.io |

   Vorher die aktuellen Werte in der GitHub-Dokumentation „Managing a custom domain for your GitHub Pages site“ gegenprüfen. Vorhandene, widersprüchliche A/AAAA/CNAME-Einträge entfernen.
3. Repository → Settings → Pages → *Custom domain*: `www.shahi-biberach.de` → Save. GitHub legt dabei die Datei `CNAME` im Repository an (lokal danach `git pull`).
4. Warten, bis der DNS-Check grün ist (bis zu 24 h), dann **Enforce HTTPS** aktivieren.
5. In `data/config.json`: `website.basisUrl` = `https://www.shahi-biberach.de` (ist bereits so gesetzt) und – erst nach rechtlicher Freigabe – `website.indexierbar` = `true`. `node tools/build.mjs`, committen.
6. Datenschutzerklärung um den Domain-/DNS-Anbieter ergänzen.
7. Google-Unternehmensprofil mit der Domain verknüpfen, Sitemap `https://www.shahi-biberach.de/sitemap.xml` in der Google Search Console einreichen.

## 3. Prüfung bei jedem Push

`.github/workflows/pruefung.yml` führt bei jedem Push die Datenprüfung, den Build und die Unit-Tests aus und meldet einen Fehler, wenn die erzeugten Seiten nicht zum aktuellen Datenstand passen. Die Veröffentlichung selbst erledigt GitHub Pages unabhängig davon.
