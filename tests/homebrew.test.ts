import assert from 'node:assert/strict';
import { test } from 'node:test';
import { campagneAvecCapitaineTest } from './fixtures.ts';
import {
  equipements,
  profils,
  obtenirProfil,
  obtenirEquipements,
  obtenirDefinitionBande,
  equipementAutorise,
  compterArmesDeTir,
} from '../lib/mordheim-data.ts';
import { validerCampagneV4 } from '../lib/campaign-validation.ts';
import { validerDefinitionsHomebrew } from '../lib/homebrew-validation.ts';
import {
  serialiserCampagne,
  importerCampagneDepuisJson,
} from '../lib/campaign-transfer.ts';
import { construireExportTexteDetaille } from '../lib/warband-export.ts';

const propre = <T>(valeur: T): T => JSON.parse(JSON.stringify(valeur));
void test('toutes les fiches officielles sont acceptées comme base éditable', () => {
  for (const profil of profils)
    assert.equal(
      validerDefinitionsHomebrew({ profils: { [profil.id]: propre(profil) } }),
      null,
      profil.id,
    );
  for (const item of equipements)
    assert.equal(
      validerDefinitionsHomebrew({ equipements: { [item.id]: propre(item) } }),
      null,
      item.id,
    );
});

void test('la surcouche est isolée, désactivable, exportable et conservée à l’import', () => {
  const campagne = campagneAvecCapitaineTest();
  campagne.homebrew.actifs = true;
  campagne.homebrew.bande = { budgetInitial: 700, effectifMaximum: 30 };
  campagne.homebrew.profils = {
    capitaine: propre({
      ...obtenirProfil('capitaine'),
      nom: 'Chef maison',
      statistiques: { ...obtenirProfil('capitaine').statistiques, force: 6 },
      equipementsAutorises: ['epee'],
    }),
  };
  const epee = equipements.find((e) => e.id === 'epee')!;
  campagne.homebrew.equipements = {
    epee: { ...epee, nom: 'Épée maison', categorie: 'Tir', quantiteMax: 3 },
  };
  campagne.homebrew.coutsEquipements.epee = 0;
  campagne.combattants[0].equipementIds = ['epee'];
  const actif = obtenirProfil('capitaine', campagne.homebrew);
  assert.equal(actif.nom, 'Chef maison');
  assert.equal(actif.statistiques.force, 6);
  assert.equal(obtenirProfil('capitaine').nom, 'Capitaine mercenaire');
  assert.equal(
    obtenirDefinitionBande(campagne.factionId, campagne.homebrew)
      .effectifMaximum,
    30,
  );
  assert.equal(
    obtenirEquipements(campagne.homebrew).find((e) => e.id === 'epee')!.cout,
    0,
  );
  assert.equal(equipementAutorise(actif, epee), true);
  assert.equal(
    equipementAutorise(
      actif,
      equipements.find((e) => e.id === 'hache')!,
    ),
    false,
  );
  assert.equal(compterArmesDeTir(['epee'], campagne.homebrew), 1);
  assert.match(construireExportTexteDetaille(campagne), /Chef maison/);
  assert.match(construireExportTexteDetaille(campagne), /Épée maison/);
  const resultat = importerCampagneDepuisJson(serialiserCampagne(campagne));
  assert.deepEqual(resultat.homebrew, campagne.homebrew);
  campagne.homebrew.actifs = false;
  assert.equal(
    obtenirProfil('capitaine', campagne.homebrew).nom,
    'Capitaine mercenaire',
  );
  assert.equal(compterArmesDeTir(['epee'], campagne.homebrew), 0);
});

void test('les nouvelles limites sont utilisées dans le contrôle de composition', () => {
  const campagne = campagneAvecCapitaineTest();
  campagne.homebrew.actifs = true;
  campagne.homebrew.limites = { armesCorpsACorps: 3 };
  campagne.homebrew.equipements = {
    epee: { ...equipements.find((e) => e.id === 'epee')!, quantiteMax: 3 },
  };
  campagne.combattants[0].equipementIds = ['epee', 'epee', 'epee'];
  assert.equal(validerCampagneV4(campagne).ok, true);
  campagne.homebrew.actifs = false;
  assert.equal(validerCampagneV4(campagne).ok, false);
});

void test('les imports refusent les définitions invalides même si la surcouche est désactivée', () => {
  for (const modification of [
    {
      profils: {
        champion: { ...propre(obtenirProfil('champion')), id: 'capitaine' },
      },
    },
    {
      profils: {
        champion: {
          ...propre(obtenirProfil('champion')),
          statistiques: { force: -1 },
        },
      },
    },
    { profils: { inconnu: propre(obtenirProfil('champion')) } },
    {
      equipements: {
        epee: {
          ...equipements.find((e) => e.id === 'epee'),
          categorie: 'Inconnu',
        },
      },
    },
    { limites: { tailleGroupe: 0 } },
    { bande: { effectifMinimum: 5, effectifMaximum: 2 } },
    { bande: { budgetInitial: 2.5 } },
    { bande: JSON.parse('{"__proto__": {"budgetInitial": 0}}') },
  ]) {
    const campagne = campagneAvecCapitaineTest();
    Object.assign(campagne.homebrew, modification);
    assert.equal(
      validerCampagneV4(campagne, { verifierReglesDeBande: false }).ok,
      false,
    );
  }
});

void test('l’accès illimité est propre au membre et se conserve dans les transferts', () => {
  const campagne = campagneAvecCapitaineTest();
  campagne.combattants[0].accesArmesHomebrew = true;
  campagne.combattants[0].equipementIds = ['marteau-sigmarite'];
  assert.equal(validerCampagneV4(campagne).ok, true);
  assert.equal(
    importerCampagneDepuisJson(serialiserCampagne(campagne)).combattants[0]
      .accesArmesHomebrew,
    true,
  );
  campagne.combattants[0].accesArmesHomebrew = false;
  assert.equal(validerCampagneV4(campagne).ok, false);
  Object.assign(campagne.combattants[0], { accesArmesHomebrew: 'oui' });
  assert.equal(
    validerCampagneV4(campagne, { verifierReglesDeBande: false }).ok,
    false,
  );
});
