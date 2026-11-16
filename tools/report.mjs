#!/usr/bin/env node
/* Schreibt docs/PRUEFPUNKTE-SPEISEKARTE.md aus data/menu.json + data/config.json.
   Aufruf: node tools/report.mjs  (läuft auch automatisch am Ende von tools/build.mjs) */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const C = require("../assets/js/core.js");
const menu = JSON.parse(fs.readFileSync(path.join(ROOT, "data/menu.json"), "utf8"));
const config = JSON.parse(fs.readFileSync(path.join(ROOT, "data/config.json"), "utf8"));
const checks = C.openChecks(menu);
const cell = (s) => String(s || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const by = (feld) => checks.filter((c) => (feld === "sonstiges" ? !["preis", "pfand", "allergene", "optionen", "varianten", "steuer"].includes(c.feld) : c.feld === feld));

let md = `# Prüfpunkte der Speisekarte

Automatisch erzeugt aus \`data/menu.json\` (Stand der Daten: ${menu.stand}). Nicht von Hand bearbeiten – nach Änderungen \`node tools/build.mjs\` ausführen.

**${checks.length} offene Prüfpunkte**, davon **${checks.filter((c) => c.sperrt).length} sperrend**: Im Modus „geoeffnet“ sind die betroffenen Produkte bzw. Optionen online nicht bestellbar, bis der Prüfpunkt nach Bestätigung durch den Betreiber im Produkt gelöscht wird (Schalter \`freigabe.sperrePruefpunkte\` in \`data/config.json\`).

So wird ein Punkt erledigt: Angabe mit dem Betreiber klären → Wert in \`data/menu.json\` korrigieren → den Eintrag im Feld \`pruefen\` des Produkts (bzw. der Optionsgruppe) löschen → \`node tools/build.mjs\` → \`node --test tests/unit.test.mjs\`.

`;
const groups = [
  ["preis", "Preise"], ["pfand", "Pfand"], ["varianten", "Varianten und Zusammensetzung"], ["optionen", "Optionen und Extras"],
  ["steuer", "Umsatzsteuer"], ["allergene", "Allergen- und Zusatzstoffkennzeichnung"], ["sonstiges", "Namen, Beschreibungen, Kennzeichen"]
];
for (const [feld, title] of groups) {
  const list = by(feld);
  if (!list.length) continue;
  md += `## ${title} (${list.length})\n\n| Wo | Hinweis | sperrt |\n|---|---|---|\n` + list.map((c) => `| ${cell(c.ort)} | ${cell(c.hinweis)} | ${c.sperrt ? "**ja**" : "nein"} |`).join("\n") + "\n\n";
}
const renamed = menu.produkte.filter((p) => p.nameLautFlyer);
md += `## Schreibweisen gegenüber dem Flyer korrigiert (${renamed.length})\n\nAuf der Website steht die korrigierte Schreibweise; die Originalschreibweise ist im Feld \`nameLautFlyer\` dokumentiert.\n\n| Nr. | Flyer | Website |\n|---|---|---|\n` +
  renamed.map((p) => `| ${p.nr || "–"} | ${cell(p.nameLautFlyer)} | ${cell(p.name)} |`).join("\n") + "\n\n";
const unconfirmed = (config.lieferung.orte || []).filter((o) => o.bestaetigt !== true);
md += `## Liefergebiet: unbestätigte Orte (${unconfirmed.length})\n\nVorschlag, nicht verifiziert. Nur Orte mit \`"bestaetigt": true\` sind im Checkout wählbar und werden öffentlich genannt.\n\n| Ort | PLZ | vorgeschlagene Zone |\n|---|---|---|\n` +
  unconfirmed.map((o) => `| ${cell(o.name)} | ${o.plz} | ${cell((C.zoneById(config, o.zone) || {}).name)} |`).join("\n") + "\n\n";
const blockers = C.launchBlockers(config);
md += `## Livegang-Sperre (zentral)\n\nSolange einer dieser Punkte fehlt, bleibt die Online-Bestellung auch im Modus „geoeffnet“ gesperrt:\n\n` + (blockers.length ? blockers.map((b) => `- ${b}`).join("\n") : "- keine – alle zentralen Angaben vorhanden") + "\n";

fs.writeFileSync(path.join(ROOT, "docs/PRUEFPUNKTE-SPEISEKARTE.md"), md);
console.log(`  docs/PRUEFPUNKTE-SPEISEKARTE.md aktualisiert (${checks.length} Prüfpunkte)`);
