/**
 * Moteur de règles pur pour le socle de campagne actuellement pris en charge.
 *
 * Important : une règle n'entre ici que si sa provenance, sa version et sa page
 * ont été recoupées. Les règles optionnelles et le homebrew restent des couches
 * séparées et ne modifient jamais silencieusement ce socle.
 */

export type AutoriteRegle =
  | 'coeur-officiel'
  | 'errata-officiel'
  | 'supplement-officiel'
  | 'edition-glm'
  | 'clarification-concepteur'
  | 'homebrew';

export type ActivationRegle =
  | 'coeur'
  | 'optionnelle'
  | 'setting'
  | 'bande'
  | 'homebrew';
export type CertificationRegle =
  | 'primaire-vérifiée'
  | 'secondaire-vérifiée'
  | 'éditorial-glm'
  | 'conflit-résolu'
  | 'non-vérifiée';

export type SourceRegle = {
  id: string;
  titre: string;
  version: string;
  autorite: AutoriteRegle;
  url: string;
  dateVerification: string;
};

export type ReferenceRegle = {
  sourceId: SourceRegle['id'];
  representationFrId?: SourceRegle['id'];
  pages: string;
  representationFrPages?: string;
  activation: ActivationRegle;
  certification: CertificationRegle;
  note?: string;
};

export const ID_RULESET = 'mordheim-1999-rules-review-2005-bandes-core';
export const ID_RULESET_GLM = 'glm-livre-complet-1.2f-bandes-core';

export const sourcesRegles = {
  coeurOfficiel: {
    id: 'mordheim-1999-campagnes',
    titre: 'Mordheim — Campaigns & Optional Rules',
    version: 'LRB2 officiel, errata 2005 intégrés',
    autorite: 'coeur-officiel',
    url: 'https://www.broheim.net/downloads/rules/Mordheim%20-%20Part%203%20-%20Campaigns%20%26%20Optional%20Rules.pdf',
    dateVerification: '2026-08-30',
  },
  rulesReview: {
    id: 'mordheim-rules-review-2005',
    titre: 'Mordheim Rules Review',
    version: 'juin 2005',
    autorite: 'errata-officiel',
    url: 'https://broheim.net/downloads/rules/Errata%2C%20plaintext.pdf',
    dateVerification: '2026-08-30',
  },
  livreComplet: {
    id: 'glm-livre-complet-1.2f',
    titre: 'Livre des Règles de Mordheim — complet VF avec errata',
    version: 'V1.2fFr (2023-04-10)',
    autorite: 'edition-glm',
    url: 'https://sites.google.com/view/grande-librairie-de-mordheim/regles/livre-des-regles',
    dateVerification: '2026-08-30',
  },
  campagneGlm: {
    id: 'glm-campagne',
    titre: 'Grande Librairie de Mordheim — Campagne',
    version: 'pages GLM consultées le 2026-08-30',
    autorite: 'edition-glm',
    url: 'https://sites.google.com/view/grande-librairie-de-mordheim/campagne',
    dateVerification: '2026-08-30',
  },
  bandesCore: {
    id: 'mordheim-1999-bandes-core',
    titre: 'Mordheim — Warbands',
    version: 'Livre de règles officiel, partie 2',
    autorite: 'coeur-officiel',
    url: 'https://broheim.net/downloads/rules/Mordheim%20-%20Part%202%20-%20Warbands.pdf',
    dateVerification: '2026-09-01',
  },
} satisfies Record<string, SourceRegle>;

export type ManifesteRuleset = {
  id: string;
  nom: string;
  coeurSourceId: string;
  errataIds: string[];
  versionBandeId: string;
  modulesOptionnels: string[];
  clarifications: string[];
  resolutionsConflits: Record<string, string>;
};

/**
 * Preset prudent : le texte français sert à l'affichage, mais l'autorité reste
 * le livre 1999 corrigé par le Rules Review 2005. Les ajouts éditoriaux GLM et
 * les clarifications de forum doivent être activés clause par clause.
 */
export const rulesetOfficiel: ManifesteRuleset = {
  id: ID_RULESET,
  nom: 'Mordheim officiel + Rules Review 2005',
  coeurSourceId: 'mordheim-1999-campagnes',
  errataIds: ['mordheim-rules-review-2005'],
  versionBandeId: 'mordheim-1999-bandes-core',
  modulesOptionnels: [],
  clarifications: [],
  resolutionsConflits: {
    'succession-chef-lanceur-sort': 'choix-sort-ou-priere',
    'reiklanders-rapiere': 'désactivée-faute-de-source-primaire',
  },
};

/** Variante fidèle au Livre complet GLM lorsque le maître de campagne la choisit. */
export const rulesetGlmStrict: ManifesteRuleset = {
  ...rulesetOfficiel,
  id: ID_RULESET_GLM,
  nom: 'Livre complet GLM V1.2fFr',
  resolutionsConflits: {
    'succession-chef-lanceur-sort': 'tirage-aleatoire-glm',
    'reiklanders-rapiere': 'désactivée-faute-de-source-primaire',
  },
};

export const referencesRegles = {
  sequenceApresBataille: ref(
    'mordheim-1999-campagnes',
    'pp. 77–78',
    'coeur',
    'primaire-vérifiée',
    'pp. 116–117',
  ),
  valeurBande: ref(
    'mordheim-1999-campagnes',
    'p. 77',
    'coeur',
    'primaire-vérifiée',
    'p. 116',
  ),
  blessuresGraves: ref(
    'mordheim-1999-campagnes',
    'pp. 79–80',
    'coeur',
    'primaire-vérifiée',
    'pp. 118–119',
  ),
  experience: ref(
    'mordheim-1999-campagnes',
    'pp. 81–85',
    'coeur',
    'primaire-vérifiée',
    'pp. 120–124',
  ),
  exploration: ref(
    'mordheim-1999-campagnes',
    'pp. 95–104',
    'coeur',
    'primaire-vérifiée',
    'pp. 134–143',
  ),
  ventePierre: ref(
    'mordheim-1999-campagnes',
    'p. 103',
    'coeur',
    'primaire-vérifiée',
    'p. 142',
  ),
  commerce: ref(
    'mordheim-1999-campagnes',
    'pp. 105–107',
    'coeur',
    'primaire-vérifiée',
    'pp. 144–146',
  ),
  francsTireurs: ref(
    'mordheim-1999-campagnes',
    'pp. 108–112',
    'coeur',
    'primaire-vérifiée',
    'pp. 147–151',
  ),
  dramatis: ref(
    'mordheim-1999-campagnes',
    'p. 111',
    'coeur',
    'primaire-vérifiée',
    'p. 152',
  ),
  bandesCore: ref(
    'mordheim-1999-bandes-core',
    'PDF pp. 5–31',
    'bande',
    'primaire-vérifiée',
  ),
} satisfies Record<string, ReferenceRegle>;

export const etapesCampagne = [
  {
    id: 'blessures',
    titre: 'Blessures graves',
    reference: referencesRegles.blessuresGraves,
  },
  {
    id: 'experience',
    titre: 'Expérience',
    reference: referencesRegles.experience,
  },
  {
    id: 'revenus',
    titre: 'Revenus et exploration',
    reference: referencesRegles.exploration,
  },
  {
    id: 'vente',
    titre: 'Vente de la pierre magique',
    reference: referencesRegles.ventePierre,
  },
  {
    id: 'veterans',
    titre: 'Disponibilité des vétérans',
    reference: referencesRegles.commerce,
  },
  {
    id: 'rarete',
    titre: 'Jets de rareté et objets rares',
    reference: referencesRegles.commerce,
  },
  {
    id: 'personnages',
    titre: 'Personnages spéciaux',
    reference: referencesRegles.dramatis,
  },
  {
    id: 'recrues',
    titre: 'Nouvelles recrues et objets communs',
    reference: referencesRegles.commerce,
  },
  {
    id: 'allocation',
    titre: 'Allocation de l’équipement',
    reference: referencesRegles.commerce,
  },
  {
    id: 'valeur',
    titre: 'Mise à jour de la valeur de bande',
    reference: referencesRegles.valeurBande,
  },
] as const;

export type EtapeCampagneId = (typeof etapesCampagne)[number]['id'];

export type EntreeValeurBande = {
  quantite: number;
  experience: number;
  grandeCreature?: boolean;
  valeurFixe?: number;
};

/** Valeur : 5 par guerrier + XP, ou 20 par grande créature + XP. */
export function calculerValeurBande(entrees: EntreeValeurBande[]) {
  return entrees.reduce((total, entree) => {
    const quantite = entierPositif(entree.quantite);
    const experience = entierPositif(entree.experience);
    const base = entree.valeurFixe ?? (entree.grandeCreature ? 20 : 5);
    return total + quantite * (base + experience);
  }, 0);
}

export function calculerBonusChallenger(difference: number) {
  const ecart = Math.max(0, Math.floor(difference));
  if (ecart <= 50) return 0;
  if (ecart <= 75) return 1;
  if (ecart <= 100) return 2;
  if (ecart <= 150) return 3;
  if (ecart <= 300) return 4;
  return 5;
}

/** Cases épaisses de la feuille officielle (Livre complet, feuilles pp. 174–175). */
export const seuilsProgressionHeros = [
  2, 4, 6, 8, 11, 14, 17, 20, 24, 28, 32, 36, 41, 46, 51, 57, 63, 69, 76, 83,
  90,
] as const;
export const seuilsProgressionHommesDeMain = [2, 5, 9, 14] as const;

export function compterProgressionsFranchies(
  experienceAvant: number,
  experienceApres: number,
  categorie: 'Héros' | 'Hommes de main',
) {
  const seuils =
    categorie === 'Héros'
      ? seuilsProgressionHeros
      : seuilsProgressionHommesDeMain;
  return seuils.filter(
    (seuil) => seuil > experienceAvant && seuil <= experienceApres,
  ).length;
}

export type Progression = {
  id: string;
  titre: string;
  choix?: string[];
  jetSecondaire?: boolean;
};

export function trouverProgressionHero(total2D6: number): Progression {
  verifierTotal2D6(total2D6);
  if (total2D6 <= 5 || total2D6 >= 10) {
    return { id: 'competence', titre: 'Nouvelle compétence' };
  }
  if (total2D6 === 6)
    return {
      id: 'force-attaque',
      titre: 'Hausse de caractéristique',
      choix: ['Force', 'Attaques'],
      jetSecondaire: true,
    };
  if (total2D6 === 7)
    return {
      id: 'cc-ct',
      titre: 'Hausse de caractéristique',
      choix: ['Capacité de Combat', 'Capacité de Tir'],
    };
  if (total2D6 === 8)
    return {
      id: 'initiative-commandement',
      titre: 'Hausse de caractéristique',
      choix: ['Initiative', 'Commandement'],
      jetSecondaire: true,
    };
  return {
    id: 'pv-endurance',
    titre: 'Hausse de caractéristique',
    choix: ['Points de Vie', 'Endurance'],
    jetSecondaire: true,
  };
}

export function trouverProgressionHommeDeMain(total2D6: number): Progression {
  verifierTotal2D6(total2D6);
  if (total2D6 <= 4) return { id: 'initiative', titre: '+1 Initiative' };
  if (total2D6 === 5) return { id: 'force', titre: '+1 Force' };
  if (total2D6 <= 7)
    return {
      id: 'cc-ct',
      titre: '+1 CC ou +1 CT',
      choix: ['Capacité de Combat', 'Capacité de Tir'],
    };
  if (total2D6 === 8) return { id: 'attaques', titre: '+1 Attaque' };
  if (total2D6 === 9) return { id: 'commandement', titre: '+1 Commandement' };
  return { id: 'gars-doue', titre: 'Ce gars est doué' };
}

export type ResultatExploration = {
  des: number[];
  total: number;
  fragments: number;
  combinaison: {
    valeur: number;
    occurrences: number;
    lieu: string;
  } | null;
};

const lieuxExploration = [
  [
    'Puits',
    'Boutique',
    'Cadavre',
    'Traînard',
    'Chariot renversé',
    'Masures en ruine',
  ],
  [
    'Taverne',
    'Forge',
    'Prisonniers',
    'Atelier d’archer',
    'Halles',
    'Service rendu',
  ],
  [
    'Armurier à poudre',
    'Sanctuaire',
    'Maison de ville',
    'Armurerie',
    'Cimetière',
    'Catacombes',
  ],
  [
    'Maison du prêteur',
    'Laboratoire d’alchimiste',
    'Joaillier',
    'Maison du marchand',
    'Bâtiment effondré',
    'Entrée des catacombes',
  ],
  [
    'La fosse',
    'Trésor caché',
    'Forge naine',
    'Bande massacrée',
    'Arène de combat',
    'Villa d’un noble',
  ],
] as const;

export function trouverLieuExploration(occurrences: number, valeur: number) {
  if (occurrences < 2 || occurrences > 6 || valeur < 1 || valeur > 6) {
    return null;
  }
  return lieuxExploration[occurrences - 2][valeur - 1];
}

/**
 * Les dés sont ceux que le joueur a décidé de conserver. Le moteur ne choisit
 * pas automatiquement les six plus hauts : conserver un double ou un triple
 * peut être préférable à maximiser seulement la somme.
 */
export function resoudreExploration(
  desConserves: number[],
): ResultatExploration {
  if (desConserves.length > 6) {
    throw new Error('Six dés d’exploration au maximum peuvent être conservés.');
  }
  if (desConserves.some((de) => !Number.isInteger(de) || de < 1 || de > 6)) {
    throw new Error('Chaque dé d’exploration doit être compris entre 1 et 6.');
  }

  const des = [...desConserves];
  const total = des.reduce((somme, de) => somme + de, 0);
  const occurrences = new Map<number, number>();
  for (const de of des) occurrences.set(de, (occurrences.get(de) ?? 0) + 1);

  const combinaison =
    [...occurrences]
      .filter(([, nombre]) => nombre >= 2)
      .sort(
        ([valeurA, nombreA], [valeurB, nombreB]) =>
          nombreB - nombreA || valeurB - valeurA,
      )
      .map(([valeur, nombre]) => ({
        valeur,
        occurrences: nombre,
        lieu: trouverLieuExploration(nombre, valeur)!,
      }))[0] ?? null;

  return { des, total, fragments: fragmentsPourTotal(total), combinaison };
}

export function fragmentsPourTotal(total: number) {
  const somme = Math.max(0, Math.floor(total));
  if (somme <= 5) return somme === 0 ? 0 : 1;
  if (somme <= 11) return 2;
  if (somme <= 17) return 3;
  if (somme <= 24) return 4;
  if (somme <= 30) return 5;
  if (somme <= 35) return 6;
  return 7;
}

const revenusPierre = [
  [45, 40, 35, 30, 30, 25],
  [60, 55, 50, 45, 40, 35],
  [75, 70, 65, 60, 55, 50],
  [90, 80, 70, 65, 60, 55],
  [110, 100, 90, 80, 70, 65],
  [120, 110, 100, 90, 80, 70],
  [145, 130, 120, 110, 100, 90],
  [155, 140, 130, 120, 110, 100],
] as const;

/** Profit net en CO après entretien, pour une unique vente d’après-bataille. */
export function calculerVentePierre(
  fragmentsVendus: number,
  guerriersComptabilises: number,
) {
  const fragments = entierPositif(fragmentsVendus);
  const guerriers = entierPositif(guerriersComptabilises);
  if (fragments === 0) return 0;
  const ligne = Math.min(fragments, 8) - 1;
  const colonne =
    guerriers <= 3
      ? 0
      : guerriers <= 6
        ? 1
        : guerriers <= 9
          ? 2
          : guerriers <= 12
            ? 3
            : guerriers <= 15
              ? 4
              : 5;
  return revenusPierre[ligne][colonne];
}

export type BlessureHommeDeMain = 'perdu' | 'survit';

export function resoudreBlessureHommeDeMain(de: number): BlessureHommeDeMain {
  verifierDe(de, 6);
  return de <= 2 ? 'perdu' : 'survit';
}

export type BlessureHero = {
  min: number;
  max: number;
  id: string;
  titre: string;
  application: 'automatique' | 'jet-secondaire' | 'résolution-table';
};

export const blessuresHeroes: BlessureHero[] = [
  { min: 11, max: 15, id: 'mort', titre: 'Mort', application: 'automatique' },
  {
    min: 16,
    max: 21,
    id: 'multiples',
    titre: 'Blessures multiples',
    application: 'jet-secondaire',
  },
  {
    min: 22,
    max: 22,
    id: 'jambe',
    titre: 'Blessure à la jambe',
    application: 'automatique',
  },
  {
    min: 23,
    max: 23,
    id: 'bras',
    titre: 'Blessure au bras',
    application: 'jet-secondaire',
  },
  {
    min: 24,
    max: 24,
    id: 'folie',
    titre: 'Folie',
    application: 'jet-secondaire',
  },
  {
    min: 25,
    max: 25,
    id: 'jambe-ecrasee',
    titre: 'Jambe écrasée',
    application: 'jet-secondaire',
  },
  {
    min: 26,
    max: 26,
    id: 'torse',
    titre: 'Blessure au torse',
    application: 'automatique',
  },
  {
    min: 31,
    max: 31,
    id: 'oeil',
    titre: 'Œil crevé',
    application: 'automatique',
  },
  {
    min: 32,
    max: 32,
    id: 'vieille',
    titre: 'Vieille blessure',
    application: 'automatique',
  },
  {
    min: 33,
    max: 33,
    id: 'nerveux',
    titre: 'Traumatisme nerveux',
    application: 'automatique',
  },
  {
    min: 34,
    max: 34,
    id: 'main',
    titre: 'Blessure à la main',
    application: 'automatique',
  },
  {
    min: 35,
    max: 35,
    id: 'profonde',
    titre: 'Blessure profonde',
    application: 'jet-secondaire',
  },
  {
    min: 36,
    max: 36,
    id: 'depouille',
    titre: 'Dépouillé',
    application: 'automatique',
  },
  {
    min: 41,
    max: 55,
    id: 'recuperation',
    titre: 'Récupération totale',
    application: 'automatique',
  },
  {
    min: 56,
    max: 56,
    id: 'rancune',
    titre: 'Rancune',
    application: 'jet-secondaire',
  },
  {
    min: 61,
    max: 61,
    id: 'capture',
    titre: 'Capturé',
    application: 'résolution-table',
  },
  {
    min: 62,
    max: 63,
    id: 'endurci',
    titre: 'Endurci',
    application: 'automatique',
  },
  {
    min: 64,
    max: 64,
    id: 'balafres',
    titre: 'Horribles balafres',
    application: 'automatique',
  },
  {
    min: 65,
    max: 65,
    id: 'arenes',
    titre: 'Vendu aux arènes',
    application: 'résolution-table',
  },
  {
    min: 66,
    max: 66,
    id: 'miracle',
    titre: 'Survie miraculeuse',
    application: 'automatique',
  },
];

export function trouverBlessureHero(d66: number) {
  verifierD66(d66);
  return blessuresHeroes.find(
    (blessure) => d66 >= blessure.min && d66 <= blessure.max,
  )!;
}

export function disponibiliteVeterans(de1: number, de2: number) {
  verifierDe(de1, 6);
  verifierDe(de2, 6);
  return de1 + de2;
}

/** Un vétéran coûte 2 CO supplémentaires par point d’expérience. */
export function surcoutVeteran(experience: number) {
  return entierPositif(experience) * 2;
}

export function jetRareteReussi(de1: number, de2: number, rarete: number) {
  verifierDe(de1, 6);
  verifierDe(de2, 6);
  if (!Number.isInteger(rarete) || rarete < 2 || rarete > 12) {
    throw new Error('La rareté doit être comprise entre 2 et 12.');
  }
  return de1 + de2 >= rarete;
}

function ref(
  sourceId: string,
  pages: string,
  activation: ActivationRegle,
  certification: CertificationRegle,
  representationFrPages?: string,
): ReferenceRegle {
  return {
    sourceId,
    representationFrId: representationFrPages
      ? 'glm-livre-complet-1.2f'
      : undefined,
    pages,
    representationFrPages,
    activation,
    certification,
    note: representationFrPages
      ? `Représentation française GLM : ${representationFrPages}.`
      : undefined,
  };
}

function entierPositif(valeur: number) {
  return Math.max(0, Math.floor(Number.isFinite(valeur) ? valeur : 0));
}

function verifierDe(valeur: number, faces: number) {
  if (!Number.isInteger(valeur) || valeur < 1 || valeur > faces) {
    throw new Error(`Le dé doit être un entier compris entre 1 et ${faces}.`);
  }
}

function verifierD66(valeur: number) {
  if (!Number.isInteger(valeur)) throw new Error('Le D66 doit être un entier.');
  const dizaines = Math.floor(valeur / 10);
  const unites = valeur % 10;
  verifierDe(dizaines, 6);
  verifierDe(unites, 6);
}

function verifierTotal2D6(valeur: number) {
  if (!Number.isInteger(valeur) || valeur < 2 || valeur > 12) {
    throw new Error('Le résultat de 2D6 doit être compris entre 2 et 12.');
  }
}
