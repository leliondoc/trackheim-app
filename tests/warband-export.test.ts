/* oxlint-disable typescript/no-floating-promises */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  construireExportTexteDetaille,
  construireExportTexteSimple,
  construireFeuilleImprimable,
  nomBaseExport,
} from '../lib/warband-export.ts';
import { campagneAvecCapitaineTest } from './fixtures.ts';

test('les exports texte restent lisibles hors de Trackheim', () => {
  const campagne = campagneAvecCapitaineTest();
  campagne.combattants[0].competences = ['Coup précis'];
  campagne.combattants[0].blessures = ['Vieille blessure'];

  const simple = construireExportTexteSimple(campagne);
  const detaille = construireExportTexteDetaille(campagne);

  assert.match(simple, /Bande de test/);
  assert.match(simple, /Wilhelm Krieger/);
  assert.match(detaille, /TRACKHEIM \| FEUILLE DE BANDE/);
  assert.match(detaille, /Compétences : Coup précis/);
  assert.match(detaille, /Blessures : Vieille blessure/);
  assert.equal(nomBaseExport(campagne), 'bande-de-test');
});

test('la feuille imprimable neutralise le contenu saisi par le joueur', () => {
  const campagne = campagneAvecCapitaineTest();
  campagne.nomBande = '<script>alert(1)</script>';
  campagne.combattants[0].notes = '<img src=x onerror=alert(1)>';

  const html = construireFeuilleImprimable(campagne);

  assert.doesNotMatch(html, /<script>alert/);
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /@page \{ size: A4/);
});
