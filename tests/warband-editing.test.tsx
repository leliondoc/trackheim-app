import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MordheimApp } from '@/app/mordheim-app';
import {
  ecrireCopieLocale,
  lireCopieLocale,
  memoriserCampagneActive,
} from '@/lib/campaign-storage';
import {
  importerCampagneDepuisJson,
  serialiserCampagne,
} from '@/lib/campaign-transfer';
import { obtenirProfil, type EtatCampagne } from '@/lib/mordheim-data';
import { campagneAvecCapitaineTest } from './fixtures';

function afficher(campagne = campagneAvecCapitaineTest()) {
  ecrireCopieLocale(localStorage, 'edition-test', campagne, {
    auteur: 'test',
    versionAttendue: 0,
  });
  memoriserCampagneActive(localStorage, 'edition-test');
  history.replaceState(null, '', '#/warband');
  return render(<MordheimApp />);
}

function sauvegarde() {
  const lecture = lireCopieLocale(localStorage, 'edition-test');
  if (lecture.statut !== 'valide') throw new Error('Sauvegarde invalide');
  return lecture.copie.campagne;
}

function avecGroupe(): EtatCampagne {
  const campagne = campagneAvecCapitaineTest();
  const profil = obtenirProfil('guerrier');
  campagne.combattants.push({
    ...campagne.combattants[0],
    id: 'groupe-test',
    nom: 'Les gardes',
    profilId: profil.id,
    statistiques: { ...profil.statistiques },
    experience: 0,
    chef: false,
    quantite: 3,
    equipementIds: ['epee'],
    coutAcquisition: 35,
    coutAcquisitionTotal: 105,
  });
  campagne.couronnes -= 105;
  return campagne;
}

describe('corrections du constructeur de bande', () => {
  it('recrute au-delà du budget et conserve le déficit au rechargement et à l’export', async () => {
    const campagne = campagneAvecCapitaineTest();
    campagne.homebrew.actifs = true;
    campagne.homebrew.coutsRecrues.champion = 500;
    const vue = afficher(campagne);
    const utilisateur = userEvent.setup();
    await utilisateur.click(
      await screen.findByRole('button', { name: 'Ajouter un combattant' }),
    );
    fireEvent.change(screen.getByLabelText('Nom du combattant'), {
      target: { value: 'Champion coûteux' },
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Budget dépassé de 60 CO',
    );
    await utilisateur.click(screen.getByRole('button', { name: 'Recruter' }));
    await waitFor(() => expect(sauvegarde().couronnes).toBe(-60));
    expect(sauvegarde().combattants).toHaveLength(2);
    const transfert = importerCampagneDepuisJson(
      serialiserCampagne(sauvegarde()),
    );
    expect(transfert.couronnes).toBe(-60);
    vue.unmount();
    render(<MordheimApp />);
    expect(await screen.findByText('Champion coûteux')).toBeInTheDocument();
    expect(
      screen.getByText('Budget initial dépassé de 60 CO'),
    ).toBeInTheDocument();
  });

  it('modifie l’équipement du Chef, débite puis rembourse sans recréer sa fiche', async () => {
    const campagne = campagneAvecCapitaineTest();
    campagne.combattants[0].notes = 'À conserver';
    const original = structuredClone(campagne.combattants[0]);
    afficher(campagne);
    const utilisateur = userEvent.setup();
    await utilisateur.click(
      await screen.findByRole('button', {
        name: 'Modifier l’équipement de Wilhelm Krieger',
      }),
    );
    await utilisateur.click(
      screen.getByRole('button', { name: 'Ajouter un exemplaire de Épée' }),
    );
    await utilisateur.click(
      screen.getByRole('button', { name: 'Enregistrer l’équipement' }),
    );
    await waitFor(() => expect(sauvegarde().couronnes).toBe(430));
    expect(sauvegarde().combattants[0]).toEqual({
      ...original,
      equipementIds: ['epee'],
      coutAcquisition: 70,
      coutAcquisitionTotal: 70,
    });
    await utilisateur.click(
      screen.getByRole('button', {
        name: 'Modifier l’équipement de Wilhelm Krieger',
      }),
    );
    await utilisateur.click(
      screen.getByRole('button', { name: 'Retirer un exemplaire de Épée' }),
    );
    await utilisateur.click(
      screen.getByRole('button', { name: 'Enregistrer l’équipement' }),
    );
    await waitFor(() => expect(sauvegarde().couronnes).toBe(440));
    expect(sauvegarde().combattants[0]).toEqual(original);
    expect(sauvegarde().inventaire).toEqual({});
  });

  it('rembourse l’équipement de chaque membre d’un groupe', async () => {
    afficher(avecGroupe());
    const utilisateur = userEvent.setup();
    await utilisateur.click(
      await screen.findByRole('button', {
        name: 'Modifier l’équipement de Les gardes',
      }),
    );
    await utilisateur.click(
      screen.getByRole('button', { name: 'Retirer un exemplaire de Épée' }),
    );
    await utilisateur.click(
      screen.getByRole('button', { name: 'Enregistrer l’équipement' }),
    );
    await waitFor(() => expect(sauvegarde().couronnes).toBe(365));
    expect(sauvegarde().combattants[1]).toMatchObject({
      quantite: 3,
      coutAcquisition: 25,
      coutAcquisitionTotal: 75,
      equipementIds: [],
    });
  });

  it('rembourse intégralement un groupe retiré à la création sans dupliquer ses objets', async () => {
    afficher(avecGroupe());
    const confirmer = vi.spyOn(window, 'confirm').mockReturnValue(true);
    try {
      const utilisateur = userEvent.setup();
      await utilisateur.click(
        await screen.findByRole('button', { name: 'Renvoyer Les gardes' }),
      );
      await waitFor(() => expect(sauvegarde().couronnes).toBe(440));
      expect(sauvegarde().combattants).toHaveLength(1);
      expect(sauvegarde().inventaire).toEqual({});
      await utilisateur.click(
        screen.getByRole('button', { name: 'Renvoyer Wilhelm Krieger' }),
      );
      await waitFor(() => expect(sauvegarde().couronnes).toBe(500));
      expect(sauvegarde().combattants).toHaveLength(0);
    } finally {
      confirmer.mockRestore();
    }
  });

  it('annuler une édition ou un retrait laisse le trésor et le combattant intacts', async () => {
    afficher();
    const original = sauvegarde();
    const utilisateur = userEvent.setup();
    await utilisateur.click(
      await screen.findByRole('button', {
        name: 'Modifier l’équipement de Wilhelm Krieger',
      }),
    );
    await utilisateur.click(
      screen.getByRole('button', { name: 'Ajouter un exemplaire de Épée' }),
    );
    await utilisateur.keyboard('{Escape}');
    expect(sauvegarde()).toEqual(original);
    const confirmer = vi.spyOn(window, 'confirm').mockReturnValue(false);
    try {
      await utilisateur.click(
        screen.getByRole('button', { name: 'Renvoyer Wilhelm Krieger' }),
      );
      expect(sauvegarde()).toEqual(original);
    } finally {
      confirmer.mockRestore();
    }
  });

  it('après une bataille, remet les armes au magot puis les réalloue sans remboursement', async () => {
    const campagne = avecGroupe();
    campagne.numeroBataille = 1;
    afficher(campagne);
    const utilisateur = userEvent.setup();
    await utilisateur.click(
      await screen.findByRole('button', {
        name: 'Modifier l’équipement de Les gardes',
      }),
    );
    await utilisateur.click(
      screen.getByRole('button', { name: 'Remettre Épée au magot' }),
    );
    await waitFor(() => expect(sauvegarde().inventaire.epee).toBe(3));
    expect(sauvegarde().couronnes).toBe(335);
    await utilisateur.selectOptions(
      screen.getByRole('combobox', { name: 'Objet à équiper' }),
      'epee',
    );
    await utilisateur.click(
      screen.getByRole('button', { name: 'Équiper depuis le magot' }),
    );
    await waitFor(() => expect(sauvegarde().inventaire).toEqual({}));
    expect(sauvegarde().combattants[1].equipementIds).toEqual(['epee']);
    expect(sauvegarde().couronnes).toBe(335);
  });

  it('garde le contrôle de trésorerie pour les recrutements après la création', async () => {
    const campagne = campagneAvecCapitaineTest();
    campagne.numeroBataille = 1;
    campagne.couronnes = 0;
    afficher(campagne);
    const utilisateur = userEvent.setup();
    await utilisateur.click(
      await screen.findByRole('button', { name: 'Ajouter un combattant' }),
    );
    fireEvent.change(screen.getByLabelText('Nom du combattant'), {
      target: { value: 'Sans fonds' },
    });
    expect(screen.getByRole('button', { name: 'Recruter' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Trésor insuffisant');
  });
});
