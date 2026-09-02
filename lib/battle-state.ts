import type {
  BatailleEnCours,
  Combattant,
  SuiviCombattantBataille,
  SuiviFigurineBataille,
} from './mordheim-data.ts';

export function pointsVieMaximumCombattant(combattant: Combattant) {
  const valeurSpeciale = combattant.statistiquesSpeciales?.pointsVie;
  if (valeurSpeciale && /^\d+$/.test(valeurSpeciale.trim())) {
    return Math.max(1, Number(valeurSpeciale));
  }
  return Math.max(1, combattant.statistiques.pointsVie);
}

export function creerSuiviCombattant(
  combattant: Combattant,
): SuiviCombattantBataille {
  const effectifInitial = Math.max(1, combattant.quantite);
  const pointsVieMaximumInitial = pointsVieMaximumCombattant(combattant);
  return {
    combattantId: combattant.id,
    effectifInitial,
    pointsVieMaximumInitial,
    figurinesTable: Array.from({ length: effectifInitial }, () => ({
      etatTable: 'Debout' as const,
      pointsVieActuels: pointsVieMaximumInitial,
    })),
    notesTable: '',
    horsCombat: 0,
    jetsBlessure: [],
    blessureResolue: false,
    blessureNote: '',
    ennemisHorsCombat: 0,
    experienceScenario: 0,
    experienceManuelle: 0,
    experienceAppliquee: false,
    progressions: { version: 1, saisies: [] },
  };
}

/**
 * Applique les invariants communs au mode table et à l'après-bataille.
 * Les figurines sont la source de vérité ; `horsCombat` reste un miroir
 * synchronisé pour le workflow d'après-bataille.
 */
export function modifierSuiviCombattant(
  suivi: SuiviCombattantBataille,
  combattant: Combattant,
  modification: Partial<SuiviCombattantBataille>,
) {
  const prochain: SuiviCombattantBataille = { ...suivi, ...modification };
  const maximumHorsCombat = suivi.effectifInitial;
  const ancienHorsCombat = suivi.horsCombat;
  void combattant;

  prochain.figurinesTable = modification.figurinesTable
    ? normaliserFigurines(prochain)
    : modification.horsCombat !== undefined
      ? definirNombreHorsCombat(
          prochain,
          bornerEntier(modification.horsCombat, 0, maximumHorsCombat),
        )
      : normaliserFigurines(prochain);
  prochain.horsCombat = prochain.figurinesTable.filter(
    (figurine) => figurine.etatTable === 'Hors de combat',
  ).length;

  if (prochain.horsCombat !== ancienHorsCombat) {
    prochain.jetsBlessure = prochain.jetsBlessure.slice(0, prochain.horsCombat);
    prochain.blessureResolue = false;
    prochain.blessureNote = '';
    prochain.resolutionBlessure = undefined;
  }

  return prochain;
}

export function modifierFigurineTable(
  suivi: SuiviCombattantBataille,
  index: number,
  modification: Partial<SuiviFigurineBataille>,
) {
  return suivi.figurinesTable.map((figurine, position) =>
    position === index
      ? normaliserFigurine(
          { ...figurine, ...modification },
          suivi.pointsVieMaximumInitial,
          modification,
        )
      : figurine,
  );
}

export function modifierParticipantBataille(
  bataille: BatailleEnCours,
  combattant: Combattant,
  modification: Partial<SuiviCombattantBataille>,
) {
  const suivi = bataille.participants[combattant.id];
  if (!suivi) return bataille;
  return {
    ...bataille,
    participants: {
      ...bataille.participants,
      [combattant.id]: modifierSuiviCombattant(suivi, combattant, modification),
    },
  };
}

/**
 * Retrouve la part du snapshot de bataille qui appartient encore à un
 * combattant courant. Une promotion peut scinder un groupe sans fabriquer un
 * nouveau participant ni perdre l'état de la figurine promue.
 */
export function obtenirSuiviParticipant(
  bataille: BatailleEnCours,
  combattantId: string,
): SuiviCombattantBataille | undefined {
  const affectation = bataille.affectationsParticipants[combattantId];
  if (!affectation) return bataille.participants[combattantId];

  const source = bataille.participants[affectation.participantId];
  if (!source) return undefined;

  const jetsParFigurine = new Map<number, number>();
  let positionJet = 0;
  source.figurinesTable.forEach((figurine, index) => {
    if (figurine.etatTable !== 'Hors de combat') return;
    const jet = source.jetsBlessure[positionJet];
    if (jet !== undefined) jetsParFigurine.set(index, jet);
    positionJet += 1;
  });

  const figurinesTable = affectation.indicesFigurines.map(
    (index) => source.figurinesTable[index],
  );
  const horsCombat = figurinesTable.filter(
    (figurine) => figurine.etatTable === 'Hors de combat',
  ).length;
  const jetsBlessure = affectation.indicesFigurines.flatMap((index) => {
    const jet = jetsParFigurine.get(index);
    return jet === undefined ? [] : [jet];
  });

  return {
    ...source,
    combattantId,
    effectifInitial: figurinesTable.length,
    figurinesTable,
    horsCombat,
    jetsBlessure,
  };
}

function bornerEntier(valeur: number, minimum: number, maximum: number) {
  if (!Number.isFinite(valeur)) return minimum;
  return Math.max(minimum, Math.min(maximum, Math.floor(valeur)));
}

function normaliserFigurines(suivi: SuiviCombattantBataille) {
  return suivi.figurinesTable
    .slice(0, suivi.effectifInitial)
    .map((figurine) =>
      normaliserFigurine(figurine, suivi.pointsVieMaximumInitial),
    );
}

function normaliserFigurine(
  figurine: SuiviFigurineBataille,
  maximumPv: number,
  modification: Partial<SuiviFigurineBataille> = {},
): SuiviFigurineBataille {
  let pointsVieActuels = bornerEntier(figurine.pointsVieActuels, 0, maximumPv);
  let etatTable = figurine.etatTable;
  const retourEnJeu =
    (modification.pointsVieActuels ?? 0) > 0 ||
    (modification.etatTable !== undefined &&
      modification.etatTable !== 'Hors de combat');
  const sortie =
    modification.etatTable === 'Hors de combat' ||
    modification.pointsVieActuels === 0;

  if (sortie && !retourEnJeu) {
    etatTable = 'Hors de combat';
    pointsVieActuels = 0;
  } else if (retourEnJeu) {
    if (etatTable === 'Hors de combat') etatTable = 'Debout';
    pointsVieActuels = Math.max(1, pointsVieActuels);
  } else if (pointsVieActuels === 0 || etatTable === 'Hors de combat') {
    etatTable = 'Hors de combat';
    pointsVieActuels = 0;
  }

  return { etatTable, pointsVieActuels };
}

function definirNombreHorsCombat(
  suivi: SuiviCombattantBataille,
  nombre: number,
): SuiviFigurineBataille[] {
  const figurines = normaliserFigurines(suivi);
  const actuelles = figurines.reduce<number[]>(
    (indices, figurine, index) =>
      figurine.etatTable === 'Hors de combat' ? [...indices, index] : indices,
    [],
  );
  if (nombre > actuelles.length) {
    let aAjouter = nombre - actuelles.length;
    return figurines.map((figurine) => {
      if (aAjouter === 0 || figurine.etatTable === 'Hors de combat') {
        return figurine;
      }
      aAjouter -= 1;
      return { etatTable: 'Hors de combat', pointsVieActuels: 0 };
    });
  }
  if (nombre < actuelles.length) {
    let aRetablir = actuelles.length - nombre;
    return figurines.map((figurine, index) => {
      if (aRetablir === 0 || !actuelles.includes(index)) return figurine;
      aRetablir -= 1;
      return {
        etatTable: 'Debout',
        pointsVieActuels: suivi.pointsVieMaximumInitial,
      };
    });
  }
  return figurines;
}
