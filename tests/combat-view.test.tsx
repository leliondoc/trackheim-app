import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';

import { CombatView } from '@/components/combat-view';
import { creerSuiviCombattant } from '@/lib/battle-state';
import type { EtatCampagne } from '@/lib/mordheim-data';
import { campagneAvecCapitaineTest } from './fixtures';

function preparerCombat(quantite = 1, bilanValide = false) {
  let courante = campagneAvecCapitaineTest();
  const combattant = { ...courante.combattants[0], quantite };
  courante = {
    ...courante,
    combattants: [combattant],
    etapesApresBataille: Array.from(
      { length: 10 },
      (_, i) => i === 0 && bilanValide,
    ),
    batailleEnCours: {
      id: 'combat-test',
      numero: 1,
      scenario: 'Escarmouche',
      adversaire: 'Skavens',
      resultat: null,
      date: '2026-09-04',
      valeurAvant: 100,
      valeurAdverse: 100,
      successeurChefId: null,
      etapeActive: 0,
      participants: { [combattant.id]: creerSuiviCombattant(combattant) },
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
    },
  };
  function Fixture() {
    const [campagne, setCampagne] = useState(courante);
    function changer(prochaine: EtatCampagne) {
      courante = prochaine;
      setCampagne(prochaine);
    }
    return (
      <CombatView
        campagne={campagne}
        onCampagneChange={changer}
        onVueChange={() => undefined}
      />
    );
  }
  render(<Fixture />);
  return () => courante.batailleEnCours!.participants[combattant.id];
}

it('verrouille le combat lorsque le bilan des blessures est validé', async () => {
  const suivi = preparerCombat(1, true);
  const original = structuredClone(suivi());
  expect(
    screen.getByText(/Le bilan des blessures est validé/),
  ).toHaveTextContent('lecture seule');
  const retirer = screen.getByRole('button', {
    name: /Retirer un Point de Vie/,
  });
  expect(retirer).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Tour suivant' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Après-bataille' })).toBeEnabled();
  await userEvent.click(retirer);
  expect(suivi()).toEqual(original);
});

it('demande la blessure à zéro PV, conserve les états au sol puis debout sans régénérer de PV', async () => {
  const suivi = preparerCombat();
  const utilisateur = userEvent.setup();
  const retirer = screen.getByRole('button', {
    name: /Retirer un Point de Vie/,
  });
  await utilisateur.click(retirer);
  expect(suivi().horsCombat).toBe(0);
  expect(suivi().figurinesTable[0].blessureAResoudre).toBe(true);
  expect(screen.getByRole('alert').textContent).toMatch(
    /nain, dague ou autre exception/,
  );
  expect(screen.getByRole('button', { name: 'Debout' })).toBeDisabled();

  await utilisateur.click(screen.getByRole('button', { name: 'Sonné' }));
  expect(suivi().figurinesTable[0]).toMatchObject({
    etatTable: 'Sonné',
    pointsVieActuels: 0,
    blessureAResoudre: false,
  });
  await utilisateur.click(screen.getByRole('button', { name: 'À terre' }));
  await utilisateur.click(screen.getByRole('button', { name: 'Debout' }));
  expect(suivi().figurinesTable[0].pointsVieActuels).toBe(0);
  expect(retirer).toBeEnabled();
  await utilisateur.click(retirer);
  expect(suivi().figurinesTable[0].blessureAResoudre).toBe(true);
  await utilisateur.click(
    screen.getByRole('button', { name: 'Hors de combat' }),
  );
  expect(suivi().horsCombat).toBe(1);
  expect(suivi().figurinesTable[0].blessureAResoudre).toBe(false);
  expect(retirer).toBeDisabled();
});

it('la blessure d’un membre ne change ni les PV ni l’état des autres figurines', async () => {
  const suivi = preparerCombat(2);
  const utilisateur = userEvent.setup();
  await utilisateur.click(
    screen.getByRole('button', { name: /Retirer un Point de Vie.*figurine 2/ }),
  );
  expect(suivi().figurinesTable[0]).toMatchObject({
    etatTable: 'Debout',
    pointsVieActuels: 1,
  });
  expect(suivi().figurinesTable[1]).toMatchObject({
    pointsVieActuels: 0,
    blessureAResoudre: true,
  });
  expect(suivi().horsCombat).toBe(0);
  expect(screen.getByRole('alert', { name: /figurine 2/ })).toBeVisible();
});
