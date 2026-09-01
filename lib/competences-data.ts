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
  'soeurs-matriarche',
]);

const sortsParProfil: Record<string, string[]> = {
  'possedes-magister': [
    'Vision de tourment',
    'Œil de Dieu',
    'Sacrifice sanglant',
    'Parole de douleur',
    'Ailes des ténèbres',
    'Possession',
  ],
  'morts-vivants-necromancien': [
    'Vol de vie',
    'Réanimation',
    'Vision de mort',
    'Malédiction',
    'Appel de Vanhel',
    'Éveil des morts',
  ],
  'skavens-sorcier': [
    'Feu de malepierre',
    'Enfants du Rat Cornu',
    'Ronge-destin',
    'Fureur noire',
    'Œil du Warp',
    'Malédiction du sorcier',
  ],
  'soeurs-matriarche': [
    'Marteau de Sigmar',
    'Cœurs d’acier',
    'Feu de l’âme',
    'Bouclier de foi',
    'Main guérisseuse',
    'Armure de justice',
  ],
};

export function sortsPourProfil(profil: ProfilRecrue) {
  return sortsParProfil[profil.id] ?? [];
}

/**
 * Liste utilisée par le successeur d'un Chef lanceur de sorts. La règle de
 * campagne lui permet de remplacer sa première progression par un tirage sur
 * la liste de son ancienne dirigeante ou de son ancien dirigeant.
 */
export function sortsPourHeritageMagique(factionId: FactionId) {
  const profilId =
    factionId === 'soeurs-de-sigmar'
      ? 'soeurs-matriarche'
      : factionId === 'culte-des-possedes'
        ? 'possedes-magister'
        : null;
  return profilId ? (sortsParProfil[profilId] ?? []) : [];
}

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
