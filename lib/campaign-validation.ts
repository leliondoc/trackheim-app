import type { EtatCampagne } from '@/lib/mordheim-data';

export const TAILLE_MAX_PAYLOAD_CAMPAGNE = 512 * 1024;

const IDENTIFIANT_CAMPAGNE = /^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$/;
const IDENTIFIANT_TECHNIQUE = /^[a-z0-9](?:[a-z0-9._-]{0,126}[a-z0-9])?$/;
const DATE_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const PROFONDEUR_JSON_MAXIMALE = 24;
const NOEUDS_JSON_MAXIMUM = 50_000;

type ValidationCampagne =
  | { ok: true; campagne: EtatCampagne }
  | { ok: false; erreur: string };

type ObjetJson = Record<string, unknown>;

export function estIdentifiantCampagneValide(
  valeur: unknown,
): valeur is string {
  return typeof valeur === 'string' && IDENTIFIANT_CAMPAGNE.test(valeur);
}

export function estRevisionValide(valeur: unknown): valeur is number {
  return Number.isSafeInteger(valeur) && Number(valeur) >= 0;
}

/**
 * Vérifie la forme persistée de la campagne v3 sans réinterpréter les règles du
 * jeu. Les clés supplémentaires restent admises pour préserver les données lors
 * d'une évolution compatible du client.
 */
export function validerCampagneV3(valeur: unknown): ValidationCampagne {
  const erreurComplexite = validerComplexiteJson(valeur);
  if (erreurComplexite) return echec(erreurComplexite);
  if (!estObjet(valeur)) return echec('La campagne doit être un objet JSON.');
  if (valeur.version !== 3) {
    return echec('La campagne doit utiliser la version 3 du format.');
  }
  if (!estRevisionValide(valeur.revision)) {
    return echec(
      'La révision de la campagne doit être un entier positif ou nul.',
    );
  }
  if (!estIdentifiantTechnique(valeur.rulesetId)) {
    return echec("L'identifiant du jeu de règles est invalide.");
  }
  if (!estTexte(valeur.nomCampagne, 1, 160)) {
    return echec('Le nom de la campagne est invalide.');
  }
  if (!estTexte(valeur.nomBande, 1, 160)) {
    return echec('Le nom de la bande est invalide.');
  }
  if (valeur.factionId !== 'mercenaires-reiklanders') {
    return echec("La faction de la campagne v3 n'est pas prise en charge.");
  }
  if (valeur.grade !== '1a') {
    return echec("Le grade de la campagne v3 n'est pas pris en charge.");
  }

  for (const [cle, contenu] of [
    ['couronnes', valeur.couronnes],
    ['fragments', valeur.fragments],
    ['numeroBataille', valeur.numeroBataille],
  ] as const) {
    if (!estEntierNaturel(contenu)) {
      return echec(`Le champ « ${cle} » doit être un entier positif ou nul.`);
    }
  }

  if (
    !Array.isArray(valeur.etapesApresBataille) ||
    valeur.etapesApresBataille.length !== 10 ||
    !valeur.etapesApresBataille.every((etape) => typeof etape === 'boolean')
  ) {
    return echec("L'état des dix étapes d'après-bataille est invalide.");
  }

  const erreurCombattants = validerCombattants(valeur.combattants);
  if (erreurCombattants) return echec(erreurCombattants);

  const erreurInventaire = validerCompteur(valeur.inventaire, 'inventaire');
  if (erreurInventaire) return echec(erreurInventaire);

  const erreurBataille = validerBataille(valeur.batailleEnCours);
  if (erreurBataille) return echec(erreurBataille);

  const erreurParties = validerParties(valeur.parties);
  if (erreurParties) return echec(erreurParties);

  const erreurHomebrew = validerHomebrew(valeur.homebrew);
  if (erreurHomebrew) return echec(erreurHomebrew);

  return { ok: true, campagne: valeur as unknown as EtatCampagne };
}

function validerCombattants(valeur: unknown) {
  if (!Array.isArray(valeur) || valeur.length > 200) {
    return 'La liste des combattants est invalide.';
  }

  const identifiants = new Set<string>();
  for (let index = 0; index < valeur.length; index += 1) {
    const combattant = valeur[index];
    const chemin = `combattants[${index}]`;
    if (!estObjet(combattant)) return `${chemin} doit être un objet.`;
    if (!estIdentifiantTechnique(combattant.id)) {
      return `${chemin}.id est invalide.`;
    }
    if (identifiants.has(combattant.id)) {
      return `L'identifiant de combattant « ${combattant.id} » est dupliqué.`;
    }
    identifiants.add(combattant.id);

    if (!estTexte(combattant.nom, 1, 160)) return `${chemin}.nom est invalide.`;
    if (!estIdentifiantTechnique(combattant.profilId)) {
      return `${chemin}.profilId est invalide.`;
    }
    if (!estEntierNaturel(combattant.experience)) {
      return `${chemin}.experience est invalide.`;
    }
    if (!['Prêt', 'Blessé', 'Absent'].includes(String(combattant.statut))) {
      return `${chemin}.statut est invalide.`;
    }

    const erreurStatistiques = validerStatistiques(
      combattant.statistiques,
      `${chemin}.statistiques`,
    );
    if (erreurStatistiques) return erreurStatistiques;

    const erreurEquipement = validerListeTextes(
      combattant.equipementIds,
      `${chemin}.equipementIds`,
      100,
      128,
      true,
    );
    if (erreurEquipement) return erreurEquipement;
    if (!estTexte(combattant.notes, 0, 10_000)) {
      return `${chemin}.notes est invalide.`;
    }
    if (!estEntierNaturel(combattant.quantite) || combattant.quantite < 1) {
      return `${chemin}.quantite est invalide.`;
    }
    if (typeof combattant.chef !== 'boolean')
      return `${chemin}.chef est invalide.`;
    if (!estEntierNaturel(combattant.coutAcquisition)) {
      return `${chemin}.coutAcquisition est invalide.`;
    }
    if (
      combattant.coutAcquisitionTotal !== undefined &&
      !estEntierNaturel(combattant.coutAcquisitionTotal)
    ) {
      return `${chemin}.coutAcquisitionTotal est invalide.`;
    }

    for (const [cle, contenu] of [
      ['competences', combattant.competences],
      ['blessures', combattant.blessures],
      ['progressions', combattant.progressions],
    ] as const) {
      const erreur = validerListeTextes(contenu, `${chemin}.${cle}`, 100, 500);
      if (erreur) return erreur;
    }

    if (!estEntierNaturel(combattant.partiesManquees)) {
      return `${chemin}.partiesManquees est invalide.`;
    }
  }

  return null;
}

function validerStatistiques(valeur: unknown, chemin: string) {
  if (!estObjet(valeur)) return `${chemin} doit être un objet.`;
  const cles = [
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
  for (const cle of cles) {
    if (!estEntierNaturel(valeur[cle])) return `${chemin}.${cle} est invalide.`;
  }
  return null;
}

function validerParties(valeur: unknown) {
  if (!Array.isArray(valeur) || valeur.length > 2_000) {
    return "L'historique des parties est invalide.";
  }
  for (let index = 0; index < valeur.length; index += 1) {
    const partie = valeur[index];
    const chemin = `parties[${index}]`;
    if (!estObjet(partie)) return `${chemin} doit être un objet.`;
    if (!estIdentifiantTechnique(partie.id))
      return `${chemin}.id est invalide.`;
    if (!estTexte(partie.scenario, 1, 300))
      return `${chemin}.scenario est invalide.`;
    if (!estTexte(partie.adversaire, 0, 300)) {
      return `${chemin}.adversaire est invalide.`;
    }
    if (!['Victoire', 'Défaite', 'Égalité'].includes(String(partie.resultat))) {
      return `${chemin}.resultat est invalide.`;
    }
    if (!estDateIso(partie.date)) return `${chemin}.date est invalide.`;
    for (const cle of [
      'valeurAvant',
      'valeurAdverse',
      'valeurApres',
      'fragmentsTrouves',
      'revenu',
    ]) {
      if (partie[cle] !== undefined && !estEntierNaturel(partie[cle])) {
        return `${chemin}.${cle} est invalide.`;
      }
    }
    if (partie.notes !== undefined && !estTexte(partie.notes, 0, 10_000)) {
      return `${chemin}.notes est invalide.`;
    }
  }
  return null;
}

function validerBataille(valeur: unknown) {
  if (valeur === null) return null;
  if (!estObjet(valeur))
    return 'La bataille en cours doit être un objet ou null.';
  if (!estIdentifiantTechnique(valeur.id))
    return 'batailleEnCours.id est invalide.';
  if (!estEntierNaturel(valeur.numero))
    return 'batailleEnCours.numero est invalide.';
  if (!estTexte(valeur.scenario, 1, 300))
    return 'batailleEnCours.scenario est invalide.';
  if (!estTexte(valeur.adversaire, 0, 300)) {
    return 'batailleEnCours.adversaire est invalide.';
  }
  if (!['Victoire', 'Défaite', 'Égalité'].includes(String(valeur.resultat))) {
    return 'batailleEnCours.resultat est invalide.';
  }
  if (!estDateIso(valeur.date)) return 'batailleEnCours.date est invalide.';
  if (!estEntierNaturel(valeur.valeurAvant)) {
    return 'batailleEnCours.valeurAvant est invalide.';
  }
  if (!estEntierNaturel(valeur.valeurAdverse)) {
    return 'batailleEnCours.valeurAdverse est invalide.';
  }
  if (
    valeur.successeurChefId !== null &&
    !estIdentifiantTechnique(valeur.successeurChefId)
  ) {
    return 'batailleEnCours.successeurChefId est invalide.';
  }
  if (!estEntierNaturel(valeur.etapeActive) || valeur.etapeActive > 10) {
    return 'batailleEnCours.etapeActive est invalide.';
  }
  if (
    !estObjet(valeur.participants) ||
    Object.keys(valeur.participants).length > 200
  ) {
    return 'batailleEnCours.participants est invalide.';
  }
  for (const [combattantId, suivi] of Object.entries(valeur.participants)) {
    const chemin = `batailleEnCours.participants.${combattantId}`;
    if (!estIdentifiantTechnique(combattantId) || !estObjet(suivi)) {
      return `${chemin} est invalide.`;
    }
    if (suivi.combattantId !== combattantId) {
      return `${chemin}.combattantId ne correspond pas à sa clé.`;
    }
    for (const cle of [
      'horsCombat',
      'ennemisHorsCombat',
      'experienceScenario',
      'experienceManuelle',
    ]) {
      if (!estEntierNaturel(suivi[cle]))
        return `${chemin}.${cle} est invalide.`;
    }
    const erreurJets = validerListeEntiers(
      suivi.jetsBlessure,
      `${chemin}.jetsBlessure`,
      100,
    );
    if (erreurJets) return erreurJets;
    if (typeof suivi.blessureResolue !== 'boolean') {
      return `${chemin}.blessureResolue est invalide.`;
    }
    if (!estTexte(suivi.blessureNote, 0, 10_000)) {
      return `${chemin}.blessureNote est invalide.`;
    }
    if (typeof suivi.experienceAppliquee !== 'boolean') {
      return `${chemin}.experienceAppliquee est invalide.`;
    }
    if (!estTexte(suivi.progressionsNote, 0, 10_000)) {
      return `${chemin}.progressionsNote est invalide.`;
    }
  }

  if (!estObjet(valeur.exploration))
    return 'batailleEnCours.exploration est invalide.';
  const erreurLancers = validerListeDes(
    valeur.exploration.lancers,
    'batailleEnCours.exploration.lancers',
    100,
  );
  if (erreurLancers) return erreurLancers;
  const erreurConserves = validerListeDes(
    valeur.exploration.desConserves,
    'batailleEnCours.exploration.desConserves',
    6,
  );
  if (erreurConserves) return erreurConserves;
  if (!estEntierNaturel(valeur.exploration.fragmentsTrouves)) {
    return 'batailleEnCours.exploration.fragmentsTrouves est invalide.';
  }
  if (typeof valeur.exploration.appliquee !== 'boolean') {
    return 'batailleEnCours.exploration.appliquee est invalide.';
  }
  if (!estTexte(valeur.exploration.noteResultat, 0, 10_000)) {
    return 'batailleEnCours.exploration.noteResultat est invalide.';
  }

  if (!estObjet(valeur.vente)) return 'batailleEnCours.vente est invalide.';
  if (!estEntierNaturel(valeur.vente.fragmentsVendus)) {
    return 'batailleEnCours.vente.fragmentsVendus est invalide.';
  }
  if (!estEntierNaturel(valeur.vente.revenu)) {
    return 'batailleEnCours.vente.revenu est invalide.';
  }
  if (typeof valeur.vente.appliquee !== 'boolean') {
    return 'batailleEnCours.vente.appliquee est invalide.';
  }

  if (!estObjet(valeur.veterans))
    return 'batailleEnCours.veterans est invalide.';
  for (const cle of ['de1', 'de2']) {
    const de = valeur.veterans[cle];
    if (de !== null && !estDe(de))
      return `batailleEnCours.veterans.${cle} est invalide.`;
  }
  if (
    valeur.veterans.disponibilite !== null &&
    !estEntierNaturel(valeur.veterans.disponibilite)
  ) {
    return 'batailleEnCours.veterans.disponibilite est invalide.';
  }
  if (
    valeur.veterans.experienceDepensee !== undefined &&
    !estEntierNaturel(valeur.veterans.experienceDepensee)
  ) {
    return 'batailleEnCours.veterans.experienceDepensee est invalide.';
  }

  if (!Array.isArray(valeur.jetsRarete) || valeur.jetsRarete.length > 200) {
    return 'batailleEnCours.jetsRarete est invalide.';
  }
  const idsJets = new Set<string>();
  for (let index = 0; index < valeur.jetsRarete.length; index += 1) {
    const jet = valeur.jetsRarete[index];
    const chemin = `batailleEnCours.jetsRarete[${index}]`;
    if (!estObjet(jet)) return `${chemin} doit être un objet.`;
    if (!estIdentifiantTechnique(jet.id)) return `${chemin}.id est invalide.`;
    if (idsJets.has(jet.id))
      return `L'identifiant de jet « ${jet.id} » est dupliqué.`;
    idsJets.add(jet.id);
    if (!estIdentifiantTechnique(jet.heroId))
      return `${chemin}.heroId est invalide.`;
    if (!estIdentifiantTechnique(jet.equipementId)) {
      return `${chemin}.equipementId est invalide.`;
    }
    if (!estDe(jet.de1) || !estDe(jet.de2))
      return `${chemin}.dés sont invalides.`;
    if (typeof jet.reussi !== 'boolean')
      return `${chemin}.reussi est invalide.`;
    if (typeof jet.achete !== 'boolean')
      return `${chemin}.achete est invalide.`;
    if (!estEntierNaturel(jet.prix)) return `${chemin}.prix est invalide.`;
  }
  if (!estTexte(valeur.personnagesSpeciaux, 0, 10_000)) {
    return 'batailleEnCours.personnagesSpeciaux est invalide.';
  }
  if (!estTexte(valeur.notes, 0, 10_000))
    return 'batailleEnCours.notes est invalide.';
  return null;
}

function validerHomebrew(valeur: unknown) {
  if (!estObjet(valeur)) return 'Les réglages homebrew doivent être un objet.';
  if (typeof valeur.actifs !== 'boolean')
    return 'homebrew.actifs est invalide.';
  if (!estTexte(valeur.nomSet, 0, 160)) return 'homebrew.nomSet est invalide.';
  if (!estTexte(valeur.description, 0, 10_000)) {
    return 'homebrew.description est invalide.';
  }
  const erreurRecrues = validerCompteur(
    valeur.coutsRecrues,
    'homebrew.coutsRecrues',
  );
  if (erreurRecrues) return erreurRecrues;
  const erreurEquipements = validerCompteur(
    valeur.coutsEquipements,
    'homebrew.coutsEquipements',
  );
  if (erreurEquipements) return erreurEquipements;
  if (!Array.isArray(valeur.regles) || valeur.regles.length > 500) {
    return 'homebrew.regles est invalide.';
  }
  for (let index = 0; index < valeur.regles.length; index += 1) {
    const regle = valeur.regles[index];
    const chemin = `homebrew.regles[${index}]`;
    if (!estObjet(regle)) return `${chemin} doit être un objet.`;
    if (!estIdentifiantTechnique(regle.id)) return `${chemin}.id est invalide.`;
    if (!estTexte(regle.titre, 1, 300)) return `${chemin}.titre est invalide.`;
    if (
      !['Bande', 'Campagne', 'Combat', 'Après-bataille'].includes(
        String(regle.portee),
      )
    ) {
      return `${chemin}.portee est invalide.`;
    }
    if (!estTexte(regle.description, 0, 10_000)) {
      return `${chemin}.description est invalide.`;
    }
    if (typeof regle.active !== 'boolean')
      return `${chemin}.active est invalide.`;
  }
  return null;
}

function validerCompteur(valeur: unknown, chemin: string) {
  if (!estObjet(valeur) || Object.keys(valeur).length > 2_000) {
    return `${chemin} doit être un objet de compteurs.`;
  }
  for (const [cle, contenu] of Object.entries(valeur)) {
    if (!estIdentifiantTechnique(cle) || !estEntierNaturel(contenu)) {
      return `${chemin}.${cle} est invalide.`;
    }
  }
  return null;
}

function validerListeTextes(
  valeur: unknown,
  chemin: string,
  tailleMaximale: number,
  longueurMaximale: number,
  identifiants = false,
) {
  if (!Array.isArray(valeur) || valeur.length > tailleMaximale) {
    return `${chemin} est invalide.`;
  }
  for (const contenu of valeur) {
    const valide = identifiants
      ? estIdentifiantTechnique(contenu)
      : estTexte(contenu, 0, longueurMaximale);
    if (!valide) return `${chemin} contient une valeur invalide.`;
  }
  return null;
}

function validerListeEntiers(
  valeur: unknown,
  chemin: string,
  tailleMaximale: number,
) {
  if (
    !Array.isArray(valeur) ||
    valeur.length > tailleMaximale ||
    !valeur.every(estEntierNaturel)
  ) {
    return `${chemin} est invalide.`;
  }
  return null;
}

function validerListeDes(
  valeur: unknown,
  chemin: string,
  tailleMaximale: number,
) {
  if (
    !Array.isArray(valeur) ||
    valeur.length > tailleMaximale ||
    !valeur.every(estDe)
  ) {
    return `${chemin} est invalide.`;
  }
  return null;
}

function estObjet(valeur: unknown): valeur is ObjetJson {
  return (
    typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)
  );
}

function validerComplexiteJson(valeur: unknown) {
  const aVisiter: Array<{ valeur: unknown; profondeur: number }> = [
    { valeur, profondeur: 0 },
  ];
  let noeuds = 0;

  while (aVisiter.length > 0) {
    const courant = aVisiter.pop();
    if (!courant) break;
    noeuds += 1;
    if (noeuds > NOEUDS_JSON_MAXIMUM) {
      return 'La campagne contient trop de valeurs JSON.';
    }
    if (courant.profondeur > PROFONDEUR_JSON_MAXIMALE) {
      return 'La campagne contient une imbrication JSON trop profonde.';
    }
    if (Array.isArray(courant.valeur)) {
      for (const contenu of courant.valeur) {
        aVisiter.push({ valeur: contenu, profondeur: courant.profondeur + 1 });
      }
    } else if (estObjet(courant.valeur)) {
      for (const contenu of Object.values(courant.valeur)) {
        aVisiter.push({ valeur: contenu, profondeur: courant.profondeur + 1 });
      }
    }
  }
  return null;
}

function estDateIso(valeur: unknown): valeur is string {
  if (typeof valeur !== 'string') return false;
  const correspondance = DATE_ISO.exec(valeur);
  if (!correspondance) return false;
  const annee = Number(correspondance[1]);
  const mois = Number(correspondance[2]);
  const jour = Number(correspondance[3]);
  const date = new Date(Date.UTC(annee, mois - 1, jour));
  return (
    date.getUTCFullYear() === annee &&
    date.getUTCMonth() === mois - 1 &&
    date.getUTCDate() === jour
  );
}

function estIdentifiantTechnique(valeur: unknown): valeur is string {
  return typeof valeur === 'string' && IDENTIFIANT_TECHNIQUE.test(valeur);
}

function estTexte(
  valeur: unknown,
  minimum: number,
  maximum: number,
): valeur is string {
  return (
    typeof valeur === 'string' &&
    valeur.length >= minimum &&
    valeur.length <= maximum &&
    !valeur.includes('\u0000')
  );
}

function estEntierNaturel(valeur: unknown): valeur is number {
  return Number.isSafeInteger(valeur) && Number(valeur) >= 0;
}

function estDe(valeur: unknown): valeur is number {
  return Number.isInteger(valeur) && Number(valeur) >= 1 && Number(valeur) <= 6;
}

function echec(erreur: string): ValidationCampagne {
  return { ok: false, erreur };
}
