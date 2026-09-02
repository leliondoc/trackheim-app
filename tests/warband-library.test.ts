import assert from 'node:assert/strict';
import test from 'node:test';

import { bandesBibliotheque, definitionsBandes } from '../lib/mordheim-data.ts';
import { fichesBandesReference } from '../lib/warbands/reference.ts';

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

void test('chaque bande constructible correspond à une fiche du catalogue', () => {
  for (const definition of definitionsBandes) {
    const fiche = bandesBibliotheque.find(
      (bande) => bande.slug === definition.id,
    );
    assert.ok(fiche, definition.id);
    assert.equal(fiche.grade, '1a');
    assert.ok(definition.profils.length >= 5, definition.id);
    assert.ok(definition.regles.length >= 1, definition.id);
  }
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
