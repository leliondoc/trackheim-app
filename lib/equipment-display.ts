import { equipements, type Combattant } from './mordheim-data.ts';

export function nomsEquipementsCombattant(combattant: Combattant) {
  return [
    ...(combattant.dagueDeBase ? ['Dague'] : []),
    ...combattant.equipementIds.map(
      (id) => equipements.find((item) => item.id === id)?.nom ?? id,
    ),
  ];
}
