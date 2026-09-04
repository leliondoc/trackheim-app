# Trackheim

Créateur de bande et tracker de campagne Mordheim, conçu comme une application web statique.

## Statut du projet

Trackheim est un projet fan non officiel, gratuit, sans publicité et sans affiliation ni approbation de Games Workshop Limited. Mordheim et les noms associés restent la propriété de leurs titulaires respectifs.

Le dépôt sépare le code original de l'application, les données de jeu et les ressources appartenant à des tiers. La licence du code ne confère aucun droit sur les marques, règles, statistiques ou autres contenus tiers.

## Données

Les campagnes sont enregistrées dans le stockage local du navigateur. Aucun compte, serveur applicatif ou service de base de données n’est utilisé. L’interface permet d’exporter la campagne active en JSON et de réimporter ce fichier sur le même appareil ou un autre.

Le stockage local appartient au navigateur : effacer les données du site supprime les campagnes qui n’ont pas été exportées.

Une donnée locale illisible ou d’un format non pris en charge reste conservée
sans modification et peut être téléchargée pour récupération. Les différences
de composition avec les règles courantes donnent un avertissement sans empêcher
la sauvegarde des registres existants. Les imports restent soumis aux contrôles
de structure, références connues et complexité. Si une même campagne est ouverte
dans deux onglets, un conflit explicite permet de choisir la version à conserver.

La restauration JSON est accessible dès l’accueil et depuis « Mes bandes ».
Le stockage refusé par le navigateur active un mode mémoire avec export explicite.
Les exports compacts et les anciens exports indentés sont acceptés, dans la limite
de 512 Ko de données utiles et de 4 Mo pour le fichier d’import.

Les 49 fiches distinguent la référence documentaire et le suivi proposé par
l’application. Les règles particulières de table et certaines annexes se résolvent
avec les sources et les notes du joueur ; leur présence dans une fiche ne signifie
pas que chaque effet est automatique.

## Architecture

- `app/` contient l’interface principale et les feuilles de style modulaires ;
- `components/` contient les composants métier et les primitives accessibles ;
- `lib/` contient les règles pures, la validation, la navigation et la persistance ;
- `tests/` couvre les règles, les transferts JSON, le stockage et les interactions essentielles.

Les campagnes structurées sont validées avant toute importation ou écriture.
Les données restent locales à l’appareil tant que l’utilisateur ne les exporte
pas lui-même.

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
npm run format:check
npm run build
```

## Publication

Chaque push sur `main` déclenche le workflow GitHub Actions qui valide, construit et publie le contenu de `dist/` sur GitHub Pages.

## Licence et crédits

Le code original de Trackheim est distribué sous licence MIT. Les ressources tierces conservent leurs licences respectives ; leur détail figure dans [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
