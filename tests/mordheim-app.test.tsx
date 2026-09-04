import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MordheimApp } from '@/app/mordheim-app';
import {
  cleCopieLocale,
  CLE_CAMPAGNE_ACTIVE,
  ecrireCopieLocale,
  lireCopieLocale,
  memoriserCampagneActive,
} from '@/lib/campaign-storage';
import type { EtatCampagne } from '@/lib/mordheim-data';
import { campagneAvecCapitaineTest, campagneVideTest } from './fixtures';
import { serialiserCampagne } from '@/lib/campaign-transfer';

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

  it('préserve les changements intervenus pendant la lecture asynchrone d’une sauvegarde', async () => {
    installerBandeTest();
    history.replaceState(null, '', '#/campaign');
    render(<MordheimApp />);
    await screen.findByRole('heading', { name: 'Entrer dans la chronique' });
    const utilisateur = userEvent.setup();
    let terminer!: (texte: string) => void;
    const attente = new Promise<string>((resolve) => {
      terminer = resolve;
    });
    fireEvent.change(screen.getByLabelText(/Choisir un fichier JSON/), {
      target: { files: [{ size: 1000, text: () => attente }] },
    });
    await utilisateur.type(
      screen.getByRole('textbox', { name: 'Nom de la campagne à démarrer' }),
      'Chronique nouvelle',
    );
    await utilisateur.click(
      screen.getByRole('button', { name: /Démarrer la campagne/ }),
    );
    await waitFor(() => {
      const lecture = lireCopieLocale(localStorage, 'campagne-principale');
      expect(
        lecture.statut === 'valide' && lecture.copie.campagne.nomCampagne,
      ).toBe('Chronique nouvelle');
    });
    await act(async () => {
      terminer(
        serialiserCampagne({
          ...campagneVideTest(),
          nomBande: 'Bande importée',
        }),
      );
    });
    await screen.findByText('Bande importée');
    const lecture = lireCopieLocale(localStorage, 'campagne-principale');
    expect(
      lecture.statut === 'valide' && lecture.copie.campagne.nomCampagne,
    ).toBe('Chronique nouvelle');
  });

  it('conserve la version courante quand la mémorisation de la nouvelle bande échoue', async () => {
    installerBandeTest();
    render(<MordheimApp />);
    const utilisateur = userEvent.setup();
    await utilisateur.click(
      await screen.findByRole('button', { name: 'Bande de test' }),
    );
    await utilisateur.selectOptions(
      screen.getByRole('combobox', { name: 'Faction' }),
      'mercenaires-reiklanders',
    );
    await utilisateur.type(
      screen.getByRole('textbox', { name: 'Nom de la nouvelle bande' }),
      'Nouvelle bande',
    );
    const ecrire = Storage.prototype.setItem.bind(localStorage);
    const espion = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(function (this: Storage, cle, valeur) {
        if (cle === CLE_CAMPAGNE_ACTIVE && valeur !== 'campagne-principale')
          throw new DOMException('Quota pointeur', 'QuotaExceededError');
        ecrire(cle, valeur);
      });
    try {
      await utilisateur.click(
        screen.getByRole('button', { name: /Créer la bande/ }),
      );
    } finally {
      espion.mockRestore();
    }
    await utilisateur.keyboard('{Escape}');
    await utilisateur.click(screen.getByRole('link', { name: /^Campagne$/ }));
    await utilisateur.type(
      screen.getByRole('textbox', { name: 'Nom de la campagne à démarrer' }),
      'Après quota',
    );
    await utilisateur.click(
      screen.getByRole('button', { name: /Démarrer la campagne/ }),
    );
    await waitFor(() => {
      const lecture = lireCopieLocale(localStorage, 'campagne-principale');
      expect(
        lecture.statut === 'valide' && lecture.copie.campagne.nomCampagne,
      ).toBe('Après quota');
    });
    expect(
      screen.queryByRole('heading', {
        name: 'Deux versions du registre existent',
      }),
    ).not.toBeInTheDocument();
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

  it('ouvre une page du menu mobile dès le premier appui tactile', async () => {
    render(<MordheimApp />);

    fireEvent.pointerUp(
      await screen.findByRole('link', { name: /^Bibliothèque$/ }),
      { pointerType: 'touch' },
    );

    expect(
      await screen.findByRole('heading', { name: /Bibliothèque/i }),
    ).toBeInTheDocument();
    expect(location.hash).toBe('#/library');
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
    expect(screen.getAllByText(/Fiche de référence ·/)).toHaveLength(49);
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

  it('affiche les noms accentués plutôt que les identifiants des profils', async () => {
    const utilisateur = userEvent.setup();
    render(<MordheimApp />);

    await utilisateur.click(
      await screen.findByRole('link', { name: /^Bibliothèque$/ }),
    );
    await utilisateur.click(
      screen.getByRole('button', {
        name: 'Consulter les informations de Kermesse du Chaos',
      }),
    );

    expect(
      await screen.findByText('Maître de Cérémonie, Impur, Frère'),
    ).toBeInTheDocument();
    expect(screen.queryByText('maitre-de-ceremonie, impur, frere')).toBeNull();
  });

  it('préserve une sauvegarde invalide et propose de récupérer son original', async () => {
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
      screen.getByRole('heading', { name: 'Votre registre est conservé' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Télécharger le registre original' }),
    ).toBeInTheDocument();
    expect(localStorage.getItem(cleCopieLocale('campagne-principale'))).toBe(
      '{ancienne-donnee-de-test',
    );
  });

  it('restaure directement depuis l’accueil sans créer une bande temporaire', async () => {
    const utilisateur = userEvent.setup();
    render(<MordheimApp />);
    expect(
      await screen.findByRole('button', { name: 'Restaurer une sauvegarde' }),
    ).toBeInTheDocument();
    const json = serialiserCampagne(campagneAvecCapitaineTest());
    const fichier = new File([json], 'campagne.json', {
      type: 'application/json',
    });
    Object.defineProperty(fichier, 'text', { value: async () => json });
    await utilisateur.upload(
      screen.getByLabelText('Fichier de sauvegarde Trackheim'),
      fichier,
    );
    await utilisateur.click(
      await screen.findByRole('link', { name: /^Ma bande$/ }),
    );
    expect(await screen.findByText('Wilhelm Krieger')).toBeInTheDocument();
  });

  it('reste utilisable quand le getter localStorage est interdit', async () => {
    const stockage = vi
      .spyOn(window, 'localStorage', 'get')
      .mockImplementation(() => {
        throw new DOMException('Refusé', 'SecurityError');
      });
    try {
      const utilisateur = userEvent.setup();
      render(<MordheimApp />);
      expect(
        await screen.findByRole('heading', { name: 'Accueil' }),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Stockage indisponible : mode mémoire'),
      ).toBeInTheDocument();
      await utilisateur.click(
        screen.getByRole('button', { name: 'Créer ma bande' }),
      );
      await utilisateur.selectOptions(
        screen.getByRole('combobox', { name: 'Faction' }),
        'mercenaires-reiklanders',
      );
      await utilisateur.type(
        screen.getByRole('textbox', { name: 'Nom de la nouvelle bande' }),
        'Bande en mémoire',
      );
      await utilisateur.click(
        screen.getByRole('button', { name: 'Créer la bande' }),
      );
      expect(await screen.findByText('Bande en mémoire')).toBeInTheDocument();
      expect(
        screen.getByText('Mode mémoire : export indispensable'),
      ).toBeInTheDocument();
    } finally {
      stockage.mockRestore();
    }
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
    ).toHaveAttribute('aria-pressed', 'false');
    await utilisateur.click(
      screen.getByRole('button', { name: 'Hors de combat' }),
    );

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
      await screen.findByRole(
        'heading',
        { name: 'Après la poussière' },
        { timeout: 5000 },
      ),
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
