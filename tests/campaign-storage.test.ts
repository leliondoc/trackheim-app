/* oxlint-disable typescript/no-floating-promises */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ConflitSauvegardeLocale,
  cleCopieLocale,
  ecrireCopieLocale,
  lireCopieLocale,
} from '../lib/campaign-storage.ts';
import { campagneVideTest, campagneAvecCapitaineTest } from './fixtures.ts';
import {
  avertissementReglesCampagne,
  validerCampagneV4,
} from '../lib/campaign-validation.ts';
import {
  importerCampagneDepuisJson,
  serialiserCampagne,
} from '../lib/campaign-transfer.ts';

class StockageMemoire implements Storage {
  #donnees = new Map<string, string>();

  get length() {
    return this.#donnees.size;
  }

  clear() {
    this.#donnees.clear();
  }

  getItem(cle: string) {
    return this.#donnees.get(cle) ?? null;
  }

  key(index: number) {
    return [...this.#donnees.keys()][index] ?? null;
  }

  removeItem(cle: string) {
    this.#donnees.delete(cle);
  }

  setItem(cle: string, valeur: string) {
    this.#donnees.set(cle, valeur);
  }
}

test('une sauvegarde illisible reste disponible pour récupération', () => {
  const stockage = new StockageMemoire();
  const cle = cleCopieLocale('campagne-principale');
  stockage.setItem(cle, '{incomplet');

  const lecture = lireCopieLocale(stockage, 'campagne-principale');
  assert.equal(lecture.statut, 'invalide');
  assert.equal(stockage.getItem(cle), '{incomplet');
});

test('une sauvegarde sans métadonnées du format actuel est refusée', () => {
  const stockage = new StockageMemoire();
  stockage.setItem(
    cleCopieLocale('campagne-principale'),
    JSON.stringify({ campagne: campagneVideTest() }),
  );

  assert.equal(
    lireCopieLocale(stockage, 'campagne-principale').statut,
    'invalide',
  );
});

test('une différence de règles conserve le registre historique et produit un avertissement', () => {
  const stockage = new StockageMemoire();
  const campagne = campagneAvecCapitaineTest();
  campagne.combattants[0].statistiques.force = 5;
  assert.equal(validerCampagneV4(campagne).ok, false);
  assert.match(avertissementReglesCampagne(campagne) ?? '', /maximum/);
  ecrireCopieLocale(stockage, 'campagne-principale', campagne, {
    auteur: 'test',
  });
  const lecture = lireCopieLocale(stockage, 'campagne-principale');
  assert.equal(lecture.statut, 'valide');
  assert.deepEqual(
    lecture.statut === 'valide' ? lecture.copie.campagne : null,
    campagne,
  );
  assert.deepEqual(
    importerCampagneDepuisJson(serialiserCampagne(campagne)),
    campagne,
  );
});

test('un stockage bloqué est distingué d’une sauvegarde corrompue', () => {
  const stockageBloque = {
    getItem() {
      throw new DOMException('Accès refusé', 'SecurityError');
    },
  } as unknown as Storage;

  const lecture = lireCopieLocale(stockageBloque, 'campagne-principale');
  assert.equal(lecture.statut, 'indisponible');
});

test('une campagne trop volumineuse est refusée avant toute écriture', () => {
  const stockage = new StockageMemoire();
  const campagne = campagneVideTest();
  campagne.parties = Array.from({ length: 60 }, (_, index) => ({
    id: `partie-volume-${index}`,
    scenario: 'Escarmouche',
    adversaire: 'Adversaire',
    resultat: 'Victoire' as const,
    date: '2026-08-30',
    notes: 'x'.repeat(9_900),
  }));

  assert.throws(
    () =>
      ecrireCopieLocale(stockage, 'campagne-principale', campagne, {
        auteur: 'test',
      }),
    /512 Ko/,
  );
  assert.equal(stockage.length, 0);
});

test('une écriture concurrente est refusée sans écrasement', () => {
  const stockage = new StockageMemoire();
  const premiere = ecrireCopieLocale(
    stockage,
    'campagne-principale',
    campagneVideTest(),
    { auteur: 'onglet-a', versionAttendue: 0 },
  );
  ecrireCopieLocale(
    stockage,
    'campagne-principale',
    { ...campagneVideTest(), nomCampagne: 'Autre onglet' },
    { auteur: 'onglet-b', versionAttendue: premiere.versionStockage },
  );

  assert.throws(
    () =>
      ecrireCopieLocale(
        stockage,
        'campagne-principale',
        { ...campagneVideTest(), nomCampagne: 'Version onglet A' },
        { auteur: 'onglet-a', versionAttendue: premiere.versionStockage },
      ),
    ConflitSauvegardeLocale,
  );
  const lecture = lireCopieLocale(stockage, 'campagne-principale');
  assert.equal(
    lecture.statut === 'valide' ? lecture.copie.campagne.nomCampagne : '',
    'Autre onglet',
  );
});
