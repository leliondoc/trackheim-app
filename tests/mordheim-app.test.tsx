import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { MordheimApp } from '@/app/mordheim-app';
import { cleCopieLocale } from '@/lib/campaign-storage';

describe('navigation principale', () => {
  beforeEach(() => {
    localStorage.clear();
    history.replaceState(null, '', '#/overview');
  });

  it('synchronise la vue, l’URL, l’état actif et le focus', async () => {
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

  it('crée une bande skaven avec ses propres profils', async () => {
    const utilisateur = userEvent.setup();
    render(<MordheimApp />);

    await utilisateur.click(
      await screen.findByRole('button', { name: /Les Cendres de Sigmar/i }),
    );
    await utilisateur.selectOptions(
      screen.getByRole('combobox', { name: 'Faction' }),
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

    await utilisateur.click(
      await screen.findByRole('button', { name: /Les Cendres de Sigmar/i }),
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
    render(<MordheimApp />);

    await screen.findByText('Enregistré sur cet appareil');
    const cle = cleCopieLocale('campagne-principale');
    const copie = JSON.parse(localStorage.getItem(cle) ?? '{}') as {
      auteur: string;
      versionStockage: number;
      campagne: { nomCampagne: string };
    };
    copie.auteur = 'autre-onglet';
    copie.versionStockage += 1;
    copie.campagne.nomCampagne = 'Campagne synchronisée';
    const nouvelleValeur = JSON.stringify(copie);
    localStorage.setItem(cle, nouvelleValeur);

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: cle, newValue: nouvelleValeur }),
      );
    });

    expect(
      await screen.findByText('Campagne synchronisée'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Deux versions du registre existent'),
    ).not.toBeInTheDocument();
  });
});
