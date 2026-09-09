import { equipements, profils } from './mordheim-data.ts';

type Objet = Record<string, unknown>;
type Controle = (valeur: unknown) => boolean;
const objet = (v: unknown): v is Objet =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const entier: Controle = (v) =>
  Number.isSafeInteger(v) && Number(v) >= 0 && Number(v) <= 1_000_000;
const texte: Controle = (v) =>
  typeof v === 'string' && v.length <= 10_000 && !v.includes('\u0000');
const nom: Controle = (v) =>
  texte(v) && (v as string).trim().length > 0 && (v as string).length <= 300;
const bool: Controle = (v) => typeof v === 'boolean';
const liste =
  (controle: Controle): Controle =>
  (v) =>
    Array.isArray(v) && v.length <= 2000 && v.every(controle);
const choix =
  (...valeurs: string[]): Controle =>
  (v) =>
    typeof v === 'string' && valeurs.includes(v);
const nullable =
  (controle: Controle): Controle =>
  (v) =>
    v === null || controle(v);
const dictionnaire =
  (controle: Controle): Controle =>
  (v) =>
    objet(v) &&
    Object.keys(v).length <= 2000 &&
    Object.entries(v).every(
      ([cle, valeur]) =>
        !['__proto__', 'constructor', 'prototype'].includes(cle) &&
        controle(valeur),
    );
const clesStats = [
  'mouvement',
  'capaciteCombat',
  'capaciteTir',
  'force',
  'endurance',
  'pointsVie',
  'initiative',
  'attaques',
  'commandement',
];
const stats: Controle = (v) =>
  objet(v) &&
  Object.keys(v).every((cle) => clesStats.includes(cle)) &&
  clesStats.every((cle) => entier(v[cle]) && Number(v[cle]) <= 1000);
const statsSpeciales: Controle = (v) =>
  objet(v) &&
  Object.entries(v).every(
    ([cle, valeur]) =>
      clesStats.includes(cle) &&
      typeof valeur === 'string' &&
      valeur.length > 0 &&
      valeur.length <= 16,
  );
const idsEquipements = new Set(equipements.map((item) => item.id));
const idsProfils = new Set(profils.map((item) => item.id));
const competences = liste(
  choix('Combat', 'Tir', 'Érudition', 'Force', 'Vitesse', 'Spécial'),
);

function verifier(
  v: unknown,
  schema: Record<string, Controle>,
  requis: string[] = [],
): boolean {
  return (
    objet(v) &&
    requis.every((cle) => v[cle] !== undefined) &&
    Object.entries(v).every(
      ([cle, valeur]) => Object.hasOwn(schema, cle) && schema[cle](valeur),
    )
  );
}

const schemaProfil: Record<string, Controle> = {
  id: (v) => typeof v === 'string' && idsProfils.has(v),
  nom,
  categorie: choix('Héros', 'Hommes de main'),
  cout: entier,
  minimum: entier,
  maximum: nullable(entier),
  experienceInitiale: entier,
  statistiques: stats,
  statistiquesSpeciales: statsSpeciales,
  maximums: stats,
  sourceMaximums: texte,
  progressionManuelle: texte,
  competencesDisponibles: competences,
  listesEquipement: liste(nom),
  equipementsAutorises: liste(
    (v) => typeof v === 'string' && idsEquipements.has(v),
  ),
  chef: bool,
  grandeCreature: bool,
  gagneExperience: bool,
  minimumMutations: entier,
  regleSpeciale: texte,
};
const schemaEquipement: Record<string, Controle> = {
  id: (v) => typeof v === 'string' && idsEquipements.has(v),
  nom,
  categorie: choix('Corps à corps', 'Tir', 'Armure', 'Divers', 'Mutation'),
  cout: entier,
  listesEquipement: liste(nom),
  accordeDagueDeBase: bool,
  quantiteMax: entier,
  quantitesMaxParProfil: dictionnaire(entier),
  profilsAutorises: liste((v) => typeof v === 'string' && idsProfils.has(v)),
  coutsParListe: dictionnaire(entier),
  reserveAuxHeros: bool,
  regleSpeciale: texte,
  rareteCommerce: entier,
  coutCommerce: entier,
  coutCommerceFormule: texte,
  commerceUniquement: bool,
  patchGlm: bool,
  achatDesactive: texte,
  prixRecrutementFormule: texte,
  prixRecrutementMinimum: entier,
};

/** Valide aussi les surcouches désactivées, sans faire confiance à un import. */
export function validerDefinitionsHomebrew(homebrew: Objet): string | null {
  if (
    homebrew.limites !== undefined &&
    !verifier(homebrew.limites, {
      armesCorpsACorps: (v) => entier(v) && Number(v) <= 100,
      armesTir: (v) => entier(v) && Number(v) <= 100,
      tailleGroupe: (v) => entier(v) && Number(v) >= 1 && Number(v) <= 100,
      heros: (v) => entier(v) && Number(v) <= 200,
    })
  )
    return 'Les limites homebrew sont invalides.';
  if (
    homebrew.bande !== undefined &&
    !verifier(homebrew.bande, {
      budgetInitial: entier,
      effectifMinimum: entier,
      effectifMaximum: nullable(entier),
    })
  )
    return 'Les paramètres de bande homebrew sont invalides.';
  if (
    objet(homebrew.bande) &&
    typeof homebrew.bande.effectifMaximum === 'number' &&
    Number(homebrew.bande.effectifMinimum ?? 0) > homebrew.bande.effectifMaximum
  )
    return 'Le minimum de bande dépasse son maximum.';
  for (const [cle, schema, requis, ids] of [
    [
      'profils',
      schemaProfil,
      [
        'id',
        'nom',
        'categorie',
        'cout',
        'minimum',
        'maximum',
        'experienceInitiale',
        'statistiques',
        'listesEquipement',
      ],
      idsProfils,
    ],
    [
      'equipements',
      schemaEquipement,
      ['id', 'nom', 'categorie', 'cout', 'listesEquipement'],
      idsEquipements,
    ],
  ] as const) {
    const valeurs = homebrew[cle];
    if (valeurs === undefined) continue;
    if (!objet(valeurs) || Object.keys(valeurs).length > ids.size)
      return `homebrew.${cle} est invalide.`;
    for (const [id, valeur] of Object.entries(valeurs)) {
      if (
        !ids.has(id) ||
        !verifier(valeur, schema, [...requis]) ||
        !objet(valeur) ||
        valeur.id !== id
      )
        return `homebrew.${cle}.${id} est invalide.`;
      if (
        cle === 'profils' &&
        typeof valeur.maximum === 'number' &&
        Number(valeur.minimum) > valeur.maximum
      )
        return `Le minimum de ${String(valeur.nom)} dépasse son maximum.`;
    }
  }
  return null;
}
