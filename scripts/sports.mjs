// Lecture et mise en forme des sports décrits dans src/sports/config.js.
// Les données incomplètes sont acceptées : ce qui manque est simplement omis,
// et listé dans les points à vérifier.
import { slugify, uniqueSlug } from "./lib.mjs";

/** Année et libellé de saison d'une édition à partir de sa date ou de son nom. */
export function seasonOf(start, name) {
  if (start) return { year: Number(String(start).slice(0, 4)), season: String(start).slice(0, 4) };
  const s = String(name || "");
  const m = s.match(/\b((?:18|19|20)\d{2})\s*[-/–]\s*((?:18|19|20)?\d{2})\b/);
  if (m) {
    const a = Number(m[1]);
    const b = m[2].length === 2 ? Number(String(a).slice(0, 2) + m[2]) : Number(m[2]);
    if (b === a + 1) return { year: a, season: `${a}-${b}` };
  }
  const y = s.match(/\b((?:18|19|20)\d{2})\b/);
  return y ? { year: Number(y[1]), season: y[1] } : { year: null, season: null };
}

/** Nom d'une édition sans l'année ou la saison. */
export function stripSeason(name) {
  return String(name || "")
    .replace(/\b(?:18|19|20)\d{2}\s*[-/–]\s*(?:(?:18|19|20)?\d{2})\b/, "")
    .replace(/\b(?:18|19|20)\d{2}\b/, "")
    .replace(/^\s*[-–:·]\s*|\s*[-–:·]\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Construit le jeu de données d'un sport.
 * raw = { comps:[{id,name,category,logo,zone[],place,active}], editions:[{id,name,start,end,comp[],host[],pos:{K:[ids]},awards:{label:[ids]}}],
 *         main:[{id,name,photo,nat[],retired,info:{}}], second:[...], zones:[{id,name,emoji}] }
 */
export function buildSportDataset(cfg, raw, meta) {
  const warnings = [];
  const errors = raw.errors || [];
  const zoneById = new Map(raw.zones.map((z) => [z.id, z]));
  const zoneOf = (ids) => { const z = (ids || []).map((id) => zoneById.get(id)).filter(Boolean)[0]; return z ? { name: z.name, emoji: z.emoji || "" } : null; };

  // Entités (équipes, joueurs, coureurs, pilotes, constructeurs)
  const groups = {};
  const idsByGroup = {};
  for (const g of Object.keys(cfg.groups)) {
    const used = new Set();
    groups[g] = (raw[g] || [])
      .filter((e) => e.name)
      .sort((a, b) => a.name.localeCompare(b.name, "fr"))
      .map((e) => ({ id: e.id, slug: uniqueSlug(slugify(e.name), used), name: e.name, photo: e.photo || null, nat: zoneOf(e.nat), retired: !!e.retired, info: e.info || {}, teams: e.teams || [] }));
    idsByGroup[g] = new Set(groups[g].map((e) => e.id));
  }

  // Compétitions
  const compIds = new Set(raw.comps.filter((c) => c.name).map((c) => c.id));
  const tmp = [];
  for (const e of raw.editions) {
    const compId = (e.comp || []).find((id) => compIds.has(id));
    if (!compId) {
      const cited = (e.comp || []).map((id) => { const c = raw.comps.find((x) => x.id === id); return c ? `${id} (lue, nom « ${c.name} »)` : `${id} (non lue)`; });
      warnings.push(`Édition sans compétition : « ${e.name} »${cited.length ? ` — liée à ${cited.join(", ")}` : " — aucune compétition liée"}`);
      continue;
    }
    const { year, season } = seasonOf(e.start, e.name);
    if (!year) { warnings.push(`Édition sans année (ni date, ni année dans le nom) : « ${e.name} »`); continue; }
    const pos = {};
    for (const [k, { ids, group }] of Object.entries(e.pos || {})) {
      const ok = ids.filter((id) => { if (idsByGroup[group]?.has(id)) return true; warnings.push(`Lien introuvable (${k}) dans « ${e.name} »`); return false; });
      if (ok.length) pos[k] = ok;
    }
    const awards = [];
    for (const a of e.awards || []) {
      const ok = a.ids.filter((id) => idsByGroup[a.group]?.has(id));
      if (ok.length) awards.push({ label: a.label, group: a.group, ids: ok });
    }
    if (!Object.keys(pos).length && !awards.length) warnings.push(`Édition sans résultat : « ${e.name} »`);
    tmp.push({ id: e.id, compId, year, season, start: e.start || null, end: e.end || null, name: stripSeason(e.name) || e.name, host: zoneOf(e.host), pos, awards });
  }
  const withEd = new Set(tmp.map((e) => e.compId));
  const usedC = new Set();
  const comps = raw.comps
    .filter((c) => c.name && withEd.has(c.id))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"))
    .map((c) => ({ id: c.id, slug: uniqueSlug(slugify(c.name), usedC), name: c.name, category: c.category || null, logo: c.logo || null, zone: zoneOf(c.zone), place: c.place || "", active: c.active ?? null }));
  const compSlug = new Map(comps.map((c) => [c.id, c.slug]));
  const usedE = new Set();
  tmp.sort((a, b) => (b.start || `${b.year}`).localeCompare(a.start || `${a.year}`) || b.year - a.year);
  const editions = tmp.map((e) => ({ ...e, slug: uniqueSlug(`${compSlug.get(e.compId)}-${e.season}`, usedE) }));

  // Les fiches sans aucun résultat ni distinction n'ont pas de page (elles restent dans les listes) :
  // cela évite des pages vides et garde le site sous la limite de 20 000 fichiers.
  const referenced = new Set(editions.flatMap((e) => [...Object.values(e.pos).flat(), ...e.awards.flatMap((a) => a.ids)]));
  for (const list of Object.values(groups)) for (const x of list) x.ref = referenced.has(x.id);

  return { meta: { ...meta, errors, read: { comps: raw.comps.length, editions: raw.editions.length, main: (raw.main || []).length, second: (raw.second || []).length }, generatedAt: new Date().toISOString() }, sport: cfg.key, comps, editions, groups, warnings: [...new Set(warnings)] };
}

/** Lit toutes les bases d'un sport via les fonctions d'accès fournies. */
export async function readSport(cfg, { readAll: readAllRaw, page, text, num, sel, multi, rel, date, file }, zones) {
  const errors = [];
  // Chaque base est lue séparément : si l'une échoue, les autres restent affichées.
  const readAll = async (id, label) => {
    try { return await readAllRaw(id, label); }
    catch (err) {
      const msg = `${label} : ${err.code ? err.code + " – " : ""}${err.message || err}`;
      console.warn(`⚠ Lecture impossible · ${msg}`);
      errors.push(msg);
      return [];
    }
  };
  const comps = [];
  const compOf = (pg, s) => ({
    id: pg.id, name: text(pg, s.name), category: sel(pg, s.category), logo: file(pg, s.logo),
    zone: rel(pg, s.zone), place: s.place ? text(pg, s.place) : "", active: s.active ? sel(pg, s.active) : null,
  });
  for (const s of cfg.comps) {
    for (const pg of await readAll(s.id, `${cfg.label} · compétitions`)) comps.push(compOf(pg, s));
  }
  const editions = [];
  for (const s of cfg.editions) {
    for (const pg of await readAll(s.id, `${cfg.label} · éditions`)) {
      const d = s.date ? date(pg, s.date) : { start: null, end: null };
      const pos = {};
      for (const [k, col, group] of s.positions) { const ids = rel(pg, col); if (ids.length) pos[k] = { ids, group }; }
      editions.push({
        id: pg.id, name: text(pg, s.name), start: d.start, end: d.end,
        comp: s.comp.flatMap((c) => rel(pg, c)), host: s.host ? rel(pg, s.host) : [],
        pos, awards: (s.awards || []).map((a) => ({ label: a.label, group: a.group, ids: rel(pg, a.col) })),
      });
    }
  }
  // Compétitions citées par des éditions mais absentes de la lecture : on les demande une par une.
  if (page) {
    const known = new Set(comps.map((c) => c.id));
    const missing = [...new Set(editions.map((e) => e.comp[0]).filter((id) => id && !known.has(id)))].slice(0, 50);
    for (const id of missing) {
      try {
        const pg = await page(id);
        const parentId = pg.parent?.data_source_id || pg.parent?.database_id;
        const s = cfg.comps.find((c) => c.id === parentId) || cfg.comps[0];
        if (pg.in_trash || pg.archived) { errors.push(`Compétition ${id} : la fiche est dans la corbeille de Notion`); continue; }
        const c = compOf(pg, s);
        comps.push(c);
        console.log(`✓ ${cfg.label} · compétition récupérée à part : ${c.name}`);
        if (!c.name) errors.push(`Compétition ${id} récupérée mais sans nom lisible. Propriétés reçues : ${Object.entries(pg.properties || {}).map(([k, v]) => `${k} (${v.type})`).join(", ")}`);
      } catch (err) {
        errors.push(`Compétition ${id} (citée par des éditions) : ${err.code ? err.code + " – " : ""}${err.message || err}`);
      }
    }
  }
  const ent = async (g) => {
    const s = cfg.entities[g];
    if (!s) return [];
    return (await readAll(s.id, `${cfg.label} · ${cfg.groups[g].label.toLowerCase()}`)).map((pg) => {
      const info = {};
      for (const [col, type, prefix] of s.info || []) {
        const v = type === "number" ? num(pg, col) : type === "multi" ? multi(pg, col).join(", ") : type === "select" ? sel(pg, col) : text(pg, col);
        if (v !== null && v !== "" && v !== undefined) info[col] = prefix ? `${prefix} ${v}` : String(v);
      }
      return { id: pg.id, name: text(pg, s.name), photo: s.photo ? file(pg, s.photo) : null, nat: s.nat ? rel(pg, s.nat) : [], retired: s.retired ? !!sel(pg, s.retired) : false, info, teams: s.teams ? rel(pg, s.teams) : [] };
    });
  };
  return { comps, editions, main: await ent("main"), second: await ent("second"), zones, errors };
}
