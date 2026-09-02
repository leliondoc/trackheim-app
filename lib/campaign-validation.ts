import {
  bandesBibliotheque,
  definitionsBandes,
  equipements,
  equipementAutorise,
  profils,
  quantiteMaxEquipement,
  type EtatCampagne,
  type FactionId,
} from './mordheim-data.ts';
import { rulesetGlmStrict, rulesetOfficiel } from './mordheim-rules.ts';

export const TAILLE_MAX_PAYLOAD_CAMPAGNE = 512 * 1024;

const IDENTIFIANT_CAMPAGNE = /^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$/;
const IDENTIFIANT_TECHNIQUE = /^[a-z0-9](?:[a-z0-9._-]{0,126}[a-z0-9])?$/;
const DATE_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const PROFONDEUR_JSON_MAXIMALE = 24;
const NOEUDS_JSON_MAXIMUM = 50_000;
const IDS_PROFILS = new Set(profils.map((profil) => profil.id));
const IDS_FACTIONS = new Set(
  definitionsBandes.map((definition) => definition.id),
);
const IDS_EQUIPEMENTS = new Set(equipements.map((equipement) => equipement.id));
const IDS_RULESETS = new Set([rulesetOfficiel.id, rulesetGlmStrict.id]);

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
 * Vérifie strictement la forme persistée de la campagne v4 sans réinterpréter
 * les règles du jeu.
 */
export function validerCampagneV4(valeur: unknown): ValidationCampagne {
  const erreurComplexite = validerComplexiteJson(valeur);
  if (erreurComplexite) return echec(erreurComplexite);
  if (!estObjet(valeur)) return echec('La campagne doit être un objet JSON.');
  if (valeur.version !== 4) {
    return echec('La campagne doit utiliser la version 4 du format.');
  }
  if (!estRevisionValide(valeur.revision)) {
    return echec(
      'La révision de la campagne doit être un entier positif ou nul.',
    );
  }
  if (
    typeof valeur.rulesetId !== 'string' ||
    !IDS_RULESETS.has(valeur.rulesetId)
  ) {
    return echec("Le jeu de règles de la campagne n'est pas pris en charge.");
  }
  if (!estTexte(valeur.nomCampagne, 1, 160)) {
    return echec('Le nom de la campagne est invalide.');
  }
  if (!estTexte(valeur.nomBande, 1, 160)) {
    return echec('Le nom de la bande est invalide.');
  }
  if (typeof valeur.campagneActive !== 'boolean') {
    return echec('L’état du mode campagne est invalide.');
  }
  if (
    typeof valeur.factionId !== 'string' ||
    !IDS_FACTIONS.has(valeur.factionId as FactionId)
  ) {
    return echec("La faction de la campagne v4 n'est pas prise en charge.");
  }
  const bandeCatalogue = bandesBibliotheque.find(
    (bande) => bande.slug === valeur.factionId,
  );
  if (!bandeCatalogue || valeur.grade !== bandeCatalogue.grade) {
    return echec('Le grade de la campagne ne correspond pas à sa faction.');
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

  const definition = definitionsBandes.find(
    (item) => item.id === valeur.factionId,
  )!;
  const erreurCombattants = validerCombattants(
    valeur.combattants,
    new Set(definition.profils.map((profil) => profil.id)),
  );
  if (erreurCombattants) return echec(erreurCombattants);
  const erreurMetier = validerReglesMetier(valeur, definition);
  if (erreurMetier) return echec(erreurMetier);
  const combattantsParId = new Map(
    (valeur.combattants as ObjetJson[]).map((combattant) => [
      String(combattant.id),
      combattant,
    ]),
  );
  const erreurInventaire = validerCompteur(
    valeur.inventaire,
    'inventaire',
    IDS_EQUIPEMENTS,
  );
  if (erreurInventaire) return echec(erreurInventaire);

  const erreurBataille = validerBataille(
    valeur.batailleEnCours,
    combattantsParId,
  );
  if (erreurBataille) return echec(erreurBataille);

  const erreurParties = validerParties(valeur.parties);
  if (erreurParties) return echec(erreurParties);

  const erreurHomebrew = validerHomebrew(valeur.homebrew);
  if (erreurHomebrew) return echec(erreurHomebrew);

  return { ok: true, campagne: valeur as unknown as EtatCampagne };
}

function validerReglesMetier(
  campagne: ObjetJson,
  definition: (typeof definitionsBandes)[number],
) {
  const combattants = campagne.combattants as ObjetJson[];
  const effectif = combattants.reduce(
    (total, combattant) => total + Number(combattant.quantite),
    0,
  );
  if (
    definition.effectifMaximum !== null &&
    effectif > definition.effectifMaximum
  ) {
    return `L’effectif dépasse la limite de ${definition.effectifMaximum} guerriers.`;
  }

  const chefs = combattants.filter((combattant) => combattant.chef === true);
  if (chefs.length > 1) return 'Une bande ne peut avoir qu’un seul Chef.';
  if (
    campagne.campagneActive === true &&
    campagne.batailleEnCours === null &&
    chefs.length !== 1
  ) {
    return 'Une campagne active doit avoir exactement un Chef.';
  }

  for (const profil of definition.profils) {
    const quantite = combattants
      .filter((combattant) => combattant.profilId === profil.id)
      .reduce((total, combattant) => total + Number(combattant.quantite), 0);
    if (profil.maximum !== null && quantite > profil.maximum) {
      return `${String(profil.nom)} dépasse sa limite de ${String(profil.maximum)}.`;
    }
  }

  for (const combattant of combattants) {
    const profil = definition.profils.find(
      (candidat) => candidat.id === combattant.profilId,
    )!;
    const quantite = Number(combattant.quantite);
    const estHeros =
      profil.categorie === 'Héros' || combattant.herosPromu === true;
    if (estHeros && quantite !== 1) {
      return `${String(combattant.nom)} est un Héros et ne peut pas représenter un groupe.`;
    }
    if (combattant.chef === true && !estHeros) {
      return `${String(combattant.nom)} ne peut pas être Chef sans être un Héros.`;
    }

    const maximums =
      profil.maximums ?? maximumsCompatiblesAvecLeProfil(profil.statistiques);
    const statistiques = combattant.statistiques as ObjetJson;
    for (const cle of Object.keys(maximums) as Array<keyof typeof maximums>) {
      if (Number(statistiques[cle]) > maximums[cle]) {
        return `${String(combattant.nom)} dépasse son maximum de ${String(cle)}.`;
      }
    }

    const ids = combattant.equipementIds as string[];
    let armesCorpsACorps = 0;
    let armesDeTir = 0;
    const compteurs = new Map<string, number>();
    for (const id of ids) {
      const equipement = equipements.find((item) => item.id === id)!;
      if (!equipementAutorise(profil, equipement, estHeros)) {
        return `${equipement.nom} n’est pas autorisé pour ${String(combattant.nom)}.`;
      }
      compteurs.set(id, (compteurs.get(id) ?? 0) + 1);
      if (equipement.categorie === 'Corps à corps') armesCorpsACorps += 1;
      if (equipement.categorie === 'Tir') armesDeTir += 1;
    }
    if (armesCorpsACorps > 2 || armesDeTir > 2) {
      return `${String(combattant.nom)} dépasse la limite de deux armes de corps à corps ou de tir.`;
    }
    for (const [id, nombre] of compteurs) {
      const equipement = equipements.find((item) => item.id === id)!;
      if (nombre > quantiteMaxEquipement(equipement, profil)) {
        return `${String(combattant.nom)} porte trop d’exemplaires de ${equipement.nom}.`;
      }
    }
    if (
      Number(combattant.coutAcquisitionTotal) <
      Number(combattant.coutAcquisition) * quantite
    ) {
      return `${String(combattant.nom)} possède un coût d’acquisition incohérent.`;
    }
  }
  return null;
}

const maximumsHumains = {
  mouvement: 4,
  capaciteCombat: 6,
  capaciteTir: 6,
  force: 4,
  endurance: 4,
  pointsVie: 3,
  initiative: 6,
  attaques: 4,
  commandement: 9,
};

function maximumsCompatiblesAvecLeProfil(
  statistiques: (typeof profils)[number]['statistiques'],
) {
  return Object.fromEntries(
    Object.entries(maximumsHumains).map(([cle, maximum]) => [
      cle,
      Math.max(maximum, statistiques[cle as keyof typeof statistiques]),
    ]),
  ) as typeof maximumsHumains;
}

function validerCombattants(valeur: unknown, idsProfilsAutorises: Set<string>) {
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
    if (
      !estIdentifiantTechnique(combattant.profilId) ||
      !idsProfilsAutorises.has(combattant.profilId)
    ) {
      return `${chemin}.profilId ne correspond à aucun profil connu.`;
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
    const erreurStatistiquesSpeciales = validerStatistiquesSpeciales(
      combattant.statistiquesSpeciales,
      `${chemin}.statistiquesSpeciales`,
    );
    if (erreurStatistiquesSpeciales) return erreurStatistiquesSpeciales;

    if (typeof combattant.dagueDeBase !== 'boolean') {
      return `${chemin}.dagueDeBase est invalide.`;
    }
    if (combattant.optionsRegles !== undefined) {
      if (!estObjet(combattant.optionsRegles)) {
        return `${chemin}.optionsRegles est invalide.`;
      }
      const clesOptions = Object.keys(combattant.optionsRegles);
      if (clesOptions.some((cle) => cle !== 'marqueChaos')) {
        return `${chemin}.optionsRegles contient une option inconnue.`;
      }
      if (
        combattant.optionsRegles.marqueChaos !== undefined &&
        (typeof combattant.optionsRegles.marqueChaos !== 'string' ||
          ![
            'Shornaal',
            'Tchar',
            'Onogal',
            'Chaos Universel',
            'Arkhar',
          ].includes(combattant.optionsRegles.marqueChaos))
      ) {
        return `${chemin}.optionsRegles.marqueChaos est invalide.`;
      }
    }
    if (
      combattant.profilId === 'ref-maraudeurs-du-chaos-devin' &&
      (!estObjet(combattant.optionsRegles) ||
        combattant.optionsRegles.marqueChaos === undefined)
    ) {
      return `${chemin}.optionsRegles.marqueChaos est obligatoire pour le Devin.`;
    }
    if (
      combattant.profilId !== 'ref-maraudeurs-du-chaos-devin' &&
      estObjet(combattant.optionsRegles) &&
      combattant.optionsRegles.marqueChaos !== undefined
    ) {
      return `${chemin}.optionsRegles.marqueChaos est réservée au Devin.`;
    }

    const erreurEquipement = validerListeTextes(
      combattant.equipementIds,
      `${chemin}.equipementIds`,
      100,
      128,
      true,
    );
    if (erreurEquipement) return erreurEquipement;
    if (
      !(combattant.equipementIds as string[]).every((id) =>
        IDS_EQUIPEMENTS.has(id),
      )
    ) {
      return `${chemin}.equipementIds contient un équipement inconnu.`;
    }
    if (!estTexte(combattant.notes, 0, 10_000)) {
      return `${chemin}.notes est invalide.`;
    }
    if (!estEntierNaturel(combattant.quantite) || combattant.quantite < 1) {
      return `${chemin}.quantite est invalide.`;
    }
    if (typeof combattant.chef !== 'boolean')
      return `${chemin}.chef est invalide.`;
    if (
      combattant.herosPromu !== undefined &&
      typeof combattant.herosPromu !== 'boolean'
    ) {
      return `${chemin}.herosPromu est invalide.`;
    }
    if (combattant.competencesDisponiblesPromu !== undefined) {
      const tables = combattant.competencesDisponiblesPromu;
      const autorisees = new Set([
        'Combat',
        'Tir',
        'Érudition',
        'Force',
        'Vitesse',
        'Spécial',
      ]);
      if (
        !Array.isArray(tables) ||
        tables.length !== 2 ||
        new Set(tables).size !== 2 ||
        !tables.every((table) => autorisees.has(String(table)))
      ) {
        return `${chemin}.competencesDisponiblesPromu est invalide.`;
      }
    }
    if (!estEntierNaturel(combattant.coutAcquisition)) {
      return `${chemin}.coutAcquisition est invalide.`;
    }
    if (!estEntierNaturel(combattant.coutAcquisitionTotal)) {
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

function validerStatistiquesSpeciales(valeur: unknown, chemin: string) {
  if (valeur === undefined) return null;
  if (!estObjet(valeur)) return `${chemin} doit être un objet.`;
  const clesAutorisees = new Set([
    'mouvement',
    'capaciteCombat',
    'capaciteTir',
    'force',
    'endurance',
    'pointsVie',
    'initiative',
    'attaques',
    'commandement',
  ]);
  for (const [cle, contenu] of Object.entries(valeur)) {
    if (!clesAutorisees.has(cle) || !estTexte(contenu, 1, 16)) {
      return `${chemin}.${cle} est invalide.`;
    }
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

function validerBataille(
  valeur: unknown,
  combattantsParId: Map<string, ObjetJson>,
) {
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
  if (
    valeur.resultat !== null &&
    (typeof valeur.resultat !== 'string' ||
      !['Victoire', 'Défaite', 'Égalité'].includes(valeur.resultat))
  ) {
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
    (!estIdentifiantTechnique(valeur.successeurChefId) ||
      !combattantsParId.has(valeur.successeurChefId))
  ) {
    return 'batailleEnCours.successeurChefId est invalide.';
  }
  if (!estEntierNaturel(valeur.etapeActive) || valeur.etapeActive > 10) {
    return 'batailleEnCours.etapeActive est invalide.';
  }
  if (
    valeur.tour !== undefined &&
    (!estEntierNaturel(valeur.tour) || valeur.tour < 1 || valeur.tour > 999)
  ) {
    return 'batailleEnCours.tour est invalide.';
  }
  if (
    valeur.phase !== undefined &&
    (typeof valeur.phase !== 'string' ||
      !['Mouvement', 'Tir', 'Corps à corps', 'Ralliement'].includes(
        valeur.phase,
      ))
  ) {
    return 'batailleEnCours.phase est invalide.';
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
    if (
      !estEntierNaturel(suivi.effectifInitial) ||
      suivi.effectifInitial < 1 ||
      suivi.effectifInitial > 200
    ) {
      return `${chemin}.effectifInitial est invalide.`;
    }
    if (
      !estEntierNaturel(suivi.pointsVieMaximumInitial) ||
      suivi.pointsVieMaximumInitial < 1 ||
      suivi.pointsVieMaximumInitial > 1_000
    ) {
      return `${chemin}.pointsVieMaximumInitial est invalide.`;
    }
    if (
      !Array.isArray(suivi.figurinesTable) ||
      suivi.figurinesTable.length !== suivi.effectifInitial
    ) {
      return `${chemin}.figurinesTable ne correspond pas à l’effectif engagé.`;
    }
    let horsCombatCalcules = 0;
    for (const [index, figurine] of suivi.figurinesTable.entries()) {
      const cheminFigurine = `${chemin}.figurinesTable.${index}`;
      if (
        !estObjet(figurine) ||
        typeof figurine.etatTable !== 'string' ||
        !['Debout', 'À terre', 'Sonné', 'Hors de combat'].includes(
          figurine.etatTable,
        ) ||
        !estEntierNaturel(figurine.pointsVieActuels) ||
        figurine.pointsVieActuels > suivi.pointsVieMaximumInitial
      ) {
        return `${cheminFigurine} est invalide.`;
      }
      const horsCombat = figurine.etatTable === 'Hors de combat';
      if (horsCombat !== (figurine.pointsVieActuels === 0)) {
        return `${cheminFigurine} contient un état et des Points de Vie incohérents.`;
      }
      if (horsCombat) horsCombatCalcules += 1;
    }
    if (
      !estEntierNaturel(suivi.horsCombat) ||
      suivi.horsCombat !== horsCombatCalcules
    ) {
      return `${chemin}.horsCombat ne correspond pas aux figurines suivies.`;
    }
    if (
      suivi.notesTable !== undefined &&
      !estTexte(suivi.notesTable, 0, 2_000)
    ) {
      return `${chemin}.notesTable est invalide.`;
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
    if (
      Array.isArray(suivi.jetsBlessure) &&
      suivi.jetsBlessure.length > suivi.horsCombat
    ) {
      return `${chemin}.jetsBlessure contient trop de jets.`;
    }
    if (typeof suivi.blessureResolue !== 'boolean') {
      return `${chemin}.blessureResolue est invalide.`;
    }
    if (!estTexte(suivi.blessureNote, 0, 10_000)) {
      return `${chemin}.blessureNote est invalide.`;
    }
    if (suivi.resolutionBlessure !== undefined) {
      if (!estObjet(suivi.resolutionBlessure)) {
        return `${chemin}.resolutionBlessure est invalide.`;
      }
      if (
        suivi.resolutionBlessure.version !== 1 ||
        (suivi.resolutionBlessure.jetSecondaire !== null &&
          !estEntierNaturel(suivi.resolutionBlessure.jetSecondaire)) ||
        !estTexte(suivi.resolutionBlessure.note, 0, 10_000) ||
        (suivi.resolutionBlessure.decision !== undefined &&
          !estTexte(suivi.resolutionBlessure.decision, 1, 80)) ||
        (suivi.resolutionBlessure.montant !== undefined &&
          suivi.resolutionBlessure.montant !== null &&
          !estEntierNaturel(suivi.resolutionBlessure.montant)) ||
        (suivi.resolutionBlessure.blessuresMultiples !== undefined &&
          !validerBlessuresMultiples(
            suivi.resolutionBlessure.blessuresMultiples,
          ))
      ) {
        return `${chemin}.resolutionBlessure est invalide.`;
      }
    }
    if (typeof suivi.experienceAppliquee !== 'boolean') {
      return `${chemin}.experienceAppliquee est invalide.`;
    }
    if (
      !estObjet(suivi.progressions) ||
      suivi.progressions.version !== 1 ||
      !Array.isArray(suivi.progressions.saisies) ||
      suivi.progressions.saisies.length > 100
    ) {
      return `${chemin}.progressions est invalide.`;
    }
    for (const saisie of suivi.progressions.saisies) {
      if (
        !estObjet(saisie) ||
        (saisie.jet !== null && !estEntierNaturel(saisie.jet)) ||
        !estTexte(saisie.decision, 0, 500) ||
        !estTexte(saisie.note, 0, 10_000) ||
        (saisie.tablesPromu !== undefined &&
          (!Array.isArray(saisie.tablesPromu) ||
            saisie.tablesPromu.length !== 2 ||
            new Set(saisie.tablesPromu).size !== 2 ||
            !saisie.tablesPromu.every((table) =>
              ['Combat', 'Tir', 'Érudition', 'Force', 'Vitesse'].includes(
                String(table),
              ),
            ))) ||
        (saisie.jetPromu !== undefined &&
          saisie.jetPromu !== null &&
          !estEntierNaturel(saisie.jetPromu)) ||
        (saisie.decisionPromu !== undefined &&
          !estTexte(saisie.decisionPromu, 0, 500)) ||
        (saisie.notePromu !== undefined &&
          !estTexte(saisie.notePromu, 0, 10_000)) ||
        (saisie.jetGroupeRestant !== undefined &&
          saisie.jetGroupeRestant !== null &&
          !estEntierNaturel(saisie.jetGroupeRestant)) ||
        (saisie.decisionGroupeRestant !== undefined &&
          !estTexte(saisie.decisionGroupeRestant, 0, 500)) ||
        (saisie.noteGroupeRestant !== undefined &&
          !estTexte(saisie.noteGroupeRestant, 0, 10_000))
      ) {
        return `${chemin}.progressions contient une saisie invalide.`;
      }
    }
  }

  if (
    !estObjet(valeur.affectationsParticipants) ||
    Object.keys(valeur.affectationsParticipants).length > 200
  ) {
    return 'batailleEnCours.affectationsParticipants est invalide.';
  }
  const indicesAttribues = new Map<string, Set<number>>();
  for (const [combattantId, affectation] of Object.entries(
    valeur.affectationsParticipants,
  )) {
    const chemin = `batailleEnCours.affectationsParticipants.${combattantId}`;
    const combattant = combattantsParId.get(combattantId);
    if (
      !estIdentifiantTechnique(combattantId) ||
      !combattant ||
      !estObjet(affectation) ||
      !estIdentifiantTechnique(affectation.participantId) ||
      !Array.isArray(affectation.indicesFigurines) ||
      !estEntierNaturel(combattant.quantite) ||
      affectation.indicesFigurines.length < 1 ||
      affectation.indicesFigurines.length > combattant.quantite ||
      affectation.indicesFigurines.length > 200
    ) {
      return `${chemin} est invalide.`;
    }
    const source = valeur.participants[affectation.participantId];
    if (!estObjet(source)) {
      return `${chemin}.participantId ne correspond à aucun snapshot.`;
    }
    const effectifInitial = source.effectifInitial;
    if (!estEntierNaturel(effectifInitial)) {
      return `${chemin}.participantId désigne un snapshot invalide.`;
    }
    const indicesLocaux = new Set<number>();
    const indicesSource =
      indicesAttribues.get(affectation.participantId) ?? new Set<number>();
    for (const index of affectation.indicesFigurines) {
      if (
        !estEntierNaturel(index) ||
        index >= effectifInitial ||
        indicesLocaux.has(index) ||
        indicesSource.has(index)
      ) {
        return `${chemin}.indicesFigurines contient une attribution invalide ou dupliquée.`;
      }
      indicesLocaux.add(index);
      indicesSource.add(index);
    }
    indicesAttribues.set(affectation.participantId, indicesSource);
  }
  for (const [combattantId, combattant] of combattantsParId) {
    if (valeur.affectationsParticipants[combattantId]) continue;
    const source = valeur.participants[combattantId];
    if (!estObjet(source)) continue;
    void combattant;
    const indicesSource = indicesAttribues.get(combattantId);
    if (indicesSource && indicesSource.size > 0) {
      return `batailleEnCours.participants.${combattantId} chevauche une affectation.`;
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
  if (!estEntierNaturel(valeur.veterans.experienceDepensee)) {
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
    if (
      !estIdentifiantTechnique(jet.heroId) ||
      !combattantsParId.has(jet.heroId)
    )
      return `${chemin}.heroId ne correspond à aucun combattant.`;
    if (
      !estIdentifiantTechnique(jet.equipementId) ||
      !IDS_EQUIPEMENTS.has(jet.equipementId)
    ) {
      return `${chemin}.equipementId ne correspond à aucun équipement connu.`;
    }
    if (!estDe(jet.de1) || !estDe(jet.de2))
      return `${chemin}.dés sont invalides.`;
    if (typeof jet.reussi !== 'boolean')
      return `${chemin}.reussi est invalide.`;
    if (typeof jet.achete !== 'boolean')
      return `${chemin}.achete est invalide.`;
    if (!estEntierNaturel(jet.prix)) return `${chemin}.prix est invalide.`;
  }
  const erreurPersonnel = validerPersonnel(
    valeur.personnel,
    new Set(combattantsParId.keys()),
  );
  if (erreurPersonnel) return erreurPersonnel;
  if (!estTexte(valeur.notes, 0, 10_000))
    return 'batailleEnCours.notes est invalide.';
  return null;
}

function validerBlessuresMultiples(valeur: unknown) {
  if (!Array.isArray(valeur) || valeur.length > 6) return false;
  return valeur.every(
    (entree) =>
      estObjet(entree) &&
      (entree.d66 === null || estEntierNaturel(entree.d66)) &&
      (entree.jetSecondaire === null ||
        estEntierNaturel(entree.jetSecondaire)) &&
      estTexte(entree.note, 0, 10_000) &&
      (entree.decision === undefined || estTexte(entree.decision, 1, 80)),
  );
}

function validerPersonnel(valeur: unknown, idsCombattants: Set<string>) {
  if (
    !estObjet(valeur) ||
    valeur.version !== 1 ||
    typeof valeur.aucun !== 'boolean' ||
    !Array.isArray(valeur.entrees) ||
    valeur.entrees.length > 200
  ) {
    return 'batailleEnCours.personnel est invalide.';
  }
  for (let index = 0; index < valeur.entrees.length; index += 1) {
    const entree = valeur.entrees[index];
    const chemin = `batailleEnCours.personnel.entrees[${index}]`;
    if (!estObjet(entree) || !estIdentifiantTechnique(entree.id)) {
      return `${chemin} est invalide.`;
    }
    if (
      !['Franc-tireur', 'Dramatis Personae', 'Autre'].includes(
        String(entree.type),
      ) ||
      !['Engagé', 'Refusé', 'Indisponible', 'Autre'].includes(
        String(entree.decision),
      )
    ) {
      return `${chemin}.type ou décision est invalide.`;
    }
    if (
      !estTexte(entree.nom, 1, 300) ||
      !estTexte(entree.note, 0, 10_000) ||
      !estEntierNaturel(entree.cout) ||
      typeof entree.coutApplique !== 'boolean'
    ) {
      return `${chemin} contient une valeur invalide.`;
    }
    if (
      entree.heroId !== '' &&
      (!estIdentifiantTechnique(entree.heroId) ||
        !idsCombattants.has(entree.heroId))
    ) {
      return `${chemin}.heroId ne correspond à aucun combattant.`;
    }
    if (
      entree.jetInitiative !== null &&
      (!estEntierNaturel(entree.jetInitiative) || entree.jetInitiative > 6)
    ) {
      return `${chemin}.jetInitiative est invalide.`;
    }
  }
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
    IDS_PROFILS,
  );
  if (erreurRecrues) return erreurRecrues;
  const erreurEquipements = validerCompteur(
    valeur.coutsEquipements,
    'homebrew.coutsEquipements',
    IDS_EQUIPEMENTS,
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

function validerCompteur(
  valeur: unknown,
  chemin: string,
  identifiantsConnus?: Set<string>,
) {
  if (!estObjet(valeur) || Object.keys(valeur).length > 2_000) {
    return `${chemin} doit être un objet de compteurs.`;
  }
  for (const [cle, contenu] of Object.entries(valeur)) {
    if (
      !estIdentifiantTechnique(cle) ||
      !estEntierNaturel(contenu) ||
      (identifiantsConnus && !identifiantsConnus.has(cle))
    ) {
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
