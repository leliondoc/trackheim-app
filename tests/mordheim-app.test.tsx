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
import { campagneAvecCapitaineTest, campagneVideTest } from './fixtures';

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

  it('ouvre l’application normalement sans imposer la création d’une bande', async () => {
    render(<MordheimApp />);

    expect(
      await screen.findByRole('heading', {
        name: 'Accueil',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Créer ma bande' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Bande de vérification/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/registre local est illisible/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /^Mode combat$/ }).querySelector('svg'),
    ).toHaveClass('lucide-swords');
    expect(
      screen.getByRole('link', { name: /^Campagne$/ }).querySelector('svg'),
    ).toHaveClass('lucide-scroll-text');
  });

  it('propose les 49 bandes dans le constructeur et conserve la sélection de la bibliothèque', async () => {
    const utilisateur = userEvent.setup();
    render(<MordheimApp />);

    await utilisateur.click(
      await screen.findByRole('link', { name: /^Bibliothèque$/ }),
    );
    await utilisateur.click(
      screen.getByRole('button', {
        name: 'Consulter les informations de Strigannes',
      }),
    );
    await utilisateur.click(
      screen.getByRole('button', { name: 'Créer cette bande' }),
    );

    const selecteur = await screen.findByRole('combobox', { name: 'Faction' });
    expect(screen.getAllByRole('option')).toHaveLength(50);
    expect(selecteur).toHaveValue('strigannes');
    expect(
      screen.getByRole('option', { name: 'Strigannes' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'Grade 1a · officiel' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'Grade 2 · création de fans' }),
    ).toBeInTheDocument();

    await utilisateur.type(
      screen.getByRole('textbox', { name: 'Nom de la nouvelle bande' }),
      'Les Voyageurs',
    );
    await utilisateur.click(
      screen.getByRole('button', { name: 'Créer la bande' }),
    );

    expect(await screen.findByText('Les Voyageurs')).toBeInTheDocument();
    expect(
      screen.getByText(/Les limites Strigannes sont contrôlées/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Domnu' })).toBeInTheDocument();
  });

  it('laisse consulter la bibliothèque sans aucune bande', async () => {
    const utilisateur = userEvent.setup();
    render(<MordheimApp />);

    await utilisateur.click(
      await screen.findByRole('link', { name: /^Bibliothèque$/ }),
    );

    expect(
      await screen.findByRole('heading', { name: /Bibliothèque/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('button', {
        name: /^Consulter les informations de /,
      }),
    ).toHaveLength(49);
    expect(screen.getAllByText(/Fiche complète/)).toHaveLength(49);
  });

  it('ouvre une fiche de bande détaillée avec une URL partageable', async () => {
    const utilisateur = userEvent.setup();
    render(<MordheimApp />);

    await utilisateur.click(
      await screen.findByRole('link', { name: /^Bibliothèque$/ }),
    );
    await utilisateur.click(
      screen.getByRole('button', {
        name: 'Consulter les informations de Culte des Possédés',
      }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Culte des Possédés' }),
    ).toBeInTheDocument();
    expect(location.hash).toBe('#/library/culte-des-possedes');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Budget initial')).toBeInTheDocument();
    expect(screen.getByText('Magister')).toBeInTheDocument();
    expect(screen.getByText('Arsenal')).toBeInTheDocument();

    await utilisateur.click(
      screen.getByRole('button', { name: 'Toutes les bandes' }),
    );
    expect(location.hash).toBe('#/library');
  });

  it('ouvre directement une fiche de bibliothèque depuis son URL', async () => {
    history.replaceState(null, '', '#/library/chasseurs-de-tresors-nains');
    render(<MordheimApp />);

    expect(
      await screen.findByRole('heading', {
        name: 'Chasseurs de Trésors Nains',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Town Cryer 4/i)).toBeInTheDocument();
    expect(screen.getByText(/5 pages en français/i)).toBeInTheDocument();
    expect(screen.getByText('Difficiles à tuer')).toBeInTheDocument();
    expect(screen.getByText('Tueur de Trolls Nain')).toBeInTheDocument();
    expect(screen.getByText('Maître des lames')).toBeInTheDocument();
  });

  it('présente un contenu utile dans chaque vue sans bande', async () => {
    const utilisateur = userEvent.setup();
    render(<MordheimApp />);

    expect(
      await screen.findByRole('heading', {
        name: 'Bâtissez votre première bande',
      }),
    ).toBeInTheDocument();

    await utilisateur.click(screen.getByRole('link', { name: /^Ma bande$/ }));
    expect(
      await screen.findByRole('heading', {
        name: 'Ce que prévoit le livre de règles',
      }),
    ).toBeInTheDocument();

    await utilisateur.click(
      screen.getByRole('link', { name: /^Mode combat$/ }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Préparez votre effectif' }),
    ).toBeInTheDocument();

    await utilisateur.click(screen.getByRole('link', { name: /^Sorts$/ }));
    expect(
      await screen.findByRole('heading', {
        name: 'Ouvrez un registre de bande',
      }),
    ).toBeInTheDocument();

    await utilisateur.click(screen.getByRole('link', { name: /^Campagne$/ }));
    expect(
      await screen.findByRole('heading', {
        name: 'Dix étapes, dans le bon ordre',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Mise à jour de la valeur de bande'),
    ).toBeInTheDocument();

    await utilisateur.click(
      screen.getByRole('link', { name: /^Règles homebrew$/ }),
    );
    expect(
      await screen.findByRole('heading', {
        name: 'L’officiel reste la référence',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('écarte silencieusement une sauvegarde invalide sans ancien format', async () => {
    localStorage.setItem(
      cleCopieLocale('campagne-principale'),
      '{ancienne-donnee-de-test',
    );
    render(<MordheimApp />);

    expect(
      await screen.findByRole('heading', {
        name: 'Accueil',
      }),
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
    document.documentElement.scrollTop = 800;
    await utilisateur.click(campagne);

    await waitFor(() => {
      expect(location.hash).toBe('#/campaign');
      expect(campagne).toHaveAttribute('aria-current', 'page');
      expect(document.activeElement).toBe(
        document.getElementById('contenu-principal'),
      );
      expect(document.documentElement.scrollTop).toBe(0);
    });
  });

  it('conserve le réglage manuel de taille du texte', async () => {
    const utilisateur = userEvent.setup();
    render(<MordheimApp />);

    const augmenter = await screen.findByRole('button', {
      name: 'Augmenter la taille du texte',
    });
    await utilisateur.click(augmenter);

    expect(screen.getByText('115 %')).toBeInTheDocument();
    expect(document.querySelector('.application')).toHaveAttribute(
      'data-text-size',
      '115',
    );
    expect(localStorage.getItem('trackheim:taille-texte')).toBe('115');
  });

  it('ouvre les quatre formats d’export depuis la campagne', async () => {
    const campagne = campagneAvecCapitaineTest();
    campagne.campagneActive = true;
    campagne.nomCampagne = 'La Chute de Mordheim';
    installerBandeTest(campagne);
    const utilisateur = userEvent.setup();
    render(<MordheimApp />);

    await utilisateur.click(
      await screen.findByRole('link', { name: /^Campagne$/ }),
    );
    await utilisateur.click(
      await screen.findByRole('button', { name: 'Exporter' }),
    );

    expect(
      await screen.findByRole('button', { name: /Sauvegarde JSON/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Résumé texte/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Texte détaillé/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Imprimer ou enregistrer en PDF/i }),
    ).toBeInTheDocument();
  });

  it('affiche le répertoire magique propre à la faction', async () => {
    const campagne = campagneVideTest();
    campagne.factionId = 'culte-des-possedes';
    installerBandeTest(campagne);
    const utilisateur = userEvent.setup();
    render(<MordheimApp />);

    await utilisateur.click(
      await screen.findByRole('link', { name: /^Sorts$/ }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Sorts et prières' }),
    ).toBeInTheDocument();
    expect(screen.getByText("Vision d'Horreur")).toBeInTheDocument();
    expect(screen.getByText(/6 pouvoir/)).toBeInTheDocument();

    await utilisateur.click(
      screen.getByRole('button', { name: 'Fiche de la bande' }),
    );
    expect(location.hash).toBe('#/library/culte-des-possedes');
    expect(
      await screen.findByRole('heading', { name: 'Culte des Possédés' }),
    ).toBeInTheDocument();
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
      resultat: null,
      date: '2026-09-01',
      valeurAvant: 25,
      valeurAdverse: 30,
      successeurChefId: null,
      etapeActive: 0,
      participants: {
        'capitaine-test': {
          combattantId: 'capitaine-test',
          effectifInitial: 1,
          pointsVieMaximumInitial: 1,
          figurinesTable: [{ etatTable: 'Debout', pointsVieActuels: 1 }],
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
      affectationsParticipants: {},
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

    await utilisateur.click(
      screen.getByRole('link', { name: /^Mode combat$/ }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Escarmouche' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Tour suivant' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sonné' })).toBeInTheDocument();
    expect(
      screen.getByLabelText('Points de Vie de Wilhelm Krieger'),
    ).toBeInTheDocument();

    await utilisateur.click(
      screen.getByRole('button', {
        name: 'Retirer un Point de Vie à Wilhelm Krieger',
      }),
    );
    expect(
      screen.getByRole('button', { name: 'Hors de combat' }),
    ).toHaveAttribute('aria-pressed', 'true');

    await utilisateur.click(screen.getByRole('link', { name: /^Campagne$/ }));
    expect(
      await screen.findByRole('heading', { name: /Bataille 1 en cours/i }),
    ).toBeInTheDocument();
    await utilisateur.click(screen.getByRole('button', { name: 'Victoire' }));
    expect(
      await screen.findByRole('heading', {
        name: 'Bataille 1 : Escarmouche',
      }),
    ).toBeInTheDocument();
  });

  it('crée une bande skaven avec ses propres profils', async () => {
    const utilisateur = userEvent.setup();
    render(<MordheimApp />);

    await utilisateur.click(
      await screen.findByRole('link', { name: /^Ma bande$/ }),
    );

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

    await utilisateur.click(
      await screen.findByRole('link', { name: /^Ma bande$/ }),
    );

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
