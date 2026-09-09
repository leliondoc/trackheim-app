import {
  obtenirEquipements,
  type ReglagesHomebrew,
  type Combattant,
} from './mordheim-data.ts';

export function nomsEquipementsCombattant(
  combattant: Combattant,
  homebrew?: ReglagesHomebrew,
) {
  return [
    ...(combattant.dagueDeBase ? ['Dague'] : []),
    ...combattant.equipementIds.map(
      (id) =>
        obtenirEquipements(homebrew).find((item) => item.id === id)?.nom ?? id,
    ),
  ];
}
