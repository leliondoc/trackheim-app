import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { construireFeuilleImprimable } from '../lib/warband-export.ts';
import { campagneAvecCapitaineTest } from '../tests/fixtures.ts';

const campagne = campagneAvecCapitaineTest();
campagne.nomBande = 'Les Veilleurs de la Porte';
campagne.campagneActive = true;
campagne.nomCampagne = 'Les Cendres de Mordheim';
campagne.combattants[0].equipementIds = ['epee', 'armure-legere'];
campagne.combattants[0].competences = ['Coup précis', 'Langage de bataille'];
campagne.combattants[0].blessures = ['Vieille blessure'];

const dossier = resolve('output/pdf');
mkdirSync(dossier, { recursive: true });
writeFileSync(
  resolve(dossier, 'trackheim-feuille-bande.html'),
  construireFeuilleImprimable(campagne),
  'utf8',
);
