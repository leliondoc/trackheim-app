import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MordheimApp } from '@/app/mordheim-app';
import {
  ecrireCopieLocale,
  lireCopieLocale,
  memoriserCampagneActive,
} from '@/lib/campaign-storage';
import { campagneAvecCapitaineTest } from './fixtures';
import { obtenirProfil } from '@/lib/mordheim-data';

function afficher(campagne = campagneAvecCapitaineTest()) {
  ecrireCopieLocale(localStorage, 'homebrew-test', campagne, {
    auteur: 'test',
    versionAttendue: 0,
  });
  memoriserCampagneActive(localStorage, 'homebrew-test');
  history.replaceState(null, '', '#/homebrew');
  return render(<MordheimApp />);
}
function sauvegarde() {
  const resultat = lireCopieLocale(localStorage, 'homebrew-test');
  if (resultat.statut !== 'valide') throw new Error('Sauvegarde invalide');
  return resultat.copie.campagne;
}
function saisir(nom: string, valeur: string) {
  fireEvent.change(screen.getByLabelText(nom, { exact: true }), {
    target: { value: valeur },
  });
}

describe('atelier homebrew complet', () => {
  it('édite un profil en pause puis utilise ses caractéristiques et son prix au recrutement', async () => {
    afficher();
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', { name: 'Personnaliser Champion' }),
    );
    saisir('Nom du profil', 'Champion maison');
    saisir('Force', '5');
    saisir('Coût du profil (CO)', '0');
    saisir('Expérience initiale', '3');
    saisir('Maximum de ce profil', '4');
    await user.click(
      screen.getByRole('button', { name: 'Enregistrer les modifications' }),
    );
    await waitFor(() =>
      expect(sauvegarde().homebrew.profils?.champion.statistiques.force).toBe(
        5,
      ),
    );
    expect(sauvegarde().homebrew.actifs).toBe(false);
    expect(obtenirProfil('champion').statistiques.force).toBe(3);
    await user.click(
      screen.getByRole('switch', { name: 'Appliquer le set homebrew' }),
    );
    await user.click(screen.getByRole('link', { name: /^Ma bande$/ }));
    await user.click(
      await screen.findByRole('button', { name: 'Recruter Champion maison' }),
    );
    saisir('Nom du combattant', 'Alrik');
    await user.click(screen.getByRole('button', { name: 'Recruter' }));
    await waitFor(() => expect(sauvegarde().combattants).toHaveLength(2));
    expect(sauvegarde().combattants[1]).toMatchObject({
      nom: 'Alrik',
      statistiques: { force: 5 },
      experience: 3,
      coutAcquisition: 0,
    });
    expect(sauvegarde().couronnes).toBe(440);
  });

  it('ajuste le budget une seule fois et conserve les limites au rechargement', async () => {
    const vue = afficher();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Bande' }));
    saisir('Budget initial (CO)', '650');
    saisir('Effectif maximum', '25');
    saisir('Taille maximum d’un groupe', '8');
    await user.click(
      screen.getByRole('button', { name: 'Enregistrer les modifications' }),
    );
    expect(sauvegarde().couronnes).toBe(440);
    await user.click(
      screen.getByRole('switch', { name: 'Appliquer le set homebrew' }),
    );
    await waitFor(() => expect(sauvegarde().couronnes).toBe(590));
    await user.click(
      screen.getByRole('switch', { name: 'Appliquer le set homebrew' }),
    );
    await waitFor(() => expect(sauvegarde().couronnes).toBe(440));
    await user.click(
      screen.getByRole('switch', { name: 'Appliquer le set homebrew' }),
    );
    await waitFor(() => expect(sauvegarde().couronnes).toBe(590));
    vue.unmount();
    render(<MordheimApp />);
    await user.click(await screen.findByRole('button', { name: 'Bande' }));
    expect(screen.getByLabelText('Taille maximum d’un groupe')).toHaveValue(8);
    expect(sauvegarde().couronnes).toBe(590);
    await user.click(screen.getByRole('link', { name: /^Ma bande$/ }));
    await user.click(
      await screen.findByRole('button', { name: 'Recruter Guerrier' }),
    );
    expect(
      within(screen.getByLabelText('Taille du groupe')).getAllByRole('option'),
    ).toHaveLength(8);
  });

  it('personnalise un équipement et autorise trois armes avec les limites maison', async () => {
    const campagne = campagneAvecCapitaineTest();
    campagne.homebrew.actifs = true;
    campagne.homebrew.limites = { armesCorpsACorps: 3 };
    afficher(campagne);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', { name: 'Équipements' }),
    );
    saisir('Rechercher un élément homebrew', 'épée');
    await user.click(
      screen.getByRole('button', { name: 'Personnaliser Épée' }),
    );
    saisir('Nom de l’équipement', 'Lame maison');
    saisir('Prix personnalisé (CO)', '7');
    saisir('Exemplaires maximum par membre', '3');
    await user.click(
      screen.getByRole('button', { name: 'Enregistrer les modifications' }),
    );
    await waitFor(() =>
      expect(sauvegarde().homebrew.equipements?.epee.nom).toBe('Lame maison'),
    );
    await user.click(screen.getByRole('link', { name: /^Ma bande$/ }));
    await user.click(
      await screen.findByRole('button', {
        name: 'Modifier l’équipement de Wilhelm Krieger',
      }),
    );
    for (let i = 0; i < 3; i++)
      await user.click(
        screen.getByRole('button', {
          name: 'Ajouter un exemplaire de Lame maison',
        }),
      );
    await user.click(
      screen.getByRole('button', { name: 'Enregistrer l’équipement' }),
    );
    await waitFor(() =>
      expect(sauvegarde().combattants[0].equipementIds).toEqual([
        'epee',
        'epee',
        'epee',
      ]),
    );
    expect(sauvegarde().couronnes).toBe(419);
    await user.click(screen.getByRole('link', { name: /^Règles homebrew$/ }));
    await user.click(
      await screen.findByRole('button', {
        name: 'Rétablir tous les prix officiels',
      }),
    );
    await waitFor(() =>
      expect(sauvegarde().homebrew.equipements?.epee).toMatchObject({
        nom: 'Lame maison',
        cout: 10,
        quantiteMax: 3,
      }),
    );
    expect(sauvegarde().couronnes).toBe(419);
  });

  it('corrige une règle existante et annule un brouillon sans perdre sa portée ni son activation', async () => {
    const campagne = campagneAvecCapitaineTest();
    campagne.homebrew.regles = [
      {
        id: 'regle-test',
        titre: 'Prime',
        description: 'Ancien texte',
        portee: 'Combat',
        active: false,
      },
    ];
    afficher(campagne);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', { name: 'Modifier Prime' }),
    );
    saisir('Nom de la règle', 'Brouillon');
    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    await user.click(screen.getByRole('button', { name: 'Modifier Prime' }));
    expect(screen.getByLabelText('Nom de la règle')).toHaveValue('Prime');
    saisir('Texte de la règle', 'Nouveau texte');
    await user.click(
      screen.getByRole('button', { name: 'Enregistrer les modifications' }),
    );
    await waitFor(() =>
      expect(sauvegarde().homebrew.regles[0]).toMatchObject({
        id: 'regle-test',
        description: 'Nouveau texte',
        active: false,
        portee: 'Combat',
      }),
    );
  });

  it('corrige une fiche existante sans remplacer ses dépenses ou ses identifiants', async () => {
    afficher();
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', { name: 'Membres recrutés' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Personnaliser Wilhelm Krieger' }),
    );
    saisir('Force', '6');
    saisir('Expérience du membre', '25');
    saisir('Compétences (une par ligne)', 'Résistant\nCoup puissant');
    await user.click(
      screen.getByRole('button', { name: 'Enregistrer les modifications' }),
    );
    await waitFor(() =>
      expect(sauvegarde().combattants[0]).toMatchObject({
        id: 'capitaine-test',
        statistiques: { force: 6 },
        experience: 25,
        competences: ['Résistant', 'Coup puissant'],
        coutAcquisition: 60,
      }),
    );
    expect(sauvegarde().couronnes).toBe(440);
  });
  it('autorise une arme d’une autre bande pour un seul membre et conserve ce choix', async () => {
    afficher();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('link', { name: /^Ma bande$/ }));
    await user.click(
      await screen.findByRole('button', {
        name: 'Modifier l’équipement de Wilhelm Krieger',
      }),
    );
    expect(
      screen.queryByRole('checkbox', {
        name: 'Ajouter Marteau sigmarite',
      }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('checkbox', {
        name: 'Homebrew : accès illimité aux armes',
      }),
    );
    saisir('Rechercher une arme ou un équipement', 'Marteau sigmarite');
    await user.click(
      screen.getByRole('checkbox', {
        name: 'Ajouter Marteau sigmarite',
      }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Enregistrer l’équipement' }),
    );
    await waitFor(() =>
      expect(sauvegarde().combattants[0]).toMatchObject({
        accesArmesHomebrew: true,
        equipementIds: ['marteau-sigmarite'],
      }),
    );
    expect(sauvegarde().couronnes).toBe(425);
    expect(sauvegarde().homebrew.actifs).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Recruter Champion' }));
    expect(
      screen.getByRole('checkbox', {
        name: 'Homebrew : accès illimité aux armes',
      }),
    ).not.toBeChecked();
    expect(
      screen.queryByRole('checkbox', {
        name: 'Ajouter Marteau sigmarite',
      }),
    ).not.toBeInTheDocument();
  });
});
