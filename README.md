# Trackheim

Créateur de bande et tracker de campagne Mordheim, conçu comme une application web statique.

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
