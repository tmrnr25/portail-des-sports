// Lit les bases Notion, prépare les images et écrit un fichier de données par sport
// dans src/data/ (tennis.json, football.json, cyclisme.json, f1.json).
// Sans clé NOTION_TOKEN, utilise les données d'exemple (pour tester en local).
import notionPkg from "@notionhq/client";
const { Client, collectAllDataSourceRows } = notionPkg;
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { TENNIS, COLS } from "./config.mjs";
import { buildDataset } from "./lib.mjs";
import { buildSportDataset, readSport } from "./sports.mjs";
import { SPORTS } from "../src/sports/config.js";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DATA = path.join(ROOT, "src/data");
const REPORT = path.join(ROOT, "rapport-donnees.txt");
const IMG_DIR = path.join(ROOT, "public/images");
const PERSO_DIR = path.join(ROOT, "images-perso"); // tes propres images, prioritaires

const token = process.env.NOTION_TOKEN;
await fs.mkdir(DATA, { recursive: true });
const write = (name, obj) => fs.writeFile(path.join(DATA, `${name}.json`), JSON.stringify(obj));
const emptySport = (cfg, note) => ({
  meta: { source: "vide", note, generatedAt: new Date().toISOString() }, sport: cfg.key,
  comps: [], editions: [], groups: Object.fromEntries(Object.keys(cfg.groups).map((g) => [g, []])), warnings: [],
});

if (!token) {
  if (process.env.CF_PAGES || process.env.WORKERS_CI || process.env.CI) {
    console.error("✖ NOTION_TOKEN manquant : ajoute la clé de l'intégration Notion dans les variables d'environnement.");
    process.exit(1);
  }
  console.warn("⚠ Pas de NOTION_TOKEN : utilisation des données d'exemple (sample-data/).");
  const tennis = JSON.parse(await fs.readFile(path.join(ROOT, "sample-data/tennis.json"), "utf8"));
  await processImages(tennisJobs(tennis));
  await write("tennis", tennis);
  for (const cfg of SPORTS) {
    let ds;
    try { ds = JSON.parse(await fs.readFile(path.join(ROOT, `sample-data/${cfg.key}.json`), "utf8")); }
    catch { ds = emptySport(cfg, "Pas de données d'exemple pour ce sport."); }
    await processImages(sportJobs(cfg, ds));
    await write(cfg.key, ds);
  }
  process.exit(0);
}

const notion = new Client({ auth: token, retry: { maxRetries: 6 } });

// ---------- lecture des propriétés ----------
const prop = (page, name) => page.properties?.[name];
const txt = (p) => {
  if (!p) return "";
  const arr = p.title || p.rich_text || [];
  return arr.map((t) => t.plain_text).join("").trim();
};
const nm = (p) => (p && typeof p.number === "number" ? p.number : null);
const sl = (p) => p?.select?.name || p?.status?.name || null;
const ms = (p) => (p?.multi_select || []).map((o) => o.name);
const rl = (p) => (p?.relation || []).map((r) => r.id);
const dt = (p) => ({ start: p?.date?.start || null, end: p?.date?.end || null });
const fl = (p) => {
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

const report = [];

// ---------- zones (pays), communes à tous les sports ----------
const rawZ = await readAll(TENNIS.zones, "Zones géographiques");
const zones = rawZ.map((pg) => ({ id: pg.id, name: txt(prop(pg, COLS.zone.name)), emoji: emojiOf(pg) }));

// ---------- tennis ----------
{
  const [rawC, rawE, rawP] = [
    await readAll(TENNIS.competitions, "Tennis · compétitions"),
    await readAll(TENNIS.editions, "Tennis · éditions"),
    await readAll(TENNIS.players, "Tennis · joueurs"),
  ];
  const c = COLS;
  const dataset = buildDataset({
    competitions: rawC.map((pg) => ({
      id: pg.id, name: txt(prop(pg, c.comp.name)), category: sl(prop(pg, c.comp.category)),
      surface: sl(prop(pg, c.comp.surface)), city: txt(prop(pg, c.comp.city)),
      created: nm(prop(pg, c.comp.created)), disappeared: nm(prop(pg, c.comp.disappeared)),
      logo: fl(prop(pg, c.comp.logo)), zone: rl(prop(pg, c.comp.zone)),
    })),
    editions: rawE.map((pg) => {
      const d = dt(prop(pg, c.edition.date));
      return {
        id: pg.id, name: txt(prop(pg, c.edition.name)), start: d.start, end: d.end,
        surface: sl(prop(pg, c.edition.surface)), category: sl(prop(pg, c.edition.category)),
        comp: rl(prop(pg, c.edition.comp)), winner: rl(prop(pg, c.edition.winner)),
        finalist: rl(prop(pg, c.edition.finalist)), semi: rl(prop(pg, c.edition.semi)),
        quarter: rl(prop(pg, c.edition.quarter)),
      };
    }),
    players: rawP.map((pg) => ({
      id: pg.id, name: txt(prop(pg, c.player.name)), best: nm(prop(pg, c.player.best)),
      retired: !!sl(prop(pg, c.player.retired)), photo: fl(prop(pg, c.player.photo)),
      nationality: rl(prop(pg, c.player.nationality)),
    })).filter((p) => p.name),
    zones,
  }, { source: "notion" });
  await processImages(tennisJobs(dataset));
  await write("tennis", dataset);
  console.log(`✓ Tennis : ${dataset.competitions.length} compétitions, ${dataset.editions.length} éditions, ${dataset.players.length} joueurs`);
  report.push(["Tennis", dataset.warnings]);
}

// ---------- autres sports ----------
const acc = {
  readAll,
  text: (pg, col) => txt(prop(pg, col)), num: (pg, col) => nm(prop(pg, col)), sel: (pg, col) => sl(prop(pg, col)),
  multi: (pg, col) => ms(prop(pg, col)), rel: (pg, col) => rl(prop(pg, col)), date: (pg, col) => dt(prop(pg, col)), file: (pg, col) => fl(prop(pg, col)),
};
for (const cfg of SPORTS) {
  let ds;
  try {
    const raw = await readSport(cfg, acc, zones);
    ds = buildSportDataset(cfg, raw, { source: "notion" });
    await processImages(sportJobs(cfg, ds));
    const counts = Object.entries(ds.groups).map(([g, l]) => `${l.length} ${cfg.groups[g].label.toLowerCase()}`).join(", ");
    console.log(`✓ ${cfg.label} : ${ds.comps.length} compétitions, ${ds.editions.length} éditions, ${counts}`);
  } catch (err) {
    // Un sport illisible (base non partagée avec l'intégration, colonne renommée…) ne bloque pas le site.
    console.warn(`⚠ ${cfg.label} : lecture impossible (${err.code || ""} ${err.message || err}). Le sport sera affiché vide.`);
    ds = emptySport(cfg, "Lecture Notion impossible lors de la dernière mise à jour.");
    ds.warnings = [`Lecture impossible : ${err.message || err}`];
  }
  await write(cfg.key, ds);
  report.push([cfg.label, ds.warnings]);
}

// ---------- rapport ----------
const total = report.reduce((n, [, w]) => n + w.length, 0);
await fs.writeFile(REPORT, `Rapport du ${new Date().toLocaleString("fr-FR")}\n\n` +
  report.map(([s, w]) => `## ${s} (${w.length})\n` + w.map((x) => "- " + x).join("\n")).join("\n\n") + "\n");
console.log(`ℹ ${total} points à vérifier dans Notion :`);
for (const [s, w] of report) {
  if (!w.length) continue;
  console.log(`  ${s} (${w.length})`);
  for (const x of w.slice(0, 80)) console.log("   - " + x);
  if (w.length > 80) console.log(`   … et ${w.length - 80} autres`);
}

// ---------- images ----------
function tennisJobs(ds) {
  return [
    ...ds.players.map((p) => ({ item: p, key: "photo", dir: "joueurs", kind: "photo" })),
    ...ds.competitions.map((x) => ({ item: x, key: "logo", dir: "tournois", kind: "logo" })),
  ];
}
function sportJobs(cfg, ds) {
  return [
    ...ds.comps.map((x) => ({ item: x, key: "logo", dir: `${cfg.key}/competitions`, kind: "logo" })),
    ...Object.entries(ds.groups).flatMap(([g, list]) =>
      list.map((x) => ({ item: x, key: "photo", dir: `${cfg.key}/${cfg.groups[g].path}`, kind: cfg.groups[g].photoKind }))),
  ];
}

// Priorité : images-perso/<dossier>/<slug>.(png|jpg|jpeg|webp) puis le fichier Notion.
// Les logos sont affichés en entier : on les place dans un cadre (16:9 pour les cartes,
// carré pour l'en-tête) dont le fond reprend la couleur du bord du logo.
// Les photos sont simplement réduites. Tout est converti en WebP léger.
async function processImages(jobs) {
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
        item[key === "logo" ? "logoSquare" : "photoSquare"] = `/images/${dir}/${item.slug}-carre.webp`;
      }
      ok++;
    } catch { miss++; }
  };
  const queue = jobs.slice();
  await Promise.all(Array.from({ length: 6 }, async () => { while (queue.length) await run(queue.shift()); }));
  if (jobs.length) console.log(`✓ Images : ${ok} prêtes${miss ? `, ${miss} impossibles à lire` : ""}`);
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
