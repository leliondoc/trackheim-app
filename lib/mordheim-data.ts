import {
  definitionsBandesCore,
  equipementsBandesCore,
} from './core-warbandes.ts';

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

export type FactionId =
  | 'mercenaires-reiklanders'
  | 'mercenaires-middenheimers'
  | 'mercenaires-marienburgers'
  | 'culte-des-possedes'
  | 'repurgateurs'
  | 'soeurs-de-sigmar'
  | 'morts-vivants'
  | 'skavens-du-clan-eshin';

export type ListeEquipementId =
  | 'mercenaires'
  | 'tireurs'
  | 'possedes'
  | 'ames-sombres'
  | 'mutations'
  | 'repurgateurs'
  | 'zelotes'
  | 'flagellants'
  | 'soeurs'
  | 'augure'
  | 'morts-vivants'
  | 'skavens-heros'
  | 'skavens-hommes-main';

export type CategorieCompetence =
  | 'Combat'
  | 'Tir'
  | 'Érudition'
  | 'Force'
  | 'Vitesse'
  | 'Spécial';

export type ProfilRecrue = {
  id: string;
  nom: string;
  categorie: 'Héros' | 'Hommes de main';
  cout: number;
  minimum: number;
  maximum: number | null;
  experienceInitiale: number;
  statistiques: Statistiques;
  /** Plafonds raciaux utilisés pour les progressions ; humain par défaut. */
  maximums?: Statistiques;
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
  /** Nombre d’exemplaires portables par combattant (une paire vaut deux). */
  quantiteMax?: number;
  quantitesMaxParProfil?: Record<string, number>;
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
};

export type Combattant = {
  id: string;
  nom: string;
  profilId: string;
  experience: number;
  statut: 'Prêt' | 'Blessé' | 'Absent';
  statistiques: Statistiques;
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

export type SuiviCombattantBataille = {
  combattantId: string;
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

export type BatailleEnCours = {
  id: string;
  numero: number;
  scenario: string;
  adversaire: string;
  resultat: Partie['resultat'];
  date: string;
  valeurAvant: number;
  valeurAdverse: number;
  successeurChefId: string | null;
  etapeActive: number;
  participants: Record<string, SuiviCombattantBataille>;
  exploration: {
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
  version: 3;
  revision: number;
  rulesetId: string;
  nomCampagne: string;
  nomBande: string;
  campagneActive: boolean;
  factionId: FactionId;
  grade: '1a';
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
  effectifMaximum: number;
  profils: ProfilRecrue[];
  regles: Array<{ titre: string; description: string }>;
  source: string;
};

export type BandeBibliotheque = {
  nom: string;
  slug: string;
  grade: '1a' | '1b' | '1c' | '2';
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
    regleSpeciale: 'Expert à l’épée : relance les touches ratées en charge.',
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

export const equipements: Equipement[] = [
  {
    id: 'dague',
    nom: 'Dague supplémentaire',
    categorie: 'Corps à corps',
    cout: 2,
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

export const definitionsBandes: DefinitionBande[] = [
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
          'La bande commence une campagne avec 600 CO au lieu de 500 CO.',
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

export function equipementAutorise(
  profil: ProfilRecrue,
  equipement: Equipement,
  estHeros = profil.categorie === 'Héros',
) {
  if (equipement.patchGlm) return false;
  if (equipement.reserveAuxHeros && !estHeros) return false;
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
  return entrees.map(([nom, slug, pdfUrl]) => ({ nom, slug, grade, pdfUrl }));
}
