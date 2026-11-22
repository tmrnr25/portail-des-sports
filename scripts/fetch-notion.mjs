// Lit les bases Notion, prépare les images et écrit src/data/tennis.json.
// Sans clé NOTION_TOKEN, utilise les données d'exemple (pour tester en local).
import notionPkg from "@notionhq/client";
const { Client, collectAllDataSourceRows } = notionPkg;
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { TENNIS, COLS } from "./config.mjs";
import { buildDataset } from "./lib.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "src/data/tennis.json");
const REPORT = path.join(ROOT, "rapport-donnees.txt");
const IMG_DIR = path.join(ROOT, "public/images");
const PERSO_DIR = path.join(ROOT, "images-perso"); // tes propres images, prioritaires

const token = process.env.NOTION_TOKEN;

if (!token) {
  if (process.env.CF_PAGES || process.env.WORKERS_CI || process.env.CI) {
    console.error("✖ NOTION_TOKEN manquant : ajoute la clé de l'intégration Notion dans les variables d'environnement.");
    process.exit(1);
  }
  console.warn("⚠ Pas de NOTION_TOKEN : utilisation des données d'exemple (sample-data/tennis.json).");
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  const sample = JSON.parse(await fs.readFile(path.join(ROOT, "sample-data/tennis.json"), "utf8"));
  await processImages(sample);
  await fs.writeFile(OUT, JSON.stringify(sample));
  process.exit(0);
}

const notion = new Client({ auth: token, retry: { maxRetries: 6 } });

// ---------- lecture des propriétés ----------
const prop = (page, name) => page.properties?.[name];
const text = (p) => {
  if (!p) return "";
  const arr = p.title || p.rich_text || [];
  return arr.map((t) => t.plain_text).join("").trim();
};
const num = (p) => (p && typeof p.number === "number" ? p.number : null);
const sel = (p) => p?.select?.name || p?.status?.name || null;
const rel = (p) => (p?.relation || []).map((r) => r.id);
const date = (p) => ({ start: p?.date?.start || null, end: p?.date?.end || null });
const file = (p) => {
  const f = (p?.files || [])[0];
  if (!f) return null;
  return f.type === "external" ? f.external.url : f.file?.url || null;
};
const emojiOf = (page) => (page.icon?.type === "emoji" ? page.icon.emoji : "");

async function readAll(id, label) {
  const t = Date.now();
  const rows = await collectAllDataSourceRows(notion, { data_source_id: id, page_size: 100 });
  const pages = rows.filter((r) => r.object === "page" && r.properties && !r.in_trash && !r.archived);
  console.log(`✓ ${label} : ${pages.length} lignes (${((Date.now() - t) / 1000).toFixed(1)} s)`);
  return pages;
}

const [rawC, rawE, rawP, rawZ] = [
  await readAll(TENNIS.competitions, "Compétitions"),
  await readAll(TENNIS.editions, "Éditions"),
  await readAll(TENNIS.players, "Joueurs"),
  await readAll(TENNIS.zones, "Zones géographiques"),
];

const c = COLS;
const dataset = buildDataset({
  competitions: rawC.map((pg) => ({
    id: pg.id, name: text(prop(pg, c.comp.name)), category: sel(prop(pg, c.comp.category)),
    surface: sel(prop(pg, c.comp.surface)), city: text(prop(pg, c.comp.city)),
    created: num(prop(pg, c.comp.created)), disappeared: num(prop(pg, c.comp.disappeared)),
    logo: file(prop(pg, c.comp.logo)), zone: rel(prop(pg, c.comp.zone)),
  })),
  editions: rawE.map((pg) => {
    const d = date(prop(pg, c.edition.date));
    return {
      id: pg.id, name: text(prop(pg, c.edition.name)), start: d.start, end: d.end,
      surface: sel(prop(pg, c.edition.surface)), category: sel(prop(pg, c.edition.category)),
      comp: rel(prop(pg, c.edition.comp)), winner: rel(prop(pg, c.edition.winner)),
      finalist: rel(prop(pg, c.edition.finalist)), semi: rel(prop(pg, c.edition.semi)),
      quarter: rel(prop(pg, c.edition.quarter)),
    };
  }),
  players: rawP.map((pg) => ({
    id: pg.id, name: text(prop(pg, c.player.name)), best: num(prop(pg, c.player.best)),
    retired: !!sel(prop(pg, c.player.retired)), photo: file(prop(pg, c.player.photo)),
    nationality: rel(prop(pg, c.player.nationality)),
  })).filter((p) => p.name),
  zones: rawZ.map((pg) => ({ id: pg.id, name: text(prop(pg, c.zone.name)), emoji: emojiOf(pg) })),
}, { source: "notion" });

await processImages(dataset);
await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, JSON.stringify(dataset));
await fs.writeFile(REPORT, `Rapport du ${new Date().toLocaleString("fr-FR")}\n\n` +
  `${dataset.competitions.length} compétitions, ${dataset.editions.length} éditions, ${dataset.players.length} joueurs\n\n` +
  `Points à vérifier dans Notion (${dataset.warnings.length}) :\n` + dataset.warnings.map((w) => "- " + w).join("\n") + "\n");
console.log(`✓ Données écrites : ${dataset.competitions.length} compétitions, ${dataset.editions.length} éditions, ${dataset.players.length} joueurs`);
console.log(`ℹ ${dataset.warnings.length} points à vérifier dans Notion :`);
for (const w of dataset.warnings.slice(0, 200)) console.log("  - " + w);
if (dataset.warnings.length > 200) console.log(`  … et ${dataset.warnings.length - 200} autres (voir rapport-donnees.txt en local)`);

// ---------- images ----------
// Priorité : images-perso/<dossier>/<slug>.(png|jpg|jpeg|webp) puis le fichier Notion.
// Les logos sont affichés en entier : on les place dans un cadre (16:9 pour les cartes,
// carré pour l'en-tête) dont le fond reprend la couleur du bord du logo.
// Les photos de joueurs sont simplement réduites. Tout est converti en WebP léger.
async function processImages(ds) {
  const jobs = [
    ...ds.players.map((p) => ({ item: p, key: "photo", dir: "joueurs", kind: "photo" })),
    ...ds.competitions.map((x) => ({ item: x, key: "logo", dir: "tournois", kind: "logo" })),
  ];
  let ok = 0, miss = 0;
  const run = async ({ item, key, dir, kind }) => {
    const src = item[key];
    item[key] = null;
    let buf = await readPerso(dir, item.slug);
    if (!buf && src && /^https?:/.test(src)) {
      try {
        const r = await fetch(src);
        if (r.ok) buf = Buffer.from(await r.arrayBuffer());
      } catch { /* image ignorée */ }
    }
    if (!buf) { if (src) miss++; return; }
    try {
      const base = path.join(IMG_DIR, dir, item.slug);
      await fs.mkdir(path.dirname(base), { recursive: true });
      if (kind === "photo") {
        await sharp(buf).rotate().resize(360, 360, { fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toFile(`${base}.webp`);
        item[key] = `/images/${dir}/${item.slug}.webp`;
      } else {
        const bg = await edgeColor(buf);
        await sharp(buf).rotate().resize(640, 360, { fit: "contain", background: bg }).flatten({ background: bg }).webp({ quality: 80 }).toFile(`${base}.webp`);
        await sharp(buf).rotate().resize(320, 320, { fit: "contain", background: bg }).flatten({ background: bg }).webp({ quality: 80 }).toFile(`${base}-carre.webp`);
        item[key] = `/images/${dir}/${item.slug}.webp`;
        item.logoSquare = `/images/${dir}/${item.slug}-carre.webp`;
      }
      ok++;
    } catch { miss++; }
  };
  const queue = jobs.slice();
  await Promise.all(Array.from({ length: 6 }, async () => { while (queue.length) await run(queue.shift()); }));
  console.log(`✓ Images : ${ok} prêtes${miss ? `, ${miss} impossibles à lire` : ""}`);
}

/** Couleur dominante du pourtour de l'image (blanc si le bord est transparent). */
async function edgeColor(buf) {
  const { data, info } = await sharp(buf).resize(48, 48, { fit: "fill" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const n = info.width, groups = new Map();
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (x > 1 && x < n - 2 && y > 1 && y < n - 2) continue;
    const i = (y * n + x) * 4;
    const px = data[i + 3] < 32 ? [255, 255, 255] : [data[i], data[i + 1], data[i + 2]];
    const k = px.map((v) => v >> 4).join(",");
    const g = groups.get(k) || { n: 0, r: 0, g: 0, b: 0 };
    g.n++; g.r += px[0]; g.g += px[1]; g.b += px[2];
    groups.set(k, g);
  }
  const best = [...groups.values()].sort((a, b) => b.n - a.n)[0];
  const [r, g, b] = [best.r, best.g, best.b].map((v) => Math.round(v / best.n));
  return { r, g, b, alpha: 1 };
}

async function readPerso(dir, slug) {
  for (const ext of ["webp", "png", "jpg", "jpeg"]) {
    try { return await fs.readFile(path.join(PERSO_DIR, dir, `${slug}.${ext}`)); } catch {}
  }
  return null;
}
