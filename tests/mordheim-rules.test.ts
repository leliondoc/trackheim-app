/* oxlint-disable typescript/no-floating-promises */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  calculerBonusChallenger,
  calculerValeurBande,
  calculerVentePierre,
  compterProgressionsFranchies,
  disponibiliteVeterans,
  jetRareteReussi,
  resoudreBlessureHommeDeMain,
  resoudreExploration,
  seuilsProgressionHeros,
  seuilsProgressionHommesDeMain,
  trouverBlessureHero,
  trouverProgressionHero,
  trouverProgressionHommeDeMain,
} from '../lib/mordheim-rules.ts';

describe('valeur de bande et outsider', () => {
  it('multiplie bien un groupe par son effectif et son XP partagé', () => {
    assert.equal(calculerValeurBande([{ quantite: 3, experience: 5 }]), 30);
  });

  it('respecte chaque borne de la table challenger', () => {
    const cas = [
      [0, 0],
      [50, 0],
      [51, 1],
      [75, 1],
      [76, 2],
      [100, 2],
      [101, 3],
      [150, 3],
      [151, 4],
      [300, 4],
      [301, 5],
    ] as const;
    for (const [difference, attendu] of cas) {
      assert.equal(calculerBonusChallenger(difference), attendu);
    }
  });
});

describe('expérience et progressions', () => {
  it('épingle les seuils imprimés des héros et hommes de main', () => {
    assert.deepEqual(
      seuilsProgressionHeros,
      [
        2, 4, 6, 8, 11, 14, 17, 20, 24, 28, 32, 36, 41, 46, 51, 57, 63, 69, 76,
        83, 90,
      ],
    );
    assert.deepEqual(seuilsProgressionHommesDeMain, [2, 5, 9, 14]);
  });

  it('ne compte que les seuils franchis pendant le gain courant', () => {
    assert.equal(compterProgressionsFranchies(35, 47, 'Héros'), 3);
    assert.equal(compterProgressionsFranchies(5, 14, 'Hommes de main'), 2);
  });

  it('résout les bornes des deux tables de progression', () => {
    assert.equal(trouverProgressionHero(2).id, 'competence');
    assert.equal(trouverProgressionHero(6).id, 'force-attaque');
    assert.equal(trouverProgressionHero(7).id, 'cc-ct');
    assert.equal(trouverProgressionHero(8).id, 'initiative-commandement');
    assert.equal(trouverProgressionHero(9).id, 'pv-endurance');
    assert.equal(trouverProgressionHero(12).id, 'competence');
    assert.equal(trouverProgressionHommeDeMain(2).id, 'initiative');
    assert.equal(trouverProgressionHommeDeMain(5).id, 'force');
    assert.equal(trouverProgressionHommeDeMain(7).id, 'cc-ct');
    assert.equal(trouverProgressionHommeDeMain(8).id, 'attaques');
    assert.equal(trouverProgressionHommeDeMain(9).id, 'commandement');
    assert.equal(trouverProgressionHommeDeMain(12).id, 'gars-doue');
  });
});

describe('exploration et revenus', () => {
  it('reproduit l’exemple vérifié : total 18, quatre fragments et triple 5', () => {
    assert.deepEqual(resoudreExploration([5, 5, 5, 3]), {
      des: [5, 5, 5, 3],
      total: 18,
      fragments: 4,
      combinaison: { valeur: 5, occurrences: 3 },
    });
  });

  it('préfère la face la plus haute quand la multiplicité est égale', () => {
    assert.deepEqual(resoudreExploration([2, 2, 6, 6]).combinaison, {
      valeur: 6,
      occurrences: 2,
    });
  });

  it('applique la table de vente à quatre fragments et sept membres', () => {
    assert.equal(calculerVentePierre(4, 7), 70);
  });

  it('refuse plus de six dés conservés ou un dé impossible', () => {
    assert.throws(() => resoudreExploration([1, 2, 3, 4, 5, 6, 6]));
    assert.throws(() => resoudreExploration([0]));
  });
});

describe('blessures, vétérans et rareté', () => {
  it('résout les deux bornes de la blessure des hommes de main', () => {
    assert.equal(resoudreBlessureHommeDeMain(2), 'perdu');
    assert.equal(resoudreBlessureHommeDeMain(3), 'survit');
  });

  it('couvre les limites et résultats singuliers de la table D66', () => {
    assert.equal(trouverBlessureHero(11).id, 'mort');
    assert.equal(trouverBlessureHero(15).id, 'mort');
    assert.equal(trouverBlessureHero(16).id, 'multiples');
    assert.equal(trouverBlessureHero(55).id, 'recuperation');
    assert.equal(trouverBlessureHero(56).id, 'rancune');
    assert.equal(trouverBlessureHero(66).id, 'miracle');
    assert.throws(() => trouverBlessureHero(67));
  });

  it('additionne les vétérans et accepte une rareté exactement atteinte', () => {
    assert.equal(disponibiliteVeterans(3, 4), 7);
    assert.equal(jetRareteReussi(4, 5, 9), true);
    assert.equal(jetRareteReussi(3, 5, 9), false);
    assert.throws(() => jetRareteReussi(0, 5, 9));
  });
});
