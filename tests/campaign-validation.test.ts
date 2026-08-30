/* oxlint-disable typescript/no-floating-promises */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  estIdentifiantCampagneValide,
  validerCampagneV3,
} from '../lib/campaign-validation.ts';
import { etatInitial, type BatailleEnCours } from '../lib/mordheim-data.ts';

function batailleMinimale(): BatailleEnCours {
  return {
    id: 'bataille-test',
    numero: 8,
    scenario: 'Escarmouche',
    adversaire: 'Skavens',
    resultat: 'Victoire',
    date: '2026-08-30',
    valeurAvant: 100,
    valeurAdverse: 120,
    successeurChefId: null,
    etapeActive: 4,
    participants: {},
    exploration: {
      lancers: [],
      desConserves: [],
      fragmentsTrouves: 0,
      appliquee: false,
      noteResultat: '',
    },
    vente: { fragmentsVendus: 0, revenu: 0, appliquee: false },
    veterans: {
      de1: 3,
      de2: 4,
      disponibilite: 7,
      experienceDepensee: 3,
    },
    jetsRarete: [],
    personnagesSpeciaux: '',
    notes: '',
  };
}

describe('contrat persistant des campagnes', () => {
  it('accepte l’état v3 livré et les identifiants techniques attendus', () => {
    assert.equal(validerCampagneV3(structuredClone(etatInitial)).ok, true);
    assert.equal(estIdentifiantCampagneValide('campagne-abc_123'), true);
    assert.equal(estIdentifiantCampagneValide('Campagne avec espaces'), false);
  });

  it('refuse les prix décimaux qui ne peuvent pas être persistés', () => {
    const campagne = structuredClone(etatInitial);
    campagne.homebrew.coutsRecrues.guerrier = 12.5;
    assert.equal(validerCampagneV3(campagne).ok, false);
  });

  it('valide le budget vétéran cumulé et refuse une dépense négative', () => {
    const campagne = structuredClone(etatInitial);
    campagne.batailleEnCours = batailleMinimale();
    assert.equal(validerCampagneV3(campagne).ok, true);

    campagne.batailleEnCours.veterans.experienceDepensee = -1;
    assert.equal(validerCampagneV3(campagne).ok, false);
  });

  it('refuse un coût historique total négatif', () => {
    const campagne = structuredClone(etatInitial);
    campagne.combattants[0].coutAcquisitionTotal = -1;
    assert.equal(validerCampagneV3(campagne).ok, false);
  });

  it('refuse une date impossible avant qu’elle atteigne le rendu', () => {
    const campagne = structuredClone(etatInitial);
    campagne.parties[0].date = '2026-02-31';
    assert.equal(validerCampagneV3(campagne).ok, false);
  });

  it('refuse une extension JSON anormalement imbriquée', () => {
    const campagne = structuredClone(etatInitial) as unknown as Record<
      string,
      unknown
    >;
    let niveau: Record<string, unknown> = campagne;
    for (let index = 0; index < 40; index += 1) {
      const suivant: Record<string, unknown> = {};
      niveau.extension = suivant;
      niveau = suivant;
    }
    assert.equal(validerCampagneV3(campagne).ok, false);
  });
});
