// Charge les données tennis et prépare tout ce dont les pages ont besoin.
import data from "../data/tennis.json";

export const meta = data.meta;
export const competitions = data.competitions;
export const editions = data.editions.map((e) => Object.assign(e, { r16: e.r16 || [], b: e.b || [] })); // triées de la plus récente à la plus ancienne
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
// ATP Finals et Next Gen ATP Finals : les « quarts » correspondent à la phase de groupe
export const isGroupStage = (c) => c.category === "ATP Finals" || /finals/i.test(c.name);
/** Libellés des tours selon le tournoi (pluriel, singulier) */
export const roundLabels = (c) => ({
  v: isOlympic(c) ? "Médaille d'or" : "Vainqueur",
  f: isOlympic(c) ? "Médaille d'argent" : "Finaliste",
  sf: "Demi-finalistes",
  qf: isGroupStage(c) ? "Phase de groupe" : "Quart-de-finalistes",
  qfCol: isGroupStage(c) ? "Phase de groupe" : "Quarts de finale",
  r16: "Huitièmes de finaliste",
  r16Col: "Huitièmes de finale",
  fCol: isOlympic(c) ? "Médaille d'argent" : "Finale",
  vCol: isOlympic(c) ? "Médaille d'or" : "Vainqueur",
});
export const heroBg = (c, S) => {
  const col = isOlympic(c) ? "#c9a227" : isOtherComp(c) ? compColor(c) : S.color;
  return `background:linear-gradient(160deg,color-mix(in srgb,${col} 85%,#fff),color-mix(in srgb,${col} 80%,#000))`;
};

export const ROLES = { V: "Titre", F: "Finale", SF: "Demi-finale", QF: "Quart", R16: "Huitième" };
const ROLE_KEYS = [["v", "V"], ["f", "F"], ["sf", "SF"], ["qf", "QF"], ["r16", "R16"]];

// Catégories d'édition (colonne « Catégorie » des éditions)
export const isGC = (e) => e.category === "Grand Chelem";
export const isM1000 = (e) => e.category === "Masters 1000";
export const isFinals = (e) => e.category === "Masters";
export const isJO = (e) => e.category === "JO";
export const catLabel = (c) => (c === "Masters" ? "ATP Finals" : c === "JO" ? "Jeux Olympiques" : c || "—");

const MAIN_ED_CATS = ["Grand Chelem", "Masters 1000", "Masters", "JO", "ATP 500", "ATP 250", "Super Series", "Regular Series"];

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
    a500: V.filter((e) => e.category === "ATP 500").length,
    a250: V.filter((e) => e.category === "ATP 250").length,
    superS: V.filter((e) => e.category === "Super Series").length,
    regularS: V.filter((e) => e.category === "Regular Series").length,
    other: V.filter((e) => !MAIN_ED_CATS.includes(e.category)).length, // anciennes catégories, hors circuit…
    lostFinals: res.filter((x) => x.r === "F").length,
    semis: res.filter((x) => x.r === "SF").length,
    quarters: res.filter((x) => x.r === "QF").length,
    r16: res.filter((x) => x.r === "R16").length,
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

// Anciens noms des catégories ATP. La base utilise partout les noms mis en place en 2009.
export const CAT_HISTORY = {
  "Masters 1000": [["1990–1992", "ATP Championship Series Single Week"], ["1993–1999", "ATP Super 9"], ["2000–2003", "ATP Tennis Masters Series"], ["2004–2008", "ATP Masters Series"], ["2009–2018", "ATP World Tour Masters 1000"], ["depuis 2019", "ATP Masters 1000"]],
  "ATP 500": [["1990–1997", "ATP Championship Series"], ["1998–2008", "ATP International Series Gold"], ["2009–2018", "ATP World Tour 500"], ["depuis 2019", "ATP 500"]],
  "ATP 250": [["1990–1997", "ATP World Series"], ["1998–2008", "ATP International Series"], ["2009–2018", "ATP World Tour 250"], ["depuis 2019", "ATP 250"]],
};
export const catHistoryText = (cat) => (CAT_HISTORY[cat] ? CAT_HISTORY[cat].map(([y, n]) => `${y} : ${n}`).join(" · ") : "");

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
    return { title: g.title, items, history: CAT_HISTORY[g.title] };
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
  records: "/tennis/records/",
};

// ---------- Records et exploits ----------
const when = (e) => e.start || `${e.year}`;
const byDate = (a, b) => when(a).localeCompare(when(b));
const nameOfComp = (id) => compById.get(id)?.name || "";

// Séries de titres consécutifs sur un même tournoi (éditions successives de la base)
export const streaks = [];
for (const [cid, list] of editionsByComp) {
  // Une édition sans vainqueur unique, ou un trou de plus de 2 ans dans la base, coupe la série
  // (2 ans : une édition annulée, comme Wimbledon 2020, ne la coupe pas).
  const eds = list.slice().sort(byDate);
  let run = [];
  const flush = () => { if (run.length >= 2) streaks.push({ pid: run[0].v[0], compId: cid, n: run.length, from: run[0], to: run.at(-1) }); };
  for (const e of eds) {
    if (e.v.length !== 1) { flush(); run = []; continue; }
    if (run.length && run[0].v[0] === e.v[0] && e.year - run.at(-1).year <= 2) run.push(e);
    else { flush(); run = [e]; }
  }
  flush();
}
streaks.sort((a, b) => b.n - a.n || byDate(a.from, b.from));
export const streaksByPlayer = new Map();
export const streaksByComp = new Map();
for (const s of streaks) {
  if (!streaksByPlayer.has(s.pid)) streaksByPlayer.set(s.pid, []);
  streaksByPlayer.get(s.pid).push(s);
  if (!streaksByComp.has(s.compId)) streaksByComp.set(s.compId, []);
  streaksByComp.get(s.compId).push(s);
}

// Exploits en Grand Chelem
const slamEds = editions.filter((e) => isGC(e) && e.v.length === 1 && slams.some((c) => c.id === e.compId)).sort(byDate);
function slamFeats(pid) {
  const won = slamEds.filter((e) => e.v[0] === pid);
  if (!won.length) return [];
  const feats = [];
  const N = slams.length; // 4
  // Grand Chelem en carrière : l'année où il gagne le dernier des quatre
  const seen = new Set();
  let career = null;
  for (const e of won) { seen.add(e.compId); if (!career && seen.size === N) career = e; }
  if (career) feats.push({ key: "career", label: "Grand Chelem en carrière", detail: `complété à ${nameOfComp(career.compId)} ${career.year}`, year: career.year, e: career });
  // Grand Chelem calendaire : les quatre la même année
  const byYear = new Map();
  for (const e of won) { if (!byYear.has(e.year)) byYear.set(e.year, new Set()); byYear.get(e.year).add(e.compId); }
  const cal = [...byYear].filter(([, s]) => s.size === N).map(([y]) => y);
  if (cal.length) feats.push({ key: "calendar", label: "Grand Chelem calendaire", detail: cal.join(", "), year: cal[0] });
  // Golden Slam en carrière : les quatre + l'or olympique
  const gold = editions.filter((e) => isJO(e) && e.v.includes(pid)).sort(byDate);
  if (career && gold.length) {
    const y = Math.max(career.year, gold[0].year);
    feats.push({ key: "golden", label: "Golden Slam en carrière", detail: `Grand Chelem en carrière + or olympique (${gold.map((e) => e.year).join(", ")})`, year: y });
    if (cal.some((yy) => gold.some((g) => g.year === yy))) feats.push({ key: "golden-cal", label: "Golden Slam calendaire", detail: cal.filter((yy) => gold.some((g) => g.year === yy)).join(", "), year: cal[0] });
  }
  // Quatre Grands Chelems d'affilée (hors année calendaire)
  let run = [];
  const runs = [];
  for (const e of slamEds) {
    if (e.v[0] === pid) run.push(e);
    else { if (run.length >= N) runs.push(run); run = []; }
  }
  if (run.length >= N) runs.push(run);
  for (const r of runs) {
    if (r.length === N && r.every((e) => e.year === r[0].year)) continue; // déjà compté en calendaire
    feats.push({ key: "row", label: `${r.length} Grands Chelems d'affilée`, detail: `de ${nameOfComp(r[0].compId)} ${r[0].year} à ${nameOfComp(r.at(-1).compId)} ${r.at(-1).year}`, year: r.at(-1).year });
  }
  return feats;
}
export const featsByPlayer = new Map(players.map((p) => [p.id, slamFeats(p.id)]).filter(([, f]) => f.length));

// ---------- Face-à-face en finale ----------
// Chaque finale avec un vainqueur et un finaliste uniques (finale olympique comprise)
export const finals = editions.filter((e) => e.v.length === 1 && e.f.length === 1);
export const h2hByPlayer = new Map(); // pid -> Map(adversaire -> { w, l, eds: [{ e, won }] })
const addH2H = (a, b, e, won) => {
  if (!h2hByPlayer.has(a)) h2hByPlayer.set(a, new Map());
  const m = h2hByPlayer.get(a);
  if (!m.has(b)) m.set(b, { w: 0, l: 0, eds: [] });
  const x = m.get(b);
  won ? x.w++ : x.l++;
  x.eds.push({ e, won });
};
for (const e of finals) { addH2H(e.v[0], e.f[0], e, true); addH2H(e.f[0], e.v[0], e, false); }
// Rivalités : les paires qui se sont le plus affrontées en finale
export const rivalries = [];
for (const [a, m] of h2hByPlayer) for (const [b, x] of m) if (a < b) rivalries.push({ a, b, n: x.w + x.l, w: x.w, l: x.l, eds: x.eds });
rivalries.sort((p, q) => q.n - p.n);

// ---------- Bilan par surface ----------
export const surfaceOf = (e) => e.surface || compById.get(e.compId)?.surface || "";
export function surfaceRecord(pid) {
  const by = {};
  for (const { e, r } of resultsByPlayer.get(pid) || []) {
    const k = surfaceOf(e) || "?";
    const s = (by[k] ||= { V: 0, F: 0, SF: 0, QF: 0, R16: 0 });
    s[r]++;
  }
  return by;
}
