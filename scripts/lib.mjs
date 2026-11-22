// Fonctions partagées : slugs, normalisation des données.

export function slugify(s) {
  return String(s)
    .replace(/🟥/g, "")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "sans-nom";
}

/** Donne un slug unique dans `used` (ajoute -2, -3… si besoin). */
export function uniqueSlug(base, used) {
  let s = base, i = 2;
  while (used.has(s)) s = `${base}-${i++}`;
  used.add(s);
  return s;
}

/** Année d'une édition : la date si elle existe, sinon l'année en tête du nom (« 2022 - Tel Aviv Open »). */
export function editionYear(start, name) {
  if (start) return Number(String(start).slice(0, 4));
  const m = String(name || "").match(/^(\d{4})/);
  return m ? Number(m[1]) : null;
}

/** Retire l'année en tête du nom d'une édition. */
export function editionLabel(name) {
  return String(name || "").replace(/^\d{4}\s*[-–]\s*/, "").trim();
}

/**
 * Construit le jeu de données final à partir d'enregistrements bruts
 * (déjà extraits de Notion ou de l'exemple), et vérifie la cohérence.
 */
export function buildDataset({ competitions, editions, players, zones }, meta) {
  const zoneById = new Map(zones.map((z) => [z.id, z]));
  const playerIds = new Set(players.map((p) => p.id));
  const compIds = new Set(competitions.map((c) => c.id));
  const warnings = [];

  // Joueurs
  const usedP = new Set();
  const P = players
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "fr"))
    .map((p) => {
      const z = p.nationality.map((id) => zoneById.get(id)).filter(Boolean)[0];
      return {
        id: p.id, slug: uniqueSlug(slugify(p.name), usedP), name: p.name,
        best: p.best ?? null, retired: !!p.retired, photo: p.photo || null,
        nat: z ? { name: z.name, emoji: z.emoji || "" } : null,
      };
    });

  // Éditions (seulement celles reliées à une compétition connue)
  const tmp = [];
  for (const e of editions) {
    const compId = e.comp.find((id) => compIds.has(id));
    if (!compId) { warnings.push(`Édition sans compétition : « ${e.name} »`); continue; }
    const year = editionYear(e.start, e.name);
    if (!year) { warnings.push(`Édition sans année : « ${e.name} »`); continue; }
    if (!e.start) warnings.push(`Édition sans date (année tirée du nom) : « ${e.name} »`);
    const keep = (ids, role) => ids.filter((id) => {
      if (playerIds.has(id)) return true;
      warnings.push(`Joueur introuvable (${role}) dans « ${e.name} »`); return false;
    });
    tmp.push({
      id: e.id, compId, year, start: e.start || null, end: e.end || null,
      name: editionLabel(e.name) || e.name, surface: e.surface || null, category: e.category || null,
      v: keep(e.winner, "vainqueur"), f: keep(e.finalist, "finaliste"),
      sf: keep(e.semi, "demi-finaliste"), qf: keep(e.quarter, "quart"),
    });
  }

  // Compétitions : uniquement celles qui ont au moins une édition de tennis
  const withEd = new Set(tmp.map((e) => e.compId));
  const usedC = new Set();
  const C = competitions
    .filter((c) => withEd.has(c.id))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"))
    .map((c) => {
      const z = (c.zone || []).map((id) => zoneById.get(id)).filter(Boolean)[0];
      return {
        id: c.id, slug: uniqueSlug(slugify(c.name), usedC), name: c.name,
        category: c.category || null, surface: c.surface || null,
        city: c.city || "", created: c.created ?? null, disappeared: c.disappeared ?? null,
        logo: c.logo || null, zone: z ? { name: z.name, emoji: z.emoji || "" } : null,
      };
    });
  const compSlug = new Map(C.map((c) => [c.id, c.slug]));

  // Slugs d'édition : <compétition>-<année>
  const usedE = new Set();
  tmp.sort((a, b) => (b.start || `${b.year}`).localeCompare(a.start || `${a.year}`));
  const E = tmp.map((e) => ({ ...e, slug: uniqueSlug(`${compSlug.get(e.compId)}-${e.year}`, usedE) }));

  // Contrôles de cohérence utiles pour corriger la base
  for (const e of E) {
    if (e.v.length === 0) warnings.push(`Édition sans vainqueur : « ${e.year} - ${e.name} »`);
  }

  return {
    meta: { ...meta, generatedAt: new Date().toISOString() },
    competitions: C, editions: E, players: P,
    warnings: [...new Set(warnings)],
  };
}
