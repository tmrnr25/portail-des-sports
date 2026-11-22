// Vérifie le nombre de fichiers du site avant la mise en ligne
// (offre gratuite Cloudflare : 20 000 fichiers maximum par version).
import fs from "node:fs";
import path from "node:path";
const LIMIT = 20000;
const count = (dir) => fs.readdirSync(dir, { withFileTypes: true }).reduce((n, d) => n + (d.isDirectory() ? count(path.join(dir, d.name)) : 1), 0);
const n = count(path.resolve("dist"));
const pct = Math.round((n / LIMIT) * 100);
if (n > LIMIT) {
  console.error(`✖ Le site compte ${n} fichiers, au-delà de la limite gratuite de ${LIMIT}. Mise en ligne annulée : le site actuel reste en place.`);
  process.exit(1);
}
// Affiche le total sur la page « État des données »
const etat = path.resolve("dist/etat/index.html");
if (fs.existsSync(etat)) fs.writeFileSync(etat, fs.readFileSync(etat, "utf8").replace("__NB_FICHIERS__", `${n.toLocaleString("fr-FR")} (${pct} %)`));
console.log(`${pct >= 90 ? "⚠" : "✓"} Fichiers du site : ${n} sur ${LIMIT} autorisés (${pct} %)${pct >= 90 ? " — on approche de la limite." : "."}`);
