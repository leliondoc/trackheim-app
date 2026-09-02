/* oxlint-disable typescript/no-floating-promises */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  bandeDepuisHash,
  hashPourBande,
  hashPourVue,
  vueDepuisHash,
} from '../lib/app-navigation.ts';

test('les vues possèdent des URL stables et partageables', () => {
  assert.equal(hashPourVue('campaign'), '#/campaign');
  assert.equal(vueDepuisHash('#/library'), 'library');
  assert.equal(vueDepuisHash('#/library/horde-orque'), 'library');
  assert.equal(hashPourBande('horde-orque'), '#/library/horde-orque');
  assert.equal(bandeDepuisHash('#/library/horde-orque'), 'horde-orque');
  assert.equal(bandeDepuisHash('#/library'), null);
});

test('une URL inconnue revient à la vue d’ensemble', () => {
  assert.equal(vueDepuisHash('#/inconnue'), 'overview');
  assert.equal(vueDepuisHash(''), 'overview');
});
