// Identifiants des bases Notion du « Portail des sports ».
// Ce sont les « data sources » (collection://…) visibles dans Notion.
export const TENNIS = {
  competitions: "2df0d481-baea-81d1-9067-000bd08e3b22", // COMPÉTITIONS (toutes disciplines)
  editions: "3100d481-baea-8109-9f60-000bfb4f59aa",     // Editions Tennis
  players: "3100d481-baea-8001-8c3b-000b8acb2f65",      // 🏆 Classement (joueurs)
  zones: "2a70d481-baea-8039-8001-000b130252c8",        // Zones Géographiques (pays)
};

// Noms des colonnes Notion utilisées. À modifier ici si une colonne est renommée.
export const COLS = {
  comp: {
    name: "Nom", category: "Catégorie actuelle", surface: "Surface actuelle",
    city: "Ville", created: "Création", disappeared: "Disparition", logo: "Logo", zone: "Zone Géographique",
  },
  edition: {
    name: "Tournoi", date: "Date", surface: "Surface", category: "Catégorie", comp: "Compétitions Tennis",
    winner: "Vainqueur", finalist: "Finaliste", semi: "Demi-finaliste", quarter: "Quart de finaliste", r16: "1/8 de finaliste", place: "Lieu",
    bronze: "Médaille de bronze", // facultatif (Jeux olympiques)
    finalStatus: "Statut finale", // facultatif : Non jouée, Abandon, Forfait, Disqualification
  },
  player: {
    name: "Joueurs", best: "Meilleur classement", retired: "Retraité", photo: "Photo", nationality: "Nationalité",
  },
  zone: { name: "Nom" },
};
