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

export type ProfilRecrue = {
  id: string;
  nom: string;
  categorie: 'Héros' | 'Hommes de main';
  cout: number;
  minimum: number;
  maximum: number | null;
  experienceInitiale: number;
  statistiques: Statistiques;
  listeEquipement: 'mercenaires' | 'tireurs';
  regleSpeciale?: string;
};

export type Equipement = {
  id: string;
  nom: string;
  categorie: 'Corps à corps' | 'Tir' | 'Armure';
  cout: number;
  reserveAuxHeros?: boolean;
  listeMercenaires?: boolean;
  listeTireurs?: boolean;
  /** Disponibilité au comptoir après la création, distincte de la liste de bande. */
  rareteCommerce?: number;
  coutCommerce?: number;
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
  coutAcquisition: number;
  /** Coût historique total du groupe, utile quand des recrues vétéranes le rejoignent. */
  coutAcquisitionTotal?: number;
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
  ennemisHorsCombat: number;
  experienceScenario: number;
  experienceManuelle: number;
  experienceAppliquee: boolean;
  progressionsNote: string;
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
    experienceDepensee?: number;
  };
  jetsRarete: JetRarete[];
  personnagesSpeciaux: string;
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
  factionId: 'mercenaires-reiklanders';
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

export type BandeBibliotheque = {
  nom: string;
  slug: string;
  grade: '1a' | '1b' | '1c' | '2';
  pdfUrl?: string;
};

export const SOURCE_GLM =
  'https://sites.google.com/view/grande-librairie-de-mordheim';

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
    listeEquipement: 'mercenaires',
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
    listeEquipement: 'mercenaires',
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
    listeEquipement: 'mercenaires',
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
    listeEquipement: 'mercenaires',
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
    listeEquipement: 'tireurs',
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
    listeEquipement: 'mercenaires',
    regleSpeciale: 'Expert à l’épée : relance les touches ratées en charge.',
  },
];

export const equipements: Equipement[] = [
  {
    id: 'dague',
    nom: 'Dague supplémentaire',
    categorie: 'Corps à corps',
    cout: 2,
    listeMercenaires: true,
    listeTireurs: true,
  },
  {
    id: 'masse',
    nom: 'Masse',
    categorie: 'Corps à corps',
    cout: 3,
    listeMercenaires: true,
    listeTireurs: true,
  },
  {
    id: 'marteau',
    nom: 'Marteau',
    categorie: 'Corps à corps',
    cout: 3,
    listeMercenaires: true,
    listeTireurs: true,
  },
  {
    id: 'hache',
    nom: 'Hache',
    categorie: 'Corps à corps',
    cout: 5,
    listeMercenaires: true,
    listeTireurs: true,
  },
  {
    id: 'epee',
    nom: 'Épée',
    categorie: 'Corps à corps',
    cout: 10,
    listeMercenaires: true,
    listeTireurs: true,
  },
  {
    id: 'hallebarde',
    nom: 'Hallebarde',
    categorie: 'Corps à corps',
    cout: 10,
    listeMercenaires: true,
  },
  {
    id: 'lance',
    nom: 'Lance',
    categorie: 'Corps à corps',
    cout: 10,
    listeMercenaires: true,
  },
  {
    id: 'morgenstern',
    nom: 'Morgenstern',
    categorie: 'Corps à corps',
    cout: 15,
    listeMercenaires: true,
  },
  {
    id: 'rapiere',
    nom: 'Rapière',
    categorie: 'Corps à corps',
    cout: 15,
    reserveAuxHeros: true,
    listeMercenaires: true,
    patchGlm: true,
  },
  {
    id: 'deux-mains',
    nom: 'Arme à deux mains',
    categorie: 'Corps à corps',
    cout: 15,
    listeMercenaires: true,
  },
  {
    id: 'arc',
    nom: 'Arc',
    categorie: 'Tir',
    cout: 10,
    listeMercenaires: true,
    listeTireurs: true,
  },
  {
    id: 'arc-long',
    nom: 'Arc long',
    categorie: 'Tir',
    cout: 15,
    listeTireurs: true,
  },
  {
    id: 'arbalete',
    nom: 'Arbalète',
    categorie: 'Tir',
    cout: 25,
    listeMercenaires: true,
    listeTireurs: true,
  },
  {
    id: 'pistolet',
    nom: 'Pistolet',
    categorie: 'Tir',
    cout: 15,
    listeMercenaires: true,
    listeTireurs: true,
    rareteCommerce: 8,
  },
  {
    id: 'pistolet-duel',
    nom: 'Pistolet de duel',
    categorie: 'Tir',
    cout: 25,
    coutCommerce: 30,
    rareteCommerce: 10,
    listeMercenaires: true,
  },
  {
    id: 'tromblon',
    nom: 'Tromblon',
    categorie: 'Tir',
    cout: 30,
    listeTireurs: true,
    rareteCommerce: 9,
  },
  {
    id: 'arquebuse',
    nom: 'Arquebuse',
    categorie: 'Tir',
    cout: 35,
    listeTireurs: true,
    rareteCommerce: 8,
  },
  {
    id: 'long-fusil-hochland',
    nom: 'Long fusil d’Hochland',
    categorie: 'Tir',
    cout: 200,
    listeTireurs: true,
    rareteCommerce: 11,
  },
  {
    id: 'armure-legere',
    nom: 'Armure légère',
    categorie: 'Armure',
    cout: 20,
    listeMercenaires: true,
    listeTireurs: true,
  },
  {
    id: 'armure-lourde',
    nom: 'Armure lourde',
    categorie: 'Armure',
    cout: 50,
    listeMercenaires: true,
  },
  {
    id: 'casque',
    nom: 'Casque',
    categorie: 'Armure',
    cout: 10,
    listeMercenaires: true,
    listeTireurs: true,
  },
  {
    id: 'bouclier',
    nom: 'Bouclier',
    categorie: 'Armure',
    cout: 5,
    listeMercenaires: true,
    listeTireurs: true,
  },
  {
    id: 'rondache',
    nom: 'Rondache',
    categorie: 'Armure',
    cout: 5,
    listeMercenaires: true,
  },
];

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

export const etatInitial: EtatCampagne = {
  version: 3,
  revision: 0,
  rulesetId: 'mordheim-1999-rules-review-2005-reiklanders',
  nomCampagne: 'Les Cendres de Sigmar',
  nomBande: 'Les Corbeaux de Reikland',
  factionId: 'mercenaires-reiklanders',
  grade: '1a',
  couronnes: 72,
  fragments: 4,
  numeroBataille: 7,
  etapesApresBataille: [
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
  ],
  combattants: [
    combattant(
      'wilhelm',
      'Wilhelm Krieger',
      'capitaine',
      34,
      ['epee', 'pistolet', 'armure-legere'],
      'Prêt',
      true,
    ),
    combattant('otto', 'Otto le Rouge', 'champion', 22, [
      'masse',
      'bouclier',
      'casque',
    ]),
    combattant('hanna', 'Hanna Brume', 'tireur', 11, ['arc-long'], 'Blessé'),
    combattant('markus', 'Markus Klein', 'guerrier', 6, ['hallebarde']),
  ],
  inventaire: {},
  batailleEnCours: null,
  parties: [
    {
      id: 'partie-7',
      scenario: 'La Tour du Sorcier',
      adversaire: 'Skavens',
      resultat: 'Victoire',
      date: '2026-08-28',
    },
  ],
  homebrew: {
    actifs: false,
    nomSet: 'Règles des Cendres',
    description:
      'Ajustements de campagne appliqués au-dessus des règles officielles.',
    coutsRecrues: {},
    coutsEquipements: {},
    regles: [],
  },
};

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

function combattant(
  id: string,
  nom: string,
  profilId: string,
  experience: number,
  equipementIds: string[],
  statut: Combattant['statut'] = 'Prêt',
  chef = false,
): Combattant {
  const profil = profilsReiklanders.find((item) => item.id === profilId)!;
  return {
    id,
    nom,
    profilId,
    experience,
    statut,
    statistiques: profil.statistiques,
    equipementIds,
    notes: '',
    quantite: 1,
    chef,
    coutAcquisition:
      profil.cout +
      equipementIds.reduce(
        (total, equipementId) =>
          total +
          (equipements.find((item) => item.id === equipementId)?.cout ?? 0),
        0,
      ),
    coutAcquisitionTotal:
      profil.cout +
      equipementIds.reduce(
        (total, equipementId) =>
          total +
          (equipements.find((item) => item.id === equipementId)?.cout ?? 0),
        0,
      ),
    competences: [],
    blessures: [],
    progressions: [],
    partiesManquees: 0,
  };
}

function bandes(
  grade: BandeBibliotheque['grade'],
  entrees: Array<[string, string, string?]>,
): BandeBibliotheque[] {
  return entrees.map(([nom, slug, pdfUrl]) => ({ nom, slug, grade, pdfUrl }));
}
