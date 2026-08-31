import {
  estIdentifiantCampagneValide,
  TAILLE_MAX_PAYLOAD_CAMPAGNE,
  validerCampagneV3,
} from './campaign-validation.ts';
import type { EtatCampagne } from './mordheim-data.ts';

export const CLE_CAMPAGNE_ACTIVE = 'trackheim:campagne-active';
export const PREFIXE_CAMPAGNE = 'trackheim:campagne:';

export type CopieLocale = {
  campagne: EtatCampagne;
  date: string;
  versionStockage: number;
  auteur: string;
};

export type LectureCopieLocale =
  | { statut: 'absente' }
  | { statut: 'valide'; copie: CopieLocale }
  | { statut: 'invalide'; erreur: string; contenuBrut: string };

export type ResumeCampagneLocale = {
  id: string;
  nomCampagne: string;
  nomBande: string;
  revision: number;
  miseAJour: string | null;
};

export class ConflitSauvegardeLocale extends Error {
  readonly versionTrouvee: number;
  readonly versionAttendue: number;

  constructor(versionTrouvee: number, versionAttendue: number) {
    super('Cette campagne a été modifiée dans un autre onglet.');
    this.name = 'ConflitSauvegardeLocale';
    this.versionTrouvee = versionTrouvee;
    this.versionAttendue = versionAttendue;
  }
}

export function cleCopieLocale(idCampagne: string) {
  return `${PREFIXE_CAMPAGNE}${idCampagne}`;
}

export function lireCampagneActive(stockage: Storage) {
  try {
    const memorisee = stockage.getItem(CLE_CAMPAGNE_ACTIVE);
    return memorisee && estIdentifiantCampagneValide(memorisee)
      ? memorisee
      : null;
  } catch {
    return null;
  }
}

export function memoriserCampagneActive(stockage: Storage, id: string) {
  if (!estIdentifiantCampagneValide(id)) {
    throw new Error('L’identifiant de campagne est invalide.');
  }
  stockage.setItem(CLE_CAMPAGNE_ACTIVE, id);
}

export function lireCopieLocale(
  stockage: Storage,
  idCampagne: string,
): LectureCopieLocale {
  let contenuBrut: string | null;
  try {
    contenuBrut = stockage.getItem(cleCopieLocale(idCampagne));
  } catch {
    return {
      statut: 'invalide',
      erreur: 'Le navigateur refuse l’accès à la sauvegarde locale.',
      contenuBrut: '',
    };
  }
  if (contenuBrut === null) return { statut: 'absente' };
  if (
    new TextEncoder().encode(contenuBrut).byteLength >
    TAILLE_MAX_PAYLOAD_CAMPAGNE + 16_384
  ) {
    return {
      statut: 'invalide',
      erreur: 'La sauvegarde locale dépasse la taille autorisée.',
      contenuBrut,
    };
  }

  let valeur: unknown;
  try {
    valeur = JSON.parse(contenuBrut) as unknown;
  } catch {
    return {
      statut: 'invalide',
      erreur: 'La sauvegarde locale ne contient pas un JSON valide.',
      contenuBrut,
    };
  }
  if (!estObjet(valeur) || !('campagne' in valeur)) {
    return {
      statut: 'invalide',
      erreur: 'La sauvegarde locale ne contient aucune campagne.',
      contenuBrut,
    };
  }
  const validation = validerCampagneV3(valeur.campagne);
  if (!validation.ok) {
    return {
      statut: 'invalide',
      erreur: `La sauvegarde locale est invalide : ${validation.erreur}`,
      contenuBrut,
    };
  }

  return {
    statut: 'valide',
    copie: {
      campagne: validation.campagne,
      date: typeof valeur.date === 'string' ? valeur.date : '',
      versionStockage: estEntierNaturel(valeur.versionStockage)
        ? valeur.versionStockage
        : 0,
      auteur: typeof valeur.auteur === 'string' ? valeur.auteur : '',
    },
  };
}

export function ecrireCopieLocale(
  stockage: Storage,
  idCampagne: string,
  campagne: EtatCampagne,
  options: {
    auteur: string;
    versionAttendue?: number;
    forcer?: boolean;
  },
) {
  const validation = validerCampagneV3(campagne);
  if (!validation.ok) {
    throw new Error(
      `La campagne à sauvegarder est invalide : ${validation.erreur}`,
    );
  }

  const lecture = lireCopieLocale(stockage, idCampagne);
  if (lecture.statut === 'invalide' && !options.forcer) {
    throw new Error(
      'Une sauvegarde locale illisible existe déjà. Exportez-la avant de la remplacer.',
    );
  }
  const versionTrouvee =
    lecture.statut === 'valide' ? lecture.copie.versionStockage : 0;
  if (
    !options.forcer &&
    options.versionAttendue !== undefined &&
    versionTrouvee !== options.versionAttendue
  ) {
    throw new ConflitSauvegardeLocale(versionTrouvee, options.versionAttendue);
  }

  const copie: CopieLocale = {
    campagne: validation.campagne,
    date: new Date().toISOString(),
    versionStockage: versionTrouvee + 1,
    auteur: options.auteur,
  };
  stockage.setItem(cleCopieLocale(idCampagne), JSON.stringify(copie));
  return copie;
}

export function listerCopiesLocales(stockage: Storage): ResumeCampagneLocale[] {
  const resultats: ResumeCampagneLocale[] = [];
  try {
    for (let index = 0; index < stockage.length; index += 1) {
      const cle = stockage.key(index);
      if (!cle?.startsWith(PREFIXE_CAMPAGNE)) continue;
      const id = cle.slice(PREFIXE_CAMPAGNE.length);
      if (!estIdentifiantCampagneValide(id)) continue;
      const lecture = lireCopieLocale(stockage, id);
      if (lecture.statut !== 'valide') continue;
      resultats.push({
        id,
        nomCampagne: lecture.copie.campagne.nomCampagne,
        nomBande: lecture.copie.campagne.nomBande,
        revision: lecture.copie.campagne.revision,
        miseAJour: lecture.copie.date || null,
      });
    }
  } catch {
    return [];
  }
  return resultats.sort((a, b) =>
    (b.miseAJour ?? '').localeCompare(a.miseAJour ?? ''),
  );
}

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return (
    typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)
  );
}

function estEntierNaturel(valeur: unknown): valeur is number {
  return Number.isSafeInteger(valeur) && Number(valeur) >= 0;
}
