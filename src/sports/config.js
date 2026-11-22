// Description des sports (hors tennis, qui a ses propres pages).
// Utilisé à la fois par le script de lecture Notion et par les pages du site.
// Pour corriger un nom de colonne Notion, c'est ici.

/** Places et tours possibles dans une édition. `win` = compte comme une victoire. */
export const POS = {
  V: { label: "Vainqueur", col: "Vainqueur", short: "V", cls: "V", win: true, podium: true, kpi: ["victoire", "victoires"] },
  F: { label: "Finaliste", col: "Finale", short: "F", cls: "F", podium: true, kpi: ["finale perdue", "finales perdues"] },
  SF: { label: "Demi-finaliste", col: "Demi-finales", short: "½", cls: "SF", podium: true, kpi: ["demi-finale", "demi-finales"] },
  QF: { label: "Quart de finaliste", col: "Quarts de finale", short: "¼", cls: "QF", kpi: ["quart de finale", "quarts de finale"] },
  P1: { label: "1er", short: "1", cls: "V", win: true, podium: true, kpi: ["victoire", "victoires"] },
  P2: { label: "2e", short: "2", cls: "F", podium: true, kpi: ["deuxième place", "deuxièmes places"] },
  P3: { label: "3e", short: "3", cls: "SF", podium: true, kpi: ["troisième place", "troisièmes places"] },
  P4: { label: "4e", short: "4", cls: "QF", kpi: ["quatrième place", "quatrièmes places"] },
  P5: { label: "5e", short: "5", cls: "QF", kpi: ["cinquième place", "cinquièmes places"] },
  T5: { label: "Top 5", short: "T5", cls: "QF", kpi: ["top 5", "tops 5"] },
  T10: { label: "Top 10", short: "T10", cls: "QF", kpi: ["top 10", "tops 10"] },
  C1: { label: "1er", short: "1", cls: "V", win: true, podium: true, kpi: ["victoire", "victoires"] },
  C2: { label: "2e", short: "2", cls: "F", podium: true, kpi: ["deuxième place", "deuxièmes places"] },
  C3: { label: "3e", short: "3", cls: "SF", podium: true, kpi: ["troisième place", "troisièmes places"] },
};

export const SPORTS = [
  {
    key: "football",
    label: "Football",
    color: "#1e5b3f",
    emoji: "⚽",
    compWord: { one: "compétition", many: "compétitions" },
    groups: {
      main: { path: "equipes", label: "Équipes", one: "équipe", fem: true, photoKind: "logo" },
      second: { path: "joueurs", label: "Joueurs", one: "joueur", photoKind: "photo" },
    },
    comps: [
      { id: "2cc0d481-baea-8159-b110-000b437b0ecc", name: "Nom", category: "Type de Compétition", logo: "Logo", zone: "Zone Géographique" },
      { id: "0590d481-baea-83be-ae98-07ff3cf39566", name: "Nom", category: "Type de Compétition", logo: "Logo", zone: "Zone Géographique" },
    ],
    editions: [
      {
        id: "2a70d481-baea-806a-b00b-000b3495ea23", // Editions Football Coupe
        name: "Nom", comp: ["Compétitions football"], host: "Pays hôte",
        positions: [["V", "Vainqueur", "main"], ["F", "Finaliste", "main"], ["SF", "Demi-finaliste", "main"], ["QF", "Quart de finaliste", "main"]],
        awards: [
          ["Meilleur Joueur", "Meilleur joueur"], ["Meilleur(s) Buteur(s)", "Meilleur buteur"], ["Meilleur(s) Passeur(s)", "Meilleur passeur"],
          ["Meilleur Jeune", "Meilleur jeune"], ["Meilleur(s) Gardien(s)", "Meilleur gardien"], ["Meilleur(s) Défenseur(s)", "Meilleur défenseur"],
          ["Meilleur(s) Milieu(x)", "Meilleur milieu"], ["Meilleur(s) Attaquant(s)", "Meilleur attaquant"],
        ].map(([col, label]) => ({ col, label, group: "second" })),
      },
      {
        id: "7890d481-baea-8373-b0c5-877f4cac05d2", // Editions Football Championnat
        name: "Nom", comp: ["Championnats", "Compétitions football"], host: "Pays hôte",
        positions: [["P1", "Vainqueur", "main"], ["P2", "Deuxième", "main"], ["P3", "Troisième", "main"], ["P4", "Quatrième", "main"], ["P5", "Cinquième", "main"]],
        awards: [
          ["Meilleur Joueur", "Meilleur joueur"], ["Meilleur(s) Buteur(s)", "Meilleur buteur"], ["Meilleur(s) Passeur(s)", "Meilleur passeur"],
          ["Meilleur Jeune", "Meilleur jeune"], ["Meilleur(s) Gardien(s)", "Meilleur gardien"], ["Meilleur(s) Défenseur(s)", "Équipe type : défense"],
          ["Meilleur(s) Milieu(x)", "Équipe type : milieu"], ["Meilleur(s) Attaquant(s)", "Équipe type : attaque"],
        ].map(([col, label]) => ({ col, label, group: "second" })),
      },
    ],
    entities: {
      main: { id: "2a70d481-baea-80af-b662-000b58f10f32", name: "Nom de l'équipe", photo: "Blason", nat: "Pays",
        info: [["Type d'Equipe", "select"], ["Surnom", "text"], ["Année de création", "number", "Créée en"], ["Disparition", "number", "Disparue en"]] },
      second: { id: "2a70d481-baea-80e5-ac3d-000bc419cf5b", name: "Postes", nat: "Nationalité", teams: "Equipes",
        info: [["Poste", "multi"]] },
    },
  },
  {
    key: "cyclisme",
    label: "Cyclisme",
    color: "#b8452a",
    emoji: "🚴",
    compWord: { one: "course", many: "courses" },
    groups: {
      main: { path: "coureurs", label: "Coureurs", one: "coureur", photoKind: "photo" },
    },
    comps: [
      { id: "30f0d481-baea-81ef-8829-000b74c9c27a", name: "Nom", category: "Type de Compétition", logo: "Logo", zone: "Zone Géographique" },
    ],
    editions: [
      {
        id: "3100d481-baea-80b0-b4dd-000b249d374b",
        name: "Nom", date: "Date", comp: ["Compétitions Cyclisme"],
        positions: [["P1", "Vainqueur", "main"], ["P2", "Deuxième", "main"], ["P3", "Troisème", "main"], ["T5", "Top 5", "main"], ["T10", "Top 10", "main"]],
        awards: [
          { col: "Points", label: "Classement par points", group: "main" },
          { col: "Grimpeur", label: "Meilleur grimpeur", group: "main" },
          { col: "Jeune", label: "Meilleur jeune", group: "main" },
        ],
      },
    ],
    entities: {
      main: { id: "3100d481-baea-804f-b44d-000bf674e265", name: "Nom", photo: "Photo", nat: "Nationalité", retired: "Retraité" },
    },
  },
  {
    key: "f1",
    label: "Formule 1",
    color: "#8c1d24",
    emoji: "🏎️",
    compWord: { one: "Grand Prix", many: "Grands Prix" },
    groups: {
      main: { path: "pilotes", label: "Pilotes", one: "pilote", photoKind: "photo" },
      second: { path: "constructeurs", label: "Constructeurs", one: "constructeur", photoKind: "logo" },
    },
    comps: [
      { id: "30f0d481-baea-8171-ab32-000b7cec1373", name: "Nom", category: "Type de Compétition", logo: "Circuit", zone: "Zone Géographique", place: "Lieu", active: "Inscrit au calendrier" },
    ],
    editions: [
      {
        id: "30f0d481-baea-8036-8e61-000bd55132aa",
        name: "Nom", comp: ["Compétitions F1"],
        positions: [
          ["P1", "Vainqueur", "main"], ["P2", "Deuxième", "main"], ["P3", "Troisième", "main"], ["P4", "Quatrième", "main"], ["P5", "Cinquième", "main"],
          ["C1", "Constructeur", "second"], ["C2", "Deuxième constructeur", "second"], ["C3", "Troisième constrcuteur", "second"],
        ],
        awards: [{ col: "Pole Position", label: "Pole position", group: "main" }],
      },
    ],
    entities: {
      main: { id: "30f0d481-baea-80f1-94b5-000b918ee417", name: "Nom", photo: "Photo", nat: "Nationalité", retired: "Retraité", teams: "Equipes" },
      second: { id: "30f0d481-baea-80e1-bda9-000b7afd09f2", name: "Nom", photo: "Logo", nat: "Pays" },
    },
  },
];

export const sportByKey = Object.fromEntries(SPORTS.map((s) => [s.key, s]));
