import assert from 'node:assert/strict';
import test from 'node:test';

import {
  bandesBibliotheque,
  definitionsBandes,
  equipementAutorise,
  equipements,
  obtenirProfil,
} from '../lib/mordheim-data.ts';
import {
  estPouvoirMagiqueApprenable,
  pouvoirsMagiquesPourProfil,
  profilsMagiquesFaction,
  profilEstLanceurMagie,
} from '../lib/magic-data.ts';
import { fichesBandesReference } from '../lib/warbands/reference.ts';
import { campagneAvecCapitaineTest, campagneVideTest } from './fixtures.ts';

void test('le catalogue contient les 49 bandes GLM attendues', () => {
  assert.equal(bandesBibliotheque.length, 49);
  assert.equal(new Set(bandesBibliotheque.map((bande) => bande.slug)).size, 49);
  assert.deepEqual(
    Object.fromEntries(
      ['1a', '1b', '1c', '2'].map((grade) => [
        grade,
        bandesBibliotheque.filter((bande) => bande.grade === grade).length,
      ]),
    ),
    { '1a': 16, '1b': 22, '1c': 9, '2': 2 },
  );
});

void test('chaque fiche possède une présentation et un document vérifiés', () => {
  for (const bande of bandesBibliotheque) {
    assert.ok(bande.presentation.length >= 80, bande.slug);
    assert.ok(bande.publication.length >= 20, bande.slug);
    assert.match(bande.pdfUrl ?? '', /^https:\/\/drive\.google\.com\//);
    assert.ok(bande.pagesPdf >= 4, bande.slug);
    assert.ok(['français', 'anglais'].includes(bande.langueDocument));
    assert.ok(
      bande.avertissements.every((avertissement) => avertissement.length >= 20),
      bande.slug,
    );
  }
});

void test('chaque répertoire magique est relié à des profils explicites', () => {
  for (const definition of definitionsBandes) {
    const fiche = fichesBandesReference[definition.id];
    const profils = profilsMagiquesFaction(definition.id);
    if (fiche.magie.length === 0) {
      assert.equal(profils.length, 0, definition.id);
      continue;
    }
    assert.ok(profils.length > 0, definition.id);
    for (const profilId of profils) {
      assert.ok(
        definition.profils.some((profil) => profil.id === profilId),
        `${definition.id}:${profilId}`,
      );
      assert.equal(profilEstLanceurMagie(profilId), true);
    }
  }

  assert.equal(profilEstLanceurMagie('repurgateurs-capitaine'), false);
  assert.equal(profilEstLanceurMagie('repurgateurs-repurgateur'), false);
  assert.equal(profilEstLanceurMagie('repurgateurs-pretre'), true);
  assert.equal(
    profilEstLanceurMagie('ref-skavens-du-clan-pestilens-pretre-de-la-peste'),
    false,
  );
  assert.equal(
    profilEstLanceurMagie(
      'ref-skavens-du-clan-pestilens-precheur-sorcier-pestilens',
    ),
    true,
  );
});

void test('seuls les trois en-têtes de magie sont exclus des pouvoirs', () => {
  const exclus = Object.entries(fichesBandesReference).flatMap(
    ([factionId, fiche]) =>
      fiche.magie
        .filter(
          (entree) =>
            !estPouvoirMagiqueApprenable(
              factionId as Parameters<typeof estPouvoirMagiqueApprenable>[0],
              entree.titre,
            ),
        )
        .map((entree) => `${factionId}:${entree.titre}`),
  );

  assert.deepEqual(exclus.sort(), [
    'caravane-des-marchands:Magie mineure',
    'expeditions-runiques:Règles des runes mineures',
    'maraudeurs-du-chaos:Rituels du Chaos',
  ]);

  const pouvoirsSansDifficulte = Object.entries(fichesBandesReference).flatMap(
    ([factionId, fiche]) =>
      fiche.magie
        .filter(
          (entree) =>
            entree.difficulte === undefined &&
            estPouvoirMagiqueApprenable(
              factionId as Parameters<typeof estPouvoirMagiqueApprenable>[0],
              entree.titre,
            ),
        )
        .map((entree) => `${factionId}:${entree.titre}`),
  );
  assert.equal(pouvoirsSansDifficulte.length, 6);
  assert.ok(
    pouvoirsSansDifficulte.includes(
      'gardiens-de-chapelle-bretonniens:Faveurs de la Dame',
    ),
  );
  assert.ok(
    pouvoirsSansDifficulte.includes('maraudeurs-du-chaos:Bénédiction de Tchar'),
  );
});

void test('le Devin ne reçoit que les pouvoirs de sa marque', () => {
  const devin = 'ref-maraudeurs-du-chaos-devin';
  const combattantBase = campagneAvecCapitaineTest().combattants[0];
  const combattantParMarque = (
    marqueChaos: NonNullable<
      typeof combattantBase.optionsRegles
    >['marqueChaos'],
  ) => ({
    ...combattantBase,
    profilId: devin,
    optionsRegles: { marqueChaos },
  });

  const arkhar = combattantParMarque('Arkhar');
  assert.equal(profilEstLanceurMagie(devin, arkhar), false);
  assert.deepEqual(
    pouvoirsMagiquesPourProfil(devin, { combattant: arkhar }),
    [],
  );
  assert.deepEqual(
    pouvoirsMagiquesPourProfil(devin, {
      combattant: combattantParMarque('Chaos Universel'),
    }),
    [
      "Vision d'Horreur",
      'Œil Divin',
      'Sang Noir',
      'Tentation du Chaos',
      'Ailes Ténébreuses',
      'Mot de Souffrance',
    ],
  );
  assert.deepEqual(
    pouvoirsMagiquesPourProfil(devin, {
      combattant: combattantParMarque('Shornaal'),
    }),
    [
      'Délicieuse souffrance',
      'Danse du serpent',
      'Tourment sans fin',
      'Consternation',
      'Mille voix',
      'Tentation',
    ],
  );
  assert.deepEqual(
    pouvoirsMagiquesPourProfil(devin, {
      combattant: combattantParMarque('Tchar'),
    }),
    [
      'Bénédiction de Tchar',
      'Dissipation',
      'Clairvoyance',
      'Courroux de Tchar',
      'Récompense de Tchar',
      'Esclave du Chaos',
    ],
  );
  assert.deepEqual(
    pouvoirsMagiquesPourProfil(devin, {
      combattant: combattantParMarque('Onogal'),
    }),
    [
      "Toucher d'Onogal",
      'Furoncles',
      'Miasmes',
      'Pestilence',
      'Peau verruqueuse',
      "Pourriture d'Onogal",
    ],
  );
});

void test('la Liche et son Nécromancien respectent leurs restrictions', () => {
  const liche = 'ref-morts-tourmentes-liche';
  const necromancien = 'ref-morts-tourmentes-necromancien';
  const pouvoirsLiche = pouvoirsMagiquesPourProfil(liche);

  assert.ok(pouvoirsLiche.includes('Horreur vivante'));
  assert.ok(!pouvoirsLiche.includes('Visage de la mort'));
  assert.deepEqual(pouvoirsMagiquesPourProfil(necromancien), []);

  const campagneAvecLiche = campagneVideTest();
  const combattantBase = campagneAvecCapitaineTest().combattants[0];
  const combattantLiche = {
    ...combattantBase,
    id: 'liche-test',
    profilId: liche,
    competences: [
      'Sort ou prière : Voleur de vie',
      'Sort ou prière : Horreur vivante',
    ],
  };
  const combattantNecromancien = {
    ...combattantBase,
    id: 'necromancien-test',
    profilId: necromancien,
  };
  campagneAvecLiche.factionId = 'morts-tourmentes';
  campagneAvecLiche.combattants = [combattantLiche, combattantNecromancien];
  assert.deepEqual(
    pouvoirsMagiquesPourProfil(necromancien, {
      combattant: combattantNecromancien,
      campagne: campagneAvecLiche,
    }),
    ['Voleur de vie', 'Visage de la mort'],
  );

  const campagneSansLiche = {
    ...campagneAvecLiche,
    combattants: [combattantNecromancien],
  };
  const pouvoirsSansLiche = pouvoirsMagiquesPourProfil(necromancien, {
    combattant: combattantNecromancien,
    campagne: campagneSansLiche,
  });
  assert.ok(pouvoirsSansLiche.includes('Visage de la mort'));
  assert.ok(!pouvoirsSansLiche.includes('Horreur vivante'));
});

void test('les répertoires externes incomplets ne créent aucun faux choix', () => {
  assert.deepEqual(
    pouvoirsMagiquesPourProfil('ref-caravane-des-marchands-magicien-caravane'),
    [],
  );

  const charmes = pouvoirsMagiquesPourProfil('ref-strigannes-petru-striganne');
  assert.equal(charmes.length, 6);
  assert.deepEqual(
    charmes,
    fichesBandesReference.strigannes.magie.map((pouvoir) => pouvoir.titre),
  );
  assert.ok(!charmes.includes('Drain de Vie'));
});

void test('chaque bande constructible correspond à une fiche du catalogue', () => {
  assert.equal(definitionsBandes.length, bandesBibliotheque.length);
  assert.deepEqual(
    definitionsBandes.map((definition) => definition.id).sort(),
    bandesBibliotheque.map((bande) => bande.slug).sort(),
  );
  for (const definition of definitionsBandes) {
    const fiche = bandesBibliotheque.find(
      (bande) => bande.slug === definition.id,
    );
    assert.ok(fiche, definition.id);
    assert.ok(definition.profils.length >= 5, definition.id);
  }
});

void test('les restrictions nominatives des équipements sont appliquées', () => {
  const domnu = obtenirProfil('ref-strigannes-domnu-striganne');
  const retameur = obtenirProfil('ref-strigannes-retameur-striganne');
  const tromblon = equipements.find(
    (equipement) =>
      equipement.nom === 'Tromblon' &&
      equipement.listesEquipement.some((liste) => liste.includes('strigannes')),
  );
  assert.ok(tromblon);
  assert.equal(equipementAutorise(domnu, tromblon), false);
  assert.equal(equipementAutorise(retameur, tromblon), true);

  const pretreSkink = obtenirProfil('ref-hommes-lezards-pretre-skink');
  const skink = obtenirProfil('ref-hommes-lezards-skink');
  const heaume = equipements.find(
    (equipement) =>
      equipement.nom === "Heaume d'os" &&
      equipement.listesEquipement.some((liste) =>
        liste.includes('hommes-lezards'),
      ) &&
      equipement.regleSpeciale?.includes('Prêtre Skink'),
  );
  const venin = equipements.find(
    (equipement) =>
      equipement.nom === 'Venin fuligineux' &&
      equipement.listesEquipement.some((liste) =>
        liste.includes('hommes-lezards'),
      ),
  );
  assert.ok(heaume);
  assert.ok(venin);
  assert.equal(equipementAutorise(pretreSkink, heaume), true);
  assert.equal(equipementAutorise(skink, heaume), false);
  assert.equal(equipementAutorise(pretreSkink, venin), true);
  assert.equal(equipementAutorise(skink, venin), false);

  const saurusTotem = obtenirProfil('ref-hommes-lezards-guerrier-totem-saurus');
  const saurus = obtenirProfil('ref-hommes-lezards-saurus');
  const gueuleEnorme = equipements.find(
    (equipement) =>
      equipement.nom === 'Gueule énorme' &&
      equipement.listesEquipement.some((liste) =>
        liste.includes('hommes-lezards'),
      ),
  );
  assert.ok(gueuleEnorme);
  assert.equal(equipementAutorise(saurusTotem, gueuleEnorme), true);
  assert.equal(equipementAutorise(saurus, gueuleEnorme), false);

  const chevalier = obtenirProfil(
    'ref-caravane-des-marchands-chevalier-avant-garde',
  );
  const gardeNoir = obtenirProfil(
    'ref-caravane-des-marchands-garde-noir-caravane',
  );
  const destrier = equipements.find(
    (equipement) =>
      equipement.nom === 'Destrier' &&
      equipement.listesEquipement.some((liste) =>
        liste.includes('caravane-des-marchands'),
      ),
  );
  assert.ok(destrier);
  assert.equal(equipementAutorise(chevalier, destrier), true);
  assert.equal(equipementAutorise(gardeNoir, destrier), false);
});

void test('la dague gratuite est une donnée structurée pour les profils concernés', () => {
  const profilsAvecDague = definitionsBandes.flatMap((definition) =>
    definition.profils.filter((profil) =>
      equipements.some(
        (equipement) =>
          equipement.accordeDagueDeBase &&
          equipementAutorise(profil, equipement),
      ),
    ),
  );

  assert.ok(profilsAvecDague.length >= 225);
  assert.ok(
    equipements
      .filter((equipement) => equipement.accordeDagueDeBase)
      .every((equipement) => /dague/i.test(equipement.nom)),
  );
});

void test('aucun texte éditorial ne contient de cadratin', () => {
  for (const bande of bandesBibliotheque) {
    assert.doesNotMatch(
      [bande.presentation, bande.publication, ...bande.avertissements].join(
        ' ',
      ),
      /\u2014/,
    );
  }
});

void test('les nouvelles fiches officielles sont structurées et traçables', () => {
  const slugsReferences = Object.keys(fichesBandesReference).sort();
  const slugsCatalogue = bandesBibliotheque.map((bande) => bande.slug).sort();
  assert.equal(slugsReferences.length, 49);
  assert.deepEqual(slugsReferences, slugsCatalogue);

  for (const [slug, fiche] of Object.entries(fichesBandesReference)) {
    assert.ok(
      bandesBibliotheque.some((bande) => bande.slug === slug),
      `${slug}: absent du catalogue`,
    );
    assert.ok(fiche.profils.length >= 5, slug);
    assert.ok(fiche.listesEquipement.length >= 1, slug);
    assert.ok(fiche.composition.budgetInitial >= 500, slug);
    assert.ok(fiche.composition.effectifMinimum >= 1, slug);
    assert.ok(
      fiche.composition.effectifMaximum === null ||
        fiche.composition.effectifMaximum >= 10,
      slug,
    );
    assert.ok(fiche.composition.source.length >= 10, slug);
    assert.equal(
      new Set(fiche.profils.map((profil) => profil.id)).size,
      fiche.profils.length,
      `${slug}: identifiants de profils dupliqués`,
    );

    for (const profil of fiche.profils) {
      assert.ok(profil.source.length >= 10, `${slug}:${profil.id}`);
      assert.ok(
        [
          'Héros',
          'Homme de main',
          'Hommes de main',
          "Créature d'équipement",
          'Monture optionnelle',
          'Transformation',
          'Véhicule',
          'Véhicule obligatoire',
        ].includes(profil.categorie),
        `${slug}:${profil.id}: catégorie inconnue`,
      );
      assert.equal(Object.keys(profil.statistiques).length, 9);
      assert.ok(
        profil.cout === null ||
          (Number.isInteger(profil.cout) && profil.cout >= 0),
      );
      if (profil.cout === null) {
        assert.ok(
          profil.categorie === 'Transformation' ||
            profil.regles.some((regle) =>
              /ne s'achète pas|transformation/i.test(regle.description),
            ),
          `${slug}:${profil.id}: coût absent sans explication`,
        );
      }
      assert.ok(Number.isInteger(profil.minimum) && profil.minimum >= 0);
      assert.ok(
        profil.maximum === null || profil.maximum >= profil.minimum,
        `${slug}:${profil.id}: quota incohérent`,
      );
      assert.ok(
        Object.values(profil.statistiques).every(
          (statistique) =>
            (typeof statistique === 'number' &&
              Number.isFinite(statistique) &&
              statistique >= 0) ||
            (typeof statistique === 'string' && statistique.length >= 1) ||
            statistique === null,
        ),
        `${slug}:${profil.id}: caractéristique invalide`,
      );
    }

    for (const liste of fiche.listesEquipement) {
      assert.ok(liste.nom.length >= 2, slug);
      assert.ok(liste.profils.length >= 1, `${slug}:${liste.nom}`);
      assert.ok(liste.categories.length >= 1, `${slug}:${liste.nom}`);
      assert.ok(liste.source.length >= 10, `${slug}:${liste.nom}`);
      for (const profilId of liste.profils) {
        assert.ok(
          fiche.profils.some((profil) => profil.id === profilId),
          `${slug}:${liste.nom}: profil ${profilId} inconnu`,
        );
      }
      for (const categorie of liste.categories) {
        assert.ok(categorie.entrees.length >= 1, `${slug}:${categorie.nom}`);
        for (const entree of categorie.entrees) {
          assert.ok(entree.nom.length >= 2, `${slug}:${liste.nom}`);
          assert.ok(Number.isFinite(entree.cout) && entree.cout >= 0);
        }
      }
    }

    for (const regle of [
      ...fiche.regles,
      ...fiche.competencesSpeciales,
      ...fiche.magie,
    ]) {
      assert.ok(regle.titre.length >= 2, slug);
      assert.ok(regle.description.length >= 15, `${slug}:${regle.titre}`);
      assert.ok((regle.source?.length ?? 0) >= 10, `${slug}:${regle.titre}`);
    }
  }
});

void test('les données structurées ne contiennent aucun cadratin', () => {
  assert.doesNotMatch(JSON.stringify(fichesBandesReference), /\u2014/);
});
