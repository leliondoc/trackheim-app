import { describe, expect, it } from 'vitest';
import {
  construireDocumentImprimable,
  construireFeuilleImprimable,
} from '../lib/warband-export';
import { campagneAvecCapitaineTest } from './fixtures';

function nouveauDocument() {
  return document.implementation.createHTMLDocument();
}

function contenu(noeud: Element | null) {
  return noeud?.textContent?.replace(/\s+/g, ' ').trim();
}

describe('document imprimable construit avec des noeuds DOM', () => {
  it('conserve le contenu et la mise en page de la feuille existante', () => {
    const campagne = campagneAvecCapitaineTest();
    campagne.combattants[0].notes = 'Une note de campagne';
    campagne.combattants[0].ameliorationsSorts = { Réanimation: 2 };
    const attendu = new DOMParser().parseFromString(
      construireFeuilleImprimable(campagne),
      'text/html',
    );
    const resultat = nouveauDocument();
    construireDocumentImprimable(campagne, resultat);
    expect(resultat.title).toBe(attendu.title);
    expect(resultat.documentElement.lang).toBe('fr');
    expect(resultat.querySelector('style')?.textContent).toBe(
      attendu.querySelector('style')?.textContent?.trim(),
    );
    for (const selecteur of [
      'h1',
      'h2',
      '.summary b',
      '.summary p',
      'table td',
      'dl div',
      'footer',
    ]) {
      expect([...resultat.querySelectorAll(selecteur)].map(contenu)).toEqual(
        [...attendu.querySelectorAll(selecteur)].map(contenu),
      );
    }
    expect(resultat.querySelector('table')?.getAttribute('aria-label')).toBe(
      attendu.querySelector('table')?.getAttribute('aria-label'),
    );
  });

  it('garde les balises et les faux attributs malveillants sous forme de texte', () => {
    const campagne = campagneAvecCapitaineTest();
    const attaque = '<img src=x onerror=alert(1)><svg onload=alert(2)>';
    const nom = '" onmouseover="alert(3)';
    campagne.nomBande = attaque;
    campagne.couronnes = attaque as unknown as number;
    campagne.fragments = attaque as unknown as number;
    campagne.combattants[0].nom = nom;
    campagne.combattants[0].notes = attaque;
    campagne.combattants[0].experience = attaque as unknown as number;
    campagne.combattants[0].statistiques.force = attaque as unknown as number;
    const resultat = nouveauDocument();
    construireDocumentImprimable(campagne, resultat);
    expect(
      resultat.querySelector(
        'script,img,svg,iframe,[onerror],[onload],[onmouseover]',
      ),
    ).toBeNull();
    expect(resultat.querySelector('h1')?.textContent).toBe(attaque);
    expect(resultat.querySelector('h2')?.textContent).toBe(nom);
    expect(resultat.querySelector('table')?.getAttribute('aria-label')).toBe(
      'Caractéristiques de ' + nom,
    );
    expect(resultat.body.textContent).toContain(attaque);
    expect(
      resultat.querySelector('.fighter dl div:last-child dd')?.textContent,
    ).toBe(attaque);
  });

  it('garde une feuille lisible pour une bande sans combattants', () => {
    const campagne = campagneAvecCapitaineTest();
    campagne.combattants = [];
    const resultat = nouveauDocument();
    construireDocumentImprimable(campagne, resultat);
    expect(resultat.querySelector('.roster')?.textContent).toBe(
      'Aucun combattant recruté.',
    );
    expect(resultat.querySelector('style')?.textContent).toContain(
      '@page { size: A4; margin: 12mm; }',
    );
  });
});
