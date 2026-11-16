// Erzeugt den Pfad des SHAHI-Bogens (Vielpassbogen / „Cusped Arch“).
// Grundform: Spitzbogen aus zwei Kreisbögen; darauf sitzen nach außen gewölbte Pässe.
// Aufruf: node tools/arch.mjs [breite] [stich] [paesseProSeite] [hoeheGesamt]
// Ausgabe: SVG-Pfad (Fenster mit senkrechten Seiten bis zur Unterkante).

export function archPath({ w = 200, rise = 125, foils = 4, h = 260, bulge = 0.62, x0 = 0, y0 = 0 } = {}) {
  const half = w / 2;
  const c = (half * half + rise * rise) / (2 * half); // Radius = Abstand Mittelpunkt (auf Kämpferlinie) zum Kämpferpunkt
  const springY = rise;                                 // Kämpferlinie (Apex bei y = 0)
  const thetaA = Math.acos((c - half) / c);             // Winkel bis zum Scheitel
  const left = [];
  for (let i = 0; i <= foils; i++) {
    const t = (thetaA * i) / foils;
    left.push([c - c * Math.cos(t), springY - c * Math.sin(t)]);
  }
  left[foils] = [half, 0];
  const right = left.slice(0, -1).reverse().map(([x, y]) => [w - x, y]);
  const pts = left.concat(right);
  const f = (n) => +(n).toFixed(2);
  let d = `M${f(x0)} ${f(y0 + h)} L${f(x0)} ${f(y0 + springY)}`;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const chord = Math.hypot(bx - ax, by - ay);
    const r = chord * bulge;
    d += ` A${f(r)} ${f(r)} 0 0 1 ${f(x0 + bx)} ${f(y0 + by)}`;
  }
  d += ` L${f(x0 + w)} ${f(y0 + h)} Z`;
  return d;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [w, rise, foils, h] = process.argv.slice(2).map(Number);
  console.log(archPath({ w: w || 200, rise: rise || 125, foils: foils || 4, h: h || 260 }));
}
