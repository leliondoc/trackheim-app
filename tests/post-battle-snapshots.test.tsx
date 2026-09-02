import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PostBattleWorkflow } from '@/components/post-battle-workflow';
import {
  creerSuiviCombattant,
  obtenirSuiviParticipant,
} from '@/lib/battle-state';
import { validerCampagneV4 } from '@/lib/campaign-validation';
import {
  obtenirProfil,
  type BatailleEnCours,
  type Combattant,
  type EtatCampagne,
} from '@/lib/mordheim-data';
import { campagneAvecCapitaineTest } from './fixtures';

function batailleTest(): BatailleEnCours {
  return {
    id: 'bataille-snapshot',
    numero: 1,
    scenario: 'Escarmouche',
    adversaire: 'Skavens',
    resultat: 'Victoire',
    date: '2026-09-02',
    valeurAvant: 100,
    valeurAdverse: 100,
    successeurChefId: null,
    etapeActive: 0,
    participants: {},
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

function groupeGuerriers(quantite: number): Combattant {
  const base = campagneAvecCapitaineTest().combattants[0];
  const profil = obtenirProfil('guerrier');
  return {
    ...base,
    id: 'groupe-guerriers',
    nom: 'Les Épées rouges',
    profilId: profil.id,
    experience: 0,
    statistiques: structuredClone(profil.statistiques),
    quantite,
    chef: false,
    coutAcquisition: profil.cout,
    coutAcquisitionTotal: profil.cout * quantite,
  };
}

function avecBataille(
  combattants: Combattant[],
  bataille: BatailleEnCours,
): EtatCampagne {
  return {
    ...campagneAvecCapitaineTest(),
    campagneActive: true,
    combattants,
    batailleEnCours: bataille,
  };
}

describe('snapshots de l’après-bataille', () => {
  it('conserve le participant tombstone après la mort d’un Héros', async () => {
    const capitaine = campagneAvecCapitaineTest().combattants[0];
    const bataille = batailleTest();
    bataille.participants[capitaine.id] = {
      ...creerSuiviCombattant(capitaine),
      figurinesTable: [{ etatTable: 'Hors de combat', pointsVieActuels: 0 }],
      horsCombat: 1,
      jetsBlessure: [11],
    };
    const onCampagneChange = vi.fn();
    render(
      <PostBattleWorkflow
        campagne={avecBataille([capitaine], bataille)}
        onCampagneChange={onCampagneChange}
        valeurBande={100}
      />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: /Résoudre et appliquer/i }),
    );

    const suivante = onCampagneChange.mock.calls.at(-1)?.[0] as EtatCampagne;
    expect(suivante.combattants).toHaveLength(0);
    expect(suivante.batailleEnCours?.participants[capitaine.id]).toMatchObject({
      combattantId: capitaine.id,
      blessureResolue: true,
      effectifInitial: 1,
    });
  });

  for (const quantite of [1, 3]) {
    it(`ne duplique pas le snapshot lors d’une promotion depuis un groupe de ${quantite}`, async () => {
      const groupe = groupeGuerriers(quantite);
      const bataille = batailleTest();
      bataille.etapeActive = 1;
      bataille.participants[groupe.id] = {
        ...creerSuiviCombattant(groupe),
        blessureResolue: true,
        experienceScenario: 1,
        progressions: {
          version: 1,
          saisies: [
            {
              jet: 10,
              decision: 'Roderick',
              note: '',
              tablesPromu: ['Combat', 'Force'],
              jetPromu: 7,
              decisionPromu: 'Capacité de Combat',
              notePromu: '',
              jetGroupeRestant: quantite > 1 ? 6 : null,
              decisionGroupeRestant:
                quantite > 1 ? 'Capacité de Tir' : undefined,
              noteGroupeRestant: quantite > 1 ? '' : undefined,
            },
          ],
        },
      };
      const onCampagneChange = vi.fn();
      const vue = render(
        <PostBattleWorkflow
          campagne={avecBataille([groupe], bataille)}
          onCampagneChange={onCampagneChange}
          valeurBande={100}
        />,
      );

      await userEvent.click(
        screen.getByRole('button', { name: /Appliquer l’expérience/i }),
      );

      const suivante = onCampagneChange.mock.calls.at(-1)?.[0] as EtatCampagne;
      const participants = suivante.batailleEnCours?.participants ?? {};
      expect(Object.keys(participants)).toEqual([groupe.id]);
      expect(participants[groupe.id]).toMatchObject({
        combattantId: groupe.id,
        effectifInitial: quantite,
        experienceAppliquee: true,
      });
      const promu = suivante.combattants.find((item) => item.herosPromu)!;
      expect(promu).toBeDefined();
      expect(suivante.combattants).toHaveLength(quantite > 1 ? 2 : 1);
      expect(
        suivante.batailleEnCours?.affectationsParticipants[promu.id],
      ).toEqual({
        participantId: groupe.id,
        indicesFigurines: [0],
      });
      if (quantite > 1) {
        expect(
          suivante.batailleEnCours?.affectationsParticipants[groupe.id],
        ).toEqual({
          participantId: groupe.id,
          indicesFigurines: [1, 2],
        });
      }
      expect(
        obtenirSuiviParticipant(suivante.batailleEnCours!, promu.id),
      ).toMatchObject({
        combattantId: promu.id,
        effectifInitial: 1,
        horsCombat: 0,
        experienceAppliquee: true,
      });
      expect(validerCampagneV4(suivante).ok).toBe(true);

      suivante.batailleEnCours!.etapeActive = 2;
      vue.rerender(
        <PostBattleWorkflow
          campagne={suivante}
          onCampagneChange={onCampagneChange}
          valeurBande={100}
        />,
      );
      expect(screen.getByText('2 dés de base attendus')).toBeVisible();

      suivante.batailleEnCours!.etapeActive = 5;
      vue.rerender(
        <PostBattleWorkflow
          campagne={suivante}
          onCampagneChange={onCampagneChange}
          valeurBande={100}
        />,
      );
      expect(
        screen.getByRole('option', { name: promu.nom }),
      ).toBeInTheDocument();

      suivante.batailleEnCours!.etapeActive = 6;
      vue.rerender(
        <PostBattleWorkflow
          campagne={suivante}
          onCampagneChange={onCampagneChange}
          valeurBande={100}
        />,
      );
      await userEvent.selectOptions(
        screen.getByLabelText('Type'),
        'Dramatis Personae',
      );
      await userEvent.type(screen.getByLabelText('Nom'), 'Johann le Noir');
      await userEvent.selectOptions(
        screen.getByLabelText('Héros chercheur'),
        promu.id,
      );
      await userEvent.type(screen.getByLabelText('Jet d’Initiative (D6)'), '1');
      onCampagneChange.mockClear();
      await userEvent.click(
        screen.getByRole('button', { name: /Ajouter la note structurée/i }),
      );
      const apresPersonnel = onCampagneChange.mock.calls.at(-1)?.[0] as
        | EtatCampagne
        | undefined;
      expect(
        apresPersonnel?.batailleEnCours?.personnel.entrees[0],
      ).toMatchObject({
        type: 'Dramatis Personae',
        nom: 'Johann le Noir',
        heroId: promu.id,
        jetInitiative: 1,
      });
    });
  }
});
