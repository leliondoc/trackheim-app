/* oxlint-disable typescript/no-floating-promises */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  creerSuiviCombattant,
  modifierFigurineTable,
  modifierSuiviCombattant,
} from '../lib/battle-state.ts';
import { campagneAvecCapitaineTest } from './fixtures.ts';

test('mettre une figurine à zéro PV alimente le bilan hors combat', () => {
  const combattant = campagneAvecCapitaineTest().combattants[0];
  const suivi = creerSuiviCombattant(combattant);
  const horsCombat = modifierSuiviCombattant(suivi, combattant, {
    figurinesTable: modifierFigurineTable(suivi, 0, {
      pointsVieActuels: 0,
    }),
  });

  assert.equal(horsCombat.figurinesTable[0].etatTable, 'Hors de combat');
  assert.equal(horsCombat.horsCombat, 1);
  assert.equal(horsCombat.figurinesTable[0].pointsVieActuels, 0);

  const retabli = modifierSuiviCombattant(horsCombat, combattant, {
    horsCombat: 0,
  });
  assert.equal(retabli.figurinesTable[0].etatTable, 'Debout');
  assert.equal(retabli.horsCombat, 0);
  assert.equal(retabli.figurinesTable[0].pointsVieActuels, 1);
});

test('un groupe suit chaque figurine et ses PV indépendamment', () => {
  const base = campagneAvecCapitaineTest().combattants[0];
  const combattant = {
    ...base,
    id: 'groupe-test',
    quantite: 3,
    chef: false,
    statistiques: { ...base.statistiques, pointsVie: 2 },
  };
  const suivi = creerSuiviCombattant(combattant);
  const uneBlessure = modifierSuiviCombattant(suivi, combattant, {
    figurinesTable: modifierFigurineTable(suivi, 1, {
      pointsVieActuels: 1,
      etatTable: 'Sonné',
    }),
  });
  const unePerte = modifierSuiviCombattant(uneBlessure, combattant, {
    figurinesTable: modifierFigurineTable(uneBlessure, 2, {
      etatTable: 'Hors de combat',
    }),
  });

  assert.deepEqual(
    unePerte.figurinesTable.map((figurine) => [
      figurine.pointsVieActuels,
      figurine.etatTable,
    ]),
    [
      [2, 'Debout'],
      [1, 'Sonné'],
      [0, 'Hors de combat'],
    ],
  );
  assert.equal(unePerte.horsCombat, 1);

  const groupeEntier = modifierSuiviCombattant(unePerte, combattant, {
    horsCombat: 3,
  });
  assert.equal(groupeEntier.horsCombat, 3);
  assert.ok(
    groupeEntier.figurinesTable.every(
      (figurine) =>
        figurine.etatTable === 'Hors de combat' &&
        figurine.pointsVieActuels === 0,
    ),
  );
});

test('le snapshot de bataille reste fixe après pertes ou renforts', () => {
  const combattant = {
    ...campagneAvecCapitaineTest().combattants[0],
    id: 'groupe-snapshot',
    quantite: 2,
    chef: false,
  };
  const suivi = creerSuiviCombattant(combattant);
  const apresRenfort = modifierSuiviCombattant(
    suivi,
    { ...combattant, quantite: 4 },
    { horsCombat: 1 },
  );

  assert.equal(apresRenfort.effectifInitial, 2);
  assert.equal(apresRenfort.figurinesTable.length, 2);
  assert.equal(apresRenfort.horsCombat, 1);
});
