import type {
  CategorieCompetence,
  Combattant,
  EtatCampagne,
  FactionId,
  ProfilRecrue,
} from './mordheim-data.ts';
import {
  pouvoirsMagiquesPourProfil,
  profilEstLanceurMagie,
} from './magic-data.ts';
import { fichesBandesReference } from './warbands/reference.ts';
import type { RegleBandeReference } from './warbands/schema.ts';

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

export function sortsPourProfil(
  profil: ProfilRecrue,
  combattant?: Combattant,
  campagne?: EtatCampagne,
) {
  return pouvoirsMagiquesPourProfil(profil.id, { combattant, campagne });
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
  return profilId ? pouvoirsMagiquesPourProfil(profilId) : [];
}

function competenceAutorisee(
  nom: string,
  profil: ProfilRecrue,
  factionId: FactionId,
  combattant?: Combattant,
) {
  if (nom === 'Langage de bataille') {
    return profil.chef && factionId !== 'morts-vivants';
  }
  if (nom === 'Sorcellerie' || nom === 'Guerrier-mage') {
    return profilEstLanceurMagie(profil.id, combattant);
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
  combattant?: Combattant,
  campagne?: EtatCampagne,
): ChoixCompetence[] {
  return (profil.competencesDisponibles ?? []).flatMap((categorie) => {
    const speciales =
      fichesBandesReference[factionId]?.competencesSpeciales ?? [];
    const idReference = profil.id.replace(`ref-${factionId}-`, '');
    const possede = (nom: string) =>
      combattant?.competences.includes(nom) ?? false;
    const autorisee = (regle: RegleBandeReference) =>
      regle.apprenable !== false &&
      (!regle.profilsAutorises ||
        regle.profilsAutorises.includes(idReference)) &&
      (!regle.reserveAuChef || Boolean(combattant?.chef ?? profil.chef)) &&
      (!regle.prerequis || regle.prerequis.every(possede)) &&
      (!regle.incompatibleAvec || !regle.incompatibleAvec.some(possede)) &&
      (!regle.maximumParBande ||
        !campagne ||
        campagne.combattants.filter((c) => c.competences.includes(regle.titre))
          .length < regle.maximumParBande);
    const noms =
      categorie === 'Spécial'
        ? (competencesSpeciales[factionId] ??
          speciales.filter(autorisee).map((regle) => regle.titre))
        : competencesStandard[categorie];
    return noms
      .filter((nom) => competenceAutorisee(nom, profil, factionId, combattant))
      .map((nom) => ({ categorie, nom }));
  });
}

/** Vérifie le résultat du lot de progressions sans invalider les choix historiques. */
export function erreurCompetencesSpecialesBande(
  factionId: FactionId,
  combattantsApres: Combattant[],
  combattantsAvant: Combattant[],
): string | null {
  const regles = fichesBandesReference[factionId]?.competencesSpeciales ?? [];
  for (const regle of regles) {
    if (regle.apprenable === false) continue;
    if (regle.maximumParBande) {
      const porteurs = (combattants: Combattant[]) =>
        combattants.filter((c) => c.competences.includes(regle.titre)).length;
      const avant = porteurs(combattantsAvant);
      const apres = porteurs(combattantsApres);
      if (apres > regle.maximumParBande && apres > avant) {
        return `${regle.titre} : la bande ne peut compter que ${regle.maximumParBande} bénéficiaire(s) de cette compétence.`;
      }
    }
    for (const combattant of combattantsApres) {
      const precedent = combattantsAvant.find((c) => c.id === combattant.id);
      if (
        !combattant.competences.includes(regle.titre) ||
        precedent?.competences.includes(regle.titre)
      )
        continue;
      const manquant = regle.prerequis?.find(
        (nom) => !combattant.competences.includes(nom),
      );
      if (manquant)
        return `${combattant.nom} : ${regle.titre} nécessite ${manquant}.`;
      const incompatible = regle.incompatibleAvec?.find((nom) =>
        combattant.competences.includes(nom),
      );
      if (incompatible)
        return `${combattant.nom} : ${regle.titre} est incompatible avec ${incompatible}.`;
    }
  }
  return null;
}
