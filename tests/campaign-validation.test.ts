/* oxlint-disable typescript/no-floating-promises */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  estIdentifiantCampagneValide,
  validerCampagneV3,
} from '../lib/campaign-validation.ts';
import { type BatailleEnCours } from '../lib/mordheim-data.ts';
import { campagneAvecCapitaineTest, campagneVideTest } from './fixtures.ts';

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
    personnel: { version: 1, aucun: false, entrees: [] },
    notes: '',
  };
}

describe('contrat persistant des campagnes', () => {
  it('accepte l’état v3 livré et les identifiants techniques attendus', () => {
    assert.equal(validerCampagneV3(campagneVideTest()).ok, true);
    assert.equal(estIdentifiantCampagneValide('campagne-abc_123'), true);
    assert.equal(estIdentifiantCampagneValide('Campagne avec espaces'), false);
  });

  it('refuse les prix décimaux qui ne peuvent pas être persistés', () => {
    const campagne = campagneVideTest();
    campagne.homebrew.coutsRecrues.guerrier = 12.5;
    assert.equal(validerCampagneV3(campagne).ok, false);
  });

  it('valide le budget vétéran cumulé et refuse une dépense négative', () => {
    const campagne = campagneVideTest();
    campagne.batailleEnCours = batailleMinimale();
    assert.equal(validerCampagneV3(campagne).ok, true);

    campagne.batailleEnCours.veterans.experienceDepensee = -1;
    assert.equal(validerCampagneV3(campagne).ok, false);
  });

  it('refuse un coût historique total négatif', () => {
    const campagne = campagneAvecCapitaineTest();
    campagne.combattants[0].coutAcquisitionTotal = -1;
    assert.equal(validerCampagneV3(campagne).ok, false);
  });

  it('refuse les références métier inconnues', () => {
    const profilInconnu = campagneAvecCapitaineTest();
    profilInconnu.combattants[0].profilId = 'profil-inconnu';
    assert.equal(validerCampagneV3(profilInconnu).ok, false);

    const equipementInconnu = campagneAvecCapitaineTest();
    equipementInconnu.combattants[0].equipementIds.push('objet-inconnu');
    assert.equal(validerCampagneV3(equipementInconnu).ok, false);
  });

  it('accepte les champs structurés du workflow', () => {
    const campagne = campagneVideTest();
    campagne.batailleEnCours = batailleMinimale();
    campagne.batailleEnCours.personnel = {
      version: 1,
      aucun: true,
      entrees: [],
    };
    assert.equal(validerCampagneV3(campagne).ok, true);
  });

  it('valide les deux progressions exigées par une promotion', () => {
    const campagne = campagneAvecCapitaineTest();
    const bataille = batailleMinimale();
    bataille.participants['capitaine-test'] = {
      combattantId: 'capitaine-test',
      horsCombat: 0,
      jetsBlessure: [],
      blessureResolue: true,
      blessureNote: '',
      ennemisHorsCombat: 0,
      experienceScenario: 0,
      experienceManuelle: 0,
      experienceAppliquee: false,
      progressions: {
        version: 1,
        saisies: [
          {
            jet: 10,
            decision: 'Nouveau Héros',
            note: '',
            tablesPromu: ['Combat', 'Force'],
            jetPromu: 7,
            decisionPromu: 'Capacité de Combat',
            notePromu: '',
            jetGroupeRestant: 6,
            decisionGroupeRestant: 'Capacité de Tir',
            noteGroupeRestant: '',
          },
        ],
      },
    };
    campagne.batailleEnCours = bataille;
    assert.equal(validerCampagneV3(campagne).ok, true);

    bataille.participants['capitaine-test'].progressions.saisies[0].jetPromu =
      -1;
    assert.equal(validerCampagneV3(campagne).ok, false);
  });

  it('refuse une date impossible avant qu’elle atteigne le rendu', () => {
    const campagne = campagneVideTest();
    campagne.parties.push({
      id: 'partie-test',
      scenario: 'Escarmouche',
      adversaire: 'Skavens',
      resultat: 'Victoire',
      date: '2026-08-30',
    });
    campagne.parties[0].date = '2026-02-31';
    assert.equal(validerCampagneV3(campagne).ok, false);
  });

  it('refuse une extension JSON anormalement imbriquée', () => {
    const campagne = campagneVideTest() as unknown as Record<string, unknown>;
    let niveau: Record<string, unknown> = campagne;
    for (let index = 0; index < 40; index += 1) {
      const suivant: Record<string, unknown> = {};
      niveau.extension = suivant;
      niveau = suivant;
    }
    assert.equal(validerCampagneV3(campagne).ok, false);
  });
});
