import assert from 'node:assert/strict';
import test from 'node:test';

import {
  competencesPourProfil,
  erreurCompetencesSpecialesBande,
} from '../lib/competences-data.ts';
import {
  definitionsBandes,
  compterArmesDeTir,
  equipementAutorise,
  equipements,
  obtenirProfil,
  type FactionId,
} from '../lib/mordheim-data.ts';
import { fichesBandesReference } from '../lib/warbands/reference.ts';
import { campagneAvecCapitaineTest } from './fixtures.ts';

function objet(id: string) {
  const resultat = equipements.find((e) => e.id === id);
  assert.ok(resultat, id);
  return resultat;
}

void test('les matériaux ont une arme et un prix complet sans perdre les anciens IDs', () => {
  const ancien = objet('ref-chasseurs-de-tresors-nains-l0-c0-e9');
  assert.ok(ancien.achatDesactive);
  const epee = objet(`${ancien.id}-arme-l0-c0-e5`);
  assert.equal(epee.nom, 'Épée (gromril)');
  assert.equal(epee.cout, 30);
  assert.equal(epee.coutCommerce, 40);
  assert.equal(epee.rareteCommerce, 11);
  assert.equal(epee.achatDesactive, undefined);
  assert.equal(epee.accordeDagueDeBase, false);
  const noble = obtenirProfil('ref-chasseurs-de-tresors-nains-noble-nain');
  assert.equal(equipementAutorise(noble, ancien), true);
  assert.equal(equipementAutorise(noble, epee), true);
  assert.equal(equipementAutorise(obtenirProfil('capitaine'), epee), false);
  const dagueNoire = objet('ref-elfes-noirs-l0-c3-e0-arme-l0-c0-e0');
  assert.equal(dagueNoire.cout, 17);
  assert.equal(
    objet('ref-elfes-noirs-l2-c0-e0-arme-l0-c0-e0').commerceUniquement,
    true,
  );
  assert.equal(
    equipements.some(
      (e) =>
        e.id.startsWith('ref-') &&
        e.cout === 0 &&
        !e.achatDesactive &&
        !e.accordeDagueDeBase,
    ),
    false,
  );
  assert.equal(new Set(equipements.map((e) => e.id)).size, equipements.length);
});

void test('les paires à tarif spécial et les prix à dés ne deviennent pas le prix de base', () => {
  assert.equal(objet('ref-artilleurs-de-nuln-l0-c1-e1-paire').cout, 35);
  assert.equal(objet('ref-artilleurs-de-nuln-l0-c1-e1-paire').quantiteMax, 1);
  const mortier = objet('ref-mangeurs-dhommes-l0-c1-e0');
  assert.equal(mortier.prixRecrutementFormule, '80 + 2D6 CO');
  assert.equal(mortier.prixRecrutementMinimum, 82);
  assert.equal(
    objet('ref-gardiens-des-tombes-l2-c0-e0').prixRecrutementMinimum,
    210,
  );
  assert.equal(
    objet('ref-arpenteurs-fimirs-l0-c2-e0').prixRecrutementMinimum,
    28,
  );
  const dagues = equipements.filter(
    (e) => e.id.startsWith('ref-strigannes-') && e.nom === 'Dague',
  );
  assert.equal(dagues.length, 2);
  assert.ok(dagues.every((e) => e.cout === 2 && e.accordeDagueDeBase));
});

void test('deux pistolets identiques et un arc occupent deux armes de tir', () => {
  assert.equal(compterArmesDeTir(['pistolet', 'pistolet', 'arc']), 2);
  assert.equal(compterArmesDeTir(['ref-artilleurs-de-nuln-l0-c1-e1-paire']), 1);
  assert.equal(compterArmesDeTir(['arc', 'arbalete', 'arquebuse']), 3);
  assert.equal(compterArmesDeTir(['pistolet', 'pistolet-duel', 'arc']), 3);
  const doubleCanon = 'ref-artilleurs-de-nuln-l0-c1-e1';
  assert.equal(compterArmesDeTir([doubleCanon, doubleCanon, 'arc']), 2);
  const repetition = 'ref-artilleurs-de-nuln-l1-c1-e2';
  assert.equal(compterArmesDeTir([repetition, repetition, 'arc']), 3);
});

void test('chaque profil annonce explicitement son droit à expérience et sa procédure de plafond', () => {
  for (const fiche of Object.values(fichesBandesReference)) {
    for (const profil of fiche.profils)
      assert.equal(typeof profil.gagneExperience, 'boolean', profil.id);
  }
  for (const definition of definitionsBandes) {
    for (const profil of definition.profils) {
      assert.equal(typeof profil.gagneExperience, 'boolean', profil.id);
      if (profil.gagneExperience)
        assert.ok(profil.maximums || profil.progressionManuelle, profil.id);
    }
  }
  const exclus = [
    'pillards-hommes-betes-chien-du-chaos',
    'bandits-du-hochland-racaille',
    'gobelins-de-la-nuit-squig-des-cavernes',
    'gobelins-de-la-nuit-snotling',
    'gobelins-de-la-nuit-troll',
    'mangeurs-dhommes-dents-de-sabre',
    'maraudeurs-du-chaos-chien-du-chaos',
    'maraudeurs-du-chaos-enfant-du-chaos',
    'moines-guerriers-de-cathay-paysan-enrage',
    'morts-tourmentes-zombie',
    'morts-tourmentes-squelette',
    'morts-tourmentes-epouvantail',
  ];
  for (const id of exclus)
    assert.equal(obtenirProfil(`ref-${id}`).gagneExperience, false, id);
  assert.equal(
    obtenirProfil('ref-pillards-hommes-betes-minotaure').gagneExperience,
    true,
  );
  const nain = obtenirProfil('ref-chasseurs-de-tresors-nains-noble-nain');
  assert.equal(nain.maximums?.endurance, 5);
  assert.equal(nain.maximums?.initiative, 5);
  assert.equal(nain.maximums?.commandement, 10);
  assert.ok(nain.sourceMaximums);
  assert.equal(
    obtenirProfil('ref-guerriers-fantomes-maitre-des-ombres').maximums
      ?.initiative,
    9,
  );
  const fimir = obtenirProfil('ref-arpenteurs-fimirs-matriarche-fimir');
  assert.equal(fimir.maximums, undefined);
  assert.ok(fimir.progressionManuelle);
  assert.equal(obtenirProfil('capitaine').maximums?.force, 4);
  assert.equal(
    definitionsBandes.find((d) => d.id === 'gobelins-des-forets')
      ?.effectifMaximum,
    20,
  );
});

function choix(
  faction: FactionId,
  profilId: string,
  competences: string[] = [],
) {
  const profil = obtenirProfil(profilId);
  const combattant = {
    ...campagneAvecCapitaineTest().combattants[0],
    profilId,
    chef: Boolean(profil.chef),
    competences,
  };
  return competencesPourProfil(profil, faction, combattant).map((c) => c.nom);
}

void test('les compétences des Tueurs et des sorciers restent réservées à ces profils', () => {
  const nain = 'chasseurs-de-tresors-nains';
  assert.ok(
    choix(nain, `ref-${nain}-tueur-de-trolls-nain`).includes('Tueur: Berserk'),
  );
  assert.ok(!choix(nain, `ref-${nain}-noble-nain`).includes('Tueur: Berserk'));
  const elfes = 'guerriers-fantomes';
  assert.ok(
    choix(elfes, `ref-${elfes}-tisseur-dombres`).includes('Maître des runes'),
  );
  assert.ok(
    !choix(elfes, `ref-${elfes}-maitre-des-ombres`).includes(
      'Maître des runes',
    ),
  );
  assert.ok(
    !choix(elfes, `ref-${elfes}-tisseur-dombres`).includes('Solide carrure'),
  );
  assert.ok(
    choix('gobelins-des-forets', 'ref-gobelins-des-forets-brav').includes(
      'Discipline',
    ),
  );
  assert.ok(
    !choix('gobelins-des-forets', 'ref-gobelins-des-forets-gran-chef').includes(
      'Discipline',
    ),
  );
});

void test('les prérequis et quotas des compétences spéciales sont appliqués', () => {
  const pestilens = 'skavens-du-clan-pestilens';
  const pretre = `ref-${pestilens}-pretre-de-la-peste`;
  assert.ok(!choix(pestilens, pretre).includes('Insensible à la douleur'));
  assert.ok(
    choix(pestilens, pretre, ['Résistant']).includes('Insensible à la douleur'),
  );
  assert.ok(!choix(pestilens, pretre).includes('Contagieux'));
  assert.ok(
    choix(pestilens, pretre, ['Corps putréfié']).includes('Contagieux'),
  );
  const profil = obtenirProfil('ref-guerriers-fantomes-maitre-des-ombres');
  const campagne = campagneAvecCapitaineTest();
  campagne.factionId = 'guerriers-fantomes';
  campagne.combattants = [0, 1].map((i) => ({
    ...campagne.combattants[0],
    id: `elfe-${i}`,
    profilId: profil.id,
    competences: ['Solide carrure'],
  }));
  assert.ok(
    !competencesPourProfil(
      profil,
      campagne.factionId,
      undefined,
      campagne,
    ).some((c) => c.nom === 'Solide carrure'),
  );
  assert.ok(
    !choix('nains-du-chaos', 'ref-nains-du-chaos-hierogrammate').includes(
      'Armure du Chaos',
    ),
  );
});

void test('seules la Matriarche et les Supérieures peuvent porter deux marteaux sigmarites', () => {
  const marteau = objet('marteau-sigmarite');
  for (const [id, maximum] of [
    ['soeurs-matriarche', 2],
    ['soeurs-superieure', 2],
    ['soeurs-augure', 1],
    ['soeurs-sigmarite', 1],
    ['soeurs-novice', 1],
  ] as const) {
    assert.equal(
      marteau.quantitesMaxParProfil?.[id] ?? marteau.quantiteMax,
      maximum,
      id,
    );
  }
});

void test('un lot de progressions ne contourne ni quota, ni prérequis, ni incompatibilité', () => {
  const base = campagneAvecCapitaineTest().combattants[0];
  const avant = [0, 1].map((i) => ({
    ...base,
    id: `heros-${i}`,
    nom: `Héros ${i}`,
    competences: [] as string[],
  }));
  const guides = avant.map((c) => ({ ...c, competences: ['Guide'] }));
  assert.match(
    erreurCompetencesSpecialesBande('chasseurs-cornus', guides, avant) ?? '',
    /Guide/,
  );
  assert.equal(
    erreurCompetencesSpecialesBande('chasseurs-cornus', guides, guides),
    null,
  );
  const pire = [...guides, { ...base, id: 'heros-3', competences: ['Guide'] }];
  assert.match(
    erreurCompetencesSpecialesBande('chasseurs-cornus', pire, guides) ?? '',
    /Guide/,
  );
  const berserk = [{ ...base, competences: ['Berserk'] }];
  const incompatible = [
    { ...base, competences: ['Berserk', 'Charge furieuse'] },
  ];
  assert.match(
    erreurCompetencesSpecialesBande('gladiateurs', incompatible, berserk) ?? '',
    /incompatible/,
  );
  assert.equal(
    erreurCompetencesSpecialesBande('gladiateurs', incompatible, incompatible),
    null,
  );
  const sansPrerequis = [{ ...base, competences: ['Insensible à la douleur'] }];
  assert.match(
    erreurCompetencesSpecialesBande(
      'skavens-du-clan-pestilens',
      sansPrerequis,
      [base],
    ) ?? '',
    /nécessite Résistant/,
  );
  assert.equal(
    erreurCompetencesSpecialesBande(
      'skavens-du-clan-pestilens',
      sansPrerequis,
      sansPrerequis,
    ),
    null,
  );
  assert.equal(
    erreurCompetencesSpecialesBande(
      'skavens-du-clan-pestilens',
      [{ ...base, competences: ['Résistant', 'Insensible à la douleur'] }],
      [base],
    ),
    null,
  );
});
