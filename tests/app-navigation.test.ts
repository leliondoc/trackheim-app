/* oxlint-disable typescript/no-floating-promises */
import assert from 'node:assert/strict';
import test from 'node:test';

import { hashPourVue, vueDepuisHash } from '../lib/app-navigation.ts';

test('les vues possèdent des URL stables et partageables', () => {
  assert.equal(hashPourVue('campaign'), '#/campaign');
  assert.equal(vueDepuisHash('#/library'), 'library');
});

test('une URL inconnue revient à la vue d’ensemble', () => {
  assert.equal(vueDepuisHash('#/inconnue'), 'overview');
  assert.equal(vueDepuisHash(''), 'overview');
});
