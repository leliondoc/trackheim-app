import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PostBattleWorkflow } from '@/components/post-battle-workflow';
import { SpellsView } from '@/components/spells-view';
import { creerSuiviCombattant } from '@/lib/battle-state';
import { sortsPourProfil } from '@/lib/competences-data';
import {
  obtenirProfil,
  type EtatCampagne,
  type Combattant,
  type BatailleEnCours,
  type FactionId,
} from '@/lib/mordheim-data';
import { obtenirFicheBandeReference } from '@/lib/warbands/reference';
import { campagneAvecCapitaineTest } from './fixtures';

function combattant(
  profilId = 'capitaine',
  overrides: Partial<Combattant> = {},
): Combattant {
  const profil = obtenirProfil(profilId);
  return {
    ...campagneAvecCapitaineTest().combattants[0],
    id: profilId,
    nom: profilId,
    profilId,
    experience: profil.experienceInitiale,
    statistiques: { ...profil.statistiques },
    chef: profil.chef === true,
    ...overrides,
  };
}
function bataille(combattants: Combattant[], etapeActive = 2): BatailleEnCours {
  return {
    id: 'bataille-regression',
    numero: 2,
    scenario: 'Escarmouche',
    adversaire: 'Skavens',
    resultat: 'Défaite',
    date: '2026-09-04',
    valeurAvant: 100,
    valeurAdverse: 100,
    successeurChefId: null,
    etapeActive,
    participants: Object.fromEntries(
      combattants.map((c) => [
        c.id,
        {
          ...creerSuiviCombattant(c),
          blessureResolue: true,
          experienceAppliquee: etapeActive > 1,
        },
      ]),
    ),
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
}
function campagne(
  combattants: Combattant[],
  b: BatailleEnCours,
  factionId: FactionId = 'mercenaires-reiklanders',
): EtatCampagne {
  return {
    ...campagneAvecCapitaineTest(),
    campagneActive: true,
    factionId,
    combattants,
    batailleEnCours: b,
    etapesApresBataille: Array.from(
      { length: 10 },
      (_, i) => i < b.etapeActive,
    ),
  };
}
function afficher(initiale: EtatCampagne) {
  const changed = vi.fn();
  function Harness() {
    const [etat, setEtat] = useState(initiale);
    return (
      <PostBattleWorkflow
        campagne={etat}
        onCampagneChange={(suivante) => {
          changed(suivante);
          setEtat(suivante);
        }}
        valeurBande={100}
      />
    );
  }
  render(<Harness />);
  return {
    changed,
    derniere: () => changed.mock.calls.at(-1)?.[0] as EtatCampagne,
  };
}
const appliquerXp = () =>
  userEvent.click(
    screen.getByRole('button', { name: /Appliquer.*expérience/i }),
  );
const appliquerExploration = () =>
  userEvent.click(
    screen.getByRole('button', { name: /Ajouter les fragments/i }),
  );

describe('régressions après-bataille relevées par audit', () => {
  it('refuse deux nouveaux Guides dans un même lot de progressions sans modifier la bande', async () => {
    const cs = [
      combattant('ref-chasseurs-cornus-chasseur-cornu', { experience: 23 }),
      combattant('ref-chasseurs-cornus-pretre-de-taal', { experience: 10 }),
    ];
    const b = bataille(cs, 1);
    for (const c of cs) {
      b.participants[c.id].progressions.saisies = [
        { jet: 2, decision: 'Guide', note: '' },
      ];
    }
    const initiale = campagne(cs, b, 'chasseurs-cornus');
    const avant = structuredClone(initiale);
    const app = afficher(initiale);
    expect(
      screen.getAllByRole('option', { name: 'Spécial : Guide' }),
    ).toHaveLength(2);
    await appliquerXp();
    expect(
      screen.getByText(/Guide : la bande ne peut compter que 1 bénéficiaire/),
    ).toBeVisible();
    expect(app.changed).not.toHaveBeenCalled();
    expect(initiale).toEqual(avant);
  });

  it.each([
    {
      cas: 'troisième arme de corps à corps',
      profilId: 'capitaine',
      factionId: 'mercenaires-reiklanders' as FactionId,
      equipe: ['epee', 'marteau'],
      ajout: 'hache',
    },
    {
      cas: 'troisième arme de tir',
      profilId: 'capitaine',
      factionId: 'mercenaires-reiklanders' as FactionId,
      equipe: ['arc', 'arbalete'],
      ajout: 'pistolet',
    },
    {
      cas: 'deuxième marteau sigmarite d’une Sœur sigmarite',
      profilId: 'soeurs-sigmarite',
      factionId: 'soeurs-de-sigmar' as FactionId,
      equipe: ['marteau-sigmarite'],
      ajout: 'marteau-sigmarite',
    },
  ])(
    'refuse l’allocation interdite : $cas',
    async ({ profilId, factionId, equipe, ajout }) => {
      const c = combattant(profilId, { equipementIds: equipe });
      const initiale = {
        ...campagne([c], bataille([c], 8), factionId),
        inventaire: { [ajout]: 1 },
      };
      const avant = structuredClone(initiale);
      const app = afficher(initiale);
      await userEvent.selectOptions(
        screen.getByLabelText('Objet du magot'),
        ajout,
      );
      await userEvent.selectOptions(
        screen.getByLabelText('Combattant ou groupe'),
        c.id,
      );
      await userEvent.click(screen.getByRole('button', { name: 'Attribuer' }));
      expect(
        screen.getByText(/Ce combattant ne peut pas utiliser cet objet/),
      ).toBeVisible();
      expect(app.changed).not.toHaveBeenCalled();
      expect(initiale).toEqual(avant);
    },
  );

  it('attribue une deuxième arme de corps à corps autorisée et la retire du magot', async () => {
    const c = combattant('capitaine', { equipementIds: ['epee'] });
    const app = afficher({
      ...campagne([c], bataille([c], 8)),
      inventaire: { marteau: 1 },
    });
    await userEvent.selectOptions(
      screen.getByLabelText('Objet du magot'),
      'marteau',
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Combattant ou groupe'),
      c.id,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Attribuer' }));
    expect(app.derniere().combattants[0].equipementIds).toEqual([
      'epee',
      'marteau',
    ]);
    expect(app.derniere().inventaire).toEqual({});
  });

  it('compte la paire de pistolets comme une seule arme de tir lors de l’allocation d’un arc', async () => {
    const c = combattant('capitaine', {
      equipementIds: ['pistolet', 'pistolet'],
    });
    const app = afficher({
      ...campagne([c], bataille([c], 8)),
      inventaire: { arc: 1 },
    });
    await userEvent.selectOptions(
      screen.getByLabelText('Objet du magot'),
      'arc',
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Combattant ou groupe'),
      c.id,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Attribuer' }));
    expect(app.derniere().combattants[0].equipementIds).toEqual([
      'pistolet',
      'pistolet',
      'arc',
    ]);
    expect(app.derniere().inventaire).toEqual({});
  });

  it('un plafond manuel demande la source puis permet Force 4 vers 5 sans plafond humain implicite', async () => {
    const profilId = 'ref-pillards-hommes-betes-bestigor';
    const c = combattant(profilId, {
      experience: 10,
      statistiques: { ...obtenirProfil(profilId).statistiques, force: 4 },
    });
    const b = bataille([c], 1);
    b.participants[c.id].progressions.saisies = [
      { jet: 6, decision: 'Force', note: '' },
    ];
    const app = afficher(campagne([c], b, 'pillards-hommes-betes'));
    await appliquerXp();
    expect(screen.getByText(/cette hausse nécessite une note/)).toBeVisible();
    expect(app.changed).not.toHaveBeenCalled();
    await userEvent.type(
      screen.getByLabelText(`Note de progression 1 pour ${c.nom}`),
      'Plafond de Force arbitré avec le PDF de la bande.',
    );
    await appliquerXp();
    expect(app.derniere().combattants[0].statistiques.force).toBe(5);
    expect(app.derniere().combattants[0].experience).toBe(11);
  });

  it('accepte la compétence choisie dans les tables du héros promu', async () => {
    const c = combattant('guerrier', {
      experience: 3,
      herosPromu: true,
      competencesDisponiblesPromu: ['Force', 'Vitesse'],
    });
    const b = bataille([c], 1);
    b.participants[c.id].progressions.saisies = [
      { jet: 2, decision: 'Coup puissant', note: '' },
    ];
    const app = afficher(campagne([c], b));
    expect(
      screen.getByRole('option', { name: 'Force : Coup puissant' }),
    ).toBeInTheDocument();
    await appliquerXp();
    expect(app.derniere().combattants[0]).toMatchObject({
      experience: 4,
      competences: ['Coup puissant'],
    });
  });

  it('termine sans dé ni fragment après défaite quand tous les héros sont hors combat', async () => {
    const c = combattant();
    const b = bataille([c]);
    b.participants[c.id].horsCombat = 1;
    b.participants[c.id].jetsBlessure = [41];
    b.participants[c.id].figurinesTable[0] = {
      etatTable: 'Hors de combat',
      pointsVieActuels: 0,
    };
    const app = afficher(campagne([c], b));
    await userEvent.click(
      screen.getByRole('button', { name: /Valider sans exploration/ }),
    );
    expect(app.derniere().fragments).toBe(0);
    expect(app.derniere().batailleEnCours!.exploration.appliquee).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: /^Continuer/ }));
    expect(app.derniere().batailleEnCours!.etapeActive).toBe(3);
    expect(app.derniere().etapesApresBataille[2]).toBe(true);
  });

  it('interdit de valider des jets de blessure de combat encore en attente', async () => {
    const c = combattant();
    const b = bataille([c], 0);
    b.participants[c.id].blessureResolue = false;
    b.participants[c.id].figurinesTable[0] = {
      etatTable: 'Debout',
      pointsVieActuels: 0,
      blessureAResoudre: true,
    };
    const app = afficher(campagne([c], b));
    await userEvent.click(
      screen.getByRole('button', { name: /Résoudre et appliquer/ }),
    );
    expect(
      screen.getByText(/Résolvez les jets de blessure en attente dans Combat/),
    ).toBeVisible();
    expect(app.changed).not.toHaveBeenCalled();
  });

  it('refuse de conserver les deux dés de l’Augure', async () => {
    const cs = [combattant('soeurs-matriarche'), combattant('soeurs-augure')];
    const b = bataille(cs);
    b.exploration = {
      ...b.exploration,
      lancers: [4, 4, 4],
      desConserves: [4, 4],
      indicesConserves: [0, 1],
      noteResultat: 'Résolution du double',
    };
    const app = afficher(campagne(cs, b, 'soeurs-de-sigmar'));
    await appliquerExploration();
    expect(
      screen.getByText('Conservez un seul des deux dés de l’Augure.'),
    ).toBeVisible();
    expect(app.changed).not.toHaveBeenCalled();
  });

  it('conserve l’identité des dés égaux Augure et ordinaires après rechargement', async () => {
    const cs = [combattant('soeurs-matriarche'), combattant('soeurs-augure')];
    const b = bataille(cs);
    b.exploration = {
      ...b.exploration,
      lancers: [4, 4, 4],
      desConserves: [4, 4],
      indicesConserves: [1, 2],
      noteResultat: 'Résolution du double',
    };
    const app = afficher(campagne(cs, b, 'soeurs-de-sigmar'));
    await appliquerExploration();
    expect(app.derniere().fragments).toBe(2);
    expect(
      app.derniere().batailleEnCours!.exploration.indicesConserves,
    ).toEqual([1, 2]);
  });

  it('choisir l’autre dé de l’Augure remplace le premier sans désélectionner un dé ordinaire égal', async () => {
    const cs = [combattant('soeurs-matriarche'), combattant('soeurs-augure')];
    const b = bataille(cs);
    b.exploration = {
      ...b.exploration,
      lancers: [4, 4, 4],
      desConserves: [4, 4],
      indicesConserves: [0, 2],
      noteResultat: 'Résolution du double',
    };
    const app = afficher(campagne(cs, b, 'soeurs-de-sigmar'));
    await userEvent.click(screen.getByRole('checkbox', { name: /Augure 2/ }));
    expect(
      app.derniere().batailleEnCours!.exploration.indicesConserves,
    ).toEqual([2, 1]);
  });

  it('accepte un dé bonus dont le résultat supplémentaire doit être défaussé', async () => {
    const c = combattant();
    const b = bataille([c]);
    b.exploration = {
      ...b.exploration,
      lancers: [1, 6],
      desConserves: [6],
      indicesConserves: [1],
      bonusDes: {
        lances: 1,
        conserves: 0,
        source:
          'Traînard, livre p95 : lancer un dé supplémentaire puis en défausser un.',
      },
    };
    const app = afficher(campagne([c], b));
    await appliquerExploration();
    expect(app.derniere().fragments).toBe(2);
    expect(app.derniere().batailleEnCours!.exploration.appliquee).toBe(true);
  });

  it('permet un bonus de lancer et de résultat conservable avec sa source', async () => {
    const c = combattant();
    const b = bataille([c]);
    b.exploration = {
      ...b.exploration,
      lancers: [6, 5],
      desConserves: [6, 5],
      indicesConserves: [0, 1],
      bonusDes: {
        lances: 1,
        conserves: 1,
        source: 'Œil omniscient de Numas, livre p100.',
      },
    };
    const app = afficher(campagne([c], b));
    await appliquerExploration();
    expect(app.derniere().batailleEnCours!.exploration.fragmentsTrouves).toBe(
      2,
    );
  });

  it('exige la source d’un bonus avant validation sans bloquer son brouillon', async () => {
    const c = combattant();
    const b = bataille([c]);
    b.exploration = {
      ...b.exploration,
      lancers: [1, 6],
      desConserves: [6],
      indicesConserves: [1],
      bonusDes: { lances: 1, conserves: 0, source: '' },
    };
    const app = afficher(campagne([c], b));
    await appliquerExploration();
    expect(
      screen.getByText(/Précisez des bonus de dés valides et leur règle/),
    ).toBeVisible();
    await userEvent.type(
      screen.getByLabelText('Règle ou récompense source du bonus'),
      'Traînard p95',
    );
    expect(
      app.derniere().batailleEnCours!.exploration.indicesConserves,
    ).toEqual([1]);
    await appliquerExploration();
    expect(app.derniere().batailleEnCours!.exploration.appliquee).toBe(true);
  });

  it('enregistre les améliorations successives d’un sort connu sans dupliquer la compétence', async () => {
    const titre = sortsPourProfil(
      obtenirProfil('morts-vivants-necromancien'),
    )[0];
    const c = combattant('morts-vivants-necromancien', {
      experience: 10,
      competences: [`Sort ou prière : ${titre}`],
    });
    const b = bataille([c], 1);
    b.participants[c.id].experienceManuelle = 3;
    b.participants[c.id].progressions.saisies = Array.from(
      { length: 2 },
      () => ({ jet: 2, decision: `__ameliorer-sort__:${titre}`, note: '' }),
    );
    const app = afficher(campagne([c], b, 'morts-vivants'));
    expect(
      screen.getAllByRole('option', {
        name: `Améliorer ${titre} : difficulté −1`,
      }),
    ).toHaveLength(2);
    await appliquerXp();
    expect(app.derniere().combattants[0].ameliorationsSorts).toEqual({
      [titre]: 2,
    });
    expect(app.derniere().combattants[0].competences).toEqual([
      `Sort ou prière : ${titre}`,
    ]);
  });

  it('refuse d’améliorer un pouvoir inconnu', async () => {
    const c = combattant('morts-vivants-necromancien', { experience: 10 });
    const b = bataille([c], 1);
    b.participants[c.id].progressions.saisies = [
      { jet: 2, decision: '__ameliorer-sort__:Pouvoir inconnu', note: '' },
    ];
    const app = afficher(campagne([c], b, 'morts-vivants'));
    await appliquerXp();
    expect(
      screen.getByText(/seul un sort ou une prière déjà connu/),
    ).toBeVisible();
    expect(app.changed).not.toHaveBeenCalled();
  });

  it('affiche la difficulté individuelle du sort amélioré dans le registre actif', () => {
    const pouvoir = obtenirFicheBandeReference('morts-vivants')!.magie.find(
      (sort) => sort.difficulte !== undefined,
    )!;
    const c = combattant('morts-vivants-necromancien', {
      competences: [`Sort ou prière : ${pouvoir.titre}`],
      ameliorationsSorts: { [pouvoir.titre]: 2 },
    });
    render(
      <SpellsView
        campagne={campagne([c], bataille([c]), 'morts-vivants')}
        onOpenFaction={vi.fn()}
      />,
    );
    expect(
      screen.getByText(
        `· Difficulté ${pouvoir.difficulte! - 2} (base ${pouvoir.difficulte}, −2)`,
      ),
    ).toBeVisible();
    expect(
      screen.getAllByText(`Difficulté ${pouvoir.difficulte}`).length,
    ).toBeGreaterThan(0);
  });
});
