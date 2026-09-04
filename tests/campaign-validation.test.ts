/* oxlint-disable typescript/no-floating-promises */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  estIdentifiantCampagneValide,
  validerCampagneV4,
} from '../lib/campaign-validation.ts';
import { creerSuiviCombattant } from '../lib/battle-state.ts';
import {
  importerCampagneDepuisJson,
  serialiserCampagne,
} from '../lib/campaign-transfer.ts';
import { obtenirProfil, type BatailleEnCours } from '../lib/mordheim-data.ts';
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
    affectationsParticipants: {},
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
  it('accepte l’état v4 livré et les identifiants techniques attendus', () => {
    assert.equal(validerCampagneV4(campagneVideTest()).ok, true);
    assert.equal(estIdentifiantCampagneValide('campagne-abc_123'), true);
    assert.equal(estIdentifiantCampagneValide('Campagne avec espaces'), false);
  });

  it('refuse les prix décimaux qui ne peuvent pas être persistés', () => {
    const campagne = campagneVideTest();
    campagne.homebrew.coutsRecrues.guerrier = 12.5;
    assert.equal(validerCampagneV4(campagne).ok, false);
  });

  it('valide le budget vétéran cumulé et refuse une dépense négative', () => {
    const campagne = campagneVideTest();
    campagne.batailleEnCours = batailleMinimale();
    assert.equal(validerCampagneV4(campagne).ok, true);

    campagne.batailleEnCours.veterans.experienceDepensee = -1;
    assert.equal(validerCampagneV4(campagne).ok, false);
  });

  it('refuse un coût historique total négatif', () => {
    const campagne = campagneAvecCapitaineTest();
    campagne.combattants[0].coutAcquisitionTotal = -1;
    assert.equal(validerCampagneV4(campagne).ok, false);
  });

  it('refuse les références métier inconnues', () => {
    const profilInconnu = campagneAvecCapitaineTest();
    profilInconnu.combattants[0].profilId = 'profil-inconnu';
    assert.equal(validerCampagneV4(profilInconnu).ok, false);

    const equipementInconnu = campagneAvecCapitaineTest();
    equipementInconnu.combattants[0].equipementIds.push('objet-inconnu');
    assert.equal(validerCampagneV4(equipementInconnu).ok, false);
  });

  it('accepte les champs structurés du workflow', () => {
    const campagne = campagneVideTest();
    campagne.batailleEnCours = batailleMinimale();
    campagne.batailleEnCours.personnel = {
      version: 1,
      aucun: true,
      entrees: [],
    };
    assert.equal(validerCampagneV4(campagne).ok, true);
  });

  it('accepte une bataille avant résultat et refuse les états de table contradictoires', () => {
    const campagne = campagneAvecCapitaineTest();
    const combattant = campagne.combattants[0];
    const bataille = batailleMinimale();
    bataille.resultat = null;
    bataille.participants[combattant.id] = creerSuiviCombattant(combattant);
    campagne.batailleEnCours = bataille;
    assert.equal(validerCampagneV4(campagne).ok, true);

    bataille.participants[combattant.id].figurinesTable[0].pointsVieActuels = 0;
    assert.equal(validerCampagneV4(campagne).ok, true);
    bataille.participants[combattant.id].figurinesTable[0].blessureAResoudre =
      true;
    assert.equal(validerCampagneV4(campagne).ok, true);
    bataille.participants[combattant.id].figurinesTable[0].etatTable =
      'Hors de combat';
    bataille.participants[combattant.id].horsCombat = 0;
    assert.equal(validerCampagneV4(campagne).ok, false);
  });

  it('conserve les limites de sécurité même sans vérifier la composition historique', () => {
    const campagne = campagneAvecCapitaineTest();
    campagne.combattants[0].quantite = 1_000_000;
    assert.equal(
      validerCampagneV4(campagne, { verifierReglesDeBande: false }).ok,
      false,
    );
    campagne.combattants[0].quantite = 1;
    campagne.combattants[0].statistiques.pointsVie = 1_000_000;
    assert.equal(
      validerCampagneV4(campagne, { verifierReglesDeBande: false }).ok,
      false,
    );
  });

  it('préserve les nouveaux états de combat, bonus et améliorations dans un export restauré', () => {
    const campagne = campagneAvecCapitaineTest();
    const combattant = campagne.combattants[0];
    combattant.competences = ['Sort ou prière : Réanimation'];
    combattant.ameliorationsSorts = { Réanimation: 2 };
    const bataille = batailleMinimale();
    bataille.participants[combattant.id] = creerSuiviCombattant(combattant);
    bataille.participants[combattant.id].figurinesTable[0] = {
      etatTable: 'Debout',
      pointsVieActuels: 0,
      blessureAResoudre: true,
    };
    bataille.exploration = {
      ...bataille.exploration,
      lancers: [4, 4],
      desConserves: [4],
      indicesConserves: [1],
      bonusDes: { lances: 1, conserves: 0, source: '' },
    };
    campagne.batailleEnCours = bataille;
    assert.equal(validerCampagneV4(campagne).ok, true);
    assert.deepEqual(
      importerCampagneDepuisJson(serialiserCampagne(campagne)),
      campagne,
    );
    bataille.exploration.appliquee = true;
    assert.equal(validerCampagneV4(campagne).ok, false);
    bataille.exploration.bonusDes!.source =
      'Traînard : dé supplémentaire à défausser';
    assert.equal(validerCampagneV4(campagne).ok, true);
    bataille.exploration.indicesConserves = [2];
    assert.equal(validerCampagneV4(campagne).ok, false);
    bataille.exploration.indicesConserves = [1];
    combattant.ameliorationsSorts = { 'Sort inconnu': 1 };
    assert.equal(validerCampagneV4(campagne).ok, false);
  });

  it('conserve un participant après une mort ou une promotion du registre', () => {
    const campagne = campagneAvecCapitaineTest();
    const combattant = campagne.combattants[0];
    const bataille = batailleMinimale();
    bataille.participants[combattant.id] = creerSuiviCombattant(combattant);
    campagne.combattants = [];
    campagne.batailleEnCours = bataille;

    assert.equal(validerCampagneV4(campagne).ok, true);
  });

  it('ne confond pas l’effectif engagé avec les renforts recrutés ensuite', () => {
    const campagne = campagneAvecCapitaineTest();
    const profil = obtenirProfil('guerrier');
    const combattant = {
      ...campagne.combattants[0],
      id: 'groupe-guerriers',
      profilId: profil.id,
      statistiques: structuredClone(profil.statistiques),
      quantite: 1,
      chef: false,
      coutAcquisition: profil.cout,
      coutAcquisitionTotal: profil.cout,
    };
    campagne.combattants = [combattant];
    const bataille = batailleMinimale();
    bataille.participants[combattant.id] = creerSuiviCombattant(combattant);
    combattant.quantite = 4;
    combattant.coutAcquisitionTotal = profil.cout * combattant.quantite;
    campagne.batailleEnCours = bataille;

    assert.equal(validerCampagneV4(campagne).ok, true);
    assert.equal(bataille.participants[combattant.id].figurinesTable.length, 1);
  });

  it('refuse les snapshots de bataille incomplets', () => {
    const campagne = campagneAvecCapitaineTest();
    const combattant = campagne.combattants[0];
    const bataille = batailleMinimale();
    bataille.participants[combattant.id] = creerSuiviCombattant(combattant);
    bataille.participants[combattant.id].effectifInitial = 2;
    campagne.batailleEnCours = bataille;

    assert.equal(validerCampagneV4(campagne).ok, false);
  });

  it('exige une marque valide pour le Devin maraudeur', () => {
    const campagne = campagneVideTest();
    campagne.factionId = 'maraudeurs-du-chaos';
    campagne.grade = '1c';
    const devin = {
      ...campagneAvecCapitaineTest().combattants[0],
      profilId: 'ref-maraudeurs-du-chaos-devin',
      chef: false,
    };
    campagne.combattants = [devin];
    assert.equal(validerCampagneV4(campagne).ok, false);

    devin.optionsRegles = { marqueChaos: 'Onogal' };
    assert.equal(validerCampagneV4(campagne).ok, true);
  });

  it('valide les deux progressions exigées par une promotion', () => {
    const campagne = campagneAvecCapitaineTest();
    const bataille = batailleMinimale();
    bataille.participants['capitaine-test'] = {
      ...creerSuiviCombattant(campagne.combattants[0]),
      blessureResolue: true,
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
    assert.equal(validerCampagneV4(campagne).ok, true);

    bataille.participants['capitaine-test'].progressions.saisies[0].jetPromu =
      -1;
    assert.equal(validerCampagneV4(campagne).ok, false);
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
    assert.equal(validerCampagneV4(campagne).ok, false);
  });

  it('refuse une extension JSON anormalement imbriquée', () => {
    const campagne = campagneVideTest() as unknown as Record<string, unknown>;
    let niveau: Record<string, unknown> = campagne;
    for (let index = 0; index < 40; index += 1) {
      const suivant: Record<string, unknown> = {};
      niveau.extension = suivant;
      niveau = suivant;
    }
    assert.equal(validerCampagneV4(campagne).ok, false);
  });
});
