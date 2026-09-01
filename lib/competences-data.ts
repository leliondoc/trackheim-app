import type {
  CategorieCompetence,
  FactionId,
  ProfilRecrue,
} from './mordheim-data.ts';

export type ChoixCompetence = {
  categorie: CategorieCompetence;
  nom: string;
};

/** Noms courts des compétences du livre de règles, regroupés par table. */
const competencesStandard: Record<
  Exclude<CategorieCompetence, 'Spécial'>,
  string[]
> = {
  Combat: [
    'Coup précis',
    'Maître du combat',
    'Entraînement aux armes',
    'Toile d’acier',
    'Maître escrimeur',
    'Esquive de combat',
  ],
  Tir: [
    'Tir rapide',
    'Pistolier',
    'Œil de lynx',
    'Expert en armes',
    'Agilité au tir',
    'Tireur d’élite',
    'Chasseur',
    'Lanceur de couteaux',
  ],
  Érudition: [
    'Langage de bataille',
    'Sorcellerie',
    'Connaissance des rues',
    'Marchandage',
    'Connaissance des arcanes',
    'Chasseur de pierres',
    'Guerrier-mage',
  ],
  Force: [
    'Coup puissant',
    'Combattant des fosses',
    'Résistant',
    'Terrifiant',
    'Homme fort',
    'Charge irrésistible',
  ],
  Vitesse: [
    'Saut',
    'Course',
    'Acrobate',
    'Réflexes foudroyants',
    'Rétablissement',
    'Esquive',
    'Grimpeur',
  ],
};

const competencesSpeciales: Partial<Record<FactionId, string[]>> = {
  'soeurs-de-sigmar': [
    'Signe de Sigmar',
    'Protection de Sigmar',
    'Détermination absolue',
    'Fureur vertueuse',
    'Foi absolue',
  ],
  'skavens-du-clan-eshin': [
    'Faim noire',
    'Combat caudal',
    'Coureur des murs',
    'Infiltration',
    'Art de la mort silencieuse',
  ],
};

const lanceursDeSorts = new Set([
  'possedes-magister',
  'morts-vivants-necromancien',
  'skavens-sorcier',
]);

function competenceAutorisee(
  nom: string,
  profil: ProfilRecrue,
  factionId: FactionId,
) {
  if (nom === 'Langage de bataille') {
    return profil.chef && factionId !== 'morts-vivants';
  }
  if (nom === 'Sorcellerie' || nom === 'Guerrier-mage') {
    return lanceursDeSorts.has(profil.id);
  }
  if (nom === 'Connaissance des arcanes') {
    return !['repurgateurs', 'soeurs-de-sigmar'].includes(factionId);
  }
  if (nom === 'Détermination absolue') {
    return profil.id === 'soeurs-matriarche';
  }
  return true;
}

export function competencesPourProfil(
  profil: ProfilRecrue,
  factionId: FactionId,
): ChoixCompetence[] {
  return (profil.competencesDisponibles ?? []).flatMap((categorie) => {
    const noms =
      categorie === 'Spécial'
        ? (competencesSpeciales[factionId] ?? [])
        : competencesStandard[categorie];
    return noms
      .filter((nom) => competenceAutorisee(nom, profil, factionId))
      .map((nom) => ({ categorie, nom }));
  });
}
