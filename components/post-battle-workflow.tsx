'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Coins,
  Dices,
  Gem,
  PackageOpen,
  Plus,
  ShoppingCart,
  Skull,
  Sparkles,
  Swords,
  Trash2,
  UserRoundSearch,
  Users,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  equipements,
  profilsReiklanders,
  type BatailleEnCours,
  type Combattant,
  type Equipement,
  type EtatCampagne,
  type JetRarete,
  type Partie,
  type Statistiques,
  type SuiviCombattantBataille,
} from '@/lib/mordheim-data';
import {
  calculerBonusChallenger,
  calculerValeurBande,
  calculerVentePierre,
  compterProgressionsFranchies,
  disponibiliteVeterans,
  etapesCampagne,
  jetRareteReussi,
  resoudreBlessureHommeDeMain,
  resoudreExploration,
  trouverBlessureHero,
  trouverProgressionHero,
  trouverProgressionHommeDeMain,
  type Progression,
} from '@/lib/mordheim-rules';

type Props = {
  campagne: EtatCampagne;
  onCampagneChange: (campagne: EtatCampagne) => void;
  valeurBande: number;
  recrutement?: React.ReactNode;
};

type BrouillonBataille = {
  scenario: string;
  adversaire: string;
  resultat: Partie['resultat'];
  date: string;
  valeurAdverse: string;
};

type SaisieProgression = {
  jet: number | null;
  decision: string;
  note: string;
};

type DossierProgressions = {
  version: 1;
  saisies: SaisieProgression[];
};

type ResolutionBlessureStructuree = {
  version: 1;
  jetSecondaire: number | null;
  note: string;
};

type EntreePersonnel = {
  id: string;
  type: 'Franc-tireur' | 'Dramatis Personae' | 'Autre';
  nom: string;
  decision: 'Engagé' | 'Refusé' | 'Indisponible' | 'Autre';
  heroId: string;
  jetInitiative: number | null;
  cout: number;
  coutApplique: boolean;
  note: string;
};

type DossierPersonnel = {
  version: 1;
  aucun: boolean;
  entrees: EntreePersonnel[];
};

type BrouillonRarete = {
  heroId: string;
  equipementId: string;
  de1: string;
  de2: string;
};

const MARQUEUR_PROGRESSIONS = 'TRACKHEIM_PROGRESSIONS_V1:';
const MARQUEUR_BLESSURE = 'TRACKHEIM_BLESSURE_V1:';
const MARQUEUR_PERSONNEL = 'TRACKHEIM_PERSONNEL_V1:';
const CHOIX_AUTRE = '__autre__';

const maximumsHumains: Record<keyof Statistiques, number> = {
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

/**
 * Assistant persistant de la séquence officielle en dix étapes.
 * Les changements irréversibles sont appliqués une seule fois, puis verrouillés.
 */
export function PostBattleWorkflow({
  campagne,
  onCampagneChange,
  valeurBande,
  recrutement,
}: Props) {
  const [creation, setCreation] = useState<BrouillonBataille>(() => ({
    scenario: '',
    adversaire: '',
    resultat: 'Victoire',
    date: new Date().toISOString().slice(0, 10),
    valeurAdverse: '',
  }));
  const [participantsSelectionnes, setParticipantsSelectionnes] = useState<
    string[]
  >(() =>
    campagne.combattants
      .filter(
        (combattant) =>
          combattant.statut !== 'Absent' && combattant.partiesManquees === 0,
      )
      .map((combattant) => combattant.id),
  );
  const [erreur, setErreur] = useState<string | null>(null);
  const [lancersExploration, setLancersExploration] = useState('');
  const [rarete, setRarete] = useState<BrouillonRarete>({
    heroId: '',
    equipementId: '',
    de1: '',
    de2: '',
  });
  const [personnel, setPersonnel] = useState<Omit<EntreePersonnel, 'id'>>({
    type: 'Franc-tireur',
    nom: '',
    decision: 'Engagé',
    heroId: '',
    jetInitiative: null,
    cout: 0,
    coutApplique: false,
    note: '',
  });
  const [allocation, setAllocation] = useState({
    equipementId: '',
    combattantId: '',
  });

  /* Les actions du workflow ne sont rendues que lorsqu'une bataille existe. */
  const bataille = campagne.batailleEnCours as BatailleEnCours;

  const profilsParId = useMemo(
    () => new Map(profilsReiklanders.map((profil) => [profil.id, profil])),
    [],
  );
  const equipementsParId = useMemo(
    () => new Map(equipements.map((equipement) => [equipement.id, equipement])),
    [],
  );

  function publierBataille(
    transformer: (courante: BatailleEnCours) => BatailleEnCours,
    changements: Partial<EtatCampagne> = {},
  ) {
    if (!campagne.batailleEnCours) return;
    onCampagneChange({
      ...campagne,
      ...changements,
      revision: campagne.revision + 1,
      batailleEnCours: transformer(campagne.batailleEnCours),
    });
  }

  function modifierParticipant(
    combattantId: string,
    modification: Partial<SuiviCombattantBataille>,
  ) {
    publierBataille((courante) => ({
      ...courante,
      participants: {
        ...courante.participants,
        [combattantId]: {
          ...courante.participants[combattantId],
          ...modification,
        },
      },
    }));
  }

  function creerBataille() {
    const valeurAdverse = entierDepuisTexte(creation.valeurAdverse);
    if (!creation.scenario.trim() || !creation.adversaire.trim()) {
      setErreur('Le scénario et l’adversaire sont obligatoires.');
      return;
    }
    if (!creation.date || valeurAdverse <= 0) {
      setErreur('Renseignez une date et une valeur de bande adverse valide.');
      return;
    }
    if (participantsSelectionnes.length === 0) {
      setErreur('Sélectionnez au moins un participant.');
      return;
    }
    const participantIndisponible = campagne.combattants.find(
      (combattant) =>
        participantsSelectionnes.includes(combattant.id) &&
        (combattant.statut === 'Absent' || combattant.partiesManquees > 0),
    );
    if (participantIndisponible) {
      setErreur(
        `${participantIndisponible.nom} doit encore manquer ${participantIndisponible.partiesManquees || 1} partie(s).`,
      );
      return;
    }

    const numerosArchives = campagne.parties
      .map((partie) => Number(partie.id.match(/partie-(\d+)/)?.[1] ?? 0))
      .filter(Number.isFinite);
    const numero = Math.max(
      campagne.numeroBataille + 1,
      ...numerosArchives.map((n) => n + 1),
      1,
    );
    const participants = Object.fromEntries(
      participantsSelectionnes.map((combattantId) => [
        combattantId,
        creerSuiviCombattant(combattantId),
      ]),
    );

    const nouvelleBataille: BatailleEnCours = {
      id: crypto.randomUUID(),
      numero,
      scenario: creation.scenario.trim(),
      adversaire: creation.adversaire.trim(),
      resultat: creation.resultat,
      date: creation.date,
      valeurAvant: valeurBande,
      valeurAdverse,
      successeurChefId: null,
      etapeActive: 0,
      participants,
      exploration: {
        lancers: [],
        desConserves: [],
        fragmentsTrouves: 0,
        appliquee: false,
        noteResultat: '',
      },
      vente: { fragmentsVendus: 0, revenu: 0, appliquee: false },
      veterans: {
        de1: null,
        de2: null,
        disponibilite: null,
        experienceDepensee: 0,
      },
      jetsRarete: [],
      personnagesSpeciaux: '',
      notes: '',
    };

    setLancersExploration('');
    setRarete({ heroId: '', equipementId: '', de1: '', de2: '' });
    setAllocation({ equipementId: '', combattantId: '' });
    setErreur(null);
    onCampagneChange({
      ...campagne,
      revision: campagne.revision + 1,
      batailleEnCours: nouvelleBataille,
      etapesApresBataille: Array.from({ length: 10 }, () => false),
    });
  }

  function terminerEtape(index: number) {
    if (!campagne.batailleEnCours) return;
    const etapes = normaliserEtapes(campagne.etapesApresBataille);
    etapes[index] = true;
    setErreur(null);
    onCampagneChange({
      ...campagne,
      revision: campagne.revision + 1,
      etapesApresBataille: etapes,
      batailleEnCours: {
        ...campagne.batailleEnCours,
        etapeActive: Math.min(9, index + 1),
      },
    });
  }

  function allerEtape(index: number) {
    publierBataille((courante) => ({ ...courante, etapeActive: index }));
    setErreur(null);
  }

  if (!campagne.batailleEnCours) {
    return (
      <CreationBataille
        campagne={campagne}
        creation={creation}
        participantsSelectionnes={participantsSelectionnes}
        erreur={erreur}
        onCreationChange={(modification) =>
          setCreation((courante) => ({ ...courante, ...modification }))
        }
        onParticipantChange={(id, selectionne) => {
          setParticipantsSelectionnes((courants) =>
            selectionne
              ? [...new Set([...courants, id])]
              : courants.filter((item) => item !== id),
          );
        }}
        onCreate={creerBataille}
      />
    );
  }

  const etapes = normaliserEtapes(campagne.etapesApresBataille);
  const terminees = etapes.filter(Boolean).length;
  const etapeActive = Math.max(0, Math.min(9, bataille.etapeActive));
  const combattantsParticipants = campagne.combattants.filter(
    (combattant) => bataille.participants[combattant.id],
  );
  /* Recalcul local sur la campagne mutée : le prop sert seulement au snapshot initial. */
  const valeurBandeCourante = calculerValeurBande(
    campagne.combattants.map((combattant) => ({
      quantite: combattant.quantite,
      experience: combattant.experience,
    })),
  );
  const bonusChallenger = calculerBonusChallenger(
    bataille.valeurAdverse - bataille.valeurAvant,
  );
  const desExplorationDeBase =
    combattantsParticipants.filter(
      (combattant) =>
        categorieCombattant(combattant, profilsParId) === 'Héros' &&
        bataille.participants[combattant.id]?.horsCombat === 0,
    ).length + (bataille.resultat === 'Victoire' ? 1 : 0);
  const candidatsChef = candidatsSuccession(campagne.combattants, profilsParId);
  const chefPresent = campagne.combattants.some(
    (combattant) => combattant.chef,
  );

  function definirHorsCombat(combattant: Combattant, valeur: number) {
    const maximum =
      categorieCombattant(combattant, profilsParId) === 'Héros'
        ? 1
        : combattant.quantite;
    const horsCombat = Math.max(0, Math.min(maximum, valeur));
    const suivi = bataille.participants[combattant.id];
    modifierParticipant(combattant.id, {
      horsCombat,
      jetsBlessure: suivi.jetsBlessure.slice(0, horsCombat),
      blessureResolue: false,
      blessureNote: '',
    });
  }

  function definirJetBlessure(
    combattantId: string,
    index: number,
    valeur: string,
  ) {
    const suivi = bataille.participants[combattantId];
    const jets = [...suivi.jetsBlessure];
    jets[index] = entierDepuisTexte(valeur);
    modifierParticipant(combattantId, {
      jetsBlessure: jets,
      blessureResolue: false,
      /* Un nouveau D66 invalide toujours la résolution secondaire précédente. */
      blessureNote: '',
    });
  }

  function modifierResolutionBlessure(
    combattantId: string,
    modification: Partial<ResolutionBlessureStructuree>,
  ) {
    const suivi = bataille.participants[combattantId];
    const resolution = lireResolutionBlessure(suivi.blessureNote);
    modifierParticipant(combattantId, {
      blessureResolue: false,
      blessureNote: serialiserResolutionBlessure({
        ...resolution,
        ...modification,
      }),
    });
  }

  function appliquerBlessures() {
    const validation = validerBlessures(
      combattantsParticipants,
      bataille,
      profilsParId,
    );
    if (validation) {
      setErreur(validation);
      return;
    }

    const participants = { ...bataille.participants };
    let chefMort = false;
    const combattantsApresBlessures: Combattant[] = [];

    for (const combattant of campagne.combattants) {
      const suivi = participants[combattant.id];
      if (!suivi || suivi.blessureResolue) {
        combattantsApresBlessures.push(combattant);
        continue;
      }

      const categorie = categorieCombattant(combattant, profilsParId);
      if (suivi.horsCombat === 0) {
        participants[combattant.id] = { ...suivi, blessureResolue: true };
        combattantsApresBlessures.push(combattant);
        continue;
      }

      if (categorie === 'Hommes de main') {
        const pertes = suivi.jetsBlessure
          .slice(0, suivi.horsCombat)
          .filter((jet) => resoudreBlessureHommeDeMain(jet) === 'perdu').length;
        const quantite = Math.max(0, combattant.quantite - pertes);
        participants[combattant.id] = {
          ...suivi,
          blessureResolue: true,
          blessureNote:
            pertes > 0
              ? `${pertes} perte${pertes > 1 ? 's' : ''}.`
              : 'Tous survivent.',
        };
        if (quantite > 0) {
          combattantsApresBlessures.push({
            ...combattant,
            quantite,
            statut: 'Prêt',
          });
        }
        continue;
      }

      const resultat = trouverBlessureHero(suivi.jetsBlessure[0]);
      const resolution = appliquerResultatHero(
        combattant,
        resultat.id,
        suivi.blessureNote,
      );
      participants[combattant.id] = {
        ...suivi,
        blessureResolue: true,
        experienceManuelle:
          suivi.experienceManuelle + (resultat.id === 'miracle' ? 1 : 0),
      };
      if (!resolution) {
        chefMort ||= combattant.chef;
      } else {
        combattantsApresBlessures.push(resolution);
      }
    }

    let successeurChefId = bataille.successeurChefId;
    let combattantsFinalises = combattantsApresBlessures;
    if (chefMort) {
      const candidats = candidatsSuccession(
        combattantsApresBlessures,
        profilsParId,
      );
      successeurChefId = candidats.length === 1 ? candidats[0].id : null;
      combattantsFinalises = combattantsApresBlessures.map((combattant) => ({
        ...combattant,
        chef: combattant.id === successeurChefId,
      }));
    }

    setErreur(null);
    onCampagneChange({
      ...campagne,
      revision: campagne.revision + 1,
      combattants: combattantsFinalises,
      batailleEnCours: {
        ...bataille,
        participants,
        successeurChefId,
      },
    });
  }

  function choisirSuccesseur(combattantId: string) {
    if (!candidatsChef.some((combattant) => combattant.id === combattantId))
      return;
    onCampagneChange({
      ...campagne,
      revision: campagne.revision + 1,
      combattants: campagne.combattants.map((combattant) => ({
        ...combattant,
        chef: combattant.id === combattantId,
      })),
      batailleEnCours: { ...bataille, successeurChefId: combattantId },
    });
  }

  function bilanExperience(combattant: Combattant) {
    const suivi = bataille.participants[combattant.id];
    const categorie = categorieCombattant(combattant, profilsParId);
    const survie = 1;
    const chefVainqueur =
      bataille.resultat === 'Victoire' &&
      combattant.chef &&
      bataille.successeurChefId === null
        ? 1
        : 0;
    const ennemisHorsCombat =
      categorie === 'Héros' ? suivi.ennemisHorsCombat : 0;
    const total =
      survie +
      chefVainqueur +
      ennemisHorsCombat +
      bonusChallenger +
      suivi.experienceScenario +
      suivi.experienceManuelle;
    const progressions = compterProgressionsFranchies(
      combattant.experience,
      combattant.experience + total,
      categorie,
    );
    return {
      survie,
      chefVainqueur,
      ennemisHorsCombat,
      total,
      progressions,
      categorie,
    };
  }

  function modifierSaisieProgression(
    combattant: Combattant,
    index: number,
    modification: Partial<SaisieProgression>,
  ) {
    const suivi = bataille.participants[combattant.id];
    const nombre = bilanExperience(combattant).progressions;
    const dossier = lireProgressions(suivi.progressionsNote, nombre);
    const saisies = dossier.saisies.map((saisie, position) =>
      position === index ? { ...saisie, ...modification } : saisie,
    );
    modifierParticipant(combattant.id, {
      progressionsNote: serialiserProgressions({ version: 1, saisies }),
    });
  }

  function appliquerExperiences() {
    const erreurs: string[] = [];
    const participants = { ...bataille.participants };
    const combattants = campagne.combattants.map((combattant) => {
      const suivi = participants[combattant.id];
      if (!suivi || suivi.experienceAppliquee) return combattant;
      const bilan = bilanExperience(combattant);
      const dossier = lireProgressions(
        suivi.progressionsNote,
        bilan.progressions,
      );
      const erreurProgression = validerProgressions(
        combattant,
        dossier.saisies,
        bilan.categorie,
        profilsParId.get(combattant.profilId)?.statistiques ??
          combattant.statistiques,
      );
      if (erreurProgression) {
        erreurs.push(`${combattant.nom} : ${erreurProgression}`);
        return combattant;
      }

      participants[combattant.id] = { ...suivi, experienceAppliquee: true };
      return appliquerProgressionsCombattant(
        { ...combattant, experience: combattant.experience + bilan.total },
        dossier.saisies,
        bilan.categorie,
        profilsParId.get(combattant.profilId)?.statistiques ??
          combattant.statistiques,
      );
    });

    if (erreurs.length > 0) {
      setErreur(erreurs.join(' '));
      return;
    }
    setErreur(null);
    onCampagneChange({
      ...campagne,
      revision: campagne.revision + 1,
      combattants,
      batailleEnCours: { ...bataille, participants },
    });
  }

  function saisirLancersExploration(texte: string) {
    setLancersExploration(texte);
    const lancers = extraireDes(texte);
    publierBataille((courante) => ({
      ...courante,
      exploration: {
        ...courante.exploration,
        lancers,
        desConserves: [],
        fragmentsTrouves: 0,
        appliquee: false,
      },
    }));
  }

  function basculerDeConserve(index: number, conserve: boolean) {
    const indices = indicesDesConserves(
      bataille.exploration.lancers,
      bataille.exploration.desConserves,
    );
    const nouveauxIndices = conserve
      ? [...new Set([...indices, index])]
      : indices.filter((position) => position !== index);
    if (nouveauxIndices.length > 6) {
      setErreur('Six dés au maximum peuvent être conservés.');
      return;
    }
    setErreur(null);
    publierBataille((courante) => ({
      ...courante,
      exploration: {
        ...courante.exploration,
        desConserves: nouveauxIndices.map(
          (position) => courante.exploration.lancers[position],
        ),
        appliquee: false,
      },
    }));
  }

  function appliquerExploration() {
    try {
      if (bataille.exploration.lancers.length < desExplorationDeBase) {
        setErreur(
          `Il faut au moins ${desExplorationDeBase} dés : un par Héros survivant non hors de combat${bataille.resultat === 'Victoire' ? ' et un pour la victoire' : ''}.`,
        );
        return;
      }
      const resultat = resoudreExploration(bataille.exploration.desConserves);
      if (resultat.des.length === 0) {
        setErreur('Conservez au moins un dé d’exploration.');
        return;
      }
      if (resultat.combinaison && !bataille.exploration.noteResultat.trim()) {
        setErreur(
          'Consignez la résolution du lieu spécial trouvé par la combinaison.',
        );
        return;
      }
      setErreur(null);
      onCampagneChange({
        ...campagne,
        revision: campagne.revision + 1,
        fragments: campagne.fragments + resultat.fragments,
        batailleEnCours: {
          ...bataille,
          exploration: {
            ...bataille.exploration,
            fragmentsTrouves: resultat.fragments,
            appliquee: true,
          },
        },
      });
    } catch (cause) {
      setErreur(
        cause instanceof Error
          ? cause.message
          : 'Jets d’exploration invalides.',
      );
    }
  }

  function appliquerVente() {
    const vendus = bataille.vente.fragmentsVendus;
    if (vendus < 0 || vendus > campagne.fragments) {
      setErreur('Le nombre de fragments vendus dépasse le stock disponible.');
      return;
    }
    const effectif = campagne.combattants.reduce(
      (total, combattant) => total + combattant.quantite,
      0,
    );
    const revenu = calculerVentePierre(vendus, effectif);
    setErreur(null);
    onCampagneChange({
      ...campagne,
      revision: campagne.revision + 1,
      fragments: campagne.fragments - vendus,
      couronnes: campagne.couronnes + revenu,
      batailleEnCours: {
        ...bataille,
        vente: { fragmentsVendus: vendus, revenu, appliquee: true },
      },
    });
  }

  function definirDeVeteran(cle: 'de1' | 'de2', valeur: string) {
    const de = entierDepuisTexte(valeur);
    publierBataille((courante) => {
      const veterans: BatailleEnCours['veterans'] = {
        ...courante.veterans,
        [cle]: de || null,
        disponibilite: null,
      };
      if (veterans.de1 && veterans.de2) {
        try {
          veterans.disponibilite = disponibiliteVeterans(
            veterans.de1,
            veterans.de2,
          );
        } catch {
          veterans.disponibilite = null;
        }
      }
      return { ...courante, veterans };
    });
  }

  function ajouterJetRarete() {
    const de1 = entierDepuisTexte(rarete.de1);
    const de2 = entierDepuisTexte(rarete.de2);
    const equipement = equipementsParId.get(rarete.equipementId);
    const hero = campagne.combattants.find(
      (combattant) => combattant.id === rarete.heroId,
    );
    if (
      !hero ||
      categorieCombattant(hero, profilsParId) !== 'Héros' ||
      bataille.participants[hero.id]?.horsCombat !== 0 ||
      !equipement?.rareteCommerce
    ) {
      setErreur('Sélectionnez un Héros et un objet rare.');
      return;
    }
    if (bataille.jetsRarete.some((jet) => jet.heroId === hero.id)) {
      setErreur('Ce Héros a déjà effectué son jet de rareté.');
      return;
    }
    if (
      lirePersonnel(bataille.personnagesSpeciaux).entrees.some(
        (entree) =>
          entree.type === 'Dramatis Personae' && entree.heroId === hero.id,
      )
    ) {
      setErreur(
        'Ce Héros a déjà recherché un Dramatis Persona pendant cette séquence.',
      );
      return;
    }
    try {
      const reussi = jetRareteReussi(de1, de2, equipement.rareteCommerce);
      const jet: JetRarete = {
        id: crypto.randomUUID(),
        heroId: hero.id,
        equipementId: equipement.id,
        de1,
        de2,
        reussi,
        achete: false,
        prix: prixCommerce(equipement, campagne),
      };
      setErreur(null);
      publierBataille((courante) => ({
        ...courante,
        jetsRarete: [...courante.jetsRarete, jet],
      }));
      setRarete({ heroId: '', equipementId: '', de1: '', de2: '' });
    } catch (cause) {
      setErreur(
        cause instanceof Error ? cause.message : 'Jet de rareté invalide.',
      );
    }
  }

  function acheterObjetRare(jetId: string) {
    const jet = bataille.jetsRarete.find((item) => item.id === jetId);
    if (!jet || !jet.reussi || jet.achete) return;
    if (jet.prix > campagne.couronnes) {
      setErreur('Le trésor ne permet pas cet achat.');
      return;
    }
    setErreur(null);
    onCampagneChange({
      ...campagne,
      revision: campagne.revision + 1,
      couronnes: campagne.couronnes - jet.prix,
      inventaire: {
        ...campagne.inventaire,
        [jet.equipementId]: (campagne.inventaire[jet.equipementId] ?? 0) + 1,
      },
      batailleEnCours: {
        ...bataille,
        jetsRarete: bataille.jetsRarete.map((item) =>
          item.id === jetId ? { ...item, achete: true } : item,
        ),
      },
    });
  }

  function ajouterPersonnel() {
    if (!personnel.nom.trim()) {
      setErreur('Donnez un nom au personnage spécial.');
      return;
    }
    const dossier = lirePersonnel(bataille.personnagesSpeciaux);
    let heroRecherche: Combattant | undefined;
    let jetInitiative: number | null = null;
    if (personnel.type === 'Dramatis Personae') {
      heroRecherche = campagne.combattants.find(
        (combattant) => combattant.id === personnel.heroId,
      );
      jetInitiative = personnel.jetInitiative;
      if (
        !heroRecherche ||
        categorieCombattant(heroRecherche, profilsParId) !== 'Héros' ||
        bataille.participants[heroRecherche.id]?.horsCombat !== 0
      ) {
        setErreur(
          'Sélectionnez un Héros admissible pour rechercher ce Dramatis Persona.',
        );
        return;
      }
      if (!jetInitiative || jetInitiative < 1 || jetInitiative > 6) {
        setErreur(
          'Le test de recherche du Dramatis Persona exige un D6 valide.',
        );
        return;
      }
      const testReussi =
        jetInitiative !== 6 &&
        jetInitiative <= heroRecherche.statistiques.initiative;
      if (personnel.decision === 'Engagé' && !testReussi) {
        setErreur(
          'Le Dramatis Persona ne peut pas être engagé : le test d’Initiative a échoué.',
        );
        return;
      }
      if (bataille.jetsRarete.some((jet) => jet.heroId === heroRecherche?.id)) {
        setErreur(
          'Ce Héros a déjà recherché un objet rare et ne peut pas rechercher un Dramatis Persona.',
        );
        return;
      }
      if (
        dossier.entrees.some(
          (entree) =>
            entree.type === 'Dramatis Personae' &&
            entree.heroId === heroRecherche?.id,
        )
      ) {
        setErreur(
          'Ce Héros a déjà effectué une recherche de Dramatis Persona.',
        );
        return;
      }
      if (
        personnel.decision === 'Engagé' &&
        dossier.entrees.some(
          (entree) =>
            entree.decision === 'Engagé' &&
            entree.nom.trim().toLocaleLowerCase('fr') ===
              personnel.nom.trim().toLocaleLowerCase('fr'),
        )
      ) {
        setErreur('Ce personnage spécial est déjà engagé.');
        return;
      }
    }
    const coutApplique = personnel.decision === 'Engagé' && personnel.cout > 0;
    if (coutApplique && personnel.cout > campagne.couronnes) {
      setErreur('Le trésor ne permet pas cet engagement.');
      return;
    }
    const entree: EntreePersonnel = {
      ...personnel,
      id: crypto.randomUUID(),
      nom: personnel.nom.trim(),
      heroId: heroRecherche?.id ?? '',
      jetInitiative,
      cout: Math.max(0, personnel.cout),
      coutApplique,
      note: personnel.note.trim(),
    };
    setErreur(null);
    publierBataille(
      (courante) => ({
        ...courante,
        personnagesSpeciaux: serialiserPersonnel({
          version: 1,
          aucun: false,
          entrees: [...dossier.entrees, entree],
        }),
      }),
      coutApplique ? { couronnes: campagne.couronnes - entree.cout } : {},
    );
    setPersonnel({
      type: 'Franc-tireur',
      nom: '',
      decision: 'Engagé',
      heroId: '',
      jetInitiative: null,
      cout: 0,
      coutApplique: false,
      note: '',
    });
  }

  function aucunPersonnel() {
    const dossier = lirePersonnel(bataille.personnagesSpeciaux);
    const remboursement = dossier.entrees.reduce(
      (total, entree) => total + (entree.coutApplique ? entree.cout : 0),
      0,
    );
    publierBataille(
      (courante) => ({
        ...courante,
        personnagesSpeciaux: serialiserPersonnel({
          version: 1,
          aucun: true,
          entrees: [],
        }),
      }),
      remboursement > 0
        ? { couronnes: campagne.couronnes + remboursement }
        : {},
    );
  }

  function supprimerPersonnel(id: string) {
    const dossier = lirePersonnel(bataille.personnagesSpeciaux);
    const entreeSupprimee = dossier.entrees.find((entree) => entree.id === id);
    publierBataille(
      (courante) => ({
        ...courante,
        personnagesSpeciaux: serialiserPersonnel({
          version: 1,
          aucun: false,
          entrees: dossier.entrees.filter((entree) => entree.id !== id),
        }),
      }),
      entreeSupprimee?.coutApplique
        ? { couronnes: campagne.couronnes + entreeSupprimee.cout }
        : {},
    );
  }

  function attribuerEquipement() {
    const equipement = equipementsParId.get(allocation.equipementId);
    const combattant = campagne.combattants.find(
      (item) => item.id === allocation.combattantId,
    );
    if (!equipement || !combattant) {
      setErreur('Sélectionnez un objet et un combattant.');
      return;
    }
    if (!peutRecevoirEquipement(combattant, equipement, profilsParId)) {
      setErreur(
        'Ce combattant ne peut pas utiliser cet objet avec sa liste actuelle.',
      );
      return;
    }
    const necessaires = combattant.quantite;
    if ((campagne.inventaire[equipement.id] ?? 0) < necessaires) {
      setErreur(
        `Il faut ${necessaires} exemplaire${necessaires > 1 ? 's' : ''} pour équiper tout le groupe.`,
      );
      return;
    }
    const inventaire = { ...campagne.inventaire };
    inventaire[equipement.id] -= necessaires;
    if (inventaire[equipement.id] <= 0) delete inventaire[equipement.id];
    setErreur(null);
    onCampagneChange({
      ...campagne,
      revision: campagne.revision + 1,
      inventaire,
      combattants: campagne.combattants.map((item) =>
        item.id === combattant.id
          ? { ...item, equipementIds: [...item.equipementIds, equipement.id] }
          : item,
      ),
    });
  }

  function remettreAuMagot(combattantId: string, position: number) {
    const combattant = campagne.combattants.find(
      (item) => item.id === combattantId,
    );
    const equipementId = combattant?.equipementIds[position];
    if (!combattant || !equipementId) return;
    const equipementIds = combattant.equipementIds.filter(
      (_, index) => index !== position,
    );
    onCampagneChange({
      ...campagne,
      revision: campagne.revision + 1,
      inventaire: {
        ...campagne.inventaire,
        [equipementId]:
          (campagne.inventaire[equipementId] ?? 0) + combattant.quantite,
      },
      combattants: campagne.combattants.map((item) =>
        item.id === combattantId ? { ...item, equipementIds } : item,
      ),
    });
  }

  function finaliserBataille() {
    if (!etapes.slice(0, 9).every(Boolean)) {
      setErreur(
        'Les neuf étapes précédentes doivent être validées avant la finalisation.',
      );
      return;
    }
    const notes = construireNotesPartie(bataille);
    const partie: Partie = {
      id: `partie-${bataille.numero}-${bataille.id}`,
      scenario: bataille.scenario,
      adversaire: bataille.adversaire,
      resultat: bataille.resultat,
      date: bataille.date,
      valeurAvant: bataille.valeurAvant,
      valeurAdverse: bataille.valeurAdverse,
      valeurApres: valeurBandeCourante,
      fragmentsTrouves: bataille.exploration.fragmentsTrouves,
      revenu: bataille.vente.revenu,
      notes: notes || undefined,
    };
    const idsParticipants = new Set(Object.keys(bataille.participants));
    const combattantsApresAbsences = campagne.combattants.map((combattant) => {
      if (idsParticipants.has(combattant.id) || combattant.partiesManquees <= 0)
        return combattant;

      /* Une absence imposée est consommée uniquement par une bataille non jouée. */
      const partiesManquees = Math.max(0, combattant.partiesManquees - 1);
      return {
        ...combattant,
        partiesManquees,
        statut:
          partiesManquees === 0 && combattant.statut === 'Absent'
            ? ('Prêt' as const)
            : combattant.statut,
      };
    });

    setErreur(null);
    onCampagneChange({
      ...campagne,
      revision: campagne.revision + 1,
      numeroBataille: bataille.numero,
      combattants: combattantsApresAbsences,
      parties: [partie, ...campagne.parties],
      batailleEnCours: null,
      etapesApresBataille: Array.from({ length: 10 }, () => false),
    });
  }

  const blessuresResolues = Object.values(bataille.participants).every(
    (participant) => participant.blessureResolue,
  );
  /* Sans Chef vivant, l'étape reste bloquée : zéro candidat n'est pas une résolution. */
  const successionResolue = chefPresent;
  const experiencesAppliquees = combattantsParticipants.every(
    (combattant) => bataille.participants[combattant.id]?.experienceAppliquee,
  );
  const resultatExploration = resoudreExplorationSure(
    bataille.exploration.desConserves,
  );
  const dossierPersonnel = lirePersonnel(bataille.personnagesSpeciaux);
  const personnelRenseigne =
    dossierPersonnel.aucun || dossierPersonnel.entrees.length > 0;

  return (
    <section className="grid gap-4" aria-label="Assistant d’après-bataille">
      <Card className="border-stone-500/30 bg-[rgba(252,248,236,.78)] shadow-sm">
        <CardHeader className="border-b border-stone-500/20">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Swords className="size-5 text-red-900" />
            Bataille {bataille.numero} — {bataille.scenario}
          </CardTitle>
          <CardDescription>
            {bataille.resultat} contre {bataille.adversaire} · valeur adverse{' '}
            {bataille.valeurAdverse}
          </CardDescription>
          <CardAction>
            <Badge variant="outline">{terminees} / 10</Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4">
          <Progress value={terminees * 10}>
            <ProgressLabel>Progression de la séquence</ProgressLabel>
            <ProgressValue>{() => `${terminees * 10} %`}</ProgressValue>
          </Progress>
          <ol
            className="grid grid-cols-2 gap-2 md:grid-cols-5"
            aria-label="Étapes de la séquence"
          >
            {etapesCampagne.map((etape, index) => {
              const accessible =
                etapes[index] ||
                index === etapes.findIndex((item) => !item) ||
                (index === 9 && etapes.slice(0, 9).every(Boolean));
              return (
                <li
                  className="search-destination"
                  id={`etape-${index}`}
                  key={etape.id}
                  tabIndex={-1}
                >
                  <Button
                    className="h-auto min-h-14 w-full justify-start whitespace-normal px-3 py-2 text-left"
                    variant={
                      index === etapeActive
                        ? 'default'
                        : etapes[index]
                          ? 'secondary'
                          : 'outline'
                    }
                    disabled={!accessible}
                    onClick={() => allerEtape(index)}
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-full border border-current text-xs">
                      {etapes[index] ? <Check className="size-3" /> : index + 1}
                    </span>
                    <span className="text-xs leading-tight">{etape.titre}</span>
                  </Button>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      {erreur && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Vérification nécessaire</AlertTitle>
          <AlertDescription>{erreur}</AlertDescription>
        </Alert>
      )}

      {etapeActive === 0 && (
        <EtapeBlessures
          bataille={bataille}
          combattants={combattantsParticipants}
          profilsParId={profilsParId}
          blessuresResolues={blessuresResolues}
          chefPresent={chefPresent}
          candidatsChef={candidatsChef}
          onHorsCombatChange={definirHorsCombat}
          onJetChange={definirJetBlessure}
          onNoteChange={(id, note) =>
            modifierParticipant(id, { blessureNote: note })
          }
          onResolutionChange={modifierResolutionBlessure}
          onApply={appliquerBlessures}
          onSuccesseurChange={choisirSuccesseur}
          onContinue={() => terminerEtape(0)}
          peutContinuer={blessuresResolues && successionResolue}
        />
      )}

      {etapeActive === 1 && (
        <EtapeExperience
          bataille={bataille}
          combattants={combattantsParticipants}
          bonusChallenger={bonusChallenger}
          profilsParId={profilsParId}
          experiencesAppliquees={experiencesAppliquees}
          bilanExperience={bilanExperience}
          onParticipantChange={modifierParticipant}
          onProgressionChange={modifierSaisieProgression}
          onApply={appliquerExperiences}
          onContinue={() => terminerEtape(1)}
        />
      )}

      {etapeActive === 2 && (
        <EtapeExploration
          bataille={bataille}
          desExplorationDeBase={desExplorationDeBase}
          saisieLancers={
            lancersExploration || bataille.exploration.lancers.join(', ')
          }
          resultat={resultatExploration}
          onLancersChange={saisirLancersExploration}
          onDeConserveChange={basculerDeConserve}
          onNoteChange={(note) =>
            publierBataille((courante) => ({
              ...courante,
              exploration: { ...courante.exploration, noteResultat: note },
            }))
          }
          onApply={appliquerExploration}
          onContinue={() => terminerEtape(2)}
        />
      )}

      {etapeActive === 3 && (
        <EtapeVente
          campagne={campagne}
          bataille={bataille}
          onVendusChange={(fragmentsVendus) =>
            publierBataille((courante) => ({
              ...courante,
              vente: { ...courante.vente, fragmentsVendus, appliquee: false },
            }))
          }
          onApply={appliquerVente}
          onContinue={() => terminerEtape(3)}
        />
      )}

      {etapeActive === 4 && (
        <EtapeVeterans
          bataille={bataille}
          onDeChange={definirDeVeteran}
          onContinue={() => terminerEtape(4)}
        />
      )}

      {etapeActive === 5 && (
        <EtapeRarete
          campagne={campagne}
          bataille={bataille}
          brouillon={rarete}
          profilsParId={profilsParId}
          equipementsParId={equipementsParId}
          onBrouillonChange={(modification) =>
            setRarete((courant) => ({ ...courant, ...modification }))
          }
          onAdd={ajouterJetRarete}
          onBuy={acheterObjetRare}
          onContinue={() => terminerEtape(5)}
        />
      )}

      {etapeActive === 6 && (
        <EtapePersonnel
          bataille={bataille}
          campagne={campagne}
          profilsParId={profilsParId}
          dossier={dossierPersonnel}
          brouillon={personnel}
          onBrouillonChange={(modification) =>
            setPersonnel((courant) => ({ ...courant, ...modification }))
          }
          onAdd={ajouterPersonnel}
          onNone={aucunPersonnel}
          onDelete={supprimerPersonnel}
          onContinue={() => terminerEtape(6)}
          peutContinuer={personnelRenseigne}
        />
      )}

      {etapeActive === 7 && (
        <EtapeRecrutement
          recrutement={recrutement}
          onContinue={() => terminerEtape(7)}
        />
      )}

      {etapeActive === 8 && (
        <EtapeAllocation
          campagne={campagne}
          selection={allocation}
          equipementsParId={equipementsParId}
          onSelectionChange={(modification) =>
            setAllocation((courante) => ({ ...courante, ...modification }))
          }
          onAssign={attribuerEquipement}
          onReturn={remettreAuMagot}
          onContinue={() => terminerEtape(8)}
        />
      )}

      {etapeActive === 9 && (
        <EtapeFinalisation
          campagne={campagne}
          bataille={bataille}
          valeurBande={valeurBandeCourante}
          onNotesChange={(notes) =>
            publierBataille((courante) => ({ ...courante, notes }))
          }
          onFinalize={finaliserBataille}
        />
      )}

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          disabled={etapeActive === 0}
          onClick={() => allerEtape(etapeActive - 1)}
        >
          <ChevronLeft /> Étape précédente
        </Button>
        {etapes[etapeActive] && etapeActive < 9 && (
          <Button variant="ghost" onClick={() => allerEtape(etapeActive + 1)}>
            Étape suivante <ChevronRight />
          </Button>
        )}
      </div>
    </section>
  );
}

function CreationBataille({
  campagne,
  creation,
  participantsSelectionnes,
  erreur,
  onCreationChange,
  onParticipantChange,
  onCreate,
}: {
  campagne: EtatCampagne;
  creation: BrouillonBataille;
  participantsSelectionnes: string[];
  erreur: string | null;
  onCreationChange: (modification: Partial<BrouillonBataille>) => void;
  onParticipantChange: (id: string, selectionne: boolean) => void;
  onCreate: () => void;
}) {
  return (
    <Card className="border-stone-500/30 bg-[rgba(252,248,236,.78)] shadow-sm">
      <CardHeader className="border-b border-stone-500/20">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Swords className="size-5 text-red-900" /> Nouvelle bataille
        </CardTitle>
        <CardDescription>
          Enregistrez le résultat avant d’ouvrir la séquence d’après-bataille.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 pt-5">
        {erreur && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>Informations incomplètes</AlertTitle>
            <AlertDescription>{erreur}</AlertDescription>
          </Alert>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <Champ libelle="Scénario" htmlFor="battle-scenario">
            <Input
              id="battle-scenario"
              value={creation.scenario}
              onChange={(event) =>
                onCreationChange({ scenario: event.target.value })
              }
              placeholder="Ex. La Tour du Sorcier"
            />
          </Champ>
          <Champ libelle="Adversaire" htmlFor="battle-opponent">
            <Input
              id="battle-opponent"
              value={creation.adversaire}
              onChange={(event) =>
                onCreationChange({ adversaire: event.target.value })
              }
              placeholder="Nom ou faction adverse"
            />
          </Champ>
          <Champ libelle="Résultat" htmlFor="battle-result">
            <NativeSelect
              id="battle-result"
              value={creation.resultat}
              onChange={(event) =>
                onCreationChange({
                  resultat: event.target.value as Partie['resultat'],
                })
              }
            >
              <NativeSelectOption value="Victoire">Victoire</NativeSelectOption>
              <NativeSelectOption value="Défaite">Défaite</NativeSelectOption>
              <NativeSelectOption value="Égalité">Égalité</NativeSelectOption>
            </NativeSelect>
          </Champ>
          <Champ libelle="Date" htmlFor="battle-date">
            <Input
              id="battle-date"
              type="date"
              value={creation.date}
              onChange={(event) =>
                onCreationChange({ date: event.target.value })
              }
            />
          </Champ>
          <Champ libelle="Valeur adverse" htmlFor="battle-rating">
            <Input
              id="battle-rating"
              type="number"
              min={1}
              value={creation.valeurAdverse}
              onChange={(event) =>
                onCreationChange({ valeurAdverse: event.target.value })
              }
            />
          </Champ>
        </div>
        <div className="grid gap-3">
          <div>
            <h3 className="font-medium">Participants</h3>
            <p className="text-sm text-muted-foreground">
              Les absents ne sont pas sélectionnés par défaut.
            </p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {campagne.combattants.map((combattant) => (
              <label
                className="flex cursor-pointer items-center gap-3 rounded-md border border-stone-500/20 px-3 py-2"
                htmlFor={`participant-${combattant.id}`}
                key={combattant.id}
              >
                <Checkbox
                  id={`participant-${combattant.id}`}
                  checked={participantsSelectionnes.includes(combattant.id)}
                  disabled={
                    combattant.statut === 'Absent' ||
                    combattant.partiesManquees > 0
                  }
                  onCheckedChange={(checked) =>
                    onParticipantChange(combattant.id, checked === true)
                  }
                />
                <span className="grid flex-1">
                  <strong className="text-sm">{combattant.nom}</strong>
                  <small className="text-muted-foreground">
                    {combattant.statut} · {combattant.experience} XP
                    {combattant.partiesManquees > 0
                      ? ` · ${combattant.partiesManquees} partie(s) à manquer`
                      : ''}
                  </small>
                </span>
              </label>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={onCreate}>
          <Plus /> Créer la bataille
        </Button>
      </CardFooter>
    </Card>
  );
}

function EtapeBlessures({
  bataille,
  combattants,
  profilsParId,
  blessuresResolues,
  chefPresent,
  candidatsChef,
  onHorsCombatChange,
  onJetChange,
  onNoteChange,
  onResolutionChange,
  onApply,
  onSuccesseurChange,
  onContinue,
  peutContinuer,
}: {
  bataille: BatailleEnCours;
  combattants: Combattant[];
  profilsParId: Map<string, (typeof profilsReiklanders)[number]>;
  blessuresResolues: boolean;
  chefPresent: boolean;
  candidatsChef: Combattant[];
  onHorsCombatChange: (combattant: Combattant, valeur: number) => void;
  onJetChange: (id: string, index: number, valeur: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onResolutionChange: (
    id: string,
    modification: Partial<ResolutionBlessureStructuree>,
  ) => void;
  onApply: () => void;
  onSuccesseurChange: (id: string) => void;
  onContinue: () => void;
  peutContinuer: boolean;
}) {
  return (
    <CarteEtape
      numero={1}
      titre="Blessures graves"
      description="Saisissez un D6 par Homme de main hors de combat et un D66 par Héros."
      icone={<Skull />}
      action={
        blessuresResolues ? (
          <Button disabled={!peutContinuer} onClick={onContinue}>
            Continuer <ChevronRight />
          </Button>
        ) : (
          <Button onClick={onApply}>
            <Dices /> Résoudre et appliquer
          </Button>
        )
      }
    >
      <div className="grid gap-3">
        {combattants.map((combattant) => {
          const suivi = bataille.participants[combattant.id];
          const categorie = categorieCombattant(combattant, profilsParId);
          const maximum = categorie === 'Héros' ? 1 : combattant.quantite;
          const apercu =
            categorie === 'Héros' && suivi.jetsBlessure[0]
              ? blessureHeroSure(suivi.jetsBlessure[0])
              : null;
          const complexe = apercu && apercu.application !== 'automatique';
          const absenceStructuree =
            apercu && ['bras', 'jambe-ecrasee', 'profonde'].includes(apercu.id);
          const resolution = lireResolutionBlessure(suivi.blessureNote);
          return (
            <article
              className="grid gap-3 rounded-md border border-stone-500/20 p-3"
              key={combattant.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <strong>{combattant.nom}</strong>
                  <p className="text-xs text-muted-foreground">
                    {categorie}
                    {combattant.quantite > 1
                      ? ` · groupe de ${combattant.quantite}`
                      : ''}
                  </p>
                </div>
                {suivi.blessureResolue && (
                  <Badge variant="secondary">
                    <Check /> Résolu
                  </Badge>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-[180px_1fr]">
                <Champ
                  libelle="Mis hors de combat"
                  htmlFor={`ooa-${combattant.id}`}
                >
                  <Input
                    id={`ooa-${combattant.id}`}
                    type="number"
                    min={0}
                    max={maximum}
                    disabled={suivi.blessureResolue}
                    value={suivi.horsCombat}
                    onChange={(event) =>
                      onHorsCombatChange(
                        combattant,
                        entierDepuisTexte(event.target.value),
                      )
                    }
                  />
                </Champ>
                {suivi.horsCombat > 0 && (
                  <div className="grid gap-2">
                    <span className="text-sm font-medium">
                      {categorie === 'Héros' ? 'Jet D66' : 'Jets D6'}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: suivi.horsCombat }, (_, index) => (
                        <Input
                          className="w-24"
                          key={index}
                          aria-label={`Jet de blessure ${index + 1} de ${combattant.nom}`}
                          type="number"
                          min={categorie === 'Héros' ? 11 : 1}
                          max={categorie === 'Héros' ? 66 : 6}
                          disabled={suivi.blessureResolue}
                          value={suivi.jetsBlessure[index] || ''}
                          onChange={(event) =>
                            onJetChange(
                              combattant.id,
                              index,
                              event.target.value,
                            )
                          }
                        />
                      ))}
                    </div>
                    {apercu && (
                      <p className="text-sm">
                        Résultat : <strong>{apercu.titre}</strong>
                        {complexe &&
                          (absenceStructuree
                            ? ' — jet secondaire requis'
                            : ' — résolution manuelle requise')}
                      </p>
                    )}
                  </div>
                )}
              </div>
              {absenceStructuree && (
                <div className="grid gap-3 rounded-md bg-stone-500/10 p-3 md:grid-cols-[180px_1fr]">
                  <Champ
                    libelle={apercu?.id === 'profonde' ? 'Jet D3' : 'Jet D6'}
                    htmlFor={`injury-secondary-${combattant.id}`}
                  >
                    <Input
                      id={`injury-secondary-${combattant.id}`}
                      type="number"
                      min={1}
                      max={apercu?.id === 'profonde' ? 3 : 6}
                      disabled={suivi.blessureResolue}
                      value={resolution.jetSecondaire ?? ''}
                      onChange={(event) =>
                        onResolutionChange(combattant.id, {
                          jetSecondaire: event.target.value
                            ? entierDepuisTexte(event.target.value)
                            : null,
                        })
                      }
                    />
                  </Champ>
                  <div className="grid gap-2">
                    <p className="text-sm text-muted-foreground">
                      {descriptionJetBlessure(
                        apercu?.id,
                        resolution.jetSecondaire,
                      )}
                    </p>
                    <Textarea
                      aria-label={`Note de blessure de ${combattant.nom}`}
                      disabled={suivi.blessureResolue}
                      value={resolution.note}
                      onChange={(event) =>
                        onResolutionChange(combattant.id, {
                          note: event.target.value,
                        })
                      }
                      placeholder="Précision de table facultative…"
                    />
                  </div>
                </div>
              )}
              {complexe && !absenceStructuree && (
                <Champ
                  libelle="Résolution de la branche complexe"
                  htmlFor={`injury-note-${combattant.id}`}
                >
                  <Textarea
                    id={`injury-note-${combattant.id}`}
                    disabled={suivi.blessureResolue}
                    value={suivi.blessureNote}
                    onChange={(event) =>
                      onNoteChange(combattant.id, event.target.value)
                    }
                    placeholder="Jets secondaires, conséquences et durée éventuelle…"
                  />
                </Champ>
              )}
              {suivi.blessureResolue && suivi.blessureNote && (
                <p className="rounded bg-stone-500/10 px-3 py-2 text-sm">
                  {decrireResolutionBlessure(suivi.blessureNote)}
                </p>
              )}
            </article>
          );
        })}
      </div>

      {blessuresResolues && !chefPresent && candidatsChef.length > 1 && (
        <Alert>
          <AlertTriangle />
          <AlertTitle>Égalité pour la succession</AlertTitle>
          <AlertDescription className="grid gap-3">
            <span>
              Les candidats restent à égalité après Commandement puis
              Expérience. Saisissez le résultat de votre arbitrage de table.
            </span>
            <NativeSelect
              defaultValue=""
              onChange={(event) => onSuccesseurChange(event.target.value)}
            >
              <NativeSelectOption value="" disabled>
                Choisir le nouveau Chef
              </NativeSelectOption>
              {candidatsChef.map((candidat) => (
                <NativeSelectOption key={candidat.id} value={candidat.id}>
                  {candidat.nom} — Cd {candidat.statistiques.commandement},{' '}
                  {candidat.experience} XP
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </AlertDescription>
        </Alert>
      )}
      {blessuresResolues && !chefPresent && candidatsChef.length === 0 && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Aucun successeur éligible</AlertTitle>
          <AlertDescription>
            Aucun Héros survivant ne peut recevoir la règle Chef.
          </AlertDescription>
        </Alert>
      )}
    </CarteEtape>
  );
}

function EtapeExperience({
  bataille,
  combattants,
  bonusChallenger,
  profilsParId,
  experiencesAppliquees,
  bilanExperience,
  onParticipantChange,
  onProgressionChange,
  onApply,
  onContinue,
}: {
  bataille: BatailleEnCours;
  combattants: Combattant[];
  bonusChallenger: number;
  profilsParId: Map<string, (typeof profilsReiklanders)[number]>;
  experiencesAppliquees: boolean;
  bilanExperience: (combattant: Combattant) => {
    survie: number;
    chefVainqueur: number;
    ennemisHorsCombat: number;
    total: number;
    progressions: number;
    categorie: 'Héros' | 'Hommes de main';
  };
  onParticipantChange: (
    id: string,
    modification: Partial<SuiviCombattantBataille>,
  ) => void;
  onProgressionChange: (
    combattant: Combattant,
    index: number,
    modification: Partial<SaisieProgression>,
  ) => void;
  onApply: () => void;
  onContinue: () => void;
}) {
  return (
    <CarteEtape
      numero={2}
      titre="Expérience et progressions"
      description={`Le bonus de challenger calculé pour cette bataille est de +${bonusChallenger} XP.`}
      icone={<Sparkles />}
      action={
        experiencesAppliquees ? (
          <Button onClick={onContinue}>
            Continuer <ChevronRight />
          </Button>
        ) : (
          <Button onClick={onApply}>
            <Check /> Appliquer l’expérience
          </Button>
        )
      }
    >
      <div className="grid gap-3">
        {combattants.map((combattant) => {
          const suivi = bataille.participants[combattant.id];
          const bilan = bilanExperience(combattant);
          const saisies = lireProgressions(
            suivi.progressionsNote,
            bilan.progressions,
          ).saisies;
          const verrouille = suivi.experienceAppliquee;
          return (
            <article
              className="grid gap-4 rounded-md border border-stone-500/20 p-3"
              key={combattant.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <strong>{combattant.nom}</strong>
                  <p className="text-xs text-muted-foreground">
                    {bilan.categorie} · {combattant.experience} →{' '}
                    {combattant.experience + bilan.total} XP
                  </p>
                </div>
                <Badge variant={verrouille ? 'secondary' : 'outline'}>
                  {verrouille ? <Check /> : <Sparkles />} +{bilan.total} XP
                </Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MiniValeur libelle="Survie" valeur={bilan.survie} />
                <MiniValeur
                  libelle="Chef vainqueur"
                  valeur={bilan.chefVainqueur}
                />
                <MiniValeur libelle="Challenger" valeur={bonusChallenger} />
                <MiniValeur
                  libelle="HdC causés"
                  valeur={bilan.ennemisHorsCombat}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Champ
                  libelle="Ennemis HdC par ce Héros"
                  htmlFor={`kills-${combattant.id}`}
                >
                  <Input
                    id={`kills-${combattant.id}`}
                    type="number"
                    min={0}
                    disabled={
                      verrouille ||
                      categorieCombattant(combattant, profilsParId) !== 'Héros'
                    }
                    value={suivi.ennemisHorsCombat}
                    onChange={(event) =>
                      onParticipantChange(combattant.id, {
                        ennemisHorsCombat: Math.max(
                          0,
                          entierDepuisTexte(event.target.value),
                        ),
                      })
                    }
                  />
                </Champ>
                <Champ
                  libelle="Bonus du scénario"
                  htmlFor={`scenario-xp-${combattant.id}`}
                >
                  <Input
                    id={`scenario-xp-${combattant.id}`}
                    type="number"
                    min={0}
                    disabled={verrouille}
                    value={suivi.experienceScenario}
                    onChange={(event) =>
                      onParticipantChange(combattant.id, {
                        experienceScenario: Math.max(
                          0,
                          entierDepuisTexte(event.target.value),
                        ),
                      })
                    }
                  />
                </Champ>
                <Champ
                  libelle="Manuels, miracle ou autre"
                  htmlFor={`manual-xp-${combattant.id}`}
                >
                  <Input
                    id={`manual-xp-${combattant.id}`}
                    type="number"
                    min={0}
                    disabled={verrouille}
                    value={suivi.experienceManuelle}
                    onChange={(event) =>
                      onParticipantChange(combattant.id, {
                        experienceManuelle: Math.max(
                          0,
                          entierDepuisTexte(event.target.value),
                        ),
                      })
                    }
                  />
                </Champ>
              </div>

              {bilan.progressions > 0 && (
                <div className="grid gap-3 rounded-md bg-stone-500/10 p-3">
                  <div>
                    <strong>
                      {bilan.progressions} progression
                      {bilan.progressions > 1 ? 's' : ''} franchie
                      {bilan.progressions > 1 ? 's' : ''}
                    </strong>
                    <p className="text-xs text-muted-foreground">
                      Renseignez chaque 2D6 avant d’appliquer l’expérience.
                    </p>
                  </div>
                  {saisies.map((saisie, index) => {
                    const resultat = progressionSure(
                      saisie.jet,
                      bilan.categorie,
                    );
                    const choix = resultat
                      ? choixProgression(resultat, bilan.categorie)
                      : [];
                    const exigeTexte =
                      resultat?.id === 'competence' ||
                      resultat?.id === 'gars-doue';
                    return (
                      <div
                        className="grid gap-3 rounded-md border border-stone-500/20 bg-background/40 p-3 md:grid-cols-[110px_1fr]"
                        key={index}
                      >
                        <Champ
                          libelle={`Jet ${index + 1}`}
                          htmlFor={`advance-${combattant.id}-${index}`}
                        >
                          <Input
                            id={`advance-${combattant.id}-${index}`}
                            type="number"
                            min={2}
                            max={12}
                            disabled={verrouille}
                            value={saisie.jet ?? ''}
                            onChange={(event) =>
                              onProgressionChange(combattant, index, {
                                jet:
                                  entierDepuisTexte(event.target.value) || null,
                                decision: '',
                              })
                            }
                          />
                        </Champ>
                        <div className="grid gap-2">
                          <p className="text-sm">
                            {resultat ? (
                              <strong>{resultat.titre}</strong>
                            ) : (
                              'Saisissez un total de 2 à 12.'
                            )}
                          </p>
                          {choix.length > 0 && (
                            <NativeSelect
                              aria-label={`Choix de progression ${index + 1} pour ${combattant.nom}`}
                              disabled={verrouille}
                              value={saisie.decision}
                              onChange={(event) =>
                                onProgressionChange(combattant, index, {
                                  decision: event.target.value,
                                })
                              }
                            >
                              <NativeSelectOption value="">
                                Choisir le résultat obtenu
                              </NativeSelectOption>
                              {choix.map((item) => (
                                <NativeSelectOption key={item} value={item}>
                                  {item}
                                </NativeSelectOption>
                              ))}
                              <NativeSelectOption value={CHOIX_AUTRE}>
                                Autre résultat autorisé, à noter
                              </NativeSelectOption>
                            </NativeSelect>
                          )}
                          {exigeTexte && (
                            <Input
                              aria-label={`Décision de progression ${index + 1} pour ${combattant.nom}`}
                              disabled={verrouille}
                              value={saisie.decision}
                              onChange={(event) =>
                                onProgressionChange(combattant, index, {
                                  decision: event.target.value,
                                })
                              }
                              placeholder={
                                resultat?.id === 'competence'
                                  ? 'Nom de la compétence ou du sort'
                                  : 'Nom du promu et résolution du groupe'
                              }
                            />
                          )}
                          {(saisie.decision === CHOIX_AUTRE ||
                            resultat?.id === 'gars-doue') && (
                            <Textarea
                              aria-label={`Note de progression ${index + 1} pour ${combattant.nom}`}
                              disabled={verrouille}
                              value={saisie.note}
                              onChange={(event) =>
                                onProgressionChange(combattant, index, {
                                  note: event.target.value,
                                })
                              }
                              placeholder="Décision complète et conséquences appliquées…"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </CarteEtape>
  );
}

function EtapeExploration({
  bataille,
  desExplorationDeBase,
  saisieLancers,
  resultat,
  onLancersChange,
  onDeConserveChange,
  onNoteChange,
  onApply,
  onContinue,
}: {
  bataille: BatailleEnCours;
  desExplorationDeBase: number;
  saisieLancers: string;
  resultat: ReturnType<typeof resoudreExploration> | null;
  onLancersChange: (texte: string) => void;
  onDeConserveChange: (index: number, conserve: boolean) => void;
  onNoteChange: (note: string) => void;
  onApply: () => void;
  onContinue: () => void;
}) {
  const indices = indicesDesConserves(
    bataille.exploration.lancers,
    bataille.exploration.desConserves,
  );
  return (
    <CarteEtape
      numero={3}
      titre="Revenus et exploration"
      description="Saisissez tous les dés lancés, puis choisissez vous-même jusqu’à six résultats à conserver."
      icone={<Gem />}
      action={
        bataille.exploration.appliquee ? (
          <Button onClick={onContinue}>
            Continuer <ChevronRight />
          </Button>
        ) : (
          <Button onClick={onApply}>
            <Gem /> Ajouter les fragments
          </Button>
        )
      }
    >
      <Alert>
        <Dices />
        <AlertTitle>{desExplorationDeBase} dés de base attendus</AlertTitle>
        <AlertDescription>
          Ajoutez ensuite les éventuels dés de compétences ou d’objets. Vous
          choisissez au maximum six dés à conserver ; le moteur ne privilégie
          pas automatiquement la somme.
        </AlertDescription>
      </Alert>
      <Champ
        libelle="Résultats des dés, séparés par des espaces ou virgules"
        htmlFor="exploration-rolls"
      >
        <Input
          id="exploration-rolls"
          disabled={bataille.exploration.appliquee}
          value={saisieLancers}
          onChange={(event) => onLancersChange(event.target.value)}
          placeholder="Ex. 6, 6, 4, 3, 2, 1, 1"
        />
      </Champ>
      {bataille.exploration.lancers.length > 0 && (
        <div className="grid gap-3">
          <p className="text-sm font-medium">
            Dés conservés ({bataille.exploration.desConserves.length} / 6)
          </p>
          <div className="flex flex-wrap gap-2">
            {bataille.exploration.lancers.map((de, index) => (
              <label
                className="flex cursor-pointer items-center gap-2 rounded-md border border-stone-500/20 px-3 py-2"
                htmlFor={`exploration-die-${index}`}
                key={`${index}-${de}`}
              >
                <Checkbox
                  id={`exploration-die-${index}`}
                  checked={indices.includes(index)}
                  disabled={bataille.exploration.appliquee}
                  onCheckedChange={(checked) =>
                    onDeConserveChange(index, checked === true)
                  }
                />
                <span className="grid size-8 place-items-center rounded border font-semibold">
                  {de}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
      {resultat && (
        <div className="grid gap-3 rounded-md bg-stone-500/10 p-4 sm:grid-cols-3">
          <MiniValeur libelle="Total" valeur={resultat.total} />
          <MiniValeur libelle="Fragments" valeur={resultat.fragments} />
          <MiniValeur
            libelle="Combinaison"
            valeur={
              resultat.combinaison
                ? `${resultat.combinaison.occurrences} × ${resultat.combinaison.valeur}`
                : 'Aucune'
            }
          />
        </div>
      )}
      {resultat?.combinaison && (
        <Champ libelle="Résolution du lieu spécial" htmlFor="exploration-note">
          <Textarea
            id="exploration-note"
            disabled={bataille.exploration.appliquee}
            value={bataille.exploration.noteResultat}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="Lieu obtenu, cible choisie et conséquences…"
          />
        </Champ>
      )}
    </CarteEtape>
  );
}

function EtapeVente({
  campagne,
  bataille,
  onVendusChange,
  onApply,
  onContinue,
}: {
  campagne: EtatCampagne;
  bataille: BatailleEnCours;
  onVendusChange: (fragments: number) => void;
  onApply: () => void;
  onContinue: () => void;
}) {
  const effectif = campagne.combattants.reduce(
    (total, combattant) => total + combattant.quantite,
    0,
  );
  const estimation = calculerVentePierre(
    bataille.vente.fragmentsVendus,
    effectif,
  );
  return (
    <CarteEtape
      numero={4}
      titre="Vente de la pierre magique"
      description="Cette vente ne peut être appliquée qu’une fois pour la bataille."
      icone={<Coins />}
      action={
        bataille.vente.appliquee ? (
          <Button onClick={onContinue}>
            Continuer <ChevronRight />
          </Button>
        ) : (
          <Button onClick={onApply}>
            <Coins /> Appliquer la vente
          </Button>
        )
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <MiniValeur
          libelle="Stock actuel"
          valeur={`${campagne.fragments} fragments`}
        />
        <MiniValeur libelle="Effectif comptabilisé" valeur={effectif} />
        <MiniValeur libelle="Profit estimé" valeur={`${estimation} CO`} />
      </div>
      <Champ libelle="Fragments vendus" htmlFor="wyrdstone-sold">
        <Input
          id="wyrdstone-sold"
          className="max-w-48"
          type="number"
          min={0}
          max={campagne.fragments}
          disabled={bataille.vente.appliquee}
          value={bataille.vente.fragmentsVendus}
          onChange={(event) =>
            onVendusChange(Math.max(0, entierDepuisTexte(event.target.value)))
          }
        />
      </Champ>
      {bataille.vente.appliquee && (
        <Alert>
          <Check />
          <AlertTitle>Vente enregistrée</AlertTitle>
          <AlertDescription>
            {bataille.vente.fragmentsVendus} fragments ont produit{' '}
            {bataille.vente.revenu} CO.
          </AlertDescription>
        </Alert>
      )}
    </CarteEtape>
  );
}

function EtapeVeterans({
  bataille,
  onDeChange,
  onContinue,
}: {
  bataille: BatailleEnCours;
  onDeChange: (cle: 'de1' | 'de2', valeur: string) => void;
  onContinue: () => void;
}) {
  const disponibilite = bataille.veterans.disponibilite;
  const experienceDepensee = bataille.veterans.experienceDepensee ?? 0;
  const experienceRestante = Math.max(
    0,
    (disponibilite ?? 0) - experienceDepensee,
  );
  return (
    <CarteEtape
      numero={5}
      titre="Disponibilité des vétérans"
      description="Le total 2D6 forme un budget d’expérience commun à toutes les recrues ajoutées aux groupes existants."
      icone={<Users />}
      action={
        <Button disabled={disponibilite === null} onClick={onContinue}>
          Valider <ChevronRight />
        </Button>
      }
    >
      <div className="flex flex-wrap items-end gap-3">
        <Champ libelle="Premier D6" htmlFor="veteran-die-1">
          <Input
            id="veteran-die-1"
            className="w-28"
            type="number"
            min={1}
            max={6}
            disabled={experienceDepensee > 0}
            value={bataille.veterans.de1 ?? ''}
            onChange={(event) => onDeChange('de1', event.target.value)}
          />
        </Champ>
        <Champ libelle="Second D6" htmlFor="veteran-die-2">
          <Input
            id="veteran-die-2"
            className="w-28"
            type="number"
            min={1}
            max={6}
            disabled={experienceDepensee > 0}
            value={bataille.veterans.de2 ?? ''}
            onChange={(event) => onDeChange('de2', event.target.value)}
          />
        </Champ>
      </div>
      {disponibilite !== null && (
        <div className="grid gap-3 rounded-md bg-stone-500/10 p-4 sm:grid-cols-3">
          <MiniValeur libelle="Budget initial" valeur={disponibilite} />
          <MiniValeur libelle="XP déjà consommée" valeur={experienceDepensee} />
          <MiniValeur
            libelle="XP encore disponible"
            valeur={experienceRestante}
          />
        </div>
      )}
    </CarteEtape>
  );
}

function EtapeRarete({
  campagne,
  bataille,
  brouillon,
  profilsParId,
  equipementsParId,
  onBrouillonChange,
  onAdd,
  onBuy,
  onContinue,
}: {
  campagne: EtatCampagne;
  bataille: BatailleEnCours;
  brouillon: BrouillonRarete;
  profilsParId: Map<string, (typeof profilsReiklanders)[number]>;
  equipementsParId: Map<string, Equipement>;
  onBrouillonChange: (modification: Partial<BrouillonRarete>) => void;
  onAdd: () => void;
  onBuy: (id: string) => void;
  onContinue: () => void;
}) {
  const heroesDramatis = new Set(
    lirePersonnel(bataille.personnagesSpeciaux)
      .entrees.filter((entree) => entree.type === 'Dramatis Personae')
      .map((entree) => entree.heroId),
  );
  const heroes = campagne.combattants.filter(
    (combattant) =>
      categorieCombattant(combattant, profilsParId) === 'Héros' &&
      bataille.participants[combattant.id]?.horsCombat === 0 &&
      !heroesDramatis.has(combattant.id),
  );
  const rares = equipements.filter((equipement) => equipement.rareteCommerce);
  return (
    <CarteEtape
      numero={6}
      titre="Rareté et objets rares"
      description="Chaque Héros survivant non hors de combat effectue au plus une recherche. Un achat réussi rejoint d’abord le magot."
      icone={<ShoppingCart />}
      action={
        <Button onClick={onContinue}>
          Terminer les recherches <ChevronRight />
        </Button>
      }
    >
      <div className="grid gap-3 rounded-md border border-stone-500/20 p-3 md:grid-cols-5">
        <Champ libelle="Héros" htmlFor="rarity-hero">
          <NativeSelect
            id="rarity-hero"
            value={brouillon.heroId}
            onChange={(event) =>
              onBrouillonChange({ heroId: event.target.value })
            }
          >
            <NativeSelectOption value="">Choisir</NativeSelectOption>
            {heroes.map((hero) => (
              <NativeSelectOption
                key={hero.id}
                value={hero.id}
                disabled={bataille.jetsRarete.some(
                  (jet) => jet.heroId === hero.id,
                )}
              >
                {hero.nom}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Champ>
        <Champ libelle="Objet" htmlFor="rarity-item">
          <NativeSelect
            id="rarity-item"
            value={brouillon.equipementId}
            onChange={(event) =>
              onBrouillonChange({ equipementId: event.target.value })
            }
          >
            <NativeSelectOption value="">Choisir</NativeSelectOption>
            {rares.map((equipement) => (
              <NativeSelectOption key={equipement.id} value={equipement.id}>
                {equipement.nom} — {equipement.rareteCommerce}+
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Champ>
        <Champ libelle="D6" htmlFor="rarity-die-1">
          <Input
            id="rarity-die-1"
            type="number"
            min={1}
            max={6}
            value={brouillon.de1}
            onChange={(event) => onBrouillonChange({ de1: event.target.value })}
          />
        </Champ>
        <Champ libelle="D6" htmlFor="rarity-die-2">
          <Input
            id="rarity-die-2"
            type="number"
            min={1}
            max={6}
            value={brouillon.de2}
            onChange={(event) => onBrouillonChange({ de2: event.target.value })}
          />
        </Champ>
        <div className="flex items-end">
          <Button className="w-full" variant="secondary" onClick={onAdd}>
            <Plus /> Ajouter
          </Button>
        </div>
      </div>

      <div className="grid gap-2">
        {bataille.jetsRarete.length === 0 && (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Aucun jet de rareté enregistré.
          </p>
        )}
        {bataille.jetsRarete.map((jet) => {
          const hero = campagne.combattants.find(
            (item) => item.id === jet.heroId,
          );
          const equipement = equipementsParId.get(jet.equipementId);
          return (
            <article
              className="flex flex-wrap items-center gap-3 rounded-md border border-stone-500/20 p-3"
              key={jet.id}
            >
              <div className="grid min-w-0 flex-1">
                <strong>{equipement?.nom ?? jet.equipementId}</strong>
                <span className="text-xs text-muted-foreground">
                  {hero?.nom ?? 'Héros inconnu'} · {jet.de1} + {jet.de2} ·{' '}
                  {jet.prix} CO
                </span>
              </div>
              <Badge variant={jet.reussi ? 'secondary' : 'outline'}>
                {jet.reussi ? 'Trouvé' : 'Échec'}
              </Badge>
              {jet.reussi && !jet.achete && (
                <Button
                  size="sm"
                  disabled={jet.prix > campagne.couronnes}
                  onClick={() => onBuy(jet.id)}
                >
                  <ShoppingCart /> Acheter
                </Button>
              )}
              {jet.achete && (
                <Badge>
                  <Check /> Au magot
                </Badge>
              )}
            </article>
          );
        })}
      </div>
    </CarteEtape>
  );
}

function EtapePersonnel({
  campagne,
  bataille,
  profilsParId,
  dossier,
  brouillon,
  onBrouillonChange,
  onAdd,
  onNone,
  onDelete,
  onContinue,
  peutContinuer,
}: {
  campagne: EtatCampagne;
  bataille: BatailleEnCours;
  profilsParId: Map<string, (typeof profilsReiklanders)[number]>;
  dossier: DossierPersonnel;
  brouillon: Omit<EntreePersonnel, 'id'>;
  onBrouillonChange: (
    modification: Partial<Omit<EntreePersonnel, 'id'>>,
  ) => void;
  onAdd: () => void;
  onNone: () => void;
  onDelete: (id: string) => void;
  onContinue: () => void;
  peutContinuer: boolean;
}) {
  const heroesAdmissibles = campagne.combattants.filter(
    (combattant) =>
      categorieCombattant(combattant, profilsParId) === 'Héros' &&
      bataille.participants[combattant.id]?.horsCombat === 0 &&
      !bataille.jetsRarete.some((jet) => jet.heroId === combattant.id) &&
      !dossier.entrees.some(
        (entree) =>
          entree.type === 'Dramatis Personae' &&
          entree.heroId === combattant.id,
      ),
  );
  return (
    <CarteEtape
      numero={7}
      titre="Personnel spécial"
      description="Un Franc-tireur s’engage directement. Pour un Dramatis Persona, ajoutez un test par Héros chercheur ; une réussite suffit, et aucun de ces Héros ne peut chercher un objet rare."
      icone={<UserRoundSearch />}
      action={
        <Button disabled={!peutContinuer} onClick={onContinue}>
          Valider <ChevronRight />
        </Button>
      }
    >
      <div className="grid gap-3 rounded-md border border-stone-500/20 p-3 md:grid-cols-2">
        <Champ libelle="Type" htmlFor="special-type">
          <NativeSelect
            id="special-type"
            value={brouillon.type}
            onChange={(event) =>
              onBrouillonChange({
                type: event.target.value as EntreePersonnel['type'],
                heroId: '',
                jetInitiative: null,
              })
            }
          >
            <NativeSelectOption value="Franc-tireur">
              Franc-tireur
            </NativeSelectOption>
            <NativeSelectOption value="Dramatis Personae">
              Dramatis Personae
            </NativeSelectOption>
            <NativeSelectOption value="Autre">Autre</NativeSelectOption>
          </NativeSelect>
        </Champ>
        <Champ libelle="Nom" htmlFor="special-name">
          <Input
            id="special-name"
            maxLength={160}
            value={brouillon.nom}
            onChange={(event) => onBrouillonChange({ nom: event.target.value })}
          />
        </Champ>
        <Champ libelle="Décision" htmlFor="special-decision">
          <NativeSelect
            id="special-decision"
            value={brouillon.decision}
            onChange={(event) =>
              onBrouillonChange({
                decision: event.target.value as EntreePersonnel['decision'],
              })
            }
          >
            <NativeSelectOption value="Engagé">Engagé</NativeSelectOption>
            <NativeSelectOption value="Refusé">Refusé</NativeSelectOption>
            <NativeSelectOption value="Indisponible">
              Indisponible
            </NativeSelectOption>
            <NativeSelectOption value="Autre">Autre</NativeSelectOption>
          </NativeSelect>
        </Champ>
        <Champ libelle="Coût noté" htmlFor="special-cost">
          <Input
            id="special-cost"
            type="number"
            min={0}
            value={brouillon.cout}
            onChange={(event) =>
              onBrouillonChange({
                cout: Math.max(0, entierDepuisTexte(event.target.value)),
              })
            }
          />
        </Champ>
        {brouillon.type === 'Dramatis Personae' && (
          <>
            <Champ libelle="Héros chercheur" htmlFor="special-hero">
              <NativeSelect
                id="special-hero"
                value={brouillon.heroId}
                onChange={(event) =>
                  onBrouillonChange({ heroId: event.target.value })
                }
              >
                <NativeSelectOption value="">Choisir</NativeSelectOption>
                {heroesAdmissibles.map((hero) => (
                  <NativeSelectOption key={hero.id} value={hero.id}>
                    {hero.nom} — I {hero.statistiques.initiative}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Champ>
            <Champ
              libelle="Jet d’Initiative (D6)"
              htmlFor="special-initiative-roll"
            >
              <Input
                id="special-initiative-roll"
                type="number"
                min={1}
                max={6}
                value={brouillon.jetInitiative ?? ''}
                onChange={(event) =>
                  onBrouillonChange({
                    jetInitiative: event.target.value
                      ? entierDepuisTexte(event.target.value)
                      : null,
                  })
                }
              />
            </Champ>
          </>
        )}
        <div className="md:col-span-2">
          <Champ libelle="Notes" htmlFor="special-note">
            <Textarea
              id="special-note"
              maxLength={3000}
              value={brouillon.note}
              onChange={(event) =>
                onBrouillonChange({ note: event.target.value })
              }
              placeholder="Disponibilité, entretien, règle propre ou décision du maître de campagne…"
            />
          </Champ>
        </div>
        <div className="flex flex-wrap justify-end gap-2 md:col-span-2">
          <Button variant="outline" onClick={onNone}>
            Aucun personnage recherché
          </Button>
          <Button onClick={onAdd}>
            <Plus /> Ajouter la note structurée
          </Button>
        </div>
      </div>
      {dossier.aucun && (
        <Alert>
          <Check />
          <AlertTitle>Aucune recherche</AlertTitle>
          <AlertDescription>
            Cette étape est explicitement renseignée.
          </AlertDescription>
        </Alert>
      )}
      {dossier.entrees.map((entree) => (
        <article
          className="flex flex-wrap items-center gap-3 rounded-md border border-stone-500/20 p-3"
          key={entree.id}
        >
          <div className="grid min-w-0 flex-1">
            <strong>{entree.nom}</strong>
            <span className="text-xs text-muted-foreground">
              {entree.type} · {entree.decision} · {entree.cout} CO
              {entree.heroId
                ? ` · ${campagne.combattants.find((combattant) => combattant.id === entree.heroId)?.nom ?? 'Héros inconnu'} · D6 ${entree.jetInitiative ?? '—'}`
                : ''}
            </span>
            {entree.note && <p className="mt-1 text-sm">{entree.note}</p>}
          </div>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Supprimer ${entree.nom}`}
            onClick={() => onDelete(entree.id)}
          >
            <Trash2 />
          </Button>
        </article>
      ))}
    </CarteEtape>
  );
}

function EtapeRecrutement({
  recrutement,
  onContinue,
}: {
  recrutement?: React.ReactNode;
  onContinue: () => void;
}) {
  return (
    <CarteEtape
      numero={8}
      titre="Recrues et objets communs"
      description="Utilisez le builder de recrutement fourni par l’application, puis validez cette étape."
      icone={<Users />}
      action={
        <Button onClick={onContinue}>
          Recrutement terminé <ChevronRight />
        </Button>
      }
    >
      {recrutement ?? (
        <Alert>
          <Users />
          <AlertTitle>Aucun module de recrutement fourni</AlertTitle>
          <AlertDescription>
            Vous pouvez néanmoins valider l’étape si aucune recrue ni aucun
            objet commun n’est acheté.
          </AlertDescription>
        </Alert>
      )}
    </CarteEtape>
  );
}

function EtapeAllocation({
  campagne,
  selection,
  equipementsParId,
  onSelectionChange,
  onAssign,
  onReturn,
  onContinue,
}: {
  campagne: EtatCampagne;
  selection: { equipementId: string; combattantId: string };
  equipementsParId: Map<string, Equipement>;
  onSelectionChange: (
    modification: Partial<{ equipementId: string; combattantId: string }>,
  ) => void;
  onAssign: () => void;
  onReturn: (combattantId: string, position: number) => void;
  onContinue: () => void;
}) {
  const inventaire = Object.entries(campagne.inventaire).filter(
    ([, quantite]) => quantite > 0,
  );
  return (
    <CarteEtape
      numero={9}
      titre="Allocation de l’équipement"
      description="Les groupes consomment un exemplaire par membre afin de conserver un équipement identique."
      icone={<PackageOpen />}
      action={
        <Button onClick={onContinue}>
          Allocation terminée <ChevronRight />
        </Button>
      }
    >
      <div className="grid gap-3 rounded-md border border-stone-500/20 p-3 md:grid-cols-[1fr_1fr_auto]">
        <Champ libelle="Objet du magot" htmlFor="allocation-item">
          <NativeSelect
            id="allocation-item"
            value={selection.equipementId}
            onChange={(event) =>
              onSelectionChange({ equipementId: event.target.value })
            }
          >
            <NativeSelectOption value="">Choisir</NativeSelectOption>
            {inventaire.map(([id, quantite]) => (
              <NativeSelectOption key={id} value={id}>
                {equipementsParId.get(id)?.nom ?? id} × {quantite}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Champ>
        <Champ libelle="Combattant ou groupe" htmlFor="allocation-fighter">
          <NativeSelect
            id="allocation-fighter"
            value={selection.combattantId}
            onChange={(event) =>
              onSelectionChange({ combattantId: event.target.value })
            }
          >
            <NativeSelectOption value="">Choisir</NativeSelectOption>
            {campagne.combattants.map((combattant) => (
              <NativeSelectOption key={combattant.id} value={combattant.id}>
                {combattant.nom}
                {combattant.quantite > 1 ? ` × ${combattant.quantite}` : ''}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Champ>
        <div className="flex items-end">
          <Button onClick={onAssign}>
            <PackageOpen /> Attribuer
          </Button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {campagne.combattants.map((combattant) => (
          <article
            className="grid gap-2 rounded-md border border-stone-500/20 p-3"
            key={combattant.id}
          >
            <div>
              <strong>{combattant.nom}</strong>
              <p className="text-xs text-muted-foreground">
                {combattant.quantite > 1
                  ? `Groupe de ${combattant.quantite}`
                  : 'Combattant individuel'}
              </p>
            </div>
            {combattant.equipementIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun objet alloué hors dague gratuite.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {combattant.equipementIds.map((id, index) => (
                  <Button
                    key={`${id}-${index}`}
                    size="sm"
                    variant="outline"
                    onClick={() => onReturn(combattant.id, index)}
                  >
                    {equipementsParId.get(id)?.nom ?? id}{' '}
                    <ChevronRight className="rotate-180" /> Magot
                  </Button>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </CarteEtape>
  );
}

function EtapeFinalisation({
  campagne,
  bataille,
  valeurBande,
  onNotesChange,
  onFinalize,
}: {
  campagne: EtatCampagne;
  bataille: BatailleEnCours;
  valeurBande: number;
  onNotesChange: (notes: string) => void;
  onFinalize: () => void;
}) {
  return (
    <CarteEtape
      numero={10}
      titre="Finalisation"
      description="La validation ajoute une Partie complète et ferme la bataille dans une seule mise à jour."
      icone={<Check />}
      action={
        <Button onClick={onFinalize}>
          <Check /> Finaliser la bataille
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniValeur libelle="Valeur avant" valeur={bataille.valeurAvant} />
        <MiniValeur libelle="Valeur après" valeur={valeurBande} />
        <MiniValeur
          libelle="Fragments trouvés"
          valeur={bataille.exploration.fragmentsTrouves}
        />
        <MiniValeur libelle="Revenu" valeur={`${bataille.vente.revenu} CO`} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <MiniValeur
          libelle="Trésor final"
          valeur={`${campagne.couronnes} CO`}
        />
        <MiniValeur libelle="Pierre restante" valeur={campagne.fragments} />
        <MiniValeur libelle="Valeur adverse" valeur={bataille.valeurAdverse} />
      </div>
      <Champ libelle="Notes générales de la bataille" htmlFor="battle-notes">
        <Textarea
          id="battle-notes"
          value={bataille.notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Décisions de table, objectif, récompense spéciale…"
        />
      </Champ>
      <Alert>
        <Check />
        <AlertTitle>Prêt à archiver</AlertTitle>
        <AlertDescription>
          Les ressources et combattants sont déjà à jour ; cette action archive
          leur état dans l’historique des parties.
        </AlertDescription>
      </Alert>
    </CarteEtape>
  );
}

function CarteEtape({
  numero,
  titre,
  description,
  icone,
  action,
  children,
}: {
  numero: number;
  titre: string;
  description: string;
  icone: React.ReactNode;
  action: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-stone-500/30 bg-[rgba(252,248,236,.78)] shadow-sm">
      <CardHeader className="border-b border-stone-500/20">
        <CardTitle className="flex items-center gap-2 text-xl">
          <span className="grid size-8 place-items-center rounded-full border border-red-950/30 text-red-950 [&>svg]:size-4">
            {icone}
          </span>
          {titre}
        </CardTitle>
        <CardDescription>
          Étape {numero} · {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 pt-5">{children}</CardContent>
      <CardFooter className="justify-end">{action}</CardFooter>
    </Card>
  );
}

function Champ({
  libelle,
  htmlFor,
  children,
}: {
  libelle: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm" htmlFor={htmlFor}>
      <span className="font-medium">{libelle}</span>
      {children}
    </label>
  );
}

function MiniValeur({
  libelle,
  valeur,
}: {
  libelle: string;
  valeur: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 rounded-md border border-stone-500/20 bg-background/30 px-3 py-2">
      <span className="text-xs text-muted-foreground">{libelle}</span>
      <strong>{valeur}</strong>
    </div>
  );
}

function creerSuiviCombattant(combattantId: string): SuiviCombattantBataille {
  return {
    combattantId,
    horsCombat: 0,
    jetsBlessure: [],
    blessureResolue: false,
    blessureNote: '',
    ennemisHorsCombat: 0,
    experienceScenario: 0,
    experienceManuelle: 0,
    experienceAppliquee: false,
    progressionsNote: '',
  };
}

function normaliserEtapes(etapes: boolean[]) {
  return Array.from({ length: 10 }, (_, index) => etapes[index] ?? false);
}

function entierDepuisTexte(valeur: string) {
  const nombre = Number(valeur);
  return Number.isFinite(nombre) ? Math.floor(nombre) : 0;
}

function categorieCombattant(
  combattant: Combattant,
  profilsParId: Map<string, (typeof profilsReiklanders)[number]>,
) {
  return profilsParId.get(combattant.profilId)?.categorie ?? 'Hommes de main';
}

function lireResolutionBlessure(texte: string): ResolutionBlessureStructuree {
  if (!texte.startsWith(MARQUEUR_BLESSURE)) {
    return { version: 1, jetSecondaire: null, note: texte };
  }
  try {
    const donnees = JSON.parse(
      texte.slice(MARQUEUR_BLESSURE.length),
    ) as Partial<ResolutionBlessureStructuree>;
    return {
      version: 1,
      jetSecondaire:
        typeof donnees.jetSecondaire === 'number'
          ? donnees.jetSecondaire
          : null,
      note: typeof donnees.note === 'string' ? donnees.note : '',
    };
  } catch {
    return { version: 1, jetSecondaire: null, note: '' };
  }
}

function serialiserResolutionBlessure(
  resolution: ResolutionBlessureStructuree,
) {
  return `${MARQUEUR_BLESSURE}${JSON.stringify(resolution)}`;
}

function decrireResolutionBlessure(texte: string) {
  const resolution = lireResolutionBlessure(texte);
  return [
    resolution.jetSecondaire !== null
      ? `Jet secondaire : ${resolution.jetSecondaire}.`
      : '',
    resolution.note.trim(),
  ]
    .filter(Boolean)
    .join(' ');
}

function descriptionJetBlessure(
  resultatId: string | undefined,
  jet: number | null,
) {
  if (jet === null)
    return 'Saisissez le jet secondaire pour appliquer la conséquence.';
  if (resultatId === 'bras')
    return jet === 1
      ? 'Bras amputé : une seule arme à une main désormais.'
      : 'Blessure légère : le Héros manquera la prochaine partie.';
  if (resultatId === 'jambe-ecrasee')
    return jet === 1
      ? 'Le Héros ne peut désormais plus courir, mais peut toujours charger.'
      : 'Le Héros manquera la prochaine partie.';
  if (resultatId === 'profonde')
    return `Le Héros manquera les ${jet} prochaine${jet > 1 ? 's' : ''} partie${jet > 1 ? 's' : ''}.`;
  return '';
}

function validerBlessures(
  combattants: Combattant[],
  bataille: BatailleEnCours,
  profilsParId: Map<string, (typeof profilsReiklanders)[number]>,
) {
  for (const combattant of combattants) {
    const suivi = bataille.participants[combattant.id];
    if (suivi.blessureResolue) continue;
    const categorie = categorieCombattant(combattant, profilsParId);
    if (suivi.jetsBlessure.length < suivi.horsCombat) {
      return `${combattant.nom} : tous les jets de blessure sont obligatoires.`;
    }
    for (const jet of suivi.jetsBlessure.slice(0, suivi.horsCombat)) {
      if (categorie === 'Héros') {
        const blessure = blessureHeroSure(jet);
        if (!blessure)
          return `${combattant.nom} : le D66 doit avoir deux chiffres compris entre 1 et 6.`;
        if (['bras', 'jambe-ecrasee', 'profonde'].includes(blessure.id)) {
          const resolution = lireResolutionBlessure(suivi.blessureNote);
          const maximum = blessure.id === 'profonde' ? 3 : 6;
          if (
            resolution.jetSecondaire === null ||
            !Number.isInteger(resolution.jetSecondaire) ||
            resolution.jetSecondaire < 1 ||
            resolution.jetSecondaire > maximum
          ) {
            return `${combattant.nom} : « ${blessure.titre} » exige un ${blessure.id === 'profonde' ? 'D3' : 'D6'} valide.`;
          }
          continue;
        }
        if (
          blessure.application !== 'automatique' &&
          !suivi.blessureNote.trim()
        ) {
          return `${combattant.nom} : la branche « ${blessure.titre} » exige une note de résolution.`;
        }
      } else {
        try {
          resoudreBlessureHommeDeMain(jet);
        } catch {
          return `${combattant.nom} : chaque jet doit être un D6 valide.`;
        }
      }
    }
  }
  return null;
}

function blessureHeroSure(d66: number) {
  try {
    return trouverBlessureHero(d66);
  } catch {
    return null;
  }
}

/** Applique les effets déterministes et les absences issues des jets secondaires saisis. */
function appliquerResultatHero(
  combattant: Combattant,
  resultatId: string,
  note: string,
) {
  const statistiques = { ...combattant.statistiques };
  const blessures = [...combattant.blessures];
  const competences = [...combattant.competences];
  let equipementIds = [...combattant.equipementIds];
  let partiesManquees = combattant.partiesManquees;
  const resolution = lireResolutionBlessure(note);

  if (resultatId === 'mort') return null;
  if (resultatId === 'jambe')
    statistiques.mouvement = Math.max(1, statistiques.mouvement - 1);
  if (resultatId === 'torse')
    statistiques.endurance = Math.max(1, statistiques.endurance - 1);
  if (resultatId === 'oeil') {
    if (blessures.some((blessure) => blessure.startsWith('Œil crevé')))
      return null;
    statistiques.capaciteTir = Math.max(1, statistiques.capaciteTir - 1);
  }
  if (resultatId === 'nerveux')
    statistiques.initiative = Math.max(1, statistiques.initiative - 1);
  if (resultatId === 'main')
    statistiques.capaciteCombat = Math.max(1, statistiques.capaciteCombat - 1);
  if (resultatId === 'depouille') equipementIds = [];
  if (resultatId === 'bras' && (resolution.jetSecondaire ?? 0) >= 2)
    partiesManquees = Math.max(partiesManquees, 1);
  if (resultatId === 'jambe-ecrasee' && (resolution.jetSecondaire ?? 0) >= 2)
    partiesManquees = Math.max(partiesManquees, 1);
  if (resultatId === 'profonde' && resolution.jetSecondaire !== null)
    partiesManquees = Math.max(partiesManquees, resolution.jetSecondaire);
  if (
    resultatId === 'endurci' &&
    !competences.includes('Endurci — immunisé à la peur')
  )
    competences.push('Endurci — immunisé à la peur');
  if (
    resultatId === 'balafres' &&
    !competences.includes('Horribles balafres — provoque la peur')
  )
    competences.push('Horribles balafres — provoque la peur');

  const resultat = blessureParId(resultatId);
  if (
    resultat &&
    !['recuperation', 'miracle', 'endurci', 'balafres'].includes(resultatId)
  ) {
    const libelle =
      resultat.application === 'automatique'
        ? resultat.titre
        : `${resultat.titre} — ${decrireResolutionBlessure(note)}`;
    blessures.push(libelle);
  }

  return {
    ...combattant,
    statistiques,
    blessures,
    competences,
    equipementIds,
    partiesManquees,
    statut:
      partiesManquees > 0
        ? ('Absent' as const)
        : resultat?.application === 'automatique' ||
            ['bras', 'jambe-ecrasee', 'profonde'].includes(resultatId)
          ? ('Prêt' as const)
          : ('Blessé' as const),
  };
}

function blessureParId(id: string) {
  for (let d1 = 1; d1 <= 6; d1 += 1) {
    for (let d2 = 1; d2 <= 6; d2 += 1) {
      const resultat = trouverBlessureHero(d1 * 10 + d2);
      if (resultat.id === id) return resultat;
    }
  }
  return null;
}

function candidatsSuccession(
  combattants: Combattant[],
  profilsParId: Map<string, (typeof profilsReiklanders)[number]>,
) {
  const heroes = combattants.filter(
    (combattant) => categorieCombattant(combattant, profilsParId) === 'Héros',
  );
  if (heroes.length === 0) return [];
  const commandement = Math.max(
    ...heroes.map((hero) => hero.statistiques.commandement),
  );
  const meilleursCd = heroes.filter(
    (hero) => hero.statistiques.commandement === commandement,
  );
  const experience = Math.max(...meilleursCd.map((hero) => hero.experience));
  return meilleursCd.filter((hero) => hero.experience === experience);
}

function lireProgressions(texte: string, nombre: number): DossierProgressions {
  let saisies: SaisieProgression[] = [];
  if (texte.startsWith(MARQUEUR_PROGRESSIONS)) {
    try {
      const donnees = JSON.parse(
        texte.slice(MARQUEUR_PROGRESSIONS.length),
      ) as Partial<DossierProgressions>;
      if (Array.isArray(donnees.saisies)) {
        saisies = donnees.saisies.map((saisie) => ({
          jet: typeof saisie.jet === 'number' ? saisie.jet : null,
          decision: typeof saisie.decision === 'string' ? saisie.decision : '',
          note: typeof saisie.note === 'string' ? saisie.note : '',
        }));
      }
    } catch {
      saisies = [];
    }
  }
  while (saisies.length < nombre)
    saisies.push({ jet: null, decision: '', note: '' });
  return { version: 1, saisies: saisies.slice(0, nombre) };
}

function serialiserProgressions(dossier: DossierProgressions) {
  return `${MARQUEUR_PROGRESSIONS}${JSON.stringify(dossier)}`;
}

function progressionSure(
  jet: number | null,
  categorie: 'Héros' | 'Hommes de main',
) {
  if (jet === null) return null;
  try {
    return categorie === 'Héros'
      ? trouverProgressionHero(jet)
      : trouverProgressionHommeDeMain(jet);
  } catch {
    return null;
  }
}

function choixProgression(
  resultat: Progression,
  categorie: 'Héros' | 'Hommes de main',
) {
  if (resultat.choix) return resultat.choix;
  if (categorie === 'Hommes de main') {
    if (resultat.id === 'initiative') return ['Initiative'];
    if (resultat.id === 'force') return ['Force'];
    if (resultat.id === 'attaques') return ['Attaques'];
    if (resultat.id === 'commandement') return ['Commandement'];
  }
  return [];
}

function validerProgressions(
  combattant: Combattant,
  saisies: SaisieProgression[],
  categorie: 'Héros' | 'Hommes de main',
  statistiquesInitiales: Statistiques,
) {
  /* Les jets multiples se contrôlent dans l'ordre : chaque hausse modifie la suivante. */
  const statistiquesSimulees = { ...combattant.statistiques };
  for (const saisie of saisies) {
    const resultat = progressionSure(saisie.jet, categorie);
    if (!resultat) return 'chaque progression exige un jet 2D6 valide.';
    const choix = choixProgression(resultat, categorie);
    if (
      (choix.length > 1 ||
        resultat.id === 'competence' ||
        resultat.id === 'gars-doue') &&
      !saisie.decision.trim()
    ) {
      return `la progression « ${resultat.titre} » exige une décision.`;
    }
    if (saisie.decision === CHOIX_AUTRE && !saisie.note.trim()) {
      return 'un résultat de remplacement doit être détaillé dans la note.';
    }
    if (resultat.id === 'gars-doue' && !saisie.note.trim()) {
      return '« Ce gars est doué » exige la résolution complète du nouveau Héros et du groupe.';
    }
    const caracteristique =
      saisie.decision === CHOIX_AUTRE
        ? CHOIX_AUTRE
        : choix.length === 1
          ? choix[0]
          : saisie.decision;
    if (
      caracteristique &&
      caracteristique !== CHOIX_AUTRE &&
      !peutAugmenter(
        statistiquesSimulees,
        caracteristique,
        categorie,
        statistiquesInitiales,
      )
    ) {
      return `${caracteristique} est déjà au maximum : effectuez la relance requise ou notez un remplacement autorisé.`;
    }
    if (caracteristique && caracteristique !== CHOIX_AUTRE) {
      augmenterCaracteristique(
        statistiquesSimulees,
        caracteristique,
        categorie,
        statistiquesInitiales,
      );
    }
  }
  return null;
}

function appliquerProgressionsCombattant(
  combattant: Combattant,
  saisies: SaisieProgression[],
  categorie: 'Héros' | 'Hommes de main',
  statistiquesInitiales: Statistiques,
) {
  const statistiques = { ...combattant.statistiques };
  const competences = [...combattant.competences];
  const progressions = [...combattant.progressions];

  for (const saisie of saisies) {
    const resultat = progressionSure(saisie.jet, categorie);
    if (!resultat) continue;
    if (resultat.id === 'competence') {
      if (!competences.includes(saisie.decision))
        competences.push(saisie.decision);
    } else if (resultat.id !== 'gars-doue') {
      const choix = choixProgression(resultat, categorie);
      const caracteristique =
        saisie.decision === CHOIX_AUTRE
          ? CHOIX_AUTRE
          : choix.length === 1
            ? choix[0]
            : saisie.decision;
      if (caracteristique !== CHOIX_AUTRE)
        augmenterCaracteristique(
          statistiques,
          caracteristique,
          categorie,
          statistiquesInitiales,
        );
    }
    const details = [
      saisie.decision === CHOIX_AUTRE ? saisie.note : saisie.decision,
      saisie.note,
    ]
      .filter((item, index, liste) => item && liste.indexOf(item) === index)
      .join(' — ');
    progressions.push(`${resultat.titre}${details ? ` : ${details}` : ''}`);
  }

  return { ...combattant, statistiques, competences, progressions };
}

function cleCaracteristique(libelle: string): keyof Statistiques | null {
  const correspondances: Record<string, keyof Statistiques> = {
    Mouvement: 'mouvement',
    'Capacité de Combat': 'capaciteCombat',
    'Capacité de Tir': 'capaciteTir',
    Force: 'force',
    Endurance: 'endurance',
    'Points de Vie': 'pointsVie',
    Initiative: 'initiative',
    Attaques: 'attaques',
    Commandement: 'commandement',
  };
  return correspondances[libelle] ?? null;
}

function maximumProgression(
  cle: keyof Statistiques,
  categorie: 'Héros' | 'Hommes de main',
  statistiquesInitiales: Statistiques,
) {
  if (categorie === 'Héros') return maximumsHumains[cle];
  /* Un Homme de main ne peut dépasser son profil initial que d'un point. */
  return Math.min(maximumsHumains[cle], statistiquesInitiales[cle] + 1);
}

function peutAugmenter(
  statistiques: Statistiques,
  libelle: string,
  categorie: 'Héros' | 'Hommes de main',
  statistiquesInitiales: Statistiques,
) {
  const cle = cleCaracteristique(libelle);
  return cle
    ? statistiques[cle] <
        maximumProgression(cle, categorie, statistiquesInitiales)
    : true;
}

function augmenterCaracteristique(
  statistiques: Statistiques,
  libelle: string,
  categorie: 'Héros' | 'Hommes de main',
  statistiquesInitiales: Statistiques,
) {
  const cle = cleCaracteristique(libelle);
  if (!cle) return;
  statistiques[cle] = Math.min(
    maximumProgression(cle, categorie, statistiquesInitiales),
    statistiques[cle] + 1,
  );
}

function extraireDes(texte: string) {
  if (!texte.trim()) return [];
  return texte
    .split(/[\s,;]+/)
    .map((valeur) => Number(valeur))
    .filter((valeur) => Number.isInteger(valeur) && valeur >= 1 && valeur <= 6);
}

function indicesDesConserves(lancers: number[], conserves: number[]) {
  const utilises = new Set<number>();
  const indices: number[] = [];
  for (const conserve of conserves) {
    const index = lancers.findIndex(
      (de, position) => de === conserve && !utilises.has(position),
    );
    if (index >= 0) {
      utilises.add(index);
      indices.push(index);
    }
  }
  return indices;
}

function resoudreExplorationSure(des: number[]) {
  try {
    return des.length > 0 ? resoudreExploration(des) : null;
  } catch {
    return null;
  }
}

function prixCommerce(equipement: Equipement, campagne: EtatCampagne) {
  if (
    campagne.homebrew.actifs &&
    campagne.homebrew.coutsEquipements[equipement.id] !== undefined
  ) {
    return campagne.homebrew.coutsEquipements[equipement.id];
  }
  return equipement.coutCommerce ?? equipement.cout;
}

function lirePersonnel(texte: string): DossierPersonnel {
  if (!texte) return { version: 1, aucun: false, entrees: [] };
  if (texte.startsWith(MARQUEUR_PERSONNEL)) {
    try {
      const dossier = JSON.parse(
        texte.slice(MARQUEUR_PERSONNEL.length),
      ) as DossierPersonnel;
      if (Array.isArray(dossier.entrees)) {
        return {
          version: 1,
          aucun: Boolean(dossier.aucun),
          entrees: dossier.entrees.map((entree) => ({
            ...entree,
            heroId: entree.heroId ?? '',
            jetInitiative: entree.jetInitiative ?? null,
            coutApplique: entree.coutApplique ?? false,
          })),
        };
      }
    } catch {
      return { version: 1, aucun: false, entrees: [] };
    }
  }
  return {
    version: 1,
    aucun: false,
    entrees: [
      {
        id: 'note-importee',
        type: 'Autre',
        nom: 'Note importée',
        decision: 'Autre',
        heroId: '',
        jetInitiative: null,
        cout: 0,
        coutApplique: false,
        note: texte,
      },
    ],
  };
}

function serialiserPersonnel(dossier: DossierPersonnel) {
  return `${MARQUEUR_PERSONNEL}${JSON.stringify(dossier)}`;
}

function peutRecevoirEquipement(
  combattant: Combattant,
  equipement: Equipement,
  profilsParId: Map<string, (typeof profilsReiklanders)[number]>,
) {
  const profil = profilsParId.get(combattant.profilId);
  if (!profil) return false;
  if (equipement.patchGlm) return false;
  if (equipement.reserveAuxHeros && profil.categorie !== 'Héros') return false;
  if (profil.listeEquipement === 'tireurs')
    return equipement.listeTireurs === true;
  return equipement.listeMercenaires === true;
}

function construireNotesPartie(bataille: BatailleEnCours) {
  const personnel = lirePersonnel(bataille.personnagesSpeciaux);
  const lignesPersonnel = personnel.aucun
    ? ['Personnel spécial : aucun.']
    : personnel.entrees.map(
        (entree) =>
          `${entree.type} ${entree.nom} : ${entree.decision}${entree.heroId ? `, chercheur ${entree.heroId}, D6 ${entree.jetInitiative}` : ''}${entree.cout ? `, ${entree.cout} CO` : ''}${entree.note ? ` — ${entree.note}` : ''}.`,
      );
  return [
    bataille.notes.trim(),
    bataille.exploration.noteResultat.trim()
      ? `Exploration : ${bataille.exploration.noteResultat.trim()}`
      : '',
    ...lignesPersonnel,
  ]
    .filter(Boolean)
    .join('\n');
}

export default PostBattleWorkflow;
