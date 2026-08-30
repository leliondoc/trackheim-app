'use client';

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  CircleAlert,
  Coins,
  ExternalLink,
  FileText,
  FlaskConical,
  Gem,
  LayoutDashboard,
  Minus,
  PackageOpen,
  Plus,
  Search,
  Settings2,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Trash2,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Progress, ProgressLabel } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  bandesBibliotheque,
  equipements,
  etapesApresBataille,
  etatInitial,
  profilsReiklanders,
  SOURCE_GLM,
  type BandeBibliotheque,
  type Combattant,
  type Equipement,
  type EtatCampagne,
  type ProfilRecrue,
  type RegleHomebrew,
  type ReglagesHomebrew,
  type Statistiques,
} from '@/lib/mordheim-data';
import {
  ID_RULESET,
  calculerValeurBande,
  rulesetGlmStrict,
  rulesetOfficiel,
  surcoutVeteran,
} from '@/lib/mordheim-rules';
import { RulesetProvenance } from '@/components/ruleset-provenance';

const PostBattleWorkflow = lazy(() =>
  import('@/components/post-battle-workflow').then((module) => ({
    default: module.PostBattleWorkflow,
  })),
);

type Vue =
  | 'overview'
  | 'warband'
  | 'campaign'
  | 'library'
  | 'homebrew'
  | 'settings';
type EtatSauvegarde =
  | 'chargement'
  | 'sauvegarde'
  | 'sauvegarde-ok'
  | 'hors-ligne'
  | 'conflit'
  | 'erreur';
type FiltreGrade = 'tous' | BandeBibliotheque['grade'];

const ID_CAMPAGNE = 'campagne-principale';
const CLE_CAMPAGNE_ACTIVE = 'trackheim:campagne-active';

type CopieLocale = {
  campagne: EtatCampagne;
  revisionServeur: number;
  modifiee: boolean;
  date: string;
};

type ConflitSauvegarde = {
  idCampagne: string;
  campagne: EtatCampagne | null;
  revision: number;
};

const navigation: Array<{
  id: Vue;
  libelle: string;
  icone: typeof LayoutDashboard;
}> = [
  { id: 'overview', libelle: 'Vue d’ensemble', icone: LayoutDashboard },
  { id: 'warband', libelle: 'Ma bande', icone: Shield },
  { id: 'campaign', libelle: 'Campagne', icone: Swords },
  { id: 'library', libelle: 'Bibliothèque', icone: BookOpen },
];

const pagesRecherche: Array<{
  id: Vue;
  libelle: string;
  description: string;
  icone: typeof LayoutDashboard;
}> = [
  {
    id: 'overview',
    libelle: 'Vue d’ensemble',
    description: 'Synthèse de la bande et après-bataille',
    icone: LayoutDashboard,
  },
  {
    id: 'warband',
    libelle: 'Ma bande',
    description: 'Recrues, équipement et progression',
    icone: Shield,
  },
  {
    id: 'campaign',
    libelle: 'Campagne',
    description: 'Séquence d’après-bataille et ressources',
    icone: Swords,
  },
  {
    id: 'library',
    libelle: 'Bibliothèque',
    description: 'Bandes et fiches de la GLM',
    icone: BookOpen,
  },
  {
    id: 'homebrew',
    libelle: 'Règles homebrew',
    description: 'Overrides et règles complémentaires',
    icone: FlaskConical,
  },
  {
    id: 'settings',
    libelle: 'Paramètres',
    description: 'Manifeste, sources et variantes de règles',
    icone: Settings2,
  },
];

export function MordheimApp() {
  const [idCampagne, setIdCampagne] = useState(ID_CAMPAGNE);
  const [vue, setVue] = useState<Vue>('overview');
  const [campagne, setCampagne] = useState<EtatCampagne>(etatInitial);
  const [rechercheOuverte, setRechercheOuverte] = useState(false);
  const [rechercheBibliotheque, setRechercheBibliotheque] = useState('');
  const [gradeBibliotheque, setGradeBibliotheque] =
    useState<FiltreGrade>('tous');
  const [cibleEnAttente, setCibleEnAttente] = useState<string | null>(null);
  const [etatSauvegarde, setEtatSauvegarde] =
    useState<EtatSauvegarde>('chargement');
  const [erreurSauvegarde, setErreurSauvegarde] = useState<string | null>(null);
  const [hydratationTerminee, setHydratationTerminee] = useState(false);
  const [erreurChargement, setErreurChargement] = useState(false);
  const [tentativeChargement, setTentativeChargement] = useState(0);
  const [conflitSauvegarde, setConflitSauvegarde] =
    useState<ConflitSauvegarde | null>(null);
  const [dialogueConflitOuvert, setDialogueConflitOuvert] = useState(false);
  const [gestionCampagnesOuverte, setGestionCampagnesOuverte] = useState(false);
  const revisionsServeur = useRef<Record<string, number>>({});
  const campagneActiveInitialisee = useRef(false);
  const premiereSauvegarde = useRef(true);
  const synchroniserApresHydratation = useRef(false);
  const generationsLocales = useRef<Record<string, number>>({});
  const idCampagneCourant = useRef(idCampagne);
  const idCampagneCharge = useRef(ID_CAMPAGNE);
  const campagnesEnConflit = useRef<Set<string>>(new Set());
  const minuteursSauvegarde = useRef<Record<string, number>>({});
  const minuteursCopiesLocales = useRef<Record<string, number>>({});
  const copiesLocalesEnAttente = useRef<
    Record<string, { campagne: EtatCampagne; revisionServeur: number }>
  >({});
  const fileSauvegarde = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    idCampagneCourant.current = idCampagne;
  }, [idCampagne]);

  useEffect(
    () => () => {
      for (const minuteur of Object.values(minuteursSauvegarde.current)) {
        window.clearTimeout(minuteur);
      }
      for (const [id, minuteur] of Object.entries(
        minuteursCopiesLocales.current,
      )) {
        window.clearTimeout(minuteur);
        const copie = copiesLocalesEnAttente.current[id];
        if (copie) {
          ecrireCopieLocale(id, copie.campagne, copie.revisionServeur, true);
        }
      }
    },
    [],
  );

  useEffect(() => {
    function viderCopiesLocales() {
      for (const [id, copie] of Object.entries(
        copiesLocalesEnAttente.current,
      )) {
        ecrireCopieLocale(id, copie.campagne, copie.revisionServeur, true);
      }
    }
    window.addEventListener('beforeunload', viderCopiesLocales);
    return () => window.removeEventListener('beforeunload', viderCopiesLocales);
  }, []);

  /* D1 reste la source partagée ; la copie locale protège le travail hors ligne. */
  useEffect(() => {
    let annule = false;

    async function chargerCampagne() {
      if (!campagneActiveInitialisee.current) {
        campagneActiveInitialisee.current = true;
        const memorisee = window.localStorage.getItem(CLE_CAMPAGNE_ACTIVE);
        if (
          memorisee &&
          estIdentifiantCampagneClientValide(memorisee) &&
          memorisee !== idCampagne
        ) {
          setIdCampagne(memorisee);
          return;
        }
      }

      setHydratationTerminee(false);
      setErreurChargement(false);
      premiereSauvegarde.current = true;
      synchroniserApresHydratation.current = false;
      setConflitSauvegarde(null);
      let conflitDetecte = false;
      let campagneChargee = false;
      const copieLocale = lireCopieLocale(idCampagne);
      if (copieLocale && !annule) {
        revisionsServeur.current[idCampagne] = copieLocale.revisionServeur;
        setCampagne(normaliserCampagne(copieLocale.campagne));
        campagneChargee = true;
      }

      try {
        const reponse = await fetch(
          `/api/campaign?id=${encodeURIComponent(idCampagne)}`,
        );
        if (!reponse.ok) throw new Error('Chargement impossible');
        const donnees = (await reponse.json()) as {
          campagne: EtatCampagne | null;
          revision?: number;
        };
        if (annule) return;

        const revisionDistante =
          donnees.revision ?? donnees.campagne?.revision ?? 0;
        revisionsServeur.current[idCampagne] = revisionDistante;
        if (
          copieLocale?.modifiee &&
          copieLocale.revisionServeur === revisionDistante
        ) {
          synchroniserApresHydratation.current = true;
          setCampagne(normaliserCampagne(copieLocale.campagne));
        } else if (
          copieLocale?.modifiee &&
          copieLocale.revisionServeur !== revisionDistante &&
          donnees.campagne
        ) {
          const distante = normaliserCampagne(donnees.campagne);
          conflitDetecte = true;
          campagnesEnConflit.current.add(idCampagne);
          setConflitSauvegarde({
            idCampagne,
            campagne: distante,
            revision: revisionDistante,
          });
          setDialogueConflitOuvert(true);
          setEtatSauvegarde('conflit');
        } else if (donnees.campagne) {
          const distante = normaliserCampagne(donnees.campagne);
          setCampagne(distante);
          ecrireCopieLocale(idCampagne, distante, revisionDistante, false);
          campagneChargee = true;
        } else if (!copieLocale) {
          const initiale = normaliserCampagne(etatInitial);
          setCampagne(initiale);
          ecrireCopieLocale(idCampagne, initiale, 0, false);
          campagneChargee = true;
        }
        idCampagneCharge.current = idCampagne;
        if (!conflitDetecte) setEtatSauvegarde('sauvegarde-ok');
      } catch {
        if (!annule) {
          setEtatSauvegarde('hors-ligne');
          if (copieLocale) {
            idCampagneCharge.current = idCampagne;
          } else if (idCampagne !== idCampagneCharge.current) {
            const idRepli = idCampagneCharge.current;
            window.localStorage.setItem(CLE_CAMPAGNE_ACTIVE, idRepli);
            setIdCampagne(idRepli);
          } else {
            // Sans cache, l’existence de l’état distant est inconnue : ne jamais
            // fabriquer une copie locale susceptible de l’écraser plus tard.
            setErreurChargement(true);
          }
        }
      } finally {
        if (!annule && (campagneChargee || copieLocale)) {
          setHydratationTerminee(true);
        }
      }
    }

    void chargerCampagne();
    return () => {
      annule = true;
    };
  }, [idCampagne, tentativeChargement]);

  /*
   * Les écritures sont sérialisées : deux frappes rapides ne peuvent plus
   * s'écraser avec la même révision serveur.
   */
  useEffect(() => {
    if (!hydratationTerminee) return;
    if (premiereSauvegarde.current) {
      premiereSauvegarde.current = false;
      if (!synchroniserApresHydratation.current) return;
    }

    const generation = (generationsLocales.current[idCampagne] ?? 0) + 1;
    generationsLocales.current[idCampagne] = generation;
    const instantane = campagne;
    const idInstantane = idCampagne;
    const revisionLocale = revisionsServeur.current[idInstantane] ?? 0;
    copiesLocalesEnAttente.current[idInstantane] = {
      campagne: instantane,
      revisionServeur: revisionLocale,
    };
    const minuteurCopie = minuteursCopiesLocales.current[idInstantane];
    if (minuteurCopie) window.clearTimeout(minuteurCopie);
    minuteursCopiesLocales.current[idInstantane] = window.setTimeout(() => {
      delete minuteursCopiesLocales.current[idInstantane];
      const copie = copiesLocalesEnAttente.current[idInstantane];
      if (!copie) return;
      delete copiesLocalesEnAttente.current[idInstantane];
      ecrireCopieLocale(
        idInstantane,
        copie.campagne,
        copie.revisionServeur,
        true,
      );
    }, 180);

    const minuteurPrecedent = minuteursSauvegarde.current[idInstantane];
    if (minuteurPrecedent) window.clearTimeout(minuteurPrecedent);
    minuteursSauvegarde.current[idInstantane] = window.setTimeout(() => {
      delete minuteursSauvegarde.current[idInstantane];
      fileSauvegarde.current = fileSauvegarde.current.then(async () => {
        if (
          campagnesEnConflit.current.has(idInstantane) ||
          generation !== generationsLocales.current[idInstantane]
        ) {
          return;
        }
        const revisionAttendue = revisionsServeur.current[idInstantane] ?? 0;
        if (idCampagneCourant.current === idInstantane) {
          setEtatSauvegarde('sauvegarde');
          setErreurSauvegarde(null);
        }
        try {
          const reponse = await fetch('/api/campaign', {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              id: idInstantane,
              campagne: { ...instantane, revision: revisionAttendue },
              expectedRevision: revisionAttendue,
            }),
          });
          const donnees = (await reponse.json()) as {
            campagne?: EtatCampagne | null;
            revision?: number;
            erreur?: string;
          };
          if (reponse.status === 409 && donnees.revision !== undefined) {
            const distante = donnees.campagne
              ? normaliserCampagne(donnees.campagne)
              : null;
            const copieRecente = lireCopieLocale(idInstantane);
            campagnesEnConflit.current.add(idInstantane);
            ecrireCopieLocale(
              idInstantane,
              copieRecente?.campagne ?? instantane,
              revisionAttendue,
              true,
            );
            if (idCampagneCourant.current === idInstantane) {
              setConflitSauvegarde({
                idCampagne: idInstantane,
                campagne: distante,
                revision: donnees.revision,
              });
              setDialogueConflitOuvert(true);
              setEtatSauvegarde('conflit');
            }
            return;
          }
          if (!reponse.ok || donnees.revision === undefined) {
            const copieRecente = lireCopieLocale(idInstantane);
            ecrireCopieLocale(
              idInstantane,
              copieRecente?.campagne ?? instantane,
              revisionAttendue,
              true,
            );
            if (idCampagneCourant.current === idInstantane) {
              setErreurSauvegarde(
                donnees.erreur ?? 'La sauvegarde a été refusée par le serveur.',
              );
              setEtatSauvegarde(
                reponse.status >= 500 ? 'hors-ligne' : 'erreur',
              );
            }
            return;
          }

          revisionsServeur.current[idInstantane] = donnees.revision;
          if (generation === generationsLocales.current[idInstantane]) {
            ecrireCopieLocale(
              idInstantane,
              instantane,
              donnees.revision,
              false,
            );
            if (idCampagneCourant.current === idInstantane) {
              setErreurSauvegarde(null);
              setEtatSauvegarde('sauvegarde-ok');
            }
          } else {
            const copieRecente = lireCopieLocale(idInstantane);
            ecrireCopieLocale(
              idInstantane,
              copieRecente?.campagne ?? instantane,
              donnees.revision,
              true,
            );
          }
        } catch {
          const copieRecente = lireCopieLocale(idInstantane);
          ecrireCopieLocale(
            idInstantane,
            copieRecente?.campagne ?? instantane,
            revisionsServeur.current[idInstantane] ?? revisionAttendue,
            true,
          );
          if (idCampagneCourant.current === idInstantane) {
            setErreurSauvegarde(
              'La sauvegarde distante est momentanément indisponible.',
            );
            setEtatSauvegarde('hors-ligne');
          }
        }
      });
    }, 650);
  }, [campagne, hydratationTerminee, idCampagne]);

  function chargerVersionServeur() {
    if (
      !conflitSauvegarde?.campagne ||
      conflitSauvegarde.idCampagne !== idCampagne
    )
      return;
    generationsLocales.current[idCampagne] =
      (generationsLocales.current[idCampagne] ?? 0) + 1;
    campagnesEnConflit.current.delete(idCampagne);
    revisionsServeur.current[idCampagne] = conflitSauvegarde.revision;
    premiereSauvegarde.current = true;
    synchroniserApresHydratation.current = false;
    setCampagne(conflitSauvegarde.campagne);
    ecrireCopieLocale(
      idCampagne,
      conflitSauvegarde.campagne,
      conflitSauvegarde.revision,
      false,
    );
    setConflitSauvegarde(null);
    setDialogueConflitOuvert(false);
    setEtatSauvegarde('sauvegarde-ok');
  }

  function garderVersionLocale() {
    if (!conflitSauvegarde || conflitSauvegarde.idCampagne !== idCampagne)
      return;
    generationsLocales.current[idCampagne] =
      (generationsLocales.current[idCampagne] ?? 0) + 1;
    campagnesEnConflit.current.delete(idCampagne);
    revisionsServeur.current[idCampagne] = conflitSauvegarde.revision;
    setConflitSauvegarde(null);
    setDialogueConflitOuvert(false);
    setCampagne((courante) => ({
      ...courante,
      revision: conflitSauvegarde.revision,
    }));
  }

  function choisirCampagne(id: string) {
    if (id === idCampagne) {
      setGestionCampagnesOuverte(false);
      return;
    }
    window.localStorage.setItem(CLE_CAMPAGNE_ACTIVE, id);
    setHydratationTerminee(false);
    setEtatSauvegarde('chargement');
    setGestionCampagnesOuverte(false);
    setIdCampagne(id);
  }

  function creerCampagne(nomCampagne: string, nomBande: string) {
    const id = `campagne-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
    const nouvelle = creerEtatCampagne(nomCampagne, nomBande);
    ecrireCopieLocale(id, nouvelle, 0, true);
    window.localStorage.setItem(CLE_CAMPAGNE_ACTIVE, id);
    setHydratationTerminee(false);
    setEtatSauvegarde('chargement');
    setGestionCampagnesOuverte(false);
    setCampagne(nouvelle);
    setIdCampagne(id);
  }

  /* Le même raccourci fonctionne sur Windows, Linux et macOS. */
  useEffect(() => {
    function ouvrirRecherche(event: KeyboardEvent) {
      if (event.repeat || event.isComposing) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (rechercheOuverte) {
          setRechercheOuverte(false);
        } else if (!document.querySelector('[role="dialog"]')) {
          setRechercheOuverte(true);
        }
      }
    }

    window.addEventListener('keydown', ouvrirRecherche);
    return () => window.removeEventListener('keydown', ouvrirRecherche);
  }, [rechercheOuverte]);

  /* Après un changement de vue, le résultat précis est amené au centre de l’écran. */
  useEffect(() => {
    if (!cibleEnAttente) return;
    const minuteur = window.setTimeout(() => {
      const destination = document.getElementById(cibleEnAttente);
      if (destination) {
        const mouvementReduit = window.matchMedia(
          '(prefers-reduced-motion: reduce)',
        ).matches;
        destination.scrollIntoView({
          behavior: mouvementReduit ? 'auto' : 'smooth',
          block: 'center',
        });
        destination.focus({ preventScroll: true });
      }
      setCibleEnAttente(null);
    }, 60);

    return () => window.clearTimeout(minuteur);
  }, [cibleEnAttente, gradeBibliotheque, rechercheBibliotheque, vue]);

  const synthese = useMemo(() => calculerSynthese(campagne), [campagne]);

  function naviguerDepuisRecherche(vueCible: Vue, cible?: string) {
    setVue(vueCible);
    setRechercheOuverte(false);
    setCibleEnAttente(cible ?? null);
  }

  function ouvrirBandeDepuisRecherche(bande: BandeBibliotheque) {
    setRechercheBibliotheque(bande.nom);
    setGradeBibliotheque('tous');
    naviguerDepuisRecherche('library', `bande-${bande.grade}-${bande.slug}`);
  }

  return (
    <main className="application">
      <div className="application-layout">
        <Sidebar vue={vue} onVueChange={setVue} />

        <section className="workspace">
          <Topbar
            campagne={campagne}
            erreurSauvegarde={erreurSauvegarde}
            etatSauvegarde={etatSauvegarde}
            rechercheOuverte={rechercheOuverte}
            onCampagnes={() => setGestionCampagnesOuverte(true)}
            onConflit={() => setDialogueConflitOuvert(true)}
            onRecherche={() => {
              if (!document.querySelector('[role="dialog"]')) {
                setRechercheOuverte(true);
              }
            }}
          />

          <div className="content-wrap" key={idCampagne}>
            {erreurChargement ? (
              <section className="campaign-load-error" role="alert">
                <CircleAlert aria-hidden="true" />
                <div>
                  <p className="eyebrow">Registre indisponible</p>
                  <h1>Impossible de vérifier la campagne</h1>
                  <p>
                    Aucune copie hors ligne fiable n’existe sur cet appareil.
                    Trackheim n’inventera pas un registre susceptible d’écraser
                    la sauvegarde distante.
                  </p>
                  <Button
                    onClick={() =>
                      setTentativeChargement((valeur) => valeur + 1)
                    }
                  >
                    Réessayer le chargement
                  </Button>
                </div>
              </section>
            ) : !hydratationTerminee ? (
              <section className="campaign-loading" aria-live="polite">
                <p className="eyebrow">Ouverture du registre</p>
                <h1>Chargement de la campagne…</h1>
                <p>
                  La bande reste verrouillée jusqu’à la fin de la
                  synchronisation.
                </p>
              </section>
            ) : (
              <>
                {vue === 'overview' && (
                  <OverviewView
                    campagne={campagne}
                    synthese={synthese}
                    onCampagneChange={setCampagne}
                    onVueChange={setVue}
                  />
                )}
                {vue === 'warband' && (
                  <WarbandView
                    campagne={campagne}
                    synthese={synthese}
                    onCampagneChange={setCampagne}
                  />
                )}
                {vue === 'campaign' && (
                  <CampaignView
                    campagne={campagne}
                    onCampagneChange={setCampagne}
                  />
                )}
                {vue === 'library' && (
                  <LibraryView
                    recherche={rechercheBibliotheque}
                    grade={gradeBibliotheque}
                    onRechercheChange={setRechercheBibliotheque}
                    onGradeChange={setGradeBibliotheque}
                  />
                )}
                {vue === 'homebrew' && (
                  <HomebrewView
                    campagne={campagne}
                    onCampagneChange={setCampagne}
                  />
                )}
                {vue === 'settings' && (
                  <SettingsView
                    campagne={campagne}
                    onCampagneChange={setCampagne}
                  />
                )}
              </>
            )}
          </div>
        </section>
      </div>

      {rechercheOuverte && (
        <GlobalSearch
          campagne={campagne}
          ouvert
          onOpenChange={setRechercheOuverte}
          onNavigate={naviguerDepuisRecherche}
          onSelectBand={ouvrirBandeDepuisRecherche}
        />
      )}

      <Dialog
        open={dialogueConflitOuvert}
        onOpenChange={setDialogueConflitOuvert}
      >
        <DialogContent className="save-conflict-dialog sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Deux versions de la campagne existent</DialogTitle>
            <DialogDescription>
              {conflitSauvegarde?.campagne
                ? 'Une autre fenêtre a enregistré une version plus récente. Votre copie locale est conservée tant que vous n’avez pas choisi.'
                : 'Le registre distant n’existe plus. Votre copie locale est conservée et peut recréer le registre.'}
            </DialogDescription>
          </DialogHeader>
          <div className="save-conflict-options">
            <button
              type="button"
              onClick={() => setDialogueConflitOuvert(false)}
            >
              <strong>Décider plus tard</strong>
              <span>
                Ferme ce message sans modifier aucune des deux versions.
              </span>
            </button>
            {conflitSauvegarde?.campagne && (
              <button type="button" onClick={chargerVersionServeur}>
                <strong>Charger la version serveur</strong>
                <span>
                  Remplace cette copie locale par la dernière sauvegarde
                  partagée.
                </span>
              </button>
            )}
            <button type="button" onClick={garderVersionLocale}>
              <strong>
                {conflitSauvegarde?.campagne
                  ? 'Garder ma version locale'
                  : 'Recréer depuis ma copie locale'}
              </strong>
              <span>
                {conflitSauvegarde?.campagne
                  ? 'Réenregistre votre travail par-dessus la version serveur.'
                  : 'Restaure ce registre dans la base partagée.'}
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {gestionCampagnesOuverte && (
        <CampaignManagerDialog
          campagneCourante={campagne}
          idCourant={idCampagne}
          onCreate={creerCampagne}
          onOpenChange={setGestionCampagnesOuverte}
          onSelect={choisirCampagne}
          open
        />
      )}
    </main>
  );
}

function Sidebar({
  vue,
  onVueChange,
}: {
  vue: Vue;
  onVueChange: (vue: Vue) => void;
}) {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-mark" aria-hidden="true">
          <Skull />
        </div>
        <div>
          <p className="brand-kicker">Mordheim</p>
          <p className="brand-title">Trackheim</p>
        </div>
      </div>

      <nav
        className="navigation-stack primary-navigation"
        aria-label="Navigation principale"
      >
        {navigation.map(({ id, libelle, icone: Icone }) => (
          <button
            aria-label={libelle}
            key={id}
            className={
              vue === id ? 'navigation-item active' : 'navigation-item'
            }
            onClick={() => onVueChange(id)}
            type="button"
          >
            <Icone aria-hidden="true" />
            <span>{libelle}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-separator" />
      <p className="sidebar-label">Outils</p>
      <nav className="navigation-stack tools-navigation" aria-label="Outils">
        <button
          aria-label="Règles homebrew"
          className={
            vue === 'homebrew' ? 'navigation-item active' : 'navigation-item'
          }
          onClick={() => onVueChange('homebrew')}
          type="button"
        >
          <FlaskConical aria-hidden="true" />
          <span>Règles homebrew</span>
          <span className="new-badge">Nouveau</span>
        </button>
        <button
          aria-label="Paramètres"
          className={
            vue === 'settings'
              ? 'navigation-item settings-navigation-item active'
              : 'navigation-item settings-navigation-item'
          }
          onClick={() => onVueChange('settings')}
          type="button"
        >
          <Settings2 aria-hidden="true" />
          <span>Paramètres</span>
        </button>
      </nav>

      <div className="sidebar-source">
        <Sparkles aria-hidden="true" />
        <div>
          <p>Données indexées depuis la Grande Librairie de Mordheim.</p>
          <a
            className="raven-credit"
            href="https://freepngimg.com/png/108894-pic-bird-raven-download-hq"
            target="_blank"
            rel="noreferrer license"
          >
            Corbeau : Brett Croft · CC BY-NC 4.0 · teinte adaptée
          </a>
        </div>
      </div>
    </aside>
  );
}

function Topbar({
  campagne,
  erreurSauvegarde,
  etatSauvegarde,
  rechercheOuverte,
  onCampagnes,
  onConflit,
  onRecherche,
}: {
  campagne: EtatCampagne;
  erreurSauvegarde: string | null;
  etatSauvegarde: EtatSauvegarde;
  rechercheOuverte: boolean;
  onCampagnes: () => void;
  onConflit: () => void;
  onRecherche: () => void;
}) {
  const libelles: Record<EtatSauvegarde, string> = {
    chargement: 'Chargement…',
    sauvegarde: 'Sauvegarde…',
    'sauvegarde-ok': 'Sauvegardé',
    'hors-ligne': 'Mode local',
    conflit: 'Conflit à résoudre',
    erreur: 'Sauvegarde refusée',
  };

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Campagne active</p>
        <button
          className="campaign-switcher"
          onClick={onCampagnes}
          type="button"
        >
          <span>{campagne.nomCampagne}</span>
          <ChevronDown aria-hidden="true" />
        </button>
      </div>
      <div className="topbar-actions">
        {etatSauvegarde === 'conflit' ? (
          <button
            className="save-state conflit"
            onClick={onConflit}
            type="button"
          >
            {libelles[etatSauvegarde]}
          </button>
        ) : (
          <span
            aria-live="polite"
            className={`save-state ${etatSauvegarde}`}
            role={etatSauvegarde === 'erreur' ? 'alert' : undefined}
            title={erreurSauvegarde ?? undefined}
          >
            {libelles[etatSauvegarde]}
            {erreurSauvegarde && (
              <span className="sr-only"> : {erreurSauvegarde}</span>
            )}
          </span>
        )}
        <button
          aria-expanded={rechercheOuverte}
          aria-haspopup="dialog"
          aria-keyshortcuts="Control+K Meta+K"
          aria-label="Ouvrir la recherche globale"
          className="search-button"
          onClick={onRecherche}
          type="button"
        >
          <Search aria-hidden="true" />
          <span>Rechercher</span>
          <kbd aria-hidden="true">Ctrl K</kbd>
        </button>
        <div className="avatar" aria-label="Profil de Troma">
          TR
        </div>
      </div>
    </header>
  );
}

type ResumeCampagne = {
  id: string;
  nomCampagne: string;
  nomBande: string;
  revision: number;
  miseAJour: string | null;
};

function CampaignManagerDialog({
  campagneCourante,
  idCourant,
  open,
  onOpenChange,
  onSelect,
  onCreate,
}: {
  campagneCourante: EtatCampagne;
  idCourant: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (id: string) => void;
  onCreate: (nomCampagne: string, nomBande: string) => void;
}) {
  const [campagnes, setCampagnes] = useState<ResumeCampagne[]>([]);
  const [chargement, setChargement] = useState(true);
  const [nomCampagne, setNomCampagne] = useState('');
  const [nomBande, setNomBande] = useState('');

  useEffect(() => {
    if (!open) return;
    let annule = false;
    const locales = listerCopiesLocales();
    const courante: ResumeCampagne = {
      id: idCourant,
      nomCampagne: campagneCourante.nomCampagne,
      nomBande: campagneCourante.nomBande,
      revision: campagneCourante.revision,
      miseAJour: null,
    };

    function publierCatalogue(distantes: ResumeCampagne[]) {
      const fusion = new Map<string, ResumeCampagne>();
      for (const resume of distantes) fusion.set(resume.id, resume);
      // Une copie locale sale doit rester retrouvable, même avant son premier PUT.
      for (const resume of locales) fusion.set(resume.id, resume);
      fusion.set(idCourant, courante);
      setCampagnes([
        courante,
        ...Array.from(fusion.values()).filter(
          (resume) => resume.id !== idCourant,
        ),
      ]);
    }

    publierCatalogue([]);
    fetch('/api/campaign?liste=1')
      .then(async (reponse) => {
        if (!reponse.ok) throw new Error('Catalogue indisponible');
        return reponse.json() as Promise<{ campagnes?: ResumeCampagne[] }>;
      })
      .then((donnees) => {
        if (annule) return;
        publierCatalogue(donnees.campagnes ?? []);
      })
      .catch(() => {
        if (!annule) publierCatalogue([]);
      })
      .finally(() => {
        if (!annule) setChargement(false);
      });
    return () => {
      annule = true;
    };
  }, [
    campagneCourante.nomBande,
    campagneCourante.nomCampagne,
    campagneCourante.revision,
    idCourant,
    open,
  ]);

  function creer() {
    if (!nomCampagne.trim() || !nomBande.trim()) return;
    onCreate(nomCampagne.trim(), nomBande.trim());
    setNomCampagne('');
    setNomBande('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="campaign-manager-dialog sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Campagnes Trackheim</DialogTitle>
          <DialogDescription>
            Passez d’une campagne à l’autre ou ouvrez un registre vierge. Chaque
            registre possède sa propre révision et sa copie hors ligne.
          </DialogDescription>
        </DialogHeader>

        <div className="campaign-manager-list" aria-busy={chargement}>
          {campagnes.map((resume) => (
            <button
              aria-pressed={resume.id === idCourant}
              className={resume.id === idCourant ? 'active' : ''}
              key={resume.id}
              onClick={() => onSelect(resume.id)}
              type="button"
            >
              <span>
                <strong>{resume.nomCampagne}</strong>
                <small>{resume.nomBande}</small>
              </span>
              <b>{resume.id === idCourant ? 'Active' : 'Ouvrir'}</b>
            </button>
          ))}
        </div>

        <form
          className="campaign-create-form"
          onSubmit={(event) => {
            event.preventDefault();
            creer();
          }}
        >
          <h3>Nouveau registre</h3>
          <Input
            aria-label="Nom de la nouvelle campagne"
            maxLength={160}
            placeholder="Nom de la campagne"
            value={nomCampagne}
            onChange={(event) => setNomCampagne(event.target.value)}
          />
          <Input
            aria-label="Nom de la nouvelle bande"
            maxLength={160}
            placeholder="Nom de la bande"
            value={nomBande}
            onChange={(event) => setNomBande(event.target.value)}
          />
          <Button
            disabled={!nomCampagne.trim() || !nomBande.trim()}
            type="submit"
          >
            <Plus /> Créer la campagne
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GlobalSearch({
  campagne,
  ouvert,
  onOpenChange,
  onNavigate,
  onSelectBand,
}: {
  campagne: EtatCampagne;
  ouvert: boolean;
  onOpenChange: (ouvert: boolean) => void;
  onNavigate: (vue: Vue, cible?: string) => void;
  onSelectBand: (bande: BandeBibliotheque) => void;
}) {
  const [terme, setTerme] = useState('');
  const rechercheDetaillee = terme.trim().length > 0;

  function selectionner(action: () => void) {
    action();
    setTerme('');
  }

  return (
    <CommandDialog
      className="global-search-dialog"
      description="Recherchez une page, un combattant, une bande, une étape de campagne ou une règle maison."
      onOpenChange={(prochaineOuverture) => {
        if (!prochaineOuverture) setTerme('');
        onOpenChange(prochaineOuverture);
      }}
      open={ouvert}
      showCloseButton
      title="Recherche globale"
    >
      <Command
        className="global-search-command"
        filter={filtrerRechercheGlobale}
        label="Recherche globale"
      >
        <CommandInput
          onValueChange={setTerme}
          placeholder="Combattant, bande, règle, équipement…"
          value={terme}
        />
        <CommandList aria-label="Résultats de recherche">
          <CommandEmpty aria-live="polite">
            Aucun résultat dans Trackheim.
          </CommandEmpty>

          <CommandGroup heading="Navigation">
            {pagesRecherche.map(
              ({ id, libelle, description, icone: Icone }) => (
                <CommandItem
                  key={id}
                  keywords={[libelle, description]}
                  onSelect={() => selectionner(() => onNavigate(id))}
                  value={`page-${id} ${libelle} ${description}`}
                >
                  <Icone aria-hidden="true" />
                  <span className="search-result-copy">
                    <strong>{libelle}</strong>
                    <small>{description}</small>
                  </span>
                </CommandItem>
              ),
            )}
          </CommandGroup>

          {campagne.combattants.length > 0 && (
            <CommandGroup heading="Combattants">
              {campagne.combattants.map((combattant) => {
                const profil = profilParId(combattant.profilId);
                const nomsEquipements = combattant.equipementIds
                  .map((id) => equipements.find((item) => item.id === id)?.nom)
                  .filter(Boolean)
                  .join(' ');
                return (
                  <CommandItem
                    key={combattant.id}
                    keywords={[
                      combattant.nom,
                      profil.nom,
                      combattant.statut,
                      combattant.notes,
                      nomsEquipements,
                      `${combattant.experience} XP`,
                    ]}
                    onSelect={() =>
                      selectionner(() =>
                        onNavigate('warband', `combattant-${combattant.id}`),
                      )
                    }
                    value={`combattant-${combattant.id} ${combattant.nom} ${profil.nom} ${nomsEquipements}`}
                  >
                    <Users aria-hidden="true" />
                    <span className="search-result-copy">
                      <strong>{combattant.nom}</strong>
                      <small>
                        {profil.nom} · {combattant.statut} ·{' '}
                        {combattant.experience} XP
                      </small>
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {rechercheDetaillee && (
            <CommandGroup heading="Profils de recrue">
              {profilsReiklanders.map((profil) => (
                <CommandItem
                  key={profil.id}
                  keywords={[
                    profil.nom,
                    profil.categorie,
                    profil.regleSpeciale ?? '',
                    `${profil.cout} couronnes`,
                  ]}
                  onSelect={() =>
                    selectionner(() =>
                      onNavigate('warband', `profil-${profil.id}`),
                    )
                  }
                  value={`profil-${profil.id} ${profil.nom} ${profil.categorie} ${profil.regleSpeciale ?? ''}`}
                >
                  <Shield aria-hidden="true" />
                  <span className="search-result-copy">
                    <strong>{profil.nom}</strong>
                    <small>
                      {profil.categorie} · {profil.cout} CO
                    </small>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {rechercheDetaillee && (
            <CommandGroup heading="Bibliothèque des bandes">
              {bandesBibliotheque.map((bande) => (
                <CommandItem
                  key={`${bande.grade}-${bande.slug}`}
                  keywords={[bande.nom, bande.slug, `grade ${bande.grade}`]}
                  onSelect={() => selectionner(() => onSelectBand(bande))}
                  value={`bande-${bande.grade}-${bande.slug} ${bande.nom} grade ${bande.grade}`}
                >
                  <BookOpen aria-hidden="true" />
                  <span className="search-result-copy">
                    <strong>{bande.nom}</strong>
                    <small>{texteGrade(bande.grade)}</small>
                  </span>
                  <CommandShortcut>Grade {bande.grade}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {rechercheDetaillee && campagne.batailleEnCours && (
            <CommandGroup heading="Après-bataille">
              {etapesApresBataille
                .slice(0, campagne.batailleEnCours.etapeActive + 1)
                .map((etape, index) => (
                  <CommandItem
                    key={etape}
                    keywords={[
                      etape,
                      descriptionEtape(index),
                      `étape ${index + 1}`,
                    ]}
                    onSelect={() =>
                      selectionner(() =>
                        onNavigate('campaign', `etape-${index}`),
                      )
                    }
                    value={`etape-${index} ${etape} ${descriptionEtape(index)}`}
                  >
                    <Swords aria-hidden="true" />
                    <span className="search-result-copy">
                      <strong>{etape}</strong>
                      <small>{descriptionEtape(index)}</small>
                    </span>
                    <CommandShortcut>Étape {index + 1}</CommandShortcut>
                  </CommandItem>
                ))}
            </CommandGroup>
          )}

          {rechercheDetaillee && (
            <CommandGroup heading="Règles homebrew">
              <CommandItem
                keywords={[
                  campagne.homebrew.nomSet,
                  campagne.homebrew.description,
                ]}
                onSelect={() =>
                  selectionner(() => onNavigate('homebrew', 'set-homebrew'))
                }
                value={`set-homebrew ${campagne.homebrew.nomSet} ${campagne.homebrew.description}`}
              >
                <FlaskConical aria-hidden="true" />
                <span className="search-result-copy">
                  <strong>{campagne.homebrew.nomSet}</strong>
                  <small>{campagne.homebrew.description}</small>
                </span>
              </CommandItem>
              {campagne.homebrew.regles.map((regle) => (
                <CommandItem
                  key={regle.id}
                  keywords={[regle.titre, regle.description, regle.portee]}
                  onSelect={() =>
                    selectionner(() =>
                      onNavigate('homebrew', `regle-${regle.id}`),
                    )
                  }
                  value={`regle-${regle.id} ${regle.titre} ${regle.description} ${regle.portee}`}
                >
                  <FileText aria-hidden="true" />
                  <span className="search-result-copy">
                    <strong>{regle.titre}</strong>
                    <small>
                      {regle.portee} · {regle.active ? 'active' : 'inactive'}
                    </small>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>

        <footer className="global-search-footer">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> naviguer
          </span>
          <span>
            <kbd>Entrée</kbd> ouvrir
          </span>
          <span>
            <kbd>Échap</kbd> fermer
          </span>
        </footer>
      </Command>
    </CommandDialog>
  );
}

function OverviewView({
  campagne,
  synthese,
  onCampagneChange,
  onVueChange,
}: {
  campagne: EtatCampagne;
  synthese: Synthese;
  onCampagneChange: (campagne: EtatCampagne) => void;
  onVueChange: (vue: Vue) => void;
}) {
  return (
    <>
      <WarbandHeading campagne={campagne} onCampagneChange={onCampagneChange} />
      <Metrics campagne={campagne} synthese={synthese} />

      <div className="dashboard-grid">
        <section className="roster-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Effectif</p>
              <h2>Combattants</h2>
            </div>
            <Button variant="outline" onClick={() => onVueChange('warband')}>
              Gérer la bande
            </Button>
          </div>
          <div className="fighter-list">
            {campagne.combattants.slice(0, 5).map((combattant) => (
              <FighterRow key={combattant.id} combattant={combattant} />
            ))}
            {campagne.combattants.length === 0 && (
              <EmptyState
                icon={Users}
                title="La bande est vide"
                text="Recrutez votre capitaine pour commencer."
              />
            )}
          </div>
        </section>

        <aside className="right-rail">
          <AfterBattleCard
            campagne={campagne}
            onOpenCampaign={() => onVueChange('campaign')}
          />
          <LastBattleCard campagne={campagne} />
        </aside>
      </div>
    </>
  );
}

function WarbandHeading({
  campagne,
  onCampagneChange,
}: {
  campagne: EtatCampagne;
  onCampagneChange: (campagne: EtatCampagne) => void;
}) {
  return (
    <section className="warband-heading">
      <div>
        <div className="title-line">
          <h1>{campagne.nomBande}</h1>
          <span className="grade-badge">Grade {campagne.grade}</span>
          {campagne.homebrew.actifs && (
            <span className="homebrew-badge">Homebrew actif</span>
          )}
        </div>
        <p>
          Mercenaires Reiklanders · {campagne.numeroBataille}e bataille ·
          {campagne.homebrew.actifs
            ? ` ${campagne.homebrew.nomSet}, en complément des règles officielles`
            : ' règles officielles Games Workshop'}
        </p>
      </div>
      <RecruitDialog campagne={campagne} onCampagneChange={onCampagneChange} />
    </section>
  );
}

function Metrics({
  campagne,
  synthese,
}: {
  campagne: EtatCampagne;
  synthese: Synthese;
}) {
  return (
    <section className="metrics-grid" aria-label="Résumé de la bande">
      <MetricCard
        icon={Users}
        label="Combattants"
        value={`${synthese.effectif}`}
        unit="/ 15"
        note={`${synthese.heros} héros · ${synthese.hommesDeMain} hommes de main`}
      />
      <MetricCard
        icon={Shield}
        label="Valeur de bande"
        value={`${synthese.valeurBande}`}
        note={`${synthese.experienceTotale} points d’expérience`}
        positive
      />
      <MetricCard
        icon={Coins}
        label="Trésor"
        value={`${campagne.couronnes}`}
        unit="CO"
        note={`${synthese.coutBande} CO investies`}
      />
      <MetricCard
        icon={Gem}
        label="Pierre magique"
        value={`${campagne.fragments}`}
        unit="fragments"
        note="À vendre pendant l’après-bataille"
      />
    </section>
  );
}

type Synthese = {
  effectif: number;
  heros: number;
  hommesDeMain: number;
  experienceTotale: number;
  coutBande: number;
  valeurBande: number;
};

function calculerSynthese(campagne: EtatCampagne): Synthese {
  let effectif = 0;
  let heros = 0;
  let hommesDeMain = 0;
  let coutBande = 0;

  for (const combattant of campagne.combattants) {
    const profil = profilParId(combattant.profilId);
    const quantite = Math.max(1, combattant.quantite);
    effectif += quantite;
    if (profil.categorie === 'Héros') heros += quantite;
    else hommesDeMain += quantite;
    coutBande +=
      combattant.coutAcquisitionTotal ?? combattant.coutAcquisition * quantite;
  }

  const experienceTotale = campagne.combattants.reduce(
    (total, combattant) =>
      total + combattant.experience * Math.max(1, combattant.quantite),
    0,
  );

  return {
    effectif,
    heros,
    hommesDeMain,
    experienceTotale,
    coutBande,
    valeurBande: calculerValeurBande(
      campagne.combattants.map((combattant) => ({
        quantite: combattant.quantite,
        experience: combattant.experience,
      })),
    ),
  };
}

function MetricCard({
  icon: Icone,
  label,
  value,
  unit,
  note,
  positive = false,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  unit?: string;
  note: string;
  positive?: boolean;
}) {
  return (
    <article className="metric-card">
      <span className="metric-icon">
        <Icone />
      </span>
      <div>
        <p>{label}</p>
        <strong>
          {value} {unit && <small>{unit}</small>}
        </strong>
      </div>
      <span className={positive ? 'metric-note positive' : 'metric-note'}>
        {note}
      </span>
    </article>
  );
}

function FighterRow({ combattant }: { combattant: Combattant }) {
  const profil = profilParId(combattant.profilId);
  const equipement = combattant.equipementIds
    .map((id) => equipementParId(id).nom)
    .join(' · ');

  return (
    <article className="fighter-row">
      <div className="fighter-avatar">{initiales(combattant.nom)}</div>
      <div className="fighter-main">
        <div className="fighter-name-line">
          <div>
            <h3>{combattant.nom}</h3>
            <p>
              {profil.nom}
              {combattant.quantite > 1
                ? ` · groupe de ${combattant.quantite}`
                : ''}
            </p>
          </div>
          <span
            className={
              combattant.statut === 'Prêt' ? 'status' : 'status wounded'
            }
          >
            {combattant.statut}
          </span>
        </div>
        <p className="stat-line">{formaterStats(combattant.statistiques)}</p>
        <div className="fighter-foot">
          <span>{equipement || 'Dague gratuite'}</span>
          <span className="xp-pill">{combattant.experience} XP</span>
        </div>
      </div>
    </article>
  );
}

function AfterBattleCard({
  campagne,
  onOpenCampaign,
}: {
  campagne: EtatCampagne;
  onOpenCampaign: () => void;
}) {
  const terminees = campagne.etapesApresBataille.filter(Boolean).length;
  const progression = terminees * 10;

  return (
    <section className="after-battle-card">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Partie n° {campagne.numeroBataille}</p>
          <h2>Après-bataille</h2>
        </div>
        <span className="step-count">{terminees} / 10</span>
      </div>
      <Progress value={progression} className="campaign-progress">
        <ProgressLabel>Progression</ProgressLabel>
      </Progress>
      <ol className="step-list">
        {etapesApresBataille.map((etape, index) => {
          const terminee = campagne.etapesApresBataille[index];
          const premiereOuverte =
            index === campagne.etapesApresBataille.findIndex((item) => !item);

          return (
            <li
              className={
                terminee
                  ? 'step-item completed'
                  : premiereOuverte
                    ? 'step-item current'
                    : 'step-item pending'
              }
              key={etape}
            >
              <button
                aria-label={`Ouvrir l’étape ${index + 1} dans le suivi de campagne`}
                className="step-number"
                onClick={onOpenCampaign}
                type="button"
              >
                {index + 1}
              </button>
              <p>{etape}</p>
              {terminee && <span className="check-mark">✓</span>}
              {premiereOuverte && <span className="step-dot" />}
            </li>
          );
        })}
      </ol>
      <Button
        className="continue-button"
        onClick={onOpenCampaign}
        variant="secondary"
      >
        {campagne.batailleEnCours
          ? 'Continuer la séquence'
          : 'Enregistrer une bataille'}
      </Button>
    </section>
  );
}

function LastBattleCard({ campagne }: { campagne: EtatCampagne }) {
  const partie = campagne.parties[0];
  if (!partie) return null;

  return (
    <section className="last-battle-card">
      <div className="battle-crest">
        <Swords />
      </div>
      <div>
        <p className="eyebrow">Dernière bataille</p>
        <h3>{partie.scenario}</h3>
        <p>
          Contre {partie.adversaire} · {formaterDate(partie.date)}
        </p>
      </div>
      <span className="victory-badge">{partie.resultat}</span>
    </section>
  );
}

function WarbandView({
  campagne,
  synthese,
  onCampagneChange,
}: {
  campagne: EtatCampagne;
  synthese: Synthese;
  onCampagneChange: (campagne: EtatCampagne) => void;
}) {
  function modifierCombattant(id: string, modification: Partial<Combattant>) {
    onCampagneChange({
      ...campagne,
      combattants: campagne.combattants.map((combattant) =>
        combattant.id === id ? { ...combattant, ...modification } : combattant,
      ),
    });
  }

  function retirerCombattant(id: string) {
    const combattant = campagne.combattants.find((item) => item.id === id);
    if (!combattant || combattant.chef) return;
    onCampagneChange({
      ...campagne,
      combattants: campagne.combattants.filter(
        (combattant) => combattant.id !== id,
      ),
    });
  }

  return (
    <section className="product-view">
      <PageHeader
        eyebrow="Builder de bande"
        title="Ma bande"
        description="Recrutez, équipez et faites progresser chaque combattant. Les limites Reiklanders sont contrôlées automatiquement."
        action={
          <RecruitDialog
            campagne={campagne}
            onCampagneChange={onCampagneChange}
          />
        }
      />

      <div className="builder-summary">
        <strong>{synthese.coutBande} CO</strong>
        <span>coût historique d’acquisition · budget initial 500 CO</span>
        <div className="budget-track">
          <span
            style={{ width: `${Math.min(100, synthese.coutBande / 5)}%` }}
          />
        </div>
        <span className={synthese.coutBande > 500 ? 'budget-alert' : ''}>
          {500 - synthese.coutBande} CO restantes
        </span>
      </div>

      <div className="recruitment-grid">
        {profilsReiklanders.map((profil) => {
          const nombre = campagne.combattants
            .filter((item) => item.profilId === profil.id)
            .reduce((total, item) => total + item.quantite, 0);
          return (
            <article
              className="profile-card search-destination"
              id={`profil-${profil.id}`}
              key={profil.id}
              tabIndex={-1}
            >
              <div className="profile-card-header">
                <span>{profil.categorie}</span>
                <strong>{coutProfil(profil, campagne)} CO</strong>
              </div>
              <h3>{profil.nom}</h3>
              <p className="stat-line">{formaterStats(profil.statistiques)}</p>
              <div className="profile-card-footer">
                <span>
                  {nombre} recruté{nombre > 1 ? 's' : ''}
                </span>
                <span>
                  {profil.maximum ? `max. ${profil.maximum}` : 'sans limite'}
                </span>
              </div>
            </article>
          );
        })}
      </div>

      <section className="management-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Feuille de bande</p>
            <h2>{synthese.effectif} combattants</h2>
          </div>
          <span className="rating-chip">Valeur {synthese.valeurBande}</span>
        </div>
        <div className="management-list">
          {campagne.combattants.map((combattant) => {
            const profil = profilParId(combattant.profilId);
            return (
              <article
                className="management-row search-destination"
                id={`combattant-${combattant.id}`}
                key={combattant.id}
                tabIndex={-1}
              >
                <div className="fighter-avatar">
                  {initiales(combattant.nom)}
                </div>
                <div className="management-identity">
                  <strong>{combattant.nom}</strong>
                  <span>
                    {profil.nom}
                    {combattant.quantite > 1
                      ? ` · ${combattant.quantite} membres`
                      : ''}
                    {combattant.chef ? ' · Chef' : ''}
                  </span>
                </div>
                <div
                  className="xp-control"
                  aria-label={`Expérience de ${combattant.nom}`}
                >
                  <Button
                    size="icon-xs"
                    variant="outline"
                    onClick={() =>
                      modifierCombattant(combattant.id, {
                        experience: Math.max(0, combattant.experience - 1),
                      })
                    }
                  >
                    <Minus />
                  </Button>
                  <span>
                    <strong>{combattant.experience}</strong> XP
                  </span>
                  <Button
                    size="icon-xs"
                    variant="outline"
                    onClick={() =>
                      modifierCombattant(combattant.id, {
                        experience: combattant.experience + 1,
                      })
                    }
                  >
                    <Plus />
                  </Button>
                </div>
                <NativeSelect
                  aria-label={`Statut de ${combattant.nom}`}
                  value={combattant.statut}
                  onChange={(event) =>
                    modifierCombattant(combattant.id, {
                      statut: event.target.value as Combattant['statut'],
                    })
                  }
                >
                  <NativeSelectOption value="Prêt">Prêt</NativeSelectOption>
                  <NativeSelectOption value="Blessé">Blessé</NativeSelectOption>
                  <NativeSelectOption value="Absent">Absent</NativeSelectOption>
                </NativeSelect>
                <Button
                  aria-label={`Renvoyer ${combattant.nom}`}
                  size="icon-sm"
                  variant="ghost"
                  disabled={combattant.chef}
                  title={
                    combattant.chef
                      ? 'Le Chef ne peut pas être renvoyé.'
                      : undefined
                  }
                  onClick={() => retirerCombattant(combattant.id)}
                >
                  <Trash2 />
                </Button>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}

function RecruitDialog({
  campagne,
  onCampagneChange,
}: {
  campagne: EtatCampagne;
  onCampagneChange: (campagne: EtatCampagne) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [profilId, setProfilId] = useState('guerrier');
  const [groupeId, setGroupeId] = useState('');
  const [nom, setNom] = useState('');
  const [quantite, setQuantite] = useState(1);
  const [selectionEquipement, setSelectionEquipement] = useState<string[]>([]);
  const groupeCible = campagne.combattants.find((item) => item.id === groupeId);
  const profil = profilParId(groupeCible?.profilId ?? profilId);
  const creationDeBande =
    campagne.numeroBataille === 0 && campagne.parties.length === 0;
  const disponibles = equipementsPourProfil(profil, campagne, creationDeBande);
  const equipementRecrue = groupeCible?.equipementIds ?? selectionEquipement;
  const quantiteDemandee =
    profil.categorie === 'Héros' ? 1 : Math.max(1, Math.min(5, quantite));
  const besoinsRares = groupeCible
    ? equipementRecrue.reduce<Record<string, number>>((besoins, id) => {
        if (equipementParId(id).rareteCommerce !== undefined) {
          besoins[id] = (besoins[id] ?? 0) + quantiteDemandee;
        }
        return besoins;
      }, {})
    : {};
  const stockRareInsuffisant = Object.entries(besoinsRares).some(
    ([id, besoin]) => (campagne.inventaire[id] ?? 0) < besoin,
  );
  const coutUnitaire =
    coutProfil(profil, campagne) +
    equipementRecrue.reduce((total, id) => {
      const equipement = equipementParId(id);
      // Un objet rare a déjà été payé au comptoir et provient donc du magot.
      if (groupeCible && equipement.rareteCommerce !== undefined) return total;
      return total + coutEquipement(equipement, campagne);
    }, 0) +
    (groupeCible ? surcoutVeteran(groupeCible.experience) : 0);
  const cout = coutUnitaire * quantiteDemandee;
  const valeurRaresAlloues = Object.entries(besoinsRares).reduce(
    (total, [id, nombre]) => {
      const equipement = equipementParId(id);
      const prixUnitaire =
        campagne.homebrew.actifs &&
        campagne.homebrew.coutsEquipements[equipement.id] !== undefined
          ? campagne.homebrew.coutsEquipements[equipement.id]
          : (equipement.coutCommerce ?? equipement.cout);
      return total + prixUnitaire * nombre;
    },
    0,
  );
  const nombreProfil = campagne.combattants
    .filter((item) => item.profilId === profilId)
    .reduce((total, item) => total + item.quantite, 0);
  const limiteAtteinte =
    profil.maximum !== null && nombreProfil + quantiteDemandee > profil.maximum;
  const bandePleine =
    calculerSynthese(campagne).effectif + quantiteDemandee > 15;
  const fondsInsuffisants = cout > campagne.couronnes;
  const chefDejaRecrute =
    profil.id === 'capitaine' && campagne.combattants.some((item) => item.chef);
  const disponibiliteVeterans =
    campagne.batailleEnCours?.veterans.disponibilite ?? null;
  const experienceVeteransDepensee =
    campagne.batailleEnCours?.veterans.experienceDepensee ?? 0;
  const experienceVeteransDemandee = groupeCible
    ? groupeCible.experience * quantiteDemandee
    : 0;
  const groupesRenforcables = campagne.combattants.filter((combattant) => {
    const profilGroupe = profilParId(combattant.profilId);
    return (
      profilGroupe.categorie === 'Hommes de main' && combattant.quantite < 5
    );
  });
  const veteranIndisponible = Boolean(
    groupeCible &&
    (disponibiliteVeterans === null ||
      experienceVeteransDepensee + experienceVeteransDemandee >
        disponibiliteVeterans),
  );
  const groupeDepasse = Boolean(
    groupeCible && groupeCible.quantite + quantiteDemandee > 5,
  );

  function reinitialiserBrouillon() {
    setProfilId('guerrier');
    setGroupeId('');
    setNom('');
    setQuantite(1);
    setSelectionEquipement([]);
  }

  function changerOuverture(nouvelEtat: boolean) {
    if (!nouvelEtat) reinitialiserBrouillon();
    setOuvert(nouvelEtat);
  }

  function recruter() {
    if (
      (!groupeCible && !nom.trim()) ||
      limiteAtteinte ||
      bandePleine ||
      fondsInsuffisants ||
      chefDejaRecrute ||
      veteranIndisponible ||
      groupeDepasse ||
      stockRareInsuffisant
    )
      return;

    if (groupeCible) {
      const inventaire = { ...campagne.inventaire };
      for (const [id, nombre] of Object.entries(besoinsRares)) {
        const restant = (inventaire[id] ?? 0) - nombre;
        if (restant > 0) inventaire[id] = restant;
        else delete inventaire[id];
      }
      onCampagneChange({
        ...campagne,
        couronnes: campagne.couronnes - cout,
        inventaire,
        combattants: campagne.combattants.map((combattant) =>
          combattant.id === groupeCible.id
            ? {
                ...combattant,
                quantite: combattant.quantite + quantiteDemandee,
                coutAcquisitionTotal:
                  (combattant.coutAcquisitionTotal ??
                    combattant.coutAcquisition * combattant.quantite) +
                  cout +
                  valeurRaresAlloues,
              }
            : combattant,
        ),
        batailleEnCours: campagne.batailleEnCours
          ? {
              ...campagne.batailleEnCours,
              veterans: {
                ...campagne.batailleEnCours.veterans,
                experienceDepensee:
                  experienceVeteransDepensee + experienceVeteransDemandee,
              },
            }
          : null,
      });
      reinitialiserBrouillon();
      setOuvert(false);
      return;
    }
    const combattant: Combattant = {
      id: crypto.randomUUID(),
      nom: nom.trim(),
      profilId,
      experience: profil.experienceInitiale,
      statut: 'Prêt',
      statistiques: { ...profil.statistiques },
      equipementIds: selectionEquipement,
      notes: '',
      quantite: quantiteDemandee,
      chef: profil.id === 'capitaine',
      coutAcquisition: coutUnitaire,
      coutAcquisitionTotal: cout,
      competences: [],
      blessures: [],
      progressions: [],
      partiesManquees: 0,
    };

    onCampagneChange({
      ...campagne,
      couronnes: campagne.couronnes - cout,
      combattants: [...campagne.combattants, combattant],
    });
    reinitialiserBrouillon();
    setOuvert(false);
  }

  function basculerEquipement(id: string, selectionne: boolean) {
    setSelectionEquipement((courante) =>
      selectionne ? [...courante, id] : courante.filter((item) => item !== id),
    );
  }

  return (
    <Dialog open={ouvert} onOpenChange={changerOuverture}>
      <DialogTrigger render={<Button className="primary-action" size="lg" />}>
        <Plus data-icon="inline-start" />
        Ajouter un combattant
      </DialogTrigger>
      <DialogContent className="recruit-dialog sm:max-w-2xl">
        <form
          className="dialog-form"
          onSubmit={(event) => {
            event.preventDefault();
            recruter();
          }}
        >
          <DialogHeader>
            <DialogTitle>Recruter un combattant</DialogTitle>
            <DialogDescription>
              Profils Reiklanders V2bFr, appliqués selon le manifeste de règles
              de la campagne.
            </DialogDescription>
          </DialogHeader>

          {!creationDeBande && groupesRenforcables.length > 0 && (
            <label className="field-group" htmlFor="recruit-group">
              <span>Destination de la recrue</span>
              <NativeSelect
                id="recruit-group"
                value={groupeId}
                onChange={(event) => {
                  const id = event.target.value;
                  const groupe = campagne.combattants.find(
                    (item) => item.id === id,
                  );
                  setGroupeId(id);
                  setQuantite(1);
                  if (groupe) {
                    setProfilId(groupe.profilId);
                    setNom(groupe.nom);
                    setSelectionEquipement([...groupe.equipementIds]);
                  } else {
                    setNom('');
                    setSelectionEquipement([]);
                  }
                }}
              >
                <NativeSelectOption value="">
                  Créer un nouveau combattant ou groupe
                </NativeSelectOption>
                {groupesRenforcables.map((groupe) => (
                  <NativeSelectOption key={groupe.id} value={groupe.id}>
                    Renforcer {groupe.nom} — {groupe.quantite}/5 ·{' '}
                    {groupe.experience} XP
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
          )}

          <div className="form-grid recruit-identity-grid">
            <label className="field-group" htmlFor="recruit-profile">
              <span>Profil</span>
              <NativeSelect
                disabled={Boolean(groupeCible)}
                id="recruit-profile"
                value={profil.id}
                onChange={(event) => {
                  setProfilId(event.target.value);
                  setQuantite(1);
                  setSelectionEquipement([]);
                }}
              >
                {profilsReiklanders.map((item) => (
                  <NativeSelectOption key={item.id} value={item.id}>
                    {item.nom} — {coutProfil(item, campagne)} CO
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
            <label className="field-group" htmlFor="recruit-name">
              <span>Nom du combattant</span>
              <Input
                disabled={Boolean(groupeCible)}
                id="recruit-name"
                maxLength={160}
                value={nom}
                onChange={(event) => setNom(event.target.value)}
                placeholder="Ex. Dieter le Borgne"
              />
            </label>
            <label className="field-group" htmlFor="recruit-quantity">
              <span>
                {profil.categorie === 'Héros' ? 'Individu' : 'Taille du groupe'}
              </span>
              <NativeSelect
                id="recruit-quantity"
                disabled={profil.categorie === 'Héros'}
                value={`${quantiteDemandee}`}
                onChange={(event) => setQuantite(Number(event.target.value))}
              >
                {Array.from(
                  { length: profil.categorie === 'Héros' ? 1 : 5 },
                  (_, index) => index + 1,
                ).map((nombre) => (
                  <NativeSelectOption key={nombre} value={`${nombre}`}>
                    {nombre}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
          </div>

          <div className="profile-preview">
            <div>
              <strong>{profil.nom}</strong>
              <span>{profil.categorie}</span>
            </div>
            <code>{formaterStats(profil.statistiques)}</code>
            {profil.regleSpeciale && <p>{profil.regleSpeciale}</p>}
          </div>

          <div className="equipment-picker">
            <div className="section-title-row">
              <h3>
                {creationDeBande
                  ? 'Équipement de départ'
                  : 'Objets communs autorisés'}
              </h3>
              <span>Première dague gratuite</span>
            </div>
            <div className="equipment-options">
              {(groupeCible
                ? groupeCible.equipementIds.map(equipementParId)
                : disponibles
              ).map((item) => (
                <div className="equipment-option" key={item.id}>
                  <Checkbox
                    aria-label={`Ajouter ${item.nom}`}
                    checked={
                      groupeCible ? true : selectionEquipement.includes(item.id)
                    }
                    disabled={Boolean(groupeCible)}
                    onCheckedChange={(checked) =>
                      basculerEquipement(item.id, checked === true)
                    }
                  />
                  <span>
                    <strong>{item.nom}</strong>
                    <small>{item.categorie}</small>
                  </span>
                  <b>
                    {groupeCible && item.rareteCommerce !== undefined
                      ? 'Magot'
                      : `${coutEquipement(item, campagne)} CO`}
                  </b>
                </div>
              ))}
            </div>
          </div>

          {(limiteAtteinte ||
            bandePleine ||
            fondsInsuffisants ||
            chefDejaRecrute ||
            veteranIndisponible ||
            groupeDepasse ||
            stockRareInsuffisant) && (
            <div className="form-alert" role="alert">
              <CircleAlert />{' '}
              {fondsInsuffisants
                ? `Trésor insuffisant : il manque ${cout - campagne.couronnes} CO.`
                : stockRareInsuffisant
                  ? 'Le magot ne contient pas assez d’exemplaires des objets rares portés par ce groupe.'
                  : veteranIndisponible
                    ? `Réserve vétéran insuffisante : ${experienceVeteransDemandee} XP requis, ${Math.max(0, (disponibiliteVeterans ?? 0) - experienceVeteransDepensee)} encore disponible.`
                    : groupeDepasse
                      ? 'Un groupe d’hommes de main ne peut pas dépasser cinq membres.'
                      : chefDejaRecrute
                        ? 'Une bande ne peut pas recruter un second Chef.'
                        : 'La limite de ce profil ou de la bande est atteinte.'}
            </div>
          )}

          <DialogFooter>
            <div className="dialog-total">
              <span>
                Total
                {quantiteDemandee > 1 ? ` · ${quantiteDemandee} membres` : ''}
              </span>
              <strong>{cout} CO</strong>
            </div>
            <Button
              type="submit"
              disabled={
                (!groupeCible && !nom.trim()) ||
                limiteAtteinte ||
                bandePleine ||
                fondsInsuffisants ||
                chefDejaRecrute ||
                veteranIndisponible ||
                groupeDepasse ||
                stockRareInsuffisant
              }
            >
              {groupeCible ? 'Renforcer le groupe' : 'Recruter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CampaignView({
  campagne,
  onCampagneChange,
}: {
  campagne: EtatCampagne;
  onCampagneChange: (campagne: EtatCampagne) => void;
}) {
  const synthese = calculerSynthese(campagne);

  function modifierRessource(
    cle: 'couronnes' | 'fragments',
    variation: number,
  ) {
    onCampagneChange({
      ...campagne,
      [cle]: Math.max(0, campagne[cle] + variation),
    });
  }

  return (
    <section className="product-view">
      <PageHeader
        eyebrow="Suivi de campagne"
        title="Après la poussière"
        description="Faites les trois premières étapes devant votre adversaire, puis reprenez les achats quand vous le souhaitez."
      />

      <RulesetProvenance
        className="campaign-ruleset-summary"
        rulesetId={campagne.rulesetId}
        variant="compact"
      />

      <div className="campaign-layout workflow-layout">
        <Suspense
          fallback={
            <section className="workflow-loading" aria-live="polite">
              Chargement de l’assistant d’après-bataille…
            </section>
          }
        >
          <PostBattleWorkflow
            campagne={campagne}
            onCampagneChange={onCampagneChange}
            valeurBande={synthese.valeurBande}
            recrutement={
              <RecruitDialog
                campagne={campagne}
                onCampagneChange={onCampagneChange}
              />
            }
          />
        </Suspense>

        <aside className="campaign-tools">
          <ResourceCounter
            icon={Coins}
            label="Couronnes d’or"
            value={campagne.couronnes}
            unit="CO"
            onChange={(variation) => modifierRessource('couronnes', variation)}
          />
          <ResourceCounter
            icon={Gem}
            label="Pierre magique"
            value={campagne.fragments}
            unit="fragments"
            onChange={(variation) => modifierRessource('fragments', variation)}
          />
          <section className="rule-note">
            <BookOpen />
            <div>
              <strong>Source de règles</strong>
              <p>
                LRB2 officiel et Rules Review 2005, avec représentation
                française GLM épinglée.
              </p>
            </div>
            <a href={`${SOURCE_GLM}/campagne`} target="_blank" rel="noreferrer">
              Consulter <ExternalLink />
            </a>
          </section>
          <section className="resource-counter inventory-summary">
            <div className="resource-heading">
              <span>
                <PackageOpen />
              </span>
              <p>Magot</p>
            </div>
            <strong>
              {Object.values(campagne.inventaire).reduce(
                (total, nombre) => total + nombre,
                0,
              )}
            </strong>
            <span>objets en réserve</span>
          </section>
        </aside>
      </div>
    </section>
  );
}

function ResourceCounter({
  icon: Icone,
  label,
  value,
  unit,
  onChange,
}: {
  icon: typeof Coins;
  label: string;
  value: number;
  unit: string;
  onChange: (variation: number) => void;
}) {
  return (
    <section className="resource-counter">
      <div className="resource-heading">
        <span>
          <Icone />
        </span>
        <p>{label}</p>
      </div>
      <div className="counter-control">
        <Button size="icon" variant="outline" onClick={() => onChange(-1)}>
          <Minus />
        </Button>
        <div>
          <strong>{value}</strong>
          <span>{unit}</span>
        </div>
        <Button size="icon" variant="outline" onClick={() => onChange(1)}>
          <Plus />
        </Button>
      </div>
    </section>
  );
}

function SettingsView({
  campagne,
  onCampagneChange,
}: {
  campagne: EtatCampagne;
  onCampagneChange: (campagne: EtatCampagne) => void;
}) {
  const options = [
    {
      manifeste: rulesetOfficiel,
      description:
        'Socle officiel 1999 corrigé par le Rules Review 2005. Les arbitrages éditoriaux GLM restent inactifs.',
    },
    {
      manifeste: rulesetGlmStrict,
      description:
        'Même socle, avec les arbitrages explicitement identifiés de la représentation française GLM.',
    },
  ];

  function choisirRuleset(rulesetId: string) {
    onCampagneChange({ ...campagne, rulesetId });
  }

  return (
    <section className="product-view settings-view">
      <PageHeader
        eyebrow="Intégrité des règles"
        title="Manifeste de campagne"
        description="Chaque campagne épingle ses sources et ses arbitrages. Une variante ne remplace jamais silencieusement une règle officielle."
      />

      <fieldset className="ruleset-selector">
        <legend>Preset effectif</legend>
        {options.map(({ manifeste, description }) => {
          const actif = campagne.rulesetId === manifeste.id;
          return (
            <button
              aria-pressed={actif}
              className={actif ? 'ruleset-option active' : 'ruleset-option'}
              key={manifeste.id}
              onClick={() => choisirRuleset(manifeste.id)}
              type="button"
            >
              <span className="ruleset-radio" aria-hidden="true" />
              <span>
                <strong>{manifeste.nom}</strong>
                <small>{description}</small>
              </span>
              <b>{actif ? 'Actif' : 'Choisir'}</b>
            </button>
          );
        })}
      </fieldset>

      <RulesetProvenance rulesetId={campagne.rulesetId} variant="detailed" />

      <p className="asset-license-note">
        Le corbeau actuellement testé dans le logo est attribué à Brett Croft
        via{' '}
        <a
          href="https://freepngimg.com/png/108894-pic-bird-raven-download-hq"
          target="_blank"
          rel="noreferrer"
        >
          FreePNGimg
        </a>{' '}
        sous{' '}
        <a
          href="https://creativecommons.org/licenses/by-nc/4.0/"
          target="_blank"
          rel="noreferrer license"
        >
          CC BY-NC 4.0
        </a>
        . Sa teinte a été adaptée pour le fond sombre ; ce test n’est pas validé
        pour un usage commercial.
      </p>
    </section>
  );
}

function LibraryView({
  recherche,
  grade,
  onRechercheChange,
  onGradeChange,
}: {
  recherche: string;
  grade: FiltreGrade;
  onRechercheChange: (recherche: string) => void;
  onGradeChange: (grade: FiltreGrade) => void;
}) {
  const resultats = bandesBibliotheque.filter((bande) => {
    const nomCorrespond = normaliser(bande.nom).includes(normaliser(recherche));
    return nomCorrespond && (grade === 'tous' || bande.grade === grade);
  });

  return (
    <section className="product-view">
      <PageHeader
        eyebrow="Grande Librairie de Mordheim"
        title="Bibliothèque des bandes"
        description="Le grade indique le niveau d’officialité GLM. Chaque entrée ouvre sa page de référence et, lorsqu’il est indexé, son PDF."
        action={
          <a
            className="source-button"
            href={`${SOURCE_GLM}/bandes`}
            target="_blank"
            rel="noreferrer"
          >
            Voir la GLM <ExternalLink />
          </a>
        }
      />

      <div className="library-toolbar">
        <div className="library-search">
          <Search />
          <Input
            aria-label="Rechercher une bande"
            value={recherche}
            onChange={(event) => onRechercheChange(event.target.value)}
            placeholder="Rechercher une bande…"
          />
        </div>
        <NativeSelect
          value={grade}
          onChange={(event) => onGradeChange(event.target.value as FiltreGrade)}
        >
          <NativeSelectOption value="tous">Tous les grades</NativeSelectOption>
          <NativeSelectOption value="1a">
            Grade 1a — officiel
          </NativeSelectOption>
          <NativeSelectOption value="1b">
            Grade 1b — publié GW
          </NativeSelectOption>
          <NativeSelectOption value="1c">
            Grade 1c — expérimental
          </NativeSelectOption>
          <NativeSelectOption value="2">
            Grade 2 — fan fiable
          </NativeSelectOption>
        </NativeSelect>
        <span>{resultats.length} bandes</span>
      </div>

      <div className="library-grid">
        {resultats.map((bande) => (
          <article
            className="library-card search-destination"
            id={`bande-${bande.grade}-${bande.slug}`}
            key={`${bande.grade}-${bande.slug}`}
            tabIndex={-1}
          >
            <div className="library-card-top">
              <span className={`grade grade-${bande.grade}`}>
                Grade {bande.grade}
              </span>
              <Shield />
            </div>
            <h3>{bande.nom}</h3>
            <p>{texteGrade(bande.grade)}</p>
            <div className="library-card-actions">
              <a
                href={`${SOURCE_GLM}/bandes/${bande.slug}`}
                target="_blank"
                rel="noreferrer"
              >
                Fiche GLM <ExternalLink />
              </a>
              {bande.pdfUrl && (
                <a href={bande.pdfUrl} target="_blank" rel="noreferrer">
                  <FileText /> PDF
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function HomebrewView({
  campagne,
  onCampagneChange,
}: {
  campagne: EtatCampagne;
  onCampagneChange: (campagne: EtatCampagne) => void;
}) {
  const nombreSurcharges =
    Object.keys(campagne.homebrew.coutsRecrues).length +
    Object.keys(campagne.homebrew.coutsEquipements).length;
  const reglesActives = campagne.homebrew.regles.filter(
    (regle) => regle.active,
  ).length;

  function mettreAJourHomebrew(changements: Partial<ReglagesHomebrew>) {
    onCampagneChange({
      ...campagne,
      homebrew: { ...campagne.homebrew, ...changements },
    });
  }

  function mettreAJourRecrue(id: string, valeur: number) {
    mettreAJourHomebrew({
      coutsRecrues: { ...campagne.homebrew.coutsRecrues, [id]: valeur },
    });
  }

  function mettreAJourEquipement(id: string, valeur: number) {
    mettreAJourHomebrew({
      coutsEquipements: { ...campagne.homebrew.coutsEquipements, [id]: valeur },
    });
  }

  function basculerSurchargeRecrue(
    id: string,
    active: boolean,
    officiel: number,
  ) {
    const valeurs = { ...campagne.homebrew.coutsRecrues };
    if (active) valeurs[id] = officiel;
    else delete valeurs[id];
    mettreAJourHomebrew({ coutsRecrues: valeurs });
  }

  function basculerSurchargeEquipement(
    id: string,
    active: boolean,
    officiel: number,
  ) {
    const valeurs = { ...campagne.homebrew.coutsEquipements };
    if (active) valeurs[id] = officiel;
    else delete valeurs[id];
    mettreAJourHomebrew({ coutsEquipements: valeurs });
  }

  function ajouterRegle(regle: Omit<RegleHomebrew, 'id' | 'active'>) {
    mettreAJourHomebrew({
      regles: [
        ...campagne.homebrew.regles,
        { ...regle, id: crypto.randomUUID(), active: true },
      ],
    });
  }

  function modifierRegle(id: string, changements: Partial<RegleHomebrew>) {
    mettreAJourHomebrew({
      regles: campagne.homebrew.regles.map((regle) =>
        regle.id === id ? { ...regle, ...changements } : regle,
      ),
    });
  }

  function supprimerRegle(id: string) {
    mettreAJourHomebrew({
      regles: campagne.homebrew.regles.filter((regle) => regle.id !== id),
    });
  }

  return (
    <section className="product-view">
      <PageHeader
        eyebrow="Règles maison"
        title="Atelier homebrew"
        description="Composez une couche de règles au-dessus du socle officiel. Seuls vos overrides remplacent les éléments concernés ; tout le reste demeure automatiquement en vanilla."
        action={
          <Button
            variant="outline"
            disabled={nombreSurcharges === 0}
            onClick={() =>
              mettreAJourHomebrew({ coutsRecrues: {}, coutsEquipements: {} })
            }
          >
            Retirer les overrides de prix
          </Button>
        }
      />

      <section className="homebrew-toggle">
        <div>
          <FlaskConical />
          <div>
            <strong>Appliquer « {campagne.homebrew.nomSet} »</strong>
            <p>
              {nombreSurcharges} overrides · {reglesActives} règles
              complémentaires actives
            </p>
          </div>
        </div>
        <Switch
          aria-label="Appliquer le set homebrew"
          checked={campagne.homebrew.actifs}
          onCheckedChange={(actifs) => mettreAJourHomebrew({ actifs })}
        />
      </section>

      <section
        className="overlay-map"
        aria-label="Ordre d’application des règles"
      >
        <div className="overlay-node official-layer">
          <Shield />
          <span>
            <small>Socle</small>
            <strong>Règles officielles</strong>
          </span>
          <b>Vanilla complet</b>
        </div>
        <span className="overlay-operator">+</span>
        <div className="overlay-node homebrew-layer">
          <FlaskConical />
          <span>
            <small>Surcouche</small>
            <strong>{campagne.homebrew.nomSet}</strong>
          </span>
          <b>{nombreSurcharges + reglesActives} éléments</b>
        </div>
        <span className="overlay-operator">=</span>
        <div className="overlay-node effective-layer">
          <Sparkles />
          <span>
            <small>Résultat</small>
            <strong>Règles effectives</strong>
          </span>
          <b>Vanilla + overrides</b>
        </div>
      </section>

      <section
        className="rule-set-card search-destination"
        id="set-homebrew"
        tabIndex={-1}
      >
        <div className="panel-header">
          <div>
            <p className="eyebrow">Identité de la surcouche</p>
            <h2>Votre set de règles</h2>
          </div>
          <span
            className={
              campagne.homebrew.actifs ? 'layer-status active' : 'layer-status'
            }
          >
            {campagne.homebrew.actifs ? 'Appliqué' : 'En préparation'}
          </span>
        </div>
        <div className="rule-set-fields">
          <label className="field-group" htmlFor="homebrew-set-name">
            Nom du set
            <Input
              id="homebrew-set-name"
              maxLength={160}
              value={campagne.homebrew.nomSet}
              onChange={(event) =>
                mettreAJourHomebrew({ nomSet: event.target.value })
              }
            />
          </label>
          <label className="field-group" htmlFor="homebrew-set-description">
            Intention de la règle maison
            <Textarea
              id="homebrew-set-description"
              maxLength={10000}
              value={campagne.homebrew.description}
              onChange={(event) =>
                mettreAJourHomebrew({ description: event.target.value })
              }
            />
          </label>
        </div>
      </section>

      <section className="custom-rules-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Compléments au livre de règles</p>
            <h2>Règles personnalisées</h2>
          </div>
          <AddRuleDialog onAdd={ajouterRegle} />
        </div>
        {campagne.homebrew.regles.length > 0 ? (
          <div className="custom-rule-list">
            {campagne.homebrew.regles.map((regle) => (
              <article
                className={
                  regle.active
                    ? 'custom-rule active search-destination'
                    : 'custom-rule search-destination'
                }
                id={`regle-${regle.id}`}
                key={regle.id}
                tabIndex={-1}
              >
                <Switch
                  aria-label={`Activer ${regle.titre}`}
                  checked={regle.active}
                  onCheckedChange={(active) =>
                    modifierRegle(regle.id, { active })
                  }
                />
                <div>
                  <div className="custom-rule-title">
                    <strong>{regle.titre}</strong>
                    <span>{regle.portee}</span>
                  </div>
                  <p>{regle.description}</p>
                </div>
                <Button
                  aria-label={`Supprimer ${regle.titre}`}
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => supprimerRegle(regle.id)}
                >
                  <Trash2 />
                </Button>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FlaskConical}
            title="Aucune règle complémentaire"
            text="Ajoutez uniquement ce qui change ou complète le livre officiel."
          />
        )}
      </section>

      <div className="homebrew-grid">
        <PriceTable
          title="Recrues"
          items={profilsReiklanders.map((profil) => ({
            id: profil.id,
            nom: profil.nom,
            officiel: profil.cout,
            valeur: campagne.homebrew.coutsRecrues[profil.id],
          }))}
          onChange={mettreAJourRecrue}
          onToggle={basculerSurchargeRecrue}
        />
        <PriceTable
          title="Équipements"
          items={equipements.map((item) => ({
            id: item.id,
            nom: item.nom,
            officiel: item.cout,
            valeur: campagne.homebrew.coutsEquipements[item.id],
          }))}
          onChange={mettreAJourEquipement}
          onToggle={basculerSurchargeEquipement}
        />
      </div>
    </section>
  );
}

function AddRuleDialog({
  onAdd,
}: {
  onAdd: (regle: Omit<RegleHomebrew, 'id' | 'active'>) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [titre, setTitre] = useState('');
  const [portee, setPortee] = useState<RegleHomebrew['portee']>('Campagne');
  const [description, setDescription] = useState('');

  function ajouter() {
    if (!titre.trim() || !description.trim()) return;
    onAdd({ titre: titre.trim(), portee, description: description.trim() });
    setTitre('');
    setDescription('');
    setPortee('Campagne');
    setOuvert(false);
  }

  function changerOuverture(nouvelEtat: boolean) {
    if (!nouvelEtat) {
      setTitre('');
      setDescription('');
      setPortee('Campagne');
    }
    setOuvert(nouvelEtat);
  }

  return (
    <Dialog open={ouvert} onOpenChange={changerOuverture}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Plus data-icon="inline-start" />
        Ajouter une règle
      </DialogTrigger>
      <DialogContent className="homebrew-rule-dialog sm:max-w-lg">
        <form
          className="dialog-form"
          onSubmit={(event) => {
            event.preventDefault();
            ajouter();
          }}
        >
          <DialogHeader>
            <DialogTitle>Nouvelle règle complémentaire</DialogTitle>
            <DialogDescription>
              Décrivez uniquement l’écart au livre officiel. La règle vanilla
              reste héritée partout ailleurs.
            </DialogDescription>
          </DialogHeader>
          <div className="homebrew-rule-form">
            <label className="field-group" htmlFor="homebrew-rule-title">
              Nom de la règle
              <Input
                id="homebrew-rule-title"
                maxLength={300}
                value={titre}
                onChange={(event) => setTitre(event.target.value)}
                placeholder="Ex. Prime du chasseur"
              />
            </label>
            <label className="field-group" htmlFor="homebrew-rule-scope">
              Portée
              <NativeSelect
                id="homebrew-rule-scope"
                value={portee}
                onChange={(event) =>
                  setPortee(event.target.value as RegleHomebrew['portee'])
                }
              >
                <NativeSelectOption value="Bande">Bande</NativeSelectOption>
                <NativeSelectOption value="Campagne">
                  Campagne
                </NativeSelectOption>
                <NativeSelectOption value="Combat">Combat</NativeSelectOption>
                <NativeSelectOption value="Après-bataille">
                  Après-bataille
                </NativeSelectOption>
              </NativeSelect>
            </label>
            <label className="field-group" htmlFor="homebrew-rule-description">
              Texte de l’override ou du complément
              <Textarea
                id="homebrew-rule-description"
                maxLength={10000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Expliquez précisément ce qui change."
              />
            </label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => changerOuverture(false)}
            >
              Annuler
            </Button>
            <Button
              disabled={!titre.trim() || !description.trim()}
              type="submit"
            >
              Ajouter au set
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PriceTable({
  title,
  items,
  onChange,
  onToggle,
}: {
  title: string;
  items: Array<{ id: string; nom: string; officiel: number; valeur?: number }>;
  onChange: (id: string, valeur: number) => void;
  onToggle: (id: string, active: boolean, officiel: number) => void;
}) {
  return (
    <section className="price-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Overrides ciblés</p>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="price-list">
        {items.map((item) => {
          const surchargeActive = item.valeur !== undefined;
          return (
            <div
              className={
                surchargeActive ? 'price-row override-active' : 'price-row'
              }
              key={item.id}
            >
              <span>
                <strong>{item.nom}</strong>
                <small>
                  Officiel : {item.officiel} CO ·{' '}
                  {surchargeActive ? 'override actif' : 'hérité en vanilla'}
                </small>
              </span>
              <Switch
                aria-label={`Surcharger le prix de ${item.nom}`}
                checked={surchargeActive}
                onCheckedChange={(active) =>
                  onToggle(item.id, active, item.officiel)
                }
              />
              <Input
                aria-label={`Prix homebrew de ${item.nom}`}
                disabled={!surchargeActive}
                type="number"
                min="0"
                step="1"
                value={item.valeur ?? item.officiel}
                onChange={(event) => {
                  const valeur = Number(event.target.value);
                  onChange(
                    item.id,
                    Number.isFinite(valeur)
                      ? Math.max(0, Math.trunc(valeur))
                      : 0,
                  );
                }}
              />
              <b>CO</b>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

function EmptyState({
  icon: Icone,
  title,
  text,
}: {
  icon: typeof Users;
  title: string;
  text: string;
}) {
  return (
    <div className="empty-state">
      <Icone />
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function coutProfil(profil: ProfilRecrue, campagne: EtatCampagne) {
  if (!campagne.homebrew.actifs) return profil.cout;
  return campagne.homebrew.coutsRecrues[profil.id] ?? profil.cout;
}

/** Un registre neuf commence avec les 500 CO de création et aucune recrue imposée. */
function creerEtatCampagne(
  nomCampagne: string,
  nomBande: string,
): EtatCampagne {
  return {
    ...etatInitial,
    revision: 0,
    nomCampagne,
    nomBande,
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
      nomSet: `Règles de ${nomCampagne}`.slice(0, 160),
      description: 'Ajustements appliqués au-dessus du socle officiel.',
      coutsRecrues: {},
      coutsEquipements: {},
      regles: [],
    },
  };
}

/**
 * Les campagnes enregistrées avant l’atelier de règles ne contiennent que les
 * overrides de prix. Cette normalisation les enrichit sans perdre leurs choix.
 */
function normaliserCampagne(campagne: EtatCampagne): EtatCampagne {
  const homebrew = (campagne.homebrew ?? {}) as Partial<ReglagesHomebrew>;
  const combattants = (campagne.combattants ?? []).map((combattant) => {
    const profil = profilParId(combattant.profilId);
    const equipementIds = combattant.equipementIds ?? [];
    const coutHistorique = coutProfil(profil, {
      ...etatInitial,
      homebrew: { ...etatInitial.homebrew, actifs: false },
    });
    return {
      ...combattant,
      quantite: Math.max(1, combattant.quantite ?? 1),
      chef: combattant.chef ?? false,
      coutAcquisition:
        combattant.coutAcquisition ??
        coutHistorique +
          equipementIds.reduce(
            (total, id) => total + equipementParId(id).cout,
            0,
          ),
      coutAcquisitionTotal:
        combattant.coutAcquisitionTotal ??
        (combattant.coutAcquisition ??
          coutHistorique +
            equipementIds.reduce(
              (total, id) => total + equipementParId(id).cout,
              0,
            )) * Math.max(1, combattant.quantite ?? 1),
      competences: combattant.competences ?? [],
      blessures: combattant.blessures ?? [],
      progressions: combattant.progressions ?? [],
      partiesManquees: Math.max(0, combattant.partiesManquees ?? 0),
    };
  });
  if (!combattants.some((combattant) => combattant.chef)) {
    const capitaine = combattants.find(
      (combattant) => combattant.profilId === 'capitaine',
    );
    if (capitaine) capitaine.chef = true;
  }

  return {
    ...campagne,
    version: 3,
    revision: campagne.revision ?? 0,
    rulesetId: campagne.rulesetId ?? ID_RULESET,
    combattants,
    inventaire: campagne.inventaire ?? {},
    batailleEnCours: campagne.batailleEnCours
      ? {
          ...campagne.batailleEnCours,
          veterans: {
            ...campagne.batailleEnCours.veterans,
            experienceDepensee: Math.max(
              0,
              Number.isSafeInteger(
                campagne.batailleEnCours.veterans.experienceDepensee,
              )
                ? (campagne.batailleEnCours.veterans.experienceDepensee ?? 0)
                : 0,
            ),
          },
        }
      : null,
    homebrew: {
      ...etatInitial.homebrew,
      ...homebrew,
      coutsRecrues: homebrew.coutsRecrues ?? {},
      coutsEquipements: homebrew.coutsEquipements ?? {},
      regles: homebrew.regles ?? [],
    },
  };
}

function coutEquipement(equipement: Equipement, campagne: EtatCampagne) {
  if (!campagne.homebrew.actifs) return equipement.cout;
  return campagne.homebrew.coutsEquipements[equipement.id] ?? equipement.cout;
}

function profilParId(id: string) {
  return (
    profilsReiklanders.find((profil) => profil.id === id) ??
    profilsReiklanders[0]
  );
}

function equipementParId(id: string) {
  return (
    equipements.find((equipement) => equipement.id === id) ?? equipements[0]
  );
}

function equipementsPourProfil(
  profil: ProfilRecrue,
  campagne: EtatCampagne,
  creationDeBande: boolean,
) {
  return equipements.filter((item) => {
    if (item.patchGlm) return false;
    if (!creationDeBande && item.rareteCommerce !== undefined) return false;
    if (profil.listeEquipement === 'tireurs') return item.listeTireurs;
    if (!item.listeMercenaires) return false;
    if (item.reserveAuxHeros) return profil.categorie === 'Héros';
    return true;
  });
}

function formaterStats(stats: Statistiques) {
  return `M${stats.mouvement}  CC${stats.capaciteCombat}  CT${stats.capaciteTir}  F${stats.force}  E${stats.endurance}  PV${stats.pointsVie}  I${stats.initiative}  A${stats.attaques}  Cd${stats.commandement}`;
}

function initiales(nom: string) {
  return nom
    .split(/\s+/)
    .slice(0, 2)
    .map((mot) => mot[0]?.toUpperCase())
    .join('');
}

function formaterDate(date: string) {
  const valeur = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(valeur.getTime())) return 'date inconnue';
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(valeur);
}

function cleCopieLocale(idCampagne: string) {
  return `trackheim:campagne:${idCampagne}`;
}

function estIdentifiantCampagneClientValide(valeur: string) {
  return /^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$/.test(valeur);
}

function lireCopieLocale(idCampagne: string): CopieLocale | null {
  try {
    const valeur = window.localStorage.getItem(cleCopieLocale(idCampagne));
    if (!valeur) return null;
    const copie = JSON.parse(valeur) as Partial<CopieLocale>;
    if (
      !copie.campagne ||
      !Number.isSafeInteger(copie.revisionServeur) ||
      typeof copie.modifiee !== 'boolean'
    ) {
      return null;
    }
    return {
      campagne: normaliserCampagne(copie.campagne),
      revisionServeur: Math.max(0, copie.revisionServeur ?? 0),
      modifiee: copie.modifiee,
      date: copie.date ?? '',
    };
  } catch {
    return null;
  }
}

function listerCopiesLocales(): ResumeCampagne[] {
  const prefixe = 'trackheim:campagne:';
  const resultats: ResumeCampagne[] = [];
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const cle = window.localStorage.key(index);
      if (!cle?.startsWith(prefixe)) continue;
      const id = cle.slice(prefixe.length);
      if (!estIdentifiantCampagneClientValide(id)) continue;
      const copie = lireCopieLocale(id);
      if (!copie) continue;
      resultats.push({
        id,
        nomCampagne: copie.campagne.nomCampagne,
        nomBande: copie.campagne.nomBande,
        revision: copie.revisionServeur,
        miseAJour: copie.date || null,
      });
    }
  } catch {
    // Le catalogue distant reste utilisable si le stockage local est bloqué.
  }
  return resultats.sort((a, b) =>
    (b.miseAJour ?? '').localeCompare(a.miseAJour ?? ''),
  );
}

function ecrireCopieLocale(
  idCampagne: string,
  campagne: EtatCampagne,
  revisionServeur: number,
  modifiee: boolean,
) {
  try {
    const copie: CopieLocale = {
      campagne,
      revisionServeur,
      modifiee,
      date: new Date().toISOString(),
    };
    window.localStorage.setItem(
      cleCopieLocale(idCampagne),
      JSON.stringify(copie),
    );
  } catch {
    // D1 reste disponible si le navigateur refuse ou sature son stockage local.
  }
}

function normaliser(texte: string) {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Cmdk reçoit la valeur principale et les mots-clés séparément. Les réunir ici
 * permet de retrouver « Sœurs » avec « soeurs » et de combiner plusieurs mots.
 */
function filtrerRechercheGlobale(
  valeur: string,
  recherche: string,
  motsCles?: string[],
) {
  const termes = normaliser(recherche).trim().split(/\s+/).filter(Boolean);
  if (termes.length === 0) return 1;

  const contenu = normaliser([valeur, ...(motsCles ?? [])].join(' '));
  if (!termes.every((terme) => contenu.includes(terme))) return 0;

  const rechercheNormalisee = termes.join(' ');
  return normaliser(valeur).startsWith(rechercheNormalisee) ? 1 : 0.8;
}

function texteGrade(grade: '1a' | '1b' | '1c' | '2') {
  if (grade === '1a') return 'Bande officielle Games Workshop.';
  if (grade === '1b')
    return 'Publication Games Workshop non déclarée officielle.';
  if (grade === '1c')
    return 'Bande expérimentale approuvée par des concepteurs.';
  return 'Création de fans testée et considérée fiable.';
}

function descriptionEtape(index: number) {
  const descriptions = [
    'Résolvez les blessures graves des héros et hommes de main.',
    'Attribuez l’expérience et effectuez les jets de progression.',
    'Explorez les ruines et déterminez les revenus.',
    'Convertissez les fragments en couronnes d’or.',
    'Calculez le nombre de vétérans disponibles.',
    'Testez la rareté avant d’acheter les objets rares.',
    'Recherchez francs-tireurs et Dramatis Personae.',
    'Recrutez et achetez depuis les listes autorisées.',
    'Répartissez l’équipement entre les combattants.',
    'Recalculez la valeur totale de la bande.',
  ];
  return descriptions[index];
}
