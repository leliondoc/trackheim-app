import assert from 'node:assert/strict';
import test from 'node:test';

import {
  importerCampagneDepuisJson,
  nomFichierCampagne,
  serialiserCampagne,
} from '../lib/campaign-transfer.ts';
import { campagneVideTest } from './fixtures.ts';
import { validerCampagneV4 } from '../lib/campaign-validation.ts';

void test('une campagne exportée peut être réimportée sans perte', () => {
  const campagne = {
    ...campagneVideTest(),
    nomCampagne: 'Les Brumes de Mordheim',
    nomBande: 'La Compagnie du Lion',
  };
  const json = serialiserCampagne(campagne, new Date('2026-08-31T12:00:00Z'));

  assert.deepEqual(importerCampagneDepuisJson(json), campagne);
});

void test('un état brut sans enveloppe Trackheim est refusé', () => {
  assert.throws(
    () => importerCampagneDepuisJson(JSON.stringify(campagneVideTest())),
    /format de sauvegarde Trackheim/i,
  );
});

void test('un fichier invalide est refusé avec une erreur lisible', () => {
  assert.throws(
    () => importerCampagneDepuisJson('{"version":3}'),
    /format de sauvegarde Trackheim/i,
  );
});

void test('le nom de fichier est portable', () => {
  assert.equal(
    nomFichierCampagne({
      ...campagneVideTest(),
      nomCampagne: 'À l’Ombre !',
      nomBande: 'Sœurs de Sigmar',
    }),
    'a-l-ombre-soeurs-de-sigmar.json',
  );
});

void test('restaure une grande campagne valide, y compris un ancien export indenté', () => {
  const campagne = campagneVideTest();
  campagne.parties = Array.from({ length: 1000 }, (_, i) => ({
    id: `partie-${i}`,
    scenario: 'Escarmouche',
    adversaire: 'Autre',
    resultat: 'Victoire',
    date: '2026-09-04',
    notes: 'x'.repeat(360),
  }));
  assert.equal(validerCampagneV4(campagne).ok, true);
  const exportCompact = serialiserCampagne(campagne);
  const ancienExport = JSON.stringify(JSON.parse(exportCompact), null, 2);
  assert.ok(new TextEncoder().encode(ancienExport).byteLength > 512 * 1024);
  assert.deepEqual(importerCampagneDepuisJson(exportCompact), campagne);
  assert.deepEqual(importerCampagneDepuisJson(ancienExport), campagne);
});
