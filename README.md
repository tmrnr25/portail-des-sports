# Portail des sports

Site statique généré à partir de la base Notion « Portail des sports ».
Chaque compétition, édition et joueur a sa page, et toutes les pages sont reliées entre elles.

## Comment ça marche

1. `scripts/fetch-notion.mjs` lit les bases Notion via l'API officielle, relie les éditions aux joueurs et aux compétitions, prépare les images et écrit `src/data/tennis.json`.
2. Astro fabrique une page HTML par compétition, édition et joueur (`src/pages/`).
3. Cloudflare Pages héberge le résultat. Une action GitHub relance la construction chaque lundi.

Sans clé Notion, le site se construit avec un extrait de la base (`sample-data/tennis.json`), pratique pour tester.

## Mise en ligne sur Cloudflare Pages

1. Dans Cloudflare : **Workers & Pages → Créer → onglet Pages → Importer un dépôt Git**, puis choisir `portail-des-sports`.
2. Réglages de construction :
   - Framework : **Astro**
   - Commande de construction : `npm run build`
   - Dossier de sortie : `dist`
3. Variables d'environnement (type **Secret** pour la clé) :
   - `NOTION_TOKEN` : la clé de l'intégration Notion
   - `NODE_VERSION` : `22`
4. Lancer le déploiement.

## Mise à jour chaque semaine

1. Dans Cloudflare : projet → **Paramètres → Builds → Deploy hooks**, créer un hook (branche `main`) et copier son adresse.
2. Dans GitHub : dépôt → **Settings → Secrets and variables → Actions → New repository secret**, nom `CLOUDFLARE_DEPLOY_HOOK`, valeur = l'adresse du hook.
3. Pour lancer une mise à jour à la main : onglet **Actions → Mise à jour hebdomadaire → Run workflow**.

## Tes propres images

Les images de Notion sont récupérées automatiquement. Pour en remplacer ou en ajouter une, dépose un fichier dans :

- `images-perso/joueurs/<slug>.png` (par ex. `novak-djokovic.png`)
- `images-perso/tournois/<slug>.png` (par ex. `roland-garros.png`)

Le slug est la fin de l'adresse de la page (`/tennis/joueurs/novak-djokovic/`). Formats acceptés : png, jpg, jpeg, webp.

## Rapport de données

À chaque construction, le journal affiche le nombre de points à vérifier dans Notion (éditions sans date, sans vainqueur, liens vers des joueurs introuvables…). En local, le détail est dans `rapport-donnees.txt`.

## En local

```bash
npm install
npm run build        # avec NOTION_TOKEN=… pour les vraies données
npm run preview
```

Les noms des bases et des colonnes Notion utilisées sont dans `scripts/config.mjs`.
