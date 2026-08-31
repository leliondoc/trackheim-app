# Trackheim

Créateur de bande et tracker de campagne Mordheim, conçu comme une application web statique.

## Statut du projet

Trackheim est un projet fan non officiel, gratuit, sans publicité et sans affiliation ni approbation de Games Workshop Limited. Mordheim et les noms associés restent la propriété de leurs titulaires respectifs.

Le dépôt sépare le code original de l'application, les données de jeu et les ressources appartenant à des tiers. La licence du code ne confère aucun droit sur les marques, règles, statistiques ou autres contenus tiers.

## Données

Les campagnes sont enregistrées dans le stockage local du navigateur. Aucun compte, serveur applicatif ou service de base de données n’est utilisé. L’interface permet d’exporter la campagne active en JSON et de réimporter ce fichier sur le même appareil ou un autre.

Le stockage local appartient au navigateur : effacer les données du site supprime les campagnes qui n’ont pas été exportées.

## Développement

Prérequis : Node.js 22.13 ou supérieur.

```bash
npm ci
npm run dev
```

Commandes de validation :

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## Publication

Chaque push sur `main` déclenche le workflow GitHub Actions qui valide, construit et publie le contenu de `dist/` sur GitHub Pages.

## Licence et crédits

Le code original de Trackheim est distribué sous licence MIT. Les ressources tierces conservent leurs licences respectives ; leur détail figure dans [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
