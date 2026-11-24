// Charge les données tennis et prépare tout ce dont les pages ont besoin.
import data from "../data/tennis.json";

export const meta = data.meta;
export const competitions = data.competitions;
export const editions = data.editions; // triées de la plus récente à la plus ancienne
export const players = data.players;

export const compById = new Map(competitions.map((c) => [c.id, c]));
export const playerById = new Map(players.map((p) => [p.id, p]));

export const SURFACES = {
  "Terre Battue": { label: "Terre battue", color: "var(--terre)" },
  "Gazon": { label: "Gazon", color: "var(--gazon)" },
  "Dur": { label: "Dur", color: "var(--dur)" },
  "Indoor": { label: "Indoor", color: "var(--indoor)" },
  "Moquette": { label: "Moquette", color: "var(--moquette)" },
};
export const surf = (s) => (SURFACES[s] ? { ...SURFACES[s], known: true } : { label: s || "", color: "var(--court)", known: !!s });
// Bandeau d'une page tournoi : couleur de la surface, or pour les Jeux olympiques
export const isOlympic = (c) => c.category === "JO" || /olympi/i.test(c.name);
export const heroBg = (c, S) => {
  const col = isOlympic(c) ? "#c9a227" : isOtherComp(c) ? compColor(c) : S.color;
  return `background:linear-gradient(160deg,color-mix(in srgb,${col} 85%,#fff),color-mix(in srgb,${col} 80%,#000))`;
};

export const ROLES = { V: "Titre", F: "Finale", SF: "Demi-finale", QF: "Quart" };
const ROLE_KEYS = [["v", "V"], ["f", "F"], ["sf", "SF"], ["qf", "QF"]];

// Catégories d'édition (colonne « Catégorie » des éditions)
export const isGC = (e) => e.category === "Grand Chelem";
export const isM1000 = (e) => e.category === "Masters 1000";
export const isFinals = (e) => e.category === "Masters";
export const isJO = (e) => e.category === "JO";
export const catLabel = (c) => (c === "Masters" ? "ATP Finals" : c === "JO" ? "Jeux Olympiques" : c || "—");

// Index : éditions par compétition, résultats par joueur
export const editionsByComp = new Map();
export const resultsByPlayer = new Map();
for (const e of editions) {
  if (!editionsByComp.has(e.compId)) editionsByComp.set(e.compId, []);
  editionsByComp.get(e.compId).push(e);
  for (const [k, r] of ROLE_KEYS) {
    for (const pid of e[k]) {
      if (!resultsByPlayer.has(pid)) resultsByPlayer.set(pid, []);
      resultsByPlayer.get(pid).push({ e, r });
    }
  }
}

export function playerStats(pid) {
  const res = resultsByPlayer.get(pid) || [];
  const V = res.filter((x) => x.r === "V").map((x) => x.e);
  return {
    results: res,
    titles: V.length,
    gc: V.filter(isGC).length,
    m1000: V.filter(isM1000).length,
    finals: V.filter(isFinals).length,
    jo: V.filter(isJO).length,
    lostFinals: res.filter((x) => x.r === "F").length,
    semis: res.filter((x) => x.r === "SF").length,
    quarters: res.filter((x) => x.r === "QF").length,
  };
}

export const statsById = new Map(players.map((p) => [p.id, playerStats(p.id)]));

// Les quatre Grands Chelems, dans l'ordre du calendrier
export const slams = competitions
  .filter((c) => c.category === "Grand Chelem")
  .map((c) => {
    const months = (editionsByComp.get(c.id) || []).filter((e) => e.start).map((e) => Number(e.start.slice(5, 7)));
    months.sort((a, b) => a - b);
    return { c, m: months.length ? months[Math.floor(months.length / 2)] : 13 };
  })
  .sort((a, b) => a.m - b.m)
  .map((x) => x.c);

// Ordre d'affichage des catégories de compétitions (comme les vues Notion)
export const COMP_GROUPS = [
  { title: "Grands Chelems", match: (c) => c.category === "Grand Chelem" },
  { title: "ATP Finals et Jeux Olympiques", match: (c) => c.category === "ATP Finals" || c.category === "JO" },
  { title: "Masters 1000", match: (c) => c.category === "Masters 1000" },
  { title: "ATP 500", match: (c) => c.category === "ATP 500" },
  { title: "ATP 250", match: (c) => c.category === "ATP 250" },
  { title: "Autres tournois", match: () => true },
];
// Les tournois du groupe « Autres tournois » (pas de logo)
const MAIN_CATS = ["Grand Chelem", "ATP Finals", "JO", "Masters 1000", "ATP 500", "ATP 250"];
export const isOtherComp = (c) => !MAIN_CATS.includes(c.category);
/** Surface sur laquelle le tournoi s'est le plus joué ; à égalité, celle jouée le plus récemment. */
export function mainSurface(c) {
  const by = {};
  for (const e of editionsByComp.get(c.id) || []) {
    const s = e.surface || c.surface; if (!s) continue;
    by[s] = by[s] || { n: 0, last: 0 }; by[s].n++; by[s].last = Math.max(by[s].last, e.year);
  }
  const best = Object.entries(by).sort((a, b) => b[1].n - a[1].n || b[1].last - a[1].last)[0];
  return best ? best[0] : c.surface;
}
/** Couleur d'un tournoi : surface la plus jouée pour les « Autres tournois », surface actuelle sinon. */
export const compColor = (c) => surf(isOtherComp(c) ? mainSurface(c) : c.surface).color;

export function groupCompetitions() {
  const left = new Set(competitions);
  return COMP_GROUPS.map((g) => {
    const items = [...left].filter(g.match);
    items.forEach((c) => left.delete(c));
    return { title: g.title, items };
  }).filter((g) => g.items.length);
}

export const initials = (s) =>
  String(s).replace(/🟥/g, "").split(/[\s-]+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export const frDate = (s, withYear = false) =>
  s ? new Date(s + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", ...(withYear ? { year: "numeric" } : {}) }) : "";

export const plural = (n, one, many) => `${n} ${n > 1 ? many || one + "s" : one}`;

export const dataDate = new Date(meta.generatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

// Liens
export const url = {
  tennis: "/tennis/",
  comp: (c) => `/tennis/tournois/${c.slug}/`,
  edition: (e) => `/tennis/editions/${e.slug}/`,
  player: (p) => `/tennis/joueurs/${p.slug}/`,
  players: "/tennis/joueurs/",
};
