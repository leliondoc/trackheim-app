/* oxlint-disable typescript/no-floating-promises */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  definitionsBandes,
  coutEquipementPourProfil,
  equipementAutorise,
  equipements,
  obtenirDefinitionBande,
  obtenirProfil,
  quantiteMaxEquipement,
  type FactionId,
} from '../lib/mordheim-data.ts';
import { campagneVideTest } from './fixtures.ts';
import { validerCampagneV3 } from '../lib/campaign-validation.ts';
import {
  competencesPourProfil,
  sortsPourHeritageMagique,
} from '../lib/competences-data.ts';

const factionsAttendues: FactionId[] = [
  'mercenaires-reiklanders',
  'mercenaires-middenheimers',
  'mercenaires-marienburgers',
  'culte-des-possedes',
  'repurgateurs',
  'soeurs-de-sigmar',
  'morts-vivants',
  'skavens-du-clan-eshin',
];

describe('socle automatisé des huit bandes historiques', () => {
  it('indexe les six familles et les trois variantes mercenaires', () => {
    assert.deepEqual(
      definitionsBandes
        .filter((definition) => factionsAttendues.includes(definition.id))
        .map((definition) => definition.id),
      factionsAttendues,
    );
    assert.equal(new Set(definitionsBandes.map((item) => item.id)).size, 49);
    assert.equal(
      new Set(
        definitionsBandes.flatMap((item) =>
          item.profils.map((profil) => profil.id),
        ),
      ).size,
      definitionsBandes.flatMap((item) => item.profils).length,
    );
  });

  it('applique les budgets et effectifs propres aux bandes', () => {
    assert.equal(
      obtenirDefinitionBande('mercenaires-marienburgers').budgetInitial,
      600,
    );
    assert.equal(obtenirDefinitionBande('repurgateurs').effectifMaximum, 12);
    assert.equal(
      obtenirDefinitionBande('skavens-du-clan-eshin').effectifMaximum,
      20,
    );
    for (const factionId of factionsAttendues) {
      const definition = obtenirDefinitionBande(factionId);
      assert.equal(definition.effectifMinimum, 3);
      assert.equal(
        definition.profils.filter((profil) => profil.chef).length,
        1,
      );
      assert.equal(
        definition.profils.find((profil) => profil.chef)?.minimum,
        1,
      );
      assert.equal(
        definition.profils.find((profil) => profil.chef)?.maximum,
        1,
      );
    }
  });

  it('conserve les différences officielles des mercenaires', () => {
    assert.equal(obtenirProfil('tireur').statistiques.capaciteTir, 4);
    assert.equal(obtenirProfil('middenheim-capitaine').statistiques.force, 4);
    assert.equal(obtenirProfil('middenheim-champion').statistiques.force, 4);
    assert.equal(
      obtenirProfil('marienburg-tireur').statistiques.capaciteTir,
      3,
    );
    assert.match(obtenirProfil('capitaine').regleSpeciale ?? '', /12 ps/);
    assert.match(
      obtenirProfil('middenheim-capitaine').regleSpeciale ?? '',
      /6 ps/,
    );
  });

  it('épingle le nombre de profils de chaque famille', () => {
    assert.deepEqual(
      factionsAttendues.map(
        (factionId) => obtenirDefinitionBande(factionId).profils.length,
      ),
      [6, 6, 6, 6, 6, 5, 6, 7],
    );
    assert.equal(obtenirProfil('morts-vivants-vampire').cout, 110);
    assert.equal(obtenirProfil('skavens-rat-ogre').cout, 210);
    assert.equal(obtenirProfil('repurgateurs-chien').maximum, 5);
    assert.equal(obtenirProfil('soeurs-novice').maximum, 10);
  });

  it('verrouille les restrictions d’équipement les plus sensibles', () => {
    const marteau = equipements.find(
      (item) => item.id === 'marteau-sigmarite',
    )!;
    const armure = equipements.find((item) => item.id === 'armure-legere')!;
    const mutation = equipements.find((item) => item.id === 'mutation-hideux')!;
    const vampire = obtenirProfil('morts-vivants-vampire');

    assert.equal(
      equipementAutorise(obtenirProfil('morts-vivants-zombie'), armure),
      false,
    );
    assert.equal(
      equipementAutorise(obtenirProfil('soeurs-augure'), armure),
      false,
    );
    assert.equal(
      equipementAutorise(obtenirProfil('soeurs-matriarche'), marteau),
      true,
    );
    assert.equal(
      equipementAutorise(obtenirProfil('possedes-mutant'), mutation),
      true,
    );
    assert.equal(equipementAutorise(vampire, mutation), false);
    assert.equal(obtenirProfil('possedes-mutant').minimumMutations, 1);

    const arc = equipements.find((item) => item.id === 'arc')!;
    const arcCourt = equipements.find((item) => item.id === 'arc-court')!;
    assert.equal(
      coutEquipementPourProfil(arc, obtenirProfil('possedes-magister')),
      15,
    );
    assert.equal(
      coutEquipementPourProfil(arcCourt, obtenirProfil('possedes-magister')),
      10,
    );
    assert.equal(
      coutEquipementPourProfil(
        arcCourt,
        obtenirProfil('morts-vivants-vampire'),
      ),
      5,
    );

    const pistolet = equipements.find((item) => item.id === 'pistolet')!;
    const marteauSigmarite = equipements.find(
      (item) => item.id === 'marteau-sigmarite',
    )!;
    assert.equal(
      quantiteMaxEquipement(pistolet, obtenirProfil('capitaine')),
      2,
    );
    assert.equal(
      quantiteMaxEquipement(
        marteauSigmarite,
        obtenirProfil('soeurs-matriarche'),
      ),
      2,
    );
    assert.equal(
      quantiteMaxEquipement(marteauSigmarite, obtenirProfil('soeurs-novice')),
      1,
    );
  });

  it('valide chaque faction et refuse un profil provenant d’une autre bande', () => {
    for (const factionId of factionsAttendues) {
      const campagne = {
        ...campagneVideTest(),
        factionId,
        combattants: [],
      };
      assert.equal(validerCampagneV3(campagne).ok, true, factionId);
    }

    const campagneSkaven = {
      ...campagneVideTest(),
      factionId: 'skavens-du-clan-eshin' as const,
      combattants: [
        {
          id: 'capitaine-reiklander',
          nom: 'Capitaine étranger',
          profilId: 'capitaine',
          experience: 20,
          statut: 'Prêt' as const,
          statistiques: structuredClone(
            obtenirProfil('capitaine').statistiques,
          ),
          equipementIds: [],
          notes: '',
          quantite: 1,
          chef: true,
          coutAcquisition: 60,
          coutAcquisitionTotal: 60,
          competences: [],
          blessures: [],
          progressions: [],
          partiesManquees: 0,
        },
      ],
    };
    assert.equal(validerCampagneV3(campagneSkaven).ok, false);
  });

  it('ne propose que les compétences accessibles au profil', () => {
    const matriarche = competencesPourProfil(
      obtenirProfil('soeurs-matriarche'),
      'soeurs-de-sigmar',
    ).map((competence) => competence.nom);
    const superieure = competencesPourProfil(
      obtenirProfil('soeurs-superieure'),
      'soeurs-de-sigmar',
    ).map((competence) => competence.nom);
    const necromancien = competencesPourProfil(
      obtenirProfil('morts-vivants-necromancien'),
      'morts-vivants',
    ).map((competence) => competence.nom);

    assert.equal(matriarche.includes('Détermination absolue'), true);
    assert.equal(superieure.includes('Détermination absolue'), false);
    assert.equal(necromancien.includes('Sorcellerie'), true);
    assert.equal(necromancien.includes('Langage de bataille'), false);
  });

  it('réserve l’héritage magique aux bandes officiellement concernées', () => {
    assert.deepEqual(sortsPourHeritageMagique('mercenaires-reiklanders'), []);
    assert.equal(sortsPourHeritageMagique('soeurs-de-sigmar').length, 6);
    assert.equal(sortsPourHeritageMagique('culte-des-possedes').length, 6);
    assert.equal(
      sortsPourHeritageMagique('soeurs-de-sigmar').includes(
        'Le Marteau de Sigmar',
      ),
      true,
    );
  });
});
