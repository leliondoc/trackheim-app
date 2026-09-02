export type GradeBande = '1a' | '1b' | '1c' | '2';

export type NoticeBande = {
  presentation: string;
  publication: string;
  langueDocument: 'français' | 'anglais';
  pdfUrl: string;
  pagesPdf: number;
  avertissements: string[];
};

export type CatalogueBandes = {
  schema: 'trackheim-warband-catalogue';
  version: 1;
  verifieLe: string;
  sourceCatalogue: string;
  bandes: Record<string, NoticeBande>;
};

export type StatistiquesBandeReference = {
  mouvement: number | string | null;
  capaciteCombat: number | string | null;
  capaciteTir: number | string | null;
  force: number | string | null;
  endurance: number | string | null;
  pointsVie: number | string | null;
  initiative: number | string | null;
  attaques: number | string | null;
  commandement: number | string | null;
};

export type RegleBandeReference = {
  titre: string;
  description: string;
  source?: string;
};

export type ProfilBandeReference = {
  id: string;
  nom: string;
  categorie:
    | 'Héros'
    | 'Homme de main'
    | 'Hommes de main'
    | "Créature d'équipement"
    | 'Monture optionnelle'
    | 'Transformation'
    | 'Véhicule'
    | 'Véhicule obligatoire';
  cout: number | null;
  minimum: number;
  maximum: number | null;
  experienceInitiale: number;
  statistiques: StatistiquesBandeReference;
  competencesDisponibles: string[];
  regles: Array<Omit<RegleBandeReference, 'source'>>;
  source: string;
};

export type EntreeEquipementBandeReference = {
  nom: string;
  cout: number;
  formuleCout?: string;
  note?: string;
};

export type ListeEquipementBandeReference = {
  nom: string;
  profils: string[];
  categories: Array<{
    nom: string;
    entrees: EntreeEquipementBandeReference[];
  }>;
  source: string;
};

export type FicheBandeReference = {
  composition: {
    budgetInitial: number;
    effectifMinimum: number;
    effectifMaximum: number | null;
    maximumHeros: number;
    source: string;
  };
  regles: RegleBandeReference[];
  profils: ProfilBandeReference[];
  listesEquipement: ListeEquipementBandeReference[];
  competencesSpeciales: RegleBandeReference[];
  magie: Array<RegleBandeReference & { difficulte?: number }>;
  ambiguites: string[];
};

export type FichesBandesReference = {
  bandes: Record<string, FicheBandeReference>;
};
