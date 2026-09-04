import {
  TAILLE_MAX_PAYLOAD_CAMPAGNE,
  validerCampagneV4,
} from './campaign-validation.ts';
import type { EtatCampagne } from './mordheim-data.ts';

const FORMAT_EXPORT = 'trackheim-campaign';
const VERSION_EXPORT = 1;
// Accepte aussi les anciennes sauvegardes indentées, avec une limite de
// données compacte distincte et les contrôles de profondeur/nombre de nœuds.
export const TAILLE_MAX_FICHIER_CAMPAGNE = 4 * 1024 * 1024;

type ExportCampagne = {
  format: typeof FORMAT_EXPORT;
  version: typeof VERSION_EXPORT;
  exporteLe: string;
  campagne: EtatCampagne;
};

export function serialiserCampagne(campagne: EtatCampagne, date = new Date()) {
  const exportCampagne: ExportCampagne = {
    format: FORMAT_EXPORT,
    version: VERSION_EXPORT,
    exporteLe: date.toISOString(),
    campagne,
  };
  return `${JSON.stringify(exportCampagne)}\n`;
}

export function importerCampagneDepuisJson(texte: string) {
  if (
    new TextEncoder().encode(texte).byteLength > TAILLE_MAX_FICHIER_CAMPAGNE
  ) {
    throw new Error('Le fichier dépasse la limite de 4 Mo.');
  }

  let valeur: unknown;
  try {
    valeur = JSON.parse(texte) as unknown;
  } catch {
    throw new Error('Le fichier ne contient pas un JSON valide.');
  }

  if (
    !estObjet(valeur) ||
    valeur.format !== FORMAT_EXPORT ||
    valeur.version !== VERSION_EXPORT ||
    !('campagne' in valeur)
  ) {
    throw new Error(
      'Ce format de sauvegarde Trackheim n’est pas pris en charge.',
    );
  }

  if (
    new TextEncoder().encode(JSON.stringify(valeur.campagne)).byteLength >
    TAILLE_MAX_PAYLOAD_CAMPAGNE
  ) {
    throw new Error(
      'Les données de la campagne dépassent la limite de 512 Ko.',
    );
  }
  const validation = validerCampagneV4(valeur.campagne, {
    verifierReglesDeBande: false,
  });
  if (!validation.ok) {
    throw new Error(`La campagne importée est invalide : ${validation.erreur}`);
  }
  return validation.campagne;
}

export function nomFichierCampagne(campagne: EtatCampagne) {
  const base = `${campagne.nomCampagne}-${campagne.nomBande}`
    .toLowerCase()
    .replaceAll('œ', 'oe')
    .replaceAll('æ', 'ae')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${base || 'campagne-trackheim'}.json`;
}

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return (
    typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)
  );
}
