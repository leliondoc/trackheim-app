import {
  definitionsBandesCore,
  equipementsBandesCore,
} from './core-warbandes.ts';
import catalogueBandesJson from './warbands/catalogue.json' with { type: 'json' };
import { fichesBandesReference } from './warbands/reference.ts';
import type {
  CatalogueBandes,
  StatistiquesBandeReference,
} from './warbands/schema.ts';

const catalogueBandes = catalogueBandesJson as CatalogueBandes;

export type Statistiques = {
  mouvement: number;
  capaciteCombat: number;
  capaciteTir: number;
  force: number;
  endurance: number;
  pointsVie: number;
  initiative: number;
  attaques: number;
  commandement: number;
};

export type FactionId = keyof typeof catalogueBandesJson.bandes;

export type ListeEquipementId = string;

export type CategorieCompetence =
  | 'Combat'
  | 'Tir'
  | 'Érudition'
  | 'Force'
  | 'Vitesse'
  | 'Spécial';

export type MarqueChaos =
  | 'Shornaal'
  | 'Tchar'
  | 'Onogal'
  | 'Chaos Universel'
  | 'Arkhar';

export type ProfilRecrue = {
  id: string;
  nom: string;
  categorie: 'Héros' | 'Hommes de main';
  cout: number;
  minimum: number;
  maximum: number | null;
  experienceInitiale: number;
  statistiques: Statistiques;
  /** Valeur imprimée non numérique, par exemple le Mouvement 2D6 d’un Squig. */
  statistiquesSpeciales?: Partial<Record<keyof Statistiques, string>>;
  /** Plafonds raciaux vérifiés. Leur absence exige un arbitrage explicite. */
  maximums?: Statistiques;
  sourceMaximums?: string;
  progressionManuelle?: string;
  competencesDisponibles?: CategorieCompetence[];
  listesEquipement: ListeEquipementId[];
  chef?: boolean;
  /** Les grandes créatures comptent 20 points de base dans la valeur de bande. */
  grandeCreature?: boolean;
  gagneExperience?: boolean;
  minimumMutations?: number;
  regleSpeciale?: string;
};

export type Equipement = {
  id: string;
  nom: string;
  categorie: 'Corps à corps' | 'Tir' | 'Armure' | 'Divers' | 'Mutation';
  cout: number;
  listesEquipement: ListeEquipementId[];
  /** Cette entrée matérialise la dague gratuite reçue au recrutement. */
  accordeDagueDeBase?: boolean;
  /** Nombre d’exemplaires de cette entrée portables par combattant. */
  quantiteMax?: number;
  quantitesMaxParProfil?: Record<string, number>;
  /** Restriction nominative imprimée dans la liste de bande. */
  profilsAutorises?: string[];
  /** Certains livres de bande fixent un prix de recrutement différent. */
  coutsParListe?: Partial<Record<ListeEquipementId, number>>;
  reserveAuxHeros?: boolean;
  regleSpeciale?: string;
  /** Disponibilité au comptoir après la création, distincte de la liste de bande. */
  rareteCommerce?: number;
  coutCommerce?: number;
  /** Formule à lancer à la table, puis saisir dans le workflow de commerce. */
  coutCommerceFormule?: string;
  /** Objet du comptoir qui ne figure pas dans l’équipement de départ. */
  commerceUniquement?: boolean;
  /** Ajout éditorial GLM, inactif dans le preset officiel strict. */
  patchGlm?: boolean;
  /** Ancienne entrée conservée pour lire les sauvegardes, remplacée à l'achat. */
  achatDesactive?: string;
  prixRecrutementFormule?: string;
  prixRecrutementMinimum?: number;
};

export type Combattant = {
  id: string;
  nom: string;
  profilId: string;
  experience: number;
  statut: 'Prêt' | 'Blessé' | 'Absent';
  statistiques: Statistiques;
  statistiquesSpeciales?: Partial<Record<keyof Statistiques, string>>;
  /** Dague réglementaire implicite, gratuite et non transférable. */
  dagueDeBase: boolean;
  /** Choix réglementaires fixés au recrutement et utilisés par les règles. */
  optionsRegles?: {
    marqueChaos?: MarqueChaos;
  };
  equipementIds: string[];
  notes: string;
  /** Les Hommes de main d'un même groupe partagent profil, XP et équipement. */
  quantite: number;
  chef: boolean;
  /** Homme de main promu par « Ce gars est doué » et traité comme un Héros. */
  herosPromu?: boolean;
  /** Deux tables choisies au moment de la promotion. */
  competencesDisponiblesPromu?: CategorieCompetence[];
  coutAcquisition: number;
  /** Coût historique total du groupe, utile quand des recrues vétéranes le rejoignent. */
  coutAcquisitionTotal: number;
  competences: string[];
  /** Baisses de difficulté acquises, indexées par titre exact du pouvoir. */
  ameliorationsSorts?: Record<string, number>;
  blessures: string[];
  progressions: string[];
  partiesManquees: number;
};

export type Partie = {
  id: string;
  scenario: string;
  adversaire: string;
  resultat: 'Victoire' | 'Défaite' | 'Égalité';
  date: string;
  valeurAvant?: number;
  valeurAdverse?: number;
  valeurApres?: number;
  fragmentsTrouves?: number;
  revenu?: number;
  notes?: string;
};

export type EtatFigurineTable =
  | 'Debout'
  | 'À terre'
  | 'Sonné'
  | 'Hors de combat';

export type SuiviFigurineBataille = {
  etatTable: EtatFigurineTable;
  pointsVieActuels: number;
  blessureAResoudre?: boolean;
};

export type SuiviCombattantBataille = {
  combattantId: string;
  /** Snapshot immuable de l'unité engagée au début de la bataille. */
  effectifInitial: number;
  pointsVieMaximumInitial: number;
  figurinesTable: SuiviFigurineBataille[];
  notesTable?: string;
  horsCombat: number;
  jetsBlessure: number[];
  blessureResolue: boolean;
  blessureNote: string;
  resolutionBlessure?: {
    version: 1;
    jetSecondaire: number | null;
    note: string;
    decision?: string;
    montant?: number | null;
    blessuresMultiples?: Array<{
      d66: number | null;
      jetSecondaire: number | null;
      note: string;
      decision?: string;
    }>;
  };
  ennemisHorsCombat: number;
  experienceScenario: number;
  experienceManuelle: number;
  experienceAppliquee: boolean;
  progressions: {
    version: 1;
    saisies: Array<{
      jet: number | null;
      decision: string;
      note: string;
      tablesPromu?: CategorieCompetence[];
      jetPromu?: number | null;
      decisionPromu?: string;
      notePromu?: string;
      jetGroupeRestant?: number | null;
      decisionGroupeRestant?: string;
      noteGroupeRestant?: string;
    }>;
  };
};

export type JetRarete = {
  id: string;
  heroId: string;
  equipementId: string;
  de1: number;
  de2: number;
  reussi: boolean;
  achete: boolean;
  prix: number;
};

export type AffectationParticipantBataille = {
  /** Identifiant du snapshot créé au début de la bataille. */
  participantId: string;
  /** Figurines de ce snapshot encore rattachées au combattant courant. */
  indicesFigurines: number[];
};

export type BatailleEnCours = {
  id: string;
  numero: number;
  scenario: string;
  adversaire: string;
  /** Renseigné à la fin du combat, avant la séquence d'après-bataille. */
  resultat: Partie['resultat'] | null;
  date: string;
  valeurAvant: number;
  valeurAdverse: number;
  /** Le bonus officiel reste une confirmation explicite du joueur. */
  bonusChallengerApplique?: boolean;
  successeurChefId: string | null;
  etapeActive: number;
  tour?: number;
  phase?: 'Mouvement' | 'Tir' | 'Corps à corps' | 'Ralliement';
  participants: Record<string, SuiviCombattantBataille>;
  /**
   * Répartition des snapshots lorsqu'un groupe est scindé par une promotion.
   * Les données de bataille restent ainsi immuables et le nouveau Héros garde
   * son lien avec la figurine qui a réellement participé.
   */
  affectationsParticipants: Record<string, AffectationParticipantBataille>;
  exploration: {
    bonusDes?: { lances: number; conserves: number; source: string };
    indicesConserves?: number[];
    lancers: number[];
    desConserves: number[];
    fragmentsTrouves: number;
    appliquee: boolean;
    noteResultat: string;
  };
  vente: {
    fragmentsVendus: number;
    revenu: number;
    appliquee: boolean;
  };
  veterans: {
    de1: number | null;
    de2: number | null;
    disponibilite: number | null;
    /** XP cumulé des recrues déjà ajoutées aux groupes pendant cette séquence. */
    experienceDepensee: number;
  };
  jetsRarete: JetRarete[];
  personnel: {
    version: 1;
    aucun: boolean;
    entrees: Array<{
      id: string;
      type: 'Franc-tireur' | 'Dramatis Personae' | 'Autre';
      nom: string;
      decision: 'Engagé' | 'Refusé' | 'Indisponible' | 'Autre';
      heroId: string;
      jetInitiative: number | null;
      cout: number;
      coutApplique: boolean;
      note: string;
    }>;
  };
  notes: string;
};

export type ReglagesHomebrew = {
  actifs: boolean;
  nomSet: string;
  description: string;
  coutsRecrues: Record<string, number>;
  coutsEquipements: Record<string, number>;
  regles: RegleHomebrew[];
};

export type RegleHomebrew = {
  id: string;
  titre: string;
  portee: 'Bande' | 'Campagne' | 'Combat' | 'Après-bataille';
  description: string;
  active: boolean;
};

export type EtatCampagne = {
  version: 4;
  revision: number;
  rulesetId: string;
  nomCampagne: string;
  nomBande: string;
  campagneActive: boolean;
  factionId: FactionId;
  grade: BandeBibliotheque['grade'];
  couronnes: number;
  fragments: number;
  numeroBataille: number;
  etapesApresBataille: boolean[];
  combattants: Combattant[];
  inventaire: Record<string, number>;
  batailleEnCours: BatailleEnCours | null;
  parties: Partie[];
  homebrew: ReglagesHomebrew;
};

export type DefinitionBande = {
  id: FactionId;
  nom: string;
  slug: string;
  budgetInitial: number;
  effectifMinimum: number;
  effectifMaximum: number | null;
  profils: ProfilRecrue[];
  regles: Array<{ titre: string; description: string }>;
  source: string;
};

export type BandeBibliotheque = {
  nom: string;
  slug: string;
  grade: '1a' | '1b' | '1c' | '2';
  presentation: string;
  publication: string;
  langueDocument: 'français' | 'anglais';
  pagesPdf: number;
  avertissements: string[];
  pdfUrl?: string;
};

export const SOURCE_GLM =
  'https://sites.google.com/view/grande-librairie-de-mordheim';

const toutesListesArmees: ListeEquipementId[] = [
  'mercenaires',
  'tireurs',
  'possedes',
  'ames-sombres',
  'repurgateurs',
  'zelotes',
  'flagellants',
  'soeurs',
  'augure',
  'morts-vivants',
  'skavens-heros',
  'skavens-hommes-main',
];

export const profilsReiklanders: ProfilRecrue[] = [
  {
    id: 'capitaine',
    nom: 'Capitaine mercenaire',
    categorie: 'Héros',
    cout: 60,
    minimum: 1,
    maximum: 1,
    experienceInitiale: 20,
    statistiques: stats(4, 4, 4, 3, 3, 1, 4, 1, 8),
    listesEquipement: ['mercenaires'],
    competencesDisponibles: ['Combat', 'Tir', 'Érudition', 'Force', 'Vitesse'],
    chef: true,
    regleSpeciale: 'Chef : commandement utilisable à 12 ps.',
  },
  {
    id: 'champion',
    nom: 'Champion',
    categorie: 'Héros',
    cout: 35,
    minimum: 0,
    maximum: 2,
    experienceInitiale: 8,
    statistiques: stats(4, 4, 3, 3, 3, 1, 3, 1, 7),
    listesEquipement: ['mercenaires'],
    competencesDisponibles: ['Combat', 'Tir', 'Force'],
  },
  {
    id: 'recrue',
    nom: 'Recrue',
    categorie: 'Héros',
    cout: 15,
    minimum: 0,
    maximum: 2,
    experienceInitiale: 0,
    statistiques: stats(4, 2, 2, 3, 3, 1, 3, 1, 6),
    listesEquipement: ['mercenaires'],
    competencesDisponibles: ['Combat', 'Tir', 'Vitesse'],
  },
  {
    id: 'guerrier',
    nom: 'Guerrier',
    categorie: 'Hommes de main',
    cout: 25,
    minimum: 0,
    maximum: null,
    experienceInitiale: 0,
    statistiques: stats(4, 3, 3, 3, 3, 1, 3, 1, 7),
    listesEquipement: ['mercenaires'],
  },
  {
    id: 'tireur',
    nom: 'Tireur',
    categorie: 'Hommes de main',
    cout: 25,
    minimum: 0,
    maximum: 7,
    experienceInitiale: 0,
    statistiques: stats(4, 3, 4, 3, 3, 1, 3, 1, 7),
    listesEquipement: ['tireurs'],
  },
  {
    id: 'bretteur',
    nom: 'Bretteur',
    categorie: 'Hommes de main',
    cout: 35,
    minimum: 0,
    maximum: 5,
    experienceInitiale: 0,
    statistiques: stats(4, 4, 3, 3, 3, 1, 3, 1, 7),
    listesEquipement: ['mercenaires'],
    regleSpeciale:
      'Expert à l’épée : lorsqu’il combat avec une épée normale, relance ses jets pour toucher ratés pendant le tour où il charge.',
  },
];

function varianteMercenaire(
  prefixe: string,
  transformer: (profil: ProfilRecrue) => ProfilRecrue,
) {
  return profilsReiklanders.map((source) => {
    const profil = transformer({
      ...source,
      statistiques: { ...source.statistiques },
      listesEquipement: [...source.listesEquipement],
    });

    return { ...profil, id: `${prefixe}-${source.id}` };
  });
}

export const profilsMiddenheimers = varianteMercenaire(
  'middenheim',
  (profil) => ({
    ...profil,
    regleSpeciale:
      profil.id === 'capitaine'
        ? 'Chef : commandement utilisable à 6 ps.'
        : profil.regleSpeciale,
    competencesDisponibles:
      profil.id === 'capitaine'
        ? ['Combat', 'Tir', 'Érudition', 'Force', 'Vitesse']
        : profil.id === 'champion' || profil.id === 'recrue'
          ? ['Combat', 'Force', 'Vitesse']
          : profil.competencesDisponibles,
    statistiques: {
      ...profil.statistiques,
      force:
        profil.id === 'capitaine' || profil.id === 'champion'
          ? 4
          : profil.statistiques.force,
      capaciteTir: profil.id === 'tireur' ? 3 : profil.statistiques.capaciteTir,
    },
  }),
);

export const profilsMarienburgers = varianteMercenaire(
  'marienburg',
  (profil) => ({
    ...profil,
    regleSpeciale:
      profil.id === 'capitaine'
        ? 'Chef : commandement utilisable à 6 ps.'
        : profil.regleSpeciale,
    competencesDisponibles:
      profil.id === 'capitaine'
        ? ['Combat', 'Tir', 'Érudition', 'Force', 'Vitesse']
        : profil.id === 'champion' || profil.id === 'recrue'
          ? ['Combat', 'Tir', 'Vitesse']
          : profil.competencesDisponibles,
    statistiques: {
      ...profil.statistiques,
      capaciteTir: profil.id === 'tireur' ? 3 : profil.statistiques.capaciteTir,
    },
  }),
);

const equipementsAutomatises: Equipement[] = [
  {
    id: 'dague',
    nom: 'Dague supplémentaire',
    categorie: 'Corps à corps',
    cout: 2,
    accordeDagueDeBase: true,
    listesEquipement: toutesListesArmees,
  },
  {
    id: 'masse',
    nom: 'Masse',
    categorie: 'Corps à corps',
    cout: 3,
    listesEquipement: [
      'mercenaires',
      'tireurs',
      'possedes',
      'ames-sombres',
      'repurgateurs',
      'zelotes',
      'soeurs',
      'augure',
      'morts-vivants',
      'skavens-hommes-main',
    ],
  },
  {
    id: 'marteau',
    nom: 'Marteau',
    categorie: 'Corps à corps',
    cout: 3,
    listesEquipement: [
      'mercenaires',
      'tireurs',
      'possedes',
      'ames-sombres',
      'repurgateurs',
      'zelotes',
      'soeurs',
      'augure',
      'morts-vivants',
    ],
  },
  {
    id: 'hache',
    nom: 'Hache',
    categorie: 'Corps à corps',
    cout: 5,
    listesEquipement: [
      'mercenaires',
      'tireurs',
      'possedes',
      'ames-sombres',
      'repurgateurs',
      'zelotes',
      'morts-vivants',
    ],
  },
  {
    id: 'epee',
    nom: 'Épée',
    categorie: 'Corps à corps',
    cout: 10,
    listesEquipement: [
      'mercenaires',
      'tireurs',
      'possedes',
      'ames-sombres',
      'repurgateurs',
      'zelotes',
      'morts-vivants',
      'skavens-heros',
      'skavens-hommes-main',
    ],
  },
  {
    id: 'hallebarde',
    nom: 'Hallebarde',
    categorie: 'Corps à corps',
    cout: 10,
    listesEquipement: ['mercenaires', 'morts-vivants', 'skavens-heros'],
  },
  {
    id: 'lance',
    nom: 'Lance',
    categorie: 'Corps à corps',
    cout: 10,
    listesEquipement: [
      'mercenaires',
      'possedes',
      'zelotes',
      'morts-vivants',
      'skavens-heros',
      'skavens-hommes-main',
    ],
  },
  {
    id: 'morgenstern',
    nom: 'Morgenstern',
    categorie: 'Corps à corps',
    cout: 15,
    listesEquipement: ['mercenaires', 'flagellants'],
  },
  {
    id: 'rapiere',
    nom: 'Rapière',
    categorie: 'Corps à corps',
    cout: 15,
    reserveAuxHeros: true,
    listesEquipement: ['mercenaires'],
    patchGlm: true,
  },
  {
    id: 'deux-mains',
    nom: 'Arme à deux mains',
    categorie: 'Corps à corps',
    cout: 15,
    listesEquipement: [
      'mercenaires',
      'possedes',
      'ames-sombres',
      'repurgateurs',
      'zelotes',
      'flagellants',
      'soeurs',
      'augure',
      'morts-vivants',
    ],
  },
  {
    id: 'arc',
    nom: 'Arc',
    categorie: 'Tir',
    cout: 10,
    coutsParListe: { possedes: 15 },
    listesEquipement: [
      'mercenaires',
      'tireurs',
      'possedes',
      'zelotes',
      'morts-vivants',
    ],
  },
  {
    id: 'arc-long',
    nom: 'Arc long',
    categorie: 'Tir',
    cout: 15,
    listesEquipement: ['tireurs'],
  },
  {
    id: 'arbalete',
    nom: 'Arbalète',
    categorie: 'Tir',
    cout: 25,
    listesEquipement: ['mercenaires', 'tireurs', 'repurgateurs'],
  },
  {
    id: 'pistolet',
    nom: 'Pistolet',
    categorie: 'Tir',
    cout: 15,
    listesEquipement: ['mercenaires', 'tireurs', 'repurgateurs'],
    rareteCommerce: 8,
    quantiteMax: 2,
  },
  {
    id: 'pistolet-duel',
    nom: 'Pistolet de duel',
    categorie: 'Tir',
    cout: 25,
    coutCommerce: 30,
    rareteCommerce: 10,
    quantiteMax: 2,
    listesEquipement: ['mercenaires'],
  },
  {
    id: 'tromblon',
    nom: 'Tromblon',
    categorie: 'Tir',
    cout: 30,
    listesEquipement: ['tireurs'],
    rareteCommerce: 9,
  },
  {
    id: 'arquebuse',
    nom: 'Arquebuse',
    categorie: 'Tir',
    cout: 35,
    listesEquipement: ['tireurs'],
    rareteCommerce: 8,
  },
  {
    id: 'long-fusil-hochland',
    nom: 'Long fusil d’Hochland',
    categorie: 'Tir',
    cout: 200,
    listesEquipement: ['tireurs'],
    rareteCommerce: 11,
  },
  {
    id: 'armure-legere',
    nom: 'Armure légère',
    categorie: 'Armure',
    cout: 20,
    listesEquipement: [
      'mercenaires',
      'tireurs',
      'possedes',
      'ames-sombres',
      'repurgateurs',
      'zelotes',
      'soeurs',
      'morts-vivants',
      'skavens-heros',
      'skavens-hommes-main',
    ],
  },
  {
    id: 'armure-lourde',
    nom: 'Armure lourde',
    categorie: 'Armure',
    cout: 50,
    listesEquipement: [
      'mercenaires',
      'possedes',
      'ames-sombres',
      'repurgateurs',
      'soeurs',
      'morts-vivants',
    ],
  },
  {
    id: 'casque',
    nom: 'Casque',
    categorie: 'Armure',
    cout: 10,
    listesEquipement: [
      'mercenaires',
      'tireurs',
      'possedes',
      'ames-sombres',
      'repurgateurs',
      'zelotes',
      'soeurs',
      'morts-vivants',
      'skavens-heros',
      'skavens-hommes-main',
    ],
  },
  {
    id: 'bouclier',
    nom: 'Bouclier',
    categorie: 'Armure',
    cout: 5,
    listesEquipement: [
      'mercenaires',
      'tireurs',
      'possedes',
      'ames-sombres',
      'repurgateurs',
      'zelotes',
      'soeurs',
      'morts-vivants',
      'skavens-hommes-main',
    ],
  },
  {
    id: 'rondache',
    nom: 'Rondache',
    categorie: 'Armure',
    cout: 5,
    listesEquipement: [
      'mercenaires',
      'repurgateurs',
      'soeurs',
      'skavens-heros',
    ],
  },
  {
    id: 'arc-elfique',
    nom: 'Arc elfique',
    categorie: 'Tir',
    cout: 35,
    listesEquipement: toutesListesArmees,
    reserveAuxHeros: true,
    rareteCommerce: 12,
    commerceUniquement: true,
  },
  {
    id: 'armure-gromril',
    nom: 'Armure en gromril',
    categorie: 'Armure',
    cout: 150,
    listesEquipement: toutesListesArmees,
    reserveAuxHeros: true,
    rareteCommerce: 11,
    commerceUniquement: true,
  },
  {
    id: 'armure-ithilmar',
    nom: 'Armure en ithilmar',
    categorie: 'Armure',
    cout: 90,
    listesEquipement: toutesListesArmees,
    reserveAuxHeros: true,
    rareteCommerce: 11,
    commerceUniquement: true,
  },
  {
    id: 'arme-gromril',
    nom: 'Arme en gromril',
    categorie: 'Divers',
    cout: 1,
    listesEquipement: toutesListesArmees,
    reserveAuxHeros: true,
    rareteCommerce: 11,
    coutCommerceFormule: '4 × le prix de l’arme choisie',
    commerceUniquement: true,
  },
  {
    id: 'arme-ithilmar',
    nom: 'Arme en ithilmar',
    categorie: 'Divers',
    cout: 1,
    listesEquipement: toutesListesArmees,
    reserveAuxHeros: true,
    rareteCommerce: 9,
    coutCommerceFormule: '3 × le prix de l’arme choisie',
    commerceUniquement: true,
  },
  ...[
    ['fleches-chasse', 'Flèches de chasse', 35, 8],
    ['porte-bonheur', 'Porte-bonheur', 10, 6],
    ['cartes-tarot', 'Cartes de tarot', 50, 7],
    ['herbes-soins', 'Herbes de soins', 20, 8],
    ['lotus-noir', 'Lotus noir', 10, 9],
    ['ombre-cramoisie', 'Ombre cramoisie', 35, 8],
    ['racine-mandragore', 'Racine de mandragore', 25, 8],
    ['tome-magie', 'Tome de magie', 200, 12],
  ].map(
    ([id, nom, cout, rarete]) =>
      ({
        id,
        nom,
        categorie: 'Divers',
        cout,
        listesEquipement: toutesListesArmees,
        reserveAuxHeros: true,
        rareteCommerce: rarete,
        commerceUniquement: true,
      }) as Equipement,
  ),
  ...[
    ['ail', 'Ail', 1],
    ['filet', 'Filet', 5],
    ['corde-grappin', 'Corde et grappin', 5],
    ['lanterne', 'Lanterne', 10],
  ].map(
    ([id, nom, cout]) =>
      ({
        id,
        nom,
        categorie: 'Divers',
        cout,
        listesEquipement: toutesListesArmees,
        reserveAuxHeros: true,
        commerceUniquement: true,
      }) as Equipement,
  ),
  ...equipementsBandesCore,
];

const definitionsBandesAutomatisees: DefinitionBande[] = [
  {
    id: 'mercenaires-reiklanders',
    nom: 'Mercenaires Reiklanders',
    slug: 'mercenaires-reiklanders',
    budgetInitial: 500,
    effectifMinimum: 3,
    effectifMaximum: 15,
    profils: profilsReiklanders,
    regles: [
      {
        titre: 'Discipline militaire',
        description:
          'Les guerriers peuvent utiliser le Commandement du Capitaine à 12 ps au lieu de 6 ps.',
      },
      {
        titre: 'Excellents tireurs',
        description:
          'Tous les Tireurs gagnent +1 en Capacité de Tir, y compris ceux recrutés plus tard.',
      },
    ],
    source: 'Livre des bandes, pp. 5–8',
  },
  {
    id: 'mercenaires-middenheimers',
    nom: 'Mercenaires Middenheimers',
    slug: 'mercenaires-middenheimers',
    budgetInitial: 500,
    effectifMinimum: 3,
    effectifMaximum: 15,
    profils: profilsMiddenheimers,
    regles: [
      {
        titre: 'Force du Nord',
        description:
          'Le Capitaine et les Champions commencent avec une Force de 4 au lieu de 3.',
      },
    ],
    source: 'Livre des bandes, pp. 5–8',
  },
  {
    id: 'mercenaires-marienburgers',
    nom: 'Mercenaires Marienburgers',
    slug: 'mercenaires-marienburgers',
    budgetInitial: 600,
    effectifMinimum: 3,
    effectifMaximum: 15,
    profils: profilsMarienburgers,
    regles: [
      {
        titre: 'Cité de l’Or',
        description:
          'La bande commence une campagne avec 600 CO au lieu de 500 CO. Pour une partie unique hors campagne, elle dispose aussi de 20 % de CO supplémentaires.',
      },
      {
        titre: 'Réseau marchand',
        description: 'La bande reçoit +1 lorsqu’elle cherche des objets rares.',
      },
    ],
    source: 'Livre des bandes, pp. 5–8',
  },
  ...definitionsBandesCore,
];

export function equipementAutorise(
  profil: ProfilRecrue,
  equipement: Equipement,
  estHeros = profil.categorie === 'Héros',
) {
  if (equipement.patchGlm) return false;
  if (equipement.reserveAuxHeros && !estHeros) return false;
  if (
    equipement.profilsAutorises &&
    !equipement.profilsAutorises.includes(profil.id)
  ) {
    return false;
  }
  return profil.listesEquipement.some((liste) =>
    equipement.listesEquipement.includes(liste),
  );
}

export function coutEquipementPourProfil(
  equipement: Equipement,
  profil: ProfilRecrue,
) {
  for (const liste of profil.listesEquipement) {
    const cout = equipement.coutsParListe?.[liste];
    if (cout !== undefined) return cout;
  }
  return equipement.cout;
}

export function quantiteMaxEquipement(
  equipement: Equipement,
  profil: ProfilRecrue,
) {
  return (
    equipement.quantitesMaxParProfil?.[profil.id] ??
    equipement.quantiteMax ??
    (equipement.categorie === 'Corps à corps' || equipement.categorie === 'Tir'
      ? 2
      : 1)
  );
}

/** Catalogue éditorial issu des grades publiés par la Grande Librairie. */
export const bandesBibliotheque: BandeBibliotheque[] = [
  ...bandes('1a', [
    ['Chasseurs de Trésors Nains', 'chasseurs-de-tresors-nains'],
    [
      'Culte des Possédés',
      'culte-des-possedes',
      'https://drive.google.com/file/d/183YdNBSFhn_KumszvRFd_--TQ8csoAPl/view',
    ],
    ['Horde Orque', 'horde-orque'],
    ['Kermesse du Chaos', 'kermesse-du-chaos'],
    ['Kislévites', 'kislevites'],
    ['Mercenaires Averlanders', 'mercenaires-averlanders'],
    [
      'Mercenaires Marienburgers',
      'mercenaires-marienburgers',
      'https://drive.google.com/file/d/11E_fKx-2HqP6kfGeZstD6tJvstJYOVV5/view',
    ],
    [
      'Mercenaires Middenheimers',
      'mercenaires-middenheimers',
      'https://drive.google.com/file/d/11E_fKx-2HqP6kfGeZstD6tJvstJYOVV5/view',
    ],
    ['Mercenaires Ostermarkers', 'mercenaires-ostermarkers'],
    ['Mercenaires Ostlanders', 'mercenaires-ostlanders'],
    [
      'Mercenaires Reiklanders',
      'mercenaires-reiklanders',
      'https://drive.google.com/file/d/11E_fKx-2HqP6kfGeZstD6tJvstJYOVV5/view',
    ],
    [
      'Morts-Vivants',
      'morts-vivants',
      'https://drive.google.com/file/d/1M07ch-ZgRYS_LgfL59v4_IEVbqm0dzi5/view',
    ],
    ['Pillards Hommes-Bêtes', 'pillards-hommes-betes'],
    [
      'Répurgateurs',
      'repurgateurs',
      'https://drive.google.com/file/d/1CAXbjM9y81RKn98E2IHDQUxOhEoDXF2O/view',
    ],
    [
      'Skavens du Clan Eshin',
      'skavens-du-clan-eshin',
      'https://drive.google.com/file/d/1Zai8Bs5wNSgrl2kogFUPPbuPxjavthBT/view',
    ],
    [
      'Sœurs de Sigmar',
      'soeurs-de-sigmar',
      'https://drive.google.com/file/d/1zAUei0vH4AntYdMcluqAXacWjrKoNqOj/view',
    ],
  ]),
  ...bandes('1b', [
    ['Amazones (L)', 'amazones-l'],
    ['Amazones (M)', 'amazones-m'],
    ['Artilleurs de Nuln', 'artilleurs-de-nuln'],
    ['Bandits du Hochland', 'bandits-du-hochland'],
    ['Chasseurs Cornus', 'chasseurs-cornus'],
    ['Chevaliers Bretonniens', 'chevaliers-bretonniens'],
    ['Elfes Noirs', 'elfes-noirs'],
    ['Escorteurs Impériaux', 'escorteurs-imperiaux'],
    ['Expéditions Runiques', 'expeditions-runiques'],
    ['Gardiens des Tombes', 'gardiens-des-tombes'],
    ['Gladiateurs', 'gladiateurs'],
    ['Gobelins des Forêts', 'gobelins-des-forets'],
    ['Guerriers Fantômes', 'guerriers-fantomes'],
    ['Hommes-Lézards', 'hommes-lezards'],
    ['Hors-la-loi de Stirwood', 'hors-la-loi-de-stirwood'],
    ['Mootlanders', 'mootlanders'],
    ['Norses', 'norses'],
    ['Orques Noirs', 'orques-noirs'],
    ['Pilleurs de Tombes Arabiens', 'pilleurs-de-tombes-arabiens'],
    ['Pirates', 'pirates'],
    ['Skavens du Clan Pestilens', 'skavens-du-clan-pestilens'],
    ['Tiléens', 'tileens'],
  ]),
  ...bandes('1c', [
    ['Caravane des Marchands', 'caravane-des-marchands'],
    ['Fils d’Hashut', 'fils-dhashut'],
    ['Gardiens de Chapelle Bretonniens', 'gardiens-de-chapelle-bretonniens'],
    ['Gobelins de la Nuit', 'gobelins-de-la-nuit'],
    ['Mangeurs d’Hommes', 'mangeurs-dhommes'],
    ['Maraudeurs du Chaos', 'maraudeurs-du-chaos'],
    ['Moines Guerriers de Cathay', 'moines-guerriers-de-cathay'],
    ['Morts Tourmentés', 'morts-tourmentes'],
    ['Nains du Chaos', 'nains-du-chaos'],
  ]),
  ...bandes('2', [
    ['Arpenteurs Fimirs', 'arpenteurs-fimirs'],
    ['Strigannes', 'strigannes'],
  ]),
];

const idsBandesAutomatisees = new Set(
  definitionsBandesAutomatisees.map((definition) => definition.id),
);

function idListeReference(slug: string, index: number) {
  return `ref-${slug}-l${index}`;
}

function idProfilReference(slug: string, id: string) {
  return `ref-${slug}-${id}`;
}

function categorieEquipementReference(nom: string): Equipement['categorie'] {
  const valeur = nom.toLocaleLowerCase('fr-FR');
  if (valeur.includes('tir')) return 'Tir';
  if (valeur.includes('armure')) return 'Armure';
  if (valeur.includes('mutation')) return 'Mutation';
  if (valeur.includes('corps à corps') || valeur === 'armes') {
    return 'Corps à corps';
  }
  return 'Divers';
}

function normaliserRecherche(valeur: string) {
  return valeur
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr-FR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const motsProfilGeneriques = new Set([
  'ancien',
  'bande',
  'chaos',
  'chef',
  'combat',
  'guerre',
  'guerriere',
  'homme',
  'noir',
  'noire',
]);

const famillesProfil = new Set([
  'corsaire',
  'gladiateur',
  'gobelin',
  'ogre',
  'saurus',
  'skink',
  'tireur',
]);

const categoriesHorsRecrutement = new Set([
  "Créature d'équipement",
  'Monture optionnelle',
  'Transformation',
]);

function radicalMotProfil(mot: string) {
  return mot.length > 4 &&
    mot.endsWith('s') &&
    mot !== 'chaos' &&
    mot !== 'saurus'
    ? mot.slice(0, -1)
    : mot;
}

function contientSequence(conteneur: string[], recherche: string[]) {
  if (recherche.length === 0 || recherche.length > conteneur.length) {
    return false;
  }
  return conteneur.some((_, index) =>
    recherche.every((mot, decalage) => conteneur[index + decalage] === mot),
  );
}

function profilsAutorisesReference(slug: FactionId, note: string | undefined) {
  if (!note) return undefined;
  const fiche = fichesBandesReference[slug];
  const restrictions = note
    .split(/[,.;:]/)
    .map(normaliserRecherche)
    .flatMap((clause) => {
      const correspondance = clause.match(/^(.*?)\b(?:uniquement|seulement)\b/);
      if (correspondance?.[1]) return [correspondance[1].trim()];
      const herosFamille = clause.match(
        /\b(?:pour|aux)\s+(?:les\s+)?heros\s+(skinks?|saurus|gobelins?|corsaires?|tireurs?|ogres?|gladiateurs?)\b/,
      );
      if (herosFamille?.[1]) return [`heros ${herosFamille[1]}`];
      if (/\breserv\w*\b.*\bheros\b/.test(clause)) return ['heros'];
      return [];
    });
  if (restrictions.length === 0) return undefined;

  const profilsEligibles = fiche.profils
    .filter(
      (profil) =>
        profil.cout !== null &&
        !categoriesHorsRecrutement.has(profil.categorie),
    )
    .map((profil) => ({
      profil,
      motsComplets: normaliserRecherche(profil.nom)
        .split(' ')
        .map(radicalMotProfil)
        .filter((mot) => mot.length >= 2),
      mots: normaliserRecherche(profil.nom)
        .split(' ')
        .map(radicalMotProfil)
        .filter((mot) => mot.length >= 4 && !motsProfilGeneriques.has(mot)),
    }));
  const frequences = new Map<string, number>();
  for (const profil of profilsEligibles) {
    for (const mot of new Set(profil.mots)) {
      frequences.set(mot, (frequences.get(mot) ?? 0) + 1);
    }
  }

  const idsAutorises = new Set<string>();
  for (const restriction of restrictions) {
    const mots = restriction.split(' ').map(radicalMotProfil);
    const motsRestriction = new Set(mots);
    const autoriseLesHeros = motsRestriction.has('hero');
    const familles = mots.filter((mot) => famillesProfil.has(mot));
    const unionHerosFamille = autoriseLesHeros && motsRestriction.has('et');
    const motsRole = mots.filter(
      (mot) =>
        mot.length >= 4 &&
        !['commun', 'hero', 'pour', 'rare', 'reserve'].includes(mot),
    );
    const familleSeule =
      familles.length > 0 &&
      motsRole.every((mot) => mot === 'et' || famillesProfil.has(mot));

    for (const { profil, mots: motsNom, motsComplets } of profilsEligibles) {
      const appartientFamille = familles.some((famille) =>
        motsNom.includes(famille),
      );
      const profilNomme =
        !(autoriseLesHeros && familles.length > 0) &&
        (motsComplets.length > 1 || motsRole.length === 1) &&
        contientSequence(mots, motsComplets);
      const roleUnique = motsNom.some(
        (mot) =>
          motsRestriction.has(mot) &&
          !famillesProfil.has(mot) &&
          frequences.get(mot) === 1,
      );
      const herosAutorise =
        autoriseLesHeros &&
        profil.categorie === 'Héros' &&
        (familles.length === 0 || unionHerosFamille || appartientFamille);
      const familleAutorisee =
        appartientFamille &&
        ((familleSeule && !autoriseLesHeros) || unionHerosFamille);
      if (herosAutorise || familleAutorisee || profilNomme || roleUnique) {
        idsAutorises.add(idProfilReference(slug, profil.id));
      }
    }
  }

  let profilsAutorises = Array.from(idsAutorises);
  if (/\bune seule marque par heros\b/.test(normaliserRecherche(note))) {
    const idsHeros = new Set(
      profilsEligibles
        .filter(({ profil }) => profil.categorie === 'Héros')
        .map(({ profil }) => idProfilReference(slug, profil.id)),
    );
    profilsAutorises =
      profilsAutorises.length > 0
        ? profilsAutorises.filter((id) => idsHeros.has(id))
        : Array.from(idsHeros);
  }

  return profilsAutorises.length > 0 ? profilsAutorises : undefined;
}

function tablesCompetencesReference(noms: string[]) {
  const tables = noms.flatMap<CategorieCompetence>((nom) => {
    if (/combat/i.test(nom)) return ['Combat'];
    if (/tir/i.test(nom)) return ['Tir'];
    if (/érudition/i.test(nom)) return ['Érudition'];
    if (/force/i.test(nom)) return ['Force'];
    if (/vitesse/i.test(nom)) return ['Vitesse'];
    if (/spécial/i.test(nom)) return ['Spécial'];
    return [];
  });
  return Array.from(new Set(tables));
}

const clesStatistiques: Array<keyof Statistiques> = [
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

function convertirStatistiquesReference(valeurs: StatistiquesBandeReference) {
  const statistiques = {} as Statistiques;
  const statistiquesSpeciales: Partial<Record<keyof Statistiques, string>> = {};
  for (const cle of clesStatistiques) {
    const valeur = valeurs[cle];
    if (typeof valeur === 'number') statistiques[cle] = valeur;
    else {
      statistiques[cle] = 0;
      statistiquesSpeciales[cle] = valeur === null ? '-' : valeur;
    }
  }
  return {
    statistiques,
    statistiquesSpeciales:
      Object.keys(statistiquesSpeciales).length > 0
        ? statistiquesSpeciales
        : undefined,
  };
}

function creerProfilsReference(slug: FactionId) {
  const fiche = fichesBandesReference[slug];
  return fiche.profils
    .filter(
      (profil) =>
        profil.cout !== null &&
        !categoriesHorsRecrutement.has(profil.categorie),
    )
    .map<ProfilRecrue>((profil) => {
      const regles = profil.regles
        .map((regle) => `${regle.titre} : ${regle.description}`)
        .join(' ');
      const estChef = profil.regles.some(
        (regle) =>
          /^chef$/i.test(regle.titre) ||
          /\best (?:toujours )?le chef\b/i.test(regle.description),
      );
      const statsReference = convertirStatistiquesReference(
        profil.statistiques,
      );
      const listesEquipement = fiche.listesEquipement.flatMap((liste, index) =>
        liste.profils.includes(profil.id)
          ? [idListeReference(slug, index)]
          : [],
      );
      const competencesDisponibles = tablesCompetencesReference(
        profil.competencesDisponibles,
      );
      return {
        id: idProfilReference(slug, profil.id),
        nom: profil.nom,
        categorie: profil.categorie === 'Héros' ? 'Héros' : 'Hommes de main',
        cout: profil.cout!,
        minimum: profil.minimum,
        maximum: profil.maximum,
        experienceInitiale: profil.experienceInitiale,
        maximums: profil.maximums,
        sourceMaximums: profil.sourceMaximums,
        progressionManuelle: profil.progressionManuelle,
        ...statsReference,
        competencesDisponibles:
          competencesDisponibles.length > 0
            ? competencesDisponibles
            : undefined,
        listesEquipement,
        chef: estChef,
        grandeCreature: profil.regles.some((regle) =>
          /grande cible|grande créature/i.test(
            `${regle.titre} ${regle.description}`,
          ),
        ),
        gagneExperience: profil.gagneExperience,
        regleSpeciale: regles || undefined,
      };
    });
}

const equipementsReference: Equipement[] = bandesBibliotheque.flatMap(
  (bande) => {
    if (idsBandesAutomatisees.has(bande.slug as FactionId)) return [];
    const fiche = fichesBandesReference[bande.slug];
    return fiche.listesEquipement.flatMap((liste, indexListe) =>
      liste.categories.flatMap((categorie, indexCategorie) =>
        categorie.entrees.flatMap((entree, indexEntree): Equipement[] => {
          const original: Equipement = {
            id: `ref-${bande.slug}-l${indexListe}-c${indexCategorie}-e${indexEntree}`,
            nom: entree.nom,
            categorie: categorieEquipementReference(categorie.nom),
            cout: entree.cout,
            achatDesactive: entree.achatDesactive,
            prixRecrutementFormule: entree.prixRecrutementFormule,
            prixRecrutementMinimum: entree.prixRecrutementMinimum,
            rareteCommerce: entree.rareteCommerce,
            coutCommerce: entree.coutCommerce,
            coutCommerceFormule: entree.coutCommerceFormule,
            commerceUniquement: entree.commerceUniquement,
            listesEquipement: [idListeReference(bande.slug, indexListe)],
            accordeDagueDeBase: /^dague$/i.test(entree.nom.trim()),
            profilsAutorises: profilsAutorisesReference(
              bande.slug as FactionId,
              entree.note,
            ),
            quantiteMax:
              entree.quantiteMax ??
              (/\bpaire\b/i.test(entree.nom) ? 1 : undefined),
            regleSpeciale: [entree.formuleCout, entree.note]
              .filter(Boolean)
              .join('. '),
          };
          const variantes: Equipement[] = [];
          const materiau = entree.variantesArme;
          if (materiau) {
            for (const [
              indexBaseListe,
              baseListe,
            ] of fiche.listesEquipement.entries()) {
              for (const [
                indexBaseCategorie,
                baseCategorie,
              ] of baseListe.categories.entries()) {
                if (
                  categorieEquipementReference(baseCategorie.nom) !==
                  'Corps à corps'
                )
                  continue;
                for (const [
                  indexBaseEntree,
                  arme,
                ] of baseCategorie.entrees.entries()) {
                  if (
                    arme.cout <= 0 ||
                    arme.variantesArme ||
                    arme.achatDesactive ||
                    arme.commerceUniquement
                  )
                    continue;
                  if (materiau.armes && !materiau.armes.includes(arme.nom))
                    continue;
                  const restrictionsBase = profilsAutorisesReference(
                    bande.slug as FactionId,
                    arme.note,
                  );
                  const autorises = liste.profils
                    .filter((id) => baseListe.profils.includes(id))
                    .map((id) => idProfilReference(bande.slug as FactionId, id))
                    .filter(
                      (id) =>
                        (!original.profilsAutorises ||
                          original.profilsAutorises.includes(id)) &&
                        (!restrictionsBase || restrictionsBase.includes(id)),
                    );
                  if (autorises.length === 0) continue;
                  const prix =
                    arme.cout * materiau.multiplicateur +
                    (materiau.supplement ?? 0);
                  variantes.push({
                    ...original,
                    id: `${original.id}-arme-l${indexBaseListe}-c${indexBaseCategorie}-e${indexBaseEntree}`,
                    nom: `${arme.nom} (${materiau.materiau})`,
                    categorie: 'Corps à corps',
                    cout: prix,
                    coutCommerce: materiau.multiplicateurCommerce
                      ? arme.cout * materiau.multiplicateurCommerce +
                        (materiau.supplement ?? 0)
                      : original.commerceUniquement
                        ? prix
                        : undefined,
                    achatDesactive: undefined,
                    accordeDagueDeBase: false,
                    profilsAutorises: autorises,
                    quantiteMax: 2,
                    regleSpeciale:
                      `${arme.nom}, ${arme.cout} CO × ${materiau.multiplicateur}${materiau.supplement ? ` + ${materiau.supplement} CO` : ''}. ${arme.note ?? ''} ${entree.note ?? ''}`.trim(),
                  });
                }
              }
            }
          }
          const prixPaire = entree.formuleCout?.match(/^(\d+) CO la paire$/);
          if (prixPaire && Number(prixPaire[1]) !== entree.cout * 2) {
            variantes.push({
              ...original,
              id: `${original.id}-paire`,
              nom: `Paire de ${entree.nom.toLocaleLowerCase('fr-FR')}`,
              cout: Number(prixPaire[1]),
              quantiteMax: 1,
            });
          }
          return [original, ...variantes];
        }),
      ),
    );
  },
);

const definitionsBandesReference: DefinitionBande[] = bandesBibliotheque
  .filter((bande) => !idsBandesAutomatisees.has(bande.slug as FactionId))
  .map((bande) => {
    const fiche = fichesBandesReference[bande.slug];
    return {
      id: bande.slug as FactionId,
      nom: bande.nom,
      slug: bande.slug,
      budgetInitial: fiche.composition.budgetInitial,
      effectifMinimum: fiche.composition.effectifMinimum,
      effectifMaximum: fiche.composition.effectifMaximum,
      profils: creerProfilsReference(bande.slug as FactionId),
      regles: fiche.regles.map(({ titre, description }) => ({
        titre,
        description,
      })),
      source: fiche.composition.source,
    };
  });

export const equipements: Equipement[] = [
  ...equipementsAutomatises,
  ...equipementsReference,
];

// Noms exacts des pistolets unitaires dont la paire est prévue par les listes.
// Les entrées « Paire de ... » comptent déjà pour une arme. Les armes à
// répétition et les éventuels pistolets-arbalètes ne sont pas inférés ici.
const nomsPistoletsUnitairesParPaire = new Set([
  'Pistolet',
  'Pistolet de duel',
  'Pistolet à malepierre',
  'Pistolet à double canon',
  'Pistolet de duel à double canon',
]);
const equipementsParIdComptage = new Map(equipements.map((e) => [e.id, e]));
const idsPistoletsUnitairesParPaire = new Set(
  equipements
    .filter(
      (e) => e.categorie === 'Tir' && nomsPistoletsUnitairesParPaire.has(e.nom),
    )
    .map((e) => e.id),
);

/** Rules Review 2005, errata p.4 : une paire de pistolets occupe une arme de tir. */
export function compterArmesDeTir(equipementIds: string[]) {
  const compteurs = new Map<string, number>();
  for (const id of equipementIds) {
    if (equipementsParIdComptage.get(id)?.categorie !== 'Tir') continue;
    compteurs.set(id, (compteurs.get(id) ?? 0) + 1);
  }
  return [...compteurs].reduce(
    (total, [id, quantite]) =>
      total +
      (idsPistoletsUnitairesParPaire.has(id)
        ? Math.ceil(quantite / 2)
        : quantite),
    0,
  );
}

const idsProfilsCoreReference: Record<string, string> = {
  capitaine: 'capitaine-mercenaire',
  champion: 'champion',
  recrue: 'recrue',
  guerrier: 'guerrier',
  tireur: 'tireur',
  bretteur: 'bretteur',
  'possedes-magister': 'magister',
  'possedes-possede': 'possede',
  'possedes-mutant': 'mutant',
  'possedes-ame-damnee': 'damne',
  'possedes-frere': 'initie',
  'possedes-homme-bete': 'homme-bete',
  'repurgateurs-capitaine': 'capitaine-repurgateur',
  'repurgateurs-repurgateur': 'repurgateur',
  'repurgateurs-pretre': 'pretre-guerrier',
  'repurgateurs-flagellant': 'flagellant',
  'repurgateurs-zelote': 'seide',
  'repurgateurs-chien': 'chien-de-guerre',
  'soeurs-matriarche': 'matriarche',
  'soeurs-superieure': 'soeur-superieure',
  'soeurs-augure': 'augure',
  'soeurs-sigmarite': 'soeur',
  'soeurs-novice': 'novice',
  'morts-vivants-vampire': 'vampire',
  'morts-vivants-necromancien': 'necromancien',
  'morts-vivants-paria': 'paria',
  'morts-vivants-zombie': 'zombie',
  'morts-vivants-goule': 'goule',
  'morts-vivants-loup': 'loup-funeste',
  'skavens-adepte': 'adepte-assassin',
  'skavens-noir': 'skaven-noir',
  'skavens-sorcier': 'sorcier-eshin',
  'skavens-coureur': 'coureur-nocturne',
  'skavens-vermine': 'vermineux',
  'skavens-rat-geant': 'rat-geant',
  'skavens-rat-ogre': 'rat-ogre',
};

function metadonneesProgressionCore(
  definition: DefinitionBande,
): DefinitionBande {
  return {
    ...definition,
    profils: definition.profils.map((profil) => {
      const id =
        idsProfilsCoreReference[
          profil.id.replace(/^(middenheim|marienburg)-/, '')
        ];
      const reference = fichesBandesReference[definition.id].profils.find(
        (p) => p.id === id,
      );
      if (!reference)
        throw new Error(`Métadonnées de progression absentes : ${profil.id}`);
      return {
        ...profil,
        gagneExperience: reference.gagneExperience,
        maximums: profil.maximums ?? reference.maximums,
        sourceMaximums: reference.sourceMaximums,
        progressionManuelle: profil.maximums
          ? undefined
          : reference.progressionManuelle,
      };
    }),
  };
}

export const definitionsBandes: DefinitionBande[] = [
  ...definitionsBandesAutomatisees.map(metadonneesProgressionCore),
  ...definitionsBandesReference,
];

export const profils = definitionsBandes.flatMap(
  (definition) => definition.profils,
);

export function obtenirDefinitionBande(factionId: FactionId) {
  const definition = definitionsBandes.find((item) => item.id === factionId);
  if (!definition) throw new Error(`Faction inconnue : ${factionId}`);
  return definition;
}

export function obtenirProfil(profilId: string) {
  const profil = profils.find((item) => item.id === profilId);
  if (!profil) throw new Error(`Profil inconnu : ${profilId}`);
  return profil;
}

export const etapesApresBataille = [
  'Blessures graves',
  'Expérience',
  'Revenus',
  'Vente de la pierre magique',
  'Disponibilité des vétérans',
  'Jets de rareté et objets rares',
  'Personnages spéciaux',
  'Nouvelles recrues et objets communs',
  'Allocation de l’équipement',
  'Mise à jour de la valeur de bande',
];

function stats(
  mouvement: number,
  capaciteCombat: number,
  capaciteTir: number,
  force: number,
  endurance: number,
  pointsVie: number,
  initiative: number,
  attaques: number,
  commandement: number,
): Statistiques {
  return {
    mouvement,
    capaciteCombat,
    capaciteTir,
    force,
    endurance,
    pointsVie,
    initiative,
    attaques,
    commandement,
  };
}

function bandes(
  grade: BandeBibliotheque['grade'],
  entrees: Array<[string, string, string?]>,
): BandeBibliotheque[] {
  return entrees.map(([nom, slug]) => {
    const notice = catalogueBandes.bandes[slug];
    if (!notice) {
      throw new Error(`Notice de bande manquante : ${slug}`);
    }
    return {
      nom,
      slug,
      grade,
      presentation: notice.presentation,
      publication: notice.publication,
      langueDocument: notice.langueDocument,
      pagesPdf: notice.pagesPdf,
      avertissements: notice.avertissements,
      pdfUrl: notice.pdfUrl,
    };
  });
}
