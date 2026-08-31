import assert from 'node:assert/strict';
import test from 'node:test';

import {
  importerCampagneDepuisJson,
  nomFichierCampagne,
  serialiserCampagne,
} from '../lib/campaign-transfer.ts';
import { etatInitial } from '../lib/mordheim-data.ts';

void test('une campagne exportée peut être réimportée sans perte', () => {
  const campagne = {
    ...etatInitial,
    nomCampagne: 'Les Brumes de Mordheim',
    nomBande: 'La Compagnie du Lion',
  };
  const json = serialiserCampagne(campagne, new Date('2026-08-31T12:00:00Z'));

  assert.deepEqual(importerCampagneDepuisJson(json), campagne);
});

void test('un état de campagne brut reste importable', () => {
  assert.deepEqual(
    importerCampagneDepuisJson(JSON.stringify(etatInitial)),
    etatInitial,
  );
});

void test('un fichier invalide est refusé avec une erreur lisible', () => {
  assert.throws(
    () => importerCampagneDepuisJson('{"version":3}'),
    /campagne importée est invalide/i,
  );
});

void test('le nom de fichier est portable', () => {
  assert.equal(
    nomFichierCampagne({
      ...etatInitial,
      nomCampagne: 'À l’Ombre !',
      nomBande: 'Sœurs de Sigmar',
    }),
    'a-l-ombre-soeurs-de-sigmar.json',
  );
});
