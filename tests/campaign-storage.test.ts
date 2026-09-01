/* oxlint-disable typescript/no-floating-promises */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ConflitSauvegardeLocale,
  cleCopieLocale,
  ecrireCopieLocale,
  lireCopieLocale,
} from '../lib/campaign-storage.ts';
import { etatInitial } from '../lib/mordheim-data.ts';

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
    JSON.stringify({ campagne: etatInitial }),
  );

  assert.equal(
    lireCopieLocale(stockage, 'campagne-principale').statut,
    'invalide',
  );
});

test('une écriture concurrente est refusée sans écrasement', () => {
  const stockage = new StockageMemoire();
  const premiere = ecrireCopieLocale(
    stockage,
    'campagne-principale',
    structuredClone(etatInitial),
    { auteur: 'onglet-a', versionAttendue: 0 },
  );
  ecrireCopieLocale(
    stockage,
    'campagne-principale',
    { ...structuredClone(etatInitial), nomCampagne: 'Autre onglet' },
    { auteur: 'onglet-b', versionAttendue: premiere.versionStockage },
  );

  assert.throws(
    () =>
      ecrireCopieLocale(
        stockage,
        'campagne-principale',
        { ...structuredClone(etatInitial), nomCampagne: 'Version onglet A' },
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
