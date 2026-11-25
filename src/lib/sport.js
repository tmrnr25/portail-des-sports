// Prépare les données d'un sport (cyclisme, F1) pour les pages.
import { SPORTS, POS, sportByKey } from "../sports/config.js";

const files = import.meta.glob("../data/*.json", { eager: true, import: "default" });
const raw = (key) => files[`../data/${key}.json`];

export { SPORTS, POS };

const cache = new Map();
export function getSport(key) {
  if (cache.has(key)) return cache.get(key);
  const cfg = sportByKey[key];
  const d = raw(key) || { comps: [], editions: [], groups: {}, meta: { source: "vide", generatedAt: new Date().toISOString() } };
  const groups = Object.fromEntries(Object.keys(cfg.groups).map((g) => [g, d.groups?.[g] || []]));
  const ent = new Map();
  for (const [g, list] of Object.entries(groups)) for (const e of list) ent.set(e.id, { ...e, group: g });
  const compById = new Map(d.comps.map((c) => [c.id, c]));
  const editionsByComp = new Map();
  const resultsByEntity = new Map(); // id -> [{e, k}]
  const awardsByEntity = new Map(); // id -> [{e, label}]
  for (const e of d.editions) {
    if (!editionsByComp.has(e.compId)) editionsByComp.set(e.compId, []);
    editionsByComp.get(e.compId).push(e);
    for (const [k, ids] of Object.entries(e.pos)) for (const id of ids) {
      if (!resultsByEntity.has(id)) resultsByEntity.set(id, []);
      resultsByEntity.get(id).push({ e, k });
    }
    for (const a of e.awards) for (const id of a.ids) {
      if (!awardsByEntity.has(id)) awardsByEntity.set(id, []);
      awardsByEntity.get(id).push({ e, label: a.label });
    }
  }
  const isWin = (k) => !!POS[k]?.win;
  const isPodium = (k) => !!POS[k]?.podium;
  const statsOf = (id) => {
    const r = resultsByEntity.get(id) || [];
    const counts = {};
    r.forEach((x) => (counts[x.k] = (counts[x.k] || 0) + 1));
    return { results: r, wins: r.filter((x) => isWin(x.k)).length, podiums: r.filter((x) => isPodium(x.k)).length, counts, awards: awardsByEntity.get(id) || [] };
  };
  const stats = new Map([...ent.keys()].map((id) => [id, statsOf(id)]));
  const base = `/${key}/`;
  const url = {
    home: base,
    comp: (c) => `${base}competitions/${c.slug}/`,
    edition: (e) => `${base}editions/${e.slug}/`,
    entity: (x) => `${base}${cfg.groups[x.group].path}/${x.slug}/`,
    group: (g) => `${base}${cfg.groups[g].path}/`,
  };
  const s = {
    cfg, meta: d.meta, comps: d.comps, editions: d.editions, groups, ent, compById, editionsByComp, stats, url,
    isWin, isPodium, empty: d.editions.length === 0,
    hasPage: (x) => x && x.ref !== false,
    // Positions réellement utilisées par une liste d'éditions, dans l'ordre de POS
    usedPositions: (eds) => Object.keys(POS).filter((k) => eds.some((e) => e.pos[k]?.length)),
    groupOfPos: (k) => (k.startsWith("C") ? "second" : "main"),
    awardWord: cfg.awardWord || { one: "distinction", many: "distinctions", title: "Distinctions", col: "Distinction" },
    secondLabel: cfg.secondLabel || "Finaliste ou 2e",
    // Couleur (et encre du texte) d'une compétition
    compTheme: (c) => {
      const cc = cfg.compColors;
      if (cc?.fromLogo && c?.logoAccent) return { color: c.logoAccent, dark: isLight(c.logoAccent) };
      const n = norm(c?.name || "");
      const hit = cc?.byName?.find(([re]) => re.test(n));
      if (hit) return { color: hit[1], dark: hit[2] === "dark" };
      return { color: cc?.byCategory?.[c?.category] || cfg.color, dark: false };
    },
  };
  cache.set(key, s);
  return s;
}

// couleur claire -> texte foncé par-dessus
const isLight = (hex) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.3; };
const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export const heroBg = (color) => `linear-gradient(160deg,color-mix(in srgb,${color} 85%,#fff),color-mix(in srgb,${color} 85%,#000))`;
export const seasonLabel = (e) => e.season || String(e.year);
export const initials = (s) => String(s).replace(/🟥/g, "").split(/[\s-]+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
export const plural = (n, one, many) => `${n} ${n > 1 ? many || one + "s" : one}`;
export const frDate = (s, withYear = false) =>
  s ? new Date(s + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", ...(withYear ? { year: "numeric" } : {}) }) : "";

// Regroupement des compétitions par catégorie, dans un ordre lisible
const CAT_ORDER = ["Coupe", "Grand Tour", "Monument", "Championnat", "Classique", "Tour", "Grand Prix"];
export function groupComps(comps) {
  const by = new Map();
  for (const c of comps) {
    const k = c.category && c.category !== "❌" ? c.category : "Autres";
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(c);
  }
  return [...by.entries()]
    .sort((a, b) => (CAT_ORDER.indexOf(a[0]) + 1 || 99) - (CAT_ORDER.indexOf(b[0]) + 1 || 99) || a[0].localeCompare(b[0], "fr"))
    .map(([title, items]) => ({ title: title === "Coupe" ? "Coupes" : title === "Championnat" ? "Championnats" : title === "Grand Tour" ? "Grands Tours" : title === "Monument" ? "Monuments" : title === "Classique" ? "Classiques" : title === "Grand Prix" ? "Grands Prix" : title, items }));
}
