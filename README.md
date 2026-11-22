# Portail des sports

Site statique généré à partir de la base Notion « Portail des sports » : tennis, cyclisme et Formule 1.
Chaque compétition, édition et joueur a sa page, et toutes les pages sont reliées entre elles.

## Comment ça marche

1. `scripts/fetch-notion.mjs` lit les bases Notion via l'API officielle, relie les éditions aux athlètes, équipes et compétitions, prépare les images et écrit un fichier par sport dans `src/data/`.
2. Astro fabrique une page HTML par compétition, édition et joueur (`src/pages/`).
3. Cloudflare héberge le résultat. Une action GitHub relance la construction chaque lundi.

Sans clé Notion, le site se construit avec un extrait de la base (`sample-data/tennis.json`), pratique pour tester.

## Hébergement sur Cloudflare (Workers)

Le site est hébergé comme fichiers statiques sur Cloudflare Workers (réglages dans `wrangler.jsonc`).

- Commande de construction : `npm run build`
- Commande de déploiement : `npx wrangler deploy`
- Variables de **construction** (Settings → Build → Variables and secrets) :
  - `NOTION_TOKEN` : la clé de l'intégration Notion (chiffrée)
  - `NODE_VERSION` : `22`

Chaque envoi de code sur la branche `main` reconstruit le site.

## Mise à jour

Pour l'instant, la mise à jour se lance à la main depuis Cloudflare (Worker → Deployments → relancer la dernière construction).

### Activer la mise à jour automatique chaque semaine (plus tard)

0. Dans `.github/workflows/maj-hebdo.yml`, retirer le `#` devant les lignes `schedule` et `cron`.

1. Dans Cloudflare : Worker `portail-des-sports` → **Settings → Builds → Deploy Hooks**, créer un hook (branche `main`) et copier son adresse.
2. Dans GitHub : dépôt → **Settings → Secrets and variables → Actions → New repository secret**, nom `CLOUDFLARE_DEPLOY_HOOK`, valeur = l'adresse du hook.
3. Pour lancer une mise à jour à la main : onglet **Actions → Mise à jour hebdomadaire → Run workflow**.

GitHub met en pause les tâches planifiées d'un dépôt public sans activité depuis 60 jours ; il prévient par e-mail, et un clic dans l'onglet Actions les relance.

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

Les noms des bases et des colonnes Notion utilisées sont dans `scripts/config.mjs` (tennis) et `src/sports/config.js` (cyclisme, F1 ; d'autres sports peuvent y être ajoutés). Un sport dont la lecture échoue est affiché vide sans bloquer le reste du site.

Images perso des autres sports : `images-perso/<sport>/<dossier>/<slug>.png`, par ex. `images-perso/f1/pilotes/charles-leclerc.png`, `images-perso/cyclisme/competitions/tour-de-france.png`.
