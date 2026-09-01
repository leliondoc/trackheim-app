import {
  etapesApresBataille,
  obtenirProfil,
  type Combattant,
  type EtatCampagne,
} from '../lib/mordheim-data.ts';

export function campagneVideTest(): EtatCampagne {
  return {
    version: 3,
    revision: 0,
    rulesetId: 'mordheim-1999-rules-review-2005-bandes-core',
    nomCampagne: 'Hors campagne',
    nomBande: 'Bande de test',
    campagneActive: false,
    factionId: 'mercenaires-reiklanders',
    grade: '1a',
    couronnes: 500,
    fragments: 0,
    numeroBataille: 0,
    etapesApresBataille: etapesApresBataille.map(() => false),
    combattants: [],
    inventaire: {},
    batailleEnCours: null,
    parties: [],
    homebrew: {
      actifs: false,
      nomSet: 'Règles de test',
      description: '',
      coutsRecrues: {},
      coutsEquipements: {},
      regles: [],
    },
  };
}

export function campagneAvecCapitaineTest(): EtatCampagne {
  const campagne = campagneVideTest();
  const profil = obtenirProfil('capitaine');
  const capitaine: Combattant = {
    id: 'capitaine-test',
    nom: 'Wilhelm Krieger',
    profilId: profil.id,
    experience: profil.experienceInitiale,
    statut: 'Prêt',
    statistiques: structuredClone(profil.statistiques),
    equipementIds: [],
    notes: '',
    quantite: 1,
    chef: true,
    coutAcquisition: profil.cout,
    coutAcquisitionTotal: profil.cout,
    competences: [],
    blessures: [],
    progressions: [],
    partiesManquees: 0,
  };
  return { ...campagne, combattants: [capitaine], couronnes: 440 };
}
