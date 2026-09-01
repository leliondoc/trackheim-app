import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { MordheimApp } from '@/app/mordheim-app';
import {
  cleCopieLocale,
  ecrireCopieLocale,
  memoriserCampagneActive,
} from '@/lib/campaign-storage';
import type { EtatCampagne } from '@/lib/mordheim-data';
import { campagneAvecCapitaineTest } from './fixtures';

function installerBandeTest(
  campagne: EtatCampagne = campagneAvecCapitaineTest(),
) {
  ecrireCopieLocale(localStorage, 'campagne-principale', campagne, {
    auteur: 'test',
    versionAttendue: 0,
  });
  memoriserCampagneActive(localStorage, 'campagne-principale');
}

describe('navigation principale', () => {
  beforeEach(() => {
    localStorage.clear();
    history.replaceState(null, '', '#/overview');
  });

  it('démarre sans bande fictive ni faction présélectionnée', async () => {
    render(<MordheimApp />);

    const faction = await screen.findByRole('combobox', { name: 'Faction' });
    expect(faction).toHaveValue('');
    expect(
      screen.queryByText(/Bande de vérification/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/registre local est illisible/i),
    ).not.toBeInTheDocument();
  });

  it('écarte silencieusement une ancienne donnée de vérification invalide', async () => {
    localStorage.setItem(
      cleCopieLocale('campagne-principale'),
      '{ancienne-donnee-de-test',
    );
    render(<MordheimApp />);

    expect(
      await screen.findByRole('heading', { name: 'Mes bandes' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/registre local est illisible/i),
    ).not.toBeInTheDocument();
    expect(
      localStorage.getItem(cleCopieLocale('campagne-principale')),
    ).toBeNull();
  });

  it('synchronise la vue, l’URL, l’état actif et le focus', async () => {
    installerBandeTest();
    const utilisateur = userEvent.setup();
    render(<MordheimApp />);

    const campagne = await screen.findByRole('link', {
      name: /^Campagne$/,
    });
    await utilisateur.click(campagne);

    await waitFor(() => {
      expect(location.hash).toBe('#/campaign');
      expect(campagne).toHaveAttribute('aria-current', 'page');
      expect(document.activeElement).toBe(
        document.getElementById('contenu-principal'),
      );
    });
  });

  it('nomme précisément les contrôles d’expérience', async () => {
    installerBandeTest();
    const utilisateur = userEvent.setup();
    render(<MordheimApp />);

    await utilisateur.click(
      await screen.findByRole('link', { name: /^Ma bande$/ }),
    );

    expect(
      await screen.findByRole('button', {
        name: 'Retirer 1 point d’expérience à Wilhelm Krieger',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Ajouter 1 point d’expérience à Wilhelm Krieger',
      }),
    ).toBeInTheDocument();
  });

  it('verrouille toutes les mutations de la bande pendant une bataille', async () => {
    const campagne = campagneAvecCapitaineTest();
    campagne.campagneActive = true;
    campagne.nomCampagne = 'La Chute de Mordheim';
    campagne.batailleEnCours = {
      id: 'bataille-verrouillage',
      numero: 1,
      scenario: 'Escarmouche',
      adversaire: 'Skavens',
      resultat: 'Victoire',
      date: '2026-09-01',
      valeurAvant: 25,
      valeurAdverse: 30,
      successeurChefId: null,
      etapeActive: 0,
      participants: {
        'capitaine-test': {
          combattantId: 'capitaine-test',
          horsCombat: 0,
          jetsBlessure: [],
          blessureResolue: false,
          blessureNote: '',
          ennemisHorsCombat: 0,
          experienceScenario: 0,
          experienceManuelle: 0,
          experienceAppliquee: false,
          progressions: { version: 1, saisies: [] },
        },
      },
      exploration: {
        lancers: [],
        desConserves: [],
        fragmentsTrouves: 0,
        appliquee: false,
        noteResultat: '',
      },
      vente: { fragmentsVendus: 0, revenu: 0, appliquee: false },
      veterans: {
        de1: null,
        de2: null,
        disponibilite: null,
        experienceDepensee: 0,
      },
      jetsRarete: [],
      personnel: { version: 1, aucun: false, entrees: [] },
      notes: '',
    };
    installerBandeTest(campagne);
    const utilisateur = userEvent.setup();
    render(<MordheimApp />);

    await utilisateur.click(
      await screen.findByRole('link', { name: /^Ma bande$/ }),
    );

    expect(
      await screen.findByText(/Une bataille est en cours/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Ajouter 1 point d’expérience à Wilhelm Krieger',
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /Ajouter un combattant/i }),
    ).toBeDisabled();
  });

  it('crée une bande skaven avec ses propres profils', async () => {
    const utilisateur = userEvent.setup();
    render(<MordheimApp />);

    await utilisateur.selectOptions(
      await screen.findByRole('combobox', { name: 'Faction' }),
      'skavens-du-clan-eshin',
    );
    await utilisateur.type(
      screen.getByRole('textbox', { name: 'Nom de la nouvelle bande' }),
      'Les Crocs de l’ombre',
    );
    await utilisateur.click(
      screen.getByRole('button', { name: /Créer la bande/i }),
    );

    expect(
      await screen.findByText(/Skavens du Clan Eshin/i),
    ).toBeInTheDocument();
    await utilisateur.click(screen.getByRole('link', { name: /^Ma bande$/ }));
    expect(
      await screen.findByRole('heading', { name: 'Adepte assassin' }),
    ).toBeInTheDocument();
  });

  it('sépare la construction de bande du démarrage de campagne', async () => {
    const utilisateur = userEvent.setup();
    render(<MordheimApp />);

    await utilisateur.selectOptions(
      await screen.findByRole('combobox', { name: 'Faction' }),
      'mercenaires-reiklanders',
    );
    await utilisateur.type(
      screen.getByRole('textbox', { name: 'Nom de la nouvelle bande' }),
      'Les Veilleurs',
    );
    await utilisateur.click(
      screen.getByRole('button', { name: /Créer la bande/i }),
    );

    await utilisateur.click(
      await screen.findByRole('link', { name: /^Campagne$/ }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Entrer dans la chronique' }),
    ).toBeInTheDocument();

    await utilisateur.type(
      screen.getByRole('textbox', {
        name: 'Nom de la campagne à démarrer',
      }),
      'Les Ruines de l’Est',
    );
    await utilisateur.click(
      screen.getByRole('button', { name: /Démarrer la campagne/i }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Après la poussière' }),
    ).toBeInTheDocument();
  });

  it('synchronise un autre onglet sans alerte quand la copie locale est propre', async () => {
    installerBandeTest();
    render(<MordheimApp />);

    await screen.findByText('Wilhelm Krieger');
    const cle = cleCopieLocale('campagne-principale');
    const copie = JSON.parse(localStorage.getItem(cle) ?? '{}') as {
      auteur: string;
      versionStockage: number;
      campagne: { nomBande: string };
    };
    copie.auteur = 'autre-onglet';
    copie.campagne.nomBande = 'Bande synchronisée';
    const nouvelleValeur = JSON.stringify(copie);
    localStorage.setItem(cle, nouvelleValeur);

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: cle, newValue: nouvelleValeur }),
      );
    });

    expect(
      (await screen.findAllByText('Bande synchronisée')).length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryByText('Deux versions du registre existent'),
    ).not.toBeInTheDocument();
  });
});
