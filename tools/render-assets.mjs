#!/usr/bin/env node
/* Erzeugt PNG-Grafiken (Favicons, App-Icons, Social-Media-Bild) aus SVG/HTML.
   Benötigt Playwright + Chrome (nur für Gestaltungsänderungen nötig, nicht für den Betrieb):
     PLAYWRIGHT_MODULE=/pfad/zu/playwright/index.mjs CHROME=/usr/bin/google-chrome node tools/render-assets.mjs */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const font = fs.readFileSync(path.join(ROOT, "assets/fonts/fraunces-600.woff2")).toString("base64");
const illu = fs.readFileSync(path.join(ROOT, "assets/img/illustrationen.svg"), "utf8").replace(/<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
const ARCH = "M0 260 L0 118 C0 74 40 56 66 44 C86 34 98 18 100 0 C102 18 114 34 134 44 C160 56 200 74 200 118 L200 260 Z";
const ARCH_INNER = "M24 260 L24 126 C24 94 52 80 74 69 C90 61 98 48 100 34 C102 48 110 61 126 69 C148 80 176 94 176 126 L176 260";
const css = `@font-face{font-family:F;src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:600}
*{margin:0;box-sizing:border-box}body{background:transparent}`;

const icon = (size, rounded) => `<html><head><style>${css}</style></head><body>
<svg width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" rx="${rounded ? 14 : 0}" fill="#22307A"/>
<g transform="translate(13 10) scale(0.19)"><path d="${ARCH}" fill="#FFB320"/><text x="100" y="226" text-anchor="middle" font-family="F" font-weight="600" font-size="160" fill="#22307A">S</text></g></svg></body></html>`;

const og = `<html><head><style>${css}
body{width:1200px;height:630px;background:#22307A;color:#fff;font-family:system-ui,sans-serif;position:relative;overflow:hidden}
.t{position:absolute;left:90px;top:150px}.t b{display:block;font:600 150px/1 F;letter-spacing:8px}.t span{display:block;font:600 44px/1.2 system-ui;margin-top:18px;letter-spacing:1px}
.t p{font:500 34px/1.35 system-ui;color:#FFE6A8;margin-top:42px}
.fr{position:absolute;left:0;right:0;bottom:0;height:22px;background:radial-gradient(circle at 16px 22px,#FFB320 15.5px,transparent 16.5px) 0 0/32px 22px repeat-x}
svg.a{position:absolute;right:90px;top:60px;width:360px}</style></head><body>
<svg style="display:none">${illu}</svg>
<div class="t"><b>SHAHI</b><span>Küche · Biberach an der Riß</span><p>Pizza, Burger, Döner, Schnitzel<br>und indische &amp; pakistanische Gerichte<br>Abholung und Lieferservice</p></div>
<svg class="a" viewBox="-8 -34 216 296" xmlns="http://www.w3.org/2000/svg"><path d="${ARCH}" fill="#FFB320"/><path d="${ARCH_INNER}" fill="none" stroke="#22307A" stroke-width="6" opacity=".35"/><circle cx="100" cy="-13" r="10" fill="#E0352B"/><use href="#curry" x="30" y="104" width="140" height="140"/></svg>
<div class="fr"></div></body></html>`;

const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ["--no-sandbox"] });
async function shot(html, w, h, out, transparent = false) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(html, { waitUntil: "load" });
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(ROOT, out), omitBackground: transparent, clip: { x: 0, y: 0, width: w, height: h } });
  await page.close();
  console.log("✓", out);
}
await shot(icon(32, true), 32, 32, "assets/img/favicon-32.png", true);
await shot(icon(180, false), 180, 180, "assets/img/apple-touch-icon.png");
await shot(icon(192, true), 192, 192, "assets/img/logo-192.png", true);
await shot(icon(512, true), 512, 512, "assets/img/logo-512.png", true);
await shot(og, 1200, 630, "assets/img/og-image.png");
await browser.close();
