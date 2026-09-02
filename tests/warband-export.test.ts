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
  assert.match(detaille, /Équipement : Dague/);
  assert.doesNotMatch(detaille, /Aucun équipement enregistré/);
  assert.equal(nomBaseExport(campagne), 'bande-de-test');
});

test('n’invente pas de dague pour un profil qui n’en reçoit pas', () => {
  const campagne = campagneAvecCapitaineTest();
  campagne.combattants[0].dagueDeBase = false;

  const detaille = construireExportTexteDetaille(campagne);

  assert.match(detaille, /Équipement : Aucun équipement enregistré/);
  assert.doesNotMatch(detaille, /Équipement : Dague/);
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
  assert.match(html, /overflow-wrap: anywhere/);
});

test('la feuille imprimable protège les contenus longs et les fiches multipages', () => {
  const campagne = campagneAvecCapitaineTest();
  campagne.nomBande = 'B'.repeat(160);
  campagne.combattants[0].notes = 'N'.repeat(10_000);

  const html = construireFeuilleImprimable(campagne);

  assert.match(html, /min-width: 0/);
  assert.match(html, /\.fighter \{ break-inside: auto; \}/);
  assert.match(html, new RegExp('B{160}'));
  assert.match(html, new RegExp('N{10000}'));
});
