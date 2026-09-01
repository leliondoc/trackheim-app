import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  CircleAlert,
  Coins,
  Download,
  ExternalLink,
  FileText,
  FlaskConical,
  Gem,
  LayoutDashboard,
  Minus,
  PackageOpen,
  Plus,
  Repeat2,
  Search,
  Settings2,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Trash2,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
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
  definitionsBandes,
  coutEquipementPourProfil,
  equipements,
  equipementAutorise,
  etapesApresBataille,
  obtenirDefinitionBande,
  obtenirProfil,
  quantiteMaxEquipement,
  SOURCE_GLM,
  type BandeBibliotheque,
  type Combattant,
  type Equipement,
  type EtatCampagne,
  type FactionId,
  type ProfilRecrue,
  type RegleHomebrew,
  type ReglagesHomebrew,
  type Statistiques,
} from '@/lib/mordheim-data';
import {
  calculerValeurBande,
  rulesetGlmStrict,
  rulesetOfficiel,
  surcoutVeteran,
} from '@/lib/mordheim-rules';
import { RulesetProvenance } from '@/components/ruleset-provenance';
import {
  IndicationNouvelOnglet,
  Sidebar,
  Topbar,
  type EtatSauvegarde,
} from '@/components/app-shell';
import {
  importerCampagneDepuisJson,
  nomFichierCampagne,
  serialiserCampagne,
} from '@/lib/campaign-transfer';
import { TAILLE_MAX_PAYLOAD_CAMPAGNE } from '@/lib/campaign-validation';
import {
  ConflitSauvegardeLocale,
  cleCopieLocale,
  ecrireCopieLocale,
  lireCampagneActive,
  lireCopieLocale,
  listerCopiesLocales,
  memoriserCampagneActive,
  type ResumeCampagneLocale,
} from '@/lib/campaign-storage';
import { hashPourVue, vueDepuisHash, type Vue } from '@/lib/app-navigation';

const PostBattleWorkflow = lazy(() =>
  import('@/components/post-battle-workflow').then((module) => ({
    default: module.PostBattleWorkflow,
  })),
);

type FiltreGrade = 'tous' | BandeBibliotheque['grade'];

const ID_CAMPAGNE = 'campagne-principale';
const ID_SESSION = crypto.randomUUID();

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
    icone: Users,
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
  const [vue, setVue] = useState<Vue>(() => vueDepuisHash(location.hash));
  const [campagne, setCampagne] = useState<EtatCampagne | null>(null);
  const [rechercheOuverte, setRechercheOuverte] = useState(false);
  const [rechercheBibliotheque, setRechercheBibliotheque] = useState('');
  const [gradeBibliotheque, setGradeBibliotheque] =
    useState<FiltreGrade>('tous');
  const [cibleEnAttente, setCibleEnAttente] = useState<string | null>(null);
  const [etatSauvegarde, setEtatSauvegarde] =
    useState<EtatSauvegarde>('chargement');
  const [erreurSauvegarde, setErreurSauvegarde] = useState<string | null>(null);
  const [hydratationTerminee, setHydratationTerminee] = useState(false);
  const [gestionCampagnesOuverte, setGestionCampagnesOuverte] = useState(false);
  const [configurationRequise, setConfigurationRequise] = useState(true);
  const [modeMemoire, setModeMemoire] = useState(false);
  const [conflitSauvegarde, setConflitSauvegarde] = useState(false);
  const campagneActiveInitialisee = useRef(false);
  const idCampagneCourant = useRef(idCampagne);
  const campagneCourante = useRef<EtatCampagne | null>(campagne);
  const versionStockage = useRef(0);
  const derniereCampagneSauvegardee = useRef('');
  const contenuPrincipal = useRef<HTMLElement>(null);
  const navigationInitialisee = useRef(false);

  useEffect(() => {
    idCampagneCourant.current = idCampagne;
    campagneCourante.current = campagne;
  }, [campagne, idCampagne]);

  useEffect(() => {
    function synchroniserVue() {
      setVue(vueDepuisHash(location.hash));
    }
    window.addEventListener('hashchange', synchroniserVue);
    return () => window.removeEventListener('hashchange', synchroniserVue);
  }, []);

  useEffect(() => {
    if (!navigationInitialisee.current) {
      navigationInitialisee.current = true;
      return;
    }
    requestAnimationFrame(() => contenuPrincipal.current?.focus());
  }, [vue]);

  function naviguerVers(vueCible: Vue) {
    const hash = hashPourVue(vueCible);
    if (location.hash !== hash) history.pushState(null, '', hash);
    setVue(vueCible);
  }

  useEffect(() => {
    function sauvegarderAvantFermeture() {
      if (!campagneCourante.current || conflitSauvegarde || modeMemoire) return;
      try {
        const copie = ecrireCopieLocale(
          window.localStorage,
          idCampagneCourant.current,
          campagneCourante.current,
          {
            auteur: ID_SESSION,
            versionAttendue: versionStockage.current,
          },
        );
        versionStockage.current = copie.versionStockage;
      } catch {
        // Le navigateur peut bloquer le stockage pendant sa fermeture.
      }
    }
    window.addEventListener('beforeunload', sauvegarderAvantFermeture);
    return () =>
      window.removeEventListener('beforeunload', sauvegarderAvantFermeture);
  }, [conflitSauvegarde, modeMemoire]);

  /* Le navigateur est la source de vérité : aucun compte ni serveur requis. */
  useEffect(() => {
    let annule = false;
    queueMicrotask(() => {
      if (annule) return;
      if (!campagneActiveInitialisee.current) {
        campagneActiveInitialisee.current = true;
        const memorisee = lireCampagneActive(window.localStorage);
        if (memorisee && memorisee !== idCampagne) {
          setIdCampagne(memorisee);
          return;
        }
      }

      setHydratationTerminee(false);
      setEtatSauvegarde('chargement');
      setErreurSauvegarde(null);
      setConflitSauvegarde(false);
      setModeMemoire(false);

      const lecture = lireCopieLocale(window.localStorage, idCampagne);
      if (lecture.statut === 'indisponible') {
        versionStockage.current = 0;
        derniereCampagneSauvegardee.current = '';
        setCampagne(null);
        setModeMemoire(true);
        setErreurSauvegarde(
          `${lecture.erreur} Trackheim reste utilisable en mémoire : exportez votre bande avant de fermer la page.`,
        );
        setEtatSauvegarde('erreur');
        setHydratationTerminee(true);
        setConfigurationRequise(true);
        return;
      }
      if (lecture.statut === 'invalide') {
        /* Avant la première publication, les anciennes données locales sont
           uniquement des jeux de vérification : elles ne sont pas migrées. */
        try {
          window.localStorage.removeItem(cleCopieLocale(idCampagne));
        } catch {
          // Le gestionnaire passera en mode mémoire si le stockage est bloqué.
        }
        versionStockage.current = 0;
        setCampagne(null);
        setConfigurationRequise(true);
        setErreurSauvegarde(null);
        setEtatSauvegarde('sauvegarde-ok');
        setHydratationTerminee(true);
        return;
      }
      const campagneChargee =
        lecture.statut === 'valide' ? lecture.copie.campagne : null;
      derniereCampagneSauvegardee.current = campagneChargee
        ? JSON.stringify(campagneChargee)
        : '';
      setCampagne(campagneChargee);

      try {
        if (lecture.statut === 'absente') {
          versionStockage.current = 0;
          setConfigurationRequise(true);
        } else {
          versionStockage.current = lecture.copie.versionStockage;
          setConfigurationRequise(false);
          memoriserCampagneActive(window.localStorage, idCampagne);
        }
        setEtatSauvegarde('sauvegarde-ok');
      } catch {
        setErreurSauvegarde(
          'Le navigateur refuse le stockage local. Exportez votre campagne avant de fermer la page.',
        );
        setEtatSauvegarde('erreur');
      }
      setHydratationTerminee(true);
    });
    return () => {
      annule = true;
    };
  }, [idCampagne]);

  useEffect(() => {
    if (!hydratationTerminee || !campagne || conflitSauvegarde || modeMemoire)
      return;
    const campagneSerialisee = JSON.stringify(campagne);
    if (campagneSerialisee === derniereCampagneSauvegardee.current) {
      setEtatSauvegarde('sauvegarde-ok');
      return;
    }
    const minuteur = window.setTimeout(() => {
      setEtatSauvegarde('sauvegarde');
      setErreurSauvegarde(null);
      try {
        const copie = ecrireCopieLocale(
          window.localStorage,
          idCampagne,
          campagne,
          { auteur: ID_SESSION, versionAttendue: versionStockage.current },
        );
        versionStockage.current = copie.versionStockage;
        derniereCampagneSauvegardee.current = campagneSerialisee;
        setEtatSauvegarde('sauvegarde-ok');
      } catch (erreur) {
        if (erreur instanceof ConflitSauvegardeLocale) {
          setConflitSauvegarde(true);
        }
        setErreurSauvegarde(
          erreur instanceof ConflitSauvegardeLocale
            ? 'Cette campagne a changé dans un autre onglet. Choisissez la version à conserver.'
            : 'La campagne n’a pas pu être enregistrée dans ce navigateur. Exportez-la en JSON pour ne rien perdre.',
        );
        setEtatSauvegarde('erreur');
      }
    }, 250);
    return () => window.clearTimeout(minuteur);
  }, [
    campagne,
    conflitSauvegarde,
    hydratationTerminee,
    idCampagne,
    modeMemoire,
  ]);

  useEffect(() => {
    function detecterModificationExterne(event: StorageEvent) {
      if (event.key !== cleCopieLocale(idCampagne) || event.newValue === null) {
        return;
      }
      const lecture = lireCopieLocale(window.localStorage, idCampagne);
      if (
        lecture.statut === 'valide' &&
        lecture.copie.auteur !== ID_SESSION &&
        (lecture.copie.versionStockage !== versionStockage.current ||
          JSON.stringify(lecture.copie.campagne) !==
            JSON.stringify(campagneCourante.current))
      ) {
        const campagneDistante = lecture.copie.campagne;
        const distanteSerialisee = JSON.stringify(campagneDistante);
        const localeSerialisee = campagneCourante.current
          ? JSON.stringify(campagneCourante.current)
          : '';

        if (distanteSerialisee === localeSerialisee) {
          versionStockage.current = lecture.copie.versionStockage;
          derniereCampagneSauvegardee.current = distanteSerialisee;
          setEtatSauvegarde('sauvegarde-ok');
          return;
        }

        if (
          localeSerialisee === derniereCampagneSauvegardee.current &&
          !conflitSauvegarde
        ) {
          versionStockage.current = lecture.copie.versionStockage;
          derniereCampagneSauvegardee.current = distanteSerialisee;
          setCampagne(campagneDistante);
          setErreurSauvegarde(null);
          setEtatSauvegarde('sauvegarde-ok');
          return;
        }

        setConflitSauvegarde(true);
        setEtatSauvegarde('erreur');
        setErreurSauvegarde(
          'Cette campagne a changé dans un autre onglet pendant vos modifications. Choisissez la version à conserver.',
        );
      }
    }
    window.addEventListener('storage', detecterModificationExterne);
    return () =>
      window.removeEventListener('storage', detecterModificationExterne);
  }, [conflitSauvegarde, idCampagne]);

  function choisirCampagne(id: string) {
    if (id === idCampagne) {
      setGestionCampagnesOuverte(false);
      return;
    }
    if (!ecrireCampagneCourante()) return;
    try {
      memoriserCampagneActive(window.localStorage, id);
    } catch {
      setErreurSauvegarde(
        'Impossible de changer de bande tant que le stockage local est indisponible. Exportez d’abord la bande courante.',
      );
      setEtatSauvegarde('erreur');
      return;
    }
    setHydratationTerminee(false);
    setEtatSauvegarde('chargement');
    setGestionCampagnesOuverte(false);
    setIdCampagne(id);
  }

  function creerBande(nomBande: string, factionId: FactionId) {
    const id = `campagne-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
    const nouvelle = creerEtatCampagne(nomBande, factionId);
    if (!modeMemoire) {
      try {
        const copie = ecrireCopieLocale(window.localStorage, id, nouvelle, {
          auteur: ID_SESSION,
          versionAttendue: 0,
        });
        versionStockage.current = copie.versionStockage;
        memoriserCampagneActive(window.localStorage, id);
      } catch (erreur) {
        setErreurSauvegarde(messageErreurStockage(erreur));
        setEtatSauvegarde('erreur');
        return;
      }
    } else {
      versionStockage.current = 0;
    }
    derniereCampagneSauvegardee.current = JSON.stringify(nouvelle);
    setConfigurationRequise(false);
    setGestionCampagnesOuverte(false);
    setCampagne(nouvelle);
    if (modeMemoire) {
      setHydratationTerminee(true);
      setEtatSauvegarde('erreur');
    } else {
      setHydratationTerminee(false);
      setEtatSauvegarde('chargement');
      setIdCampagne(id);
    }
  }

  function exporterCampagne() {
    if (!campagne) return;
    telechargerTexte(
      serialiserCampagne(campagne),
      nomFichierCampagne(campagne),
    );
  }

  function importerCampagne(texte: string) {
    try {
      const importee = importerCampagneDepuisJson(texte);
      const id = `campagne-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
      if (!modeMemoire) {
        const copie = ecrireCopieLocale(window.localStorage, id, importee, {
          auteur: ID_SESSION,
          versionAttendue: 0,
        });
        versionStockage.current = copie.versionStockage;
        memoriserCampagneActive(window.localStorage, id);
      }
      derniereCampagneSauvegardee.current = JSON.stringify(importee);
      setConfigurationRequise(false);
      setCampagne(importee);
      setGestionCampagnesOuverte(false);
      if (modeMemoire) {
        setHydratationTerminee(true);
        setEtatSauvegarde('erreur');
      } else {
        setHydratationTerminee(false);
        setEtatSauvegarde('chargement');
        setIdCampagne(id);
      }
    } catch (erreur) {
      setErreurSauvegarde(
        erreur instanceof Error
          ? erreur.message
          : 'La campagne n’a pas pu être importée.',
      );
      setEtatSauvegarde('erreur');
    }
  }

  function ecrireCampagneCourante() {
    if (!campagne) return true;
    if (conflitSauvegarde || modeMemoire) {
      setErreurSauvegarde(
        'La bande courante n’est pas enregistrée. Exportez-la avant d’en ouvrir une autre.',
      );
      setEtatSauvegarde('erreur');
      return false;
    }
    try {
      const copie = ecrireCopieLocale(
        window.localStorage,
        idCampagne,
        campagne,
        { auteur: ID_SESSION, versionAttendue: versionStockage.current },
      );
      versionStockage.current = copie.versionStockage;
      derniereCampagneSauvegardee.current = JSON.stringify(campagne);
      return true;
    } catch (erreur) {
      setErreurSauvegarde(messageErreurStockage(erreur));
      setEtatSauvegarde('erreur');
      return false;
    }
  }

  function chargerVersionAutreOnglet() {
    const lecture = lireCopieLocale(window.localStorage, idCampagne);
    if (lecture.statut !== 'valide') return;
    versionStockage.current = lecture.copie.versionStockage;
    const campagneDistante = lecture.copie.campagne;
    derniereCampagneSauvegardee.current = JSON.stringify(campagneDistante);
    setCampagne(campagneDistante);
    setConflitSauvegarde(false);
    setErreurSauvegarde(null);
    setEtatSauvegarde('sauvegarde-ok');
  }

  function conserverVersionCetOnglet() {
    if (!campagne) return;
    try {
      const copie = ecrireCopieLocale(
        window.localStorage,
        idCampagne,
        campagne,
        {
          auteur: ID_SESSION,
          forcer: true,
        },
      );
      versionStockage.current = copie.versionStockage;
      derniereCampagneSauvegardee.current = JSON.stringify(campagne);
      setConflitSauvegarde(false);
      setErreurSauvegarde(null);
      setEtatSauvegarde('sauvegarde-ok');
    } catch (erreur) {
      setErreurSauvegarde(messageErreurStockage(erreur));
      setEtatSauvegarde('erreur');
    }
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

  const synthese = useMemo(
    () => (campagne ? calculerSynthese(campagne) : null),
    [campagne],
  );

  function naviguerDepuisRecherche(vueCible: Vue, cible?: string) {
    naviguerVers(vueCible);
    setRechercheOuverte(false);
    setCibleEnAttente(cible ?? null);
  }

  function ouvrirBandeDepuisRecherche(bande: BandeBibliotheque) {
    setRechercheBibliotheque(bande.nom);
    setGradeBibliotheque('tous');
    naviguerDepuisRecherche('library', `bande-${bande.grade}-${bande.slug}`);
  }

  return (
    <div className="application">
      <a className="skip-link" href="#contenu-principal">
        Aller au contenu principal
      </a>
      <div className="application-layout">
        <Sidebar vue={vue} onVueChange={naviguerVers} />

        <div className="workspace">
          <Topbar
            campagne={campagne}
            erreurSauvegarde={erreurSauvegarde}
            etatSauvegarde={etatSauvegarde}
            rechercheOuverte={rechercheOuverte}
            onCampagnes={() => setGestionCampagnesOuverte(true)}
            onRecherche={() => {
              if (!campagne) {
                naviguerVers('library');
              } else if (!document.querySelector('[role="dialog"]')) {
                setRechercheOuverte(true);
              }
            }}
          />

          <main
            className="content-wrap"
            id="contenu-principal"
            key={idCampagne}
            ref={contenuPrincipal}
            tabIndex={-1}
          >
            {!hydratationTerminee ? (
              <section className="campaign-loading" aria-live="polite">
                <div className="campaign-loading-banner">
                  <span className="campaign-loading-seal" aria-hidden="true">
                    <Skull />
                  </span>
                  <div>
                    <p className="eyebrow">Ouverture du registre</p>
                    <h1>Les chroniques se dévoilent…</h1>
                  </div>
                </div>
                <div className="campaign-loading-body">
                  <p>
                    Trackheim rassemble la bande, son trésor et les dernières
                    traces de la campagne.
                  </p>
                  <div className="campaign-loading-track" aria-hidden="true">
                    <span />
                  </div>
                  <small>
                    Le registre est ouvert depuis la sauvegarde de cet appareil.
                  </small>
                </div>
              </section>
            ) : conflitSauvegarde ? (
              <section className="data-recovery-panel" role="alert">
                <CircleAlert aria-hidden="true" />
                <div>
                  <p className="eyebrow">Conflit entre deux onglets</p>
                  <h1>Deux versions du registre existent</h1>
                  <p>
                    Choisissez explicitement celle à conserver. Aucune donnée
                    n’est remplacée automatiquement.
                  </p>
                  <div className="recovery-actions">
                    <Button onClick={chargerVersionAutreOnglet} type="button">
                      Charger l’autre onglet
                    </Button>
                    <Button
                      onClick={conserverVersionCetOnglet}
                      type="button"
                      variant="outline"
                    >
                      Conserver cet onglet
                    </Button>
                  </div>
                </div>
              </section>
            ) : campagne && synthese ? (
              <>
                {modeMemoire && (
                  <section className="storage-warning" role="alert">
                    <CircleAlert aria-hidden="true" />
                    <div>
                      <strong>Mode mémoire : export indispensable</strong>
                      <p>{erreurSauvegarde}</p>
                    </div>
                    <Button onClick={exporterCampagne} type="button">
                      <Download aria-hidden="true" /> Exporter maintenant
                    </Button>
                  </section>
                )}
                {!modeMemoire &&
                  etatSauvegarde === 'erreur' &&
                  erreurSauvegarde && (
                    <section className="storage-warning" role="alert">
                      <CircleAlert aria-hidden="true" />
                      <div>
                        <strong>Sauvegarde interrompue</strong>
                        <p>{erreurSauvegarde}</p>
                      </div>
                      <Button onClick={exporterCampagne} type="button">
                        <Download aria-hidden="true" /> Exporter la bande
                      </Button>
                    </section>
                  )}
                {vue === 'overview' && (
                  <OverviewView
                    campagne={campagne}
                    synthese={synthese}
                    onCampagneChange={setCampagne}
                    onVueChange={naviguerVers}
                  />
                )}
                {vue === 'warband' && (
                  <WarbandView
                    campagne={campagne}
                    synthese={synthese}
                    onCampagneChange={setCampagne}
                    onChangerBande={() => setGestionCampagnesOuverte(true)}
                  />
                )}
                {vue === 'campaign' && (
                  <CampaignView
                    campagne={campagne}
                    onCampagneChange={setCampagne}
                    onExport={exporterCampagne}
                    onImport={importerCampagne}
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
            ) : (
              <EmptyApplicationContent
                vue={vue}
                recherche={rechercheBibliotheque}
                grade={gradeBibliotheque}
                onCreate={creerBande}
                onGradeChange={setGradeBibliotheque}
                onRechercheChange={setRechercheBibliotheque}
                onVueChange={naviguerVers}
              />
            )}
          </main>
          <footer className="site-disclaimer">
            Trackheim est un projet fan non officiel, sans affiliation ni
            approbation de Games Workshop Limited.
          </footer>
        </div>
      </div>

      {rechercheOuverte && campagne && (
        <GlobalSearch
          campagne={campagne}
          ouvert
          onOpenChange={setRechercheOuverte}
          onNavigate={naviguerDepuisRecherche}
          onSelectBand={ouvrirBandeDepuisRecherche}
        />
      )}

      {gestionCampagnesOuverte && (
        <CampaignManagerDialog
          campagneCourante={campagne}
          configurationRequise={configurationRequise}
          idCourant={idCampagne}
          onCreate={creerBande}
          onExport={exporterCampagne}
          onOpenChange={setGestionCampagnesOuverte}
          onSelect={choisirCampagne}
          open
        />
      )}
    </div>
  );
}

type ResumeCampagne = ResumeCampagneLocale;

function CampaignManagerDialog({
  campagneCourante,
  configurationRequise,
  idCourant,
  open,
  onOpenChange,
  onSelect,
  onCreate,
  onExport,
}: {
  campagneCourante: EtatCampagne | null;
  configurationRequise: boolean;
  idCourant: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (id: string) => void;
  onCreate: (nomBande: string, factionId: FactionId) => void;
  onExport: () => void;
}) {
  const [nomBande, setNomBande] = useState('');
  const [factionSelectionnee, setFactionSelectionnee] = useState('');
  const bandeSelectionnee = bandesBibliotheque.find(
    (bande) => bande.slug === factionSelectionnee,
  );
  const factionPriseEnCharge = definitionsBandes.some(
    (definition) => definition.id === factionSelectionnee,
  );

  const campagnes = useMemo(() => {
    const locales = listerCopiesLocales(window.localStorage);
    const courante: ResumeCampagne | null = campagneCourante
      ? {
          id: idCourant,
          nomCampagne: campagneCourante.nomCampagne,
          nomBande: campagneCourante.nomBande,
          campagneActive: campagneCourante.campagneActive !== false,
          revision: campagneCourante.revision,
          miseAJour: null,
        }
      : null;
    const fusion = new Map(locales.map((resume) => [resume.id, resume]));
    if (!configurationRequise && courante) fusion.set(idCourant, courante);
    return configurationRequise
      ? Array.from(fusion.values())
      : [
          ...(courante ? [courante] : []),
          ...Array.from(fusion.values()).filter(
            (resume) => resume.id !== idCourant,
          ),
        ];
  }, [campagneCourante, configurationRequise, idCourant]);

  function creer() {
    if (!factionPriseEnCharge || !nomBande.trim()) {
      return;
    }
    onCreate(nomBande.trim(), factionSelectionnee as FactionId);
    setNomBande('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="campaign-manager-dialog sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Mes bandes</DialogTitle>
          <DialogDescription>
            {configurationRequise
              ? 'Choisissez une faction et nommez votre première bande. Rien n’est créé automatiquement.'
              : 'Construisez plusieurs bandes et ouvrez celle que vous souhaitez utiliser. L’inscription dans une campagne se fait ensuite depuis l’espace Campagne.'}
          </DialogDescription>
        </DialogHeader>

        <div className="campaign-manager-list">
          {campagnes.map((resume) => (
            <button
              aria-pressed={resume.id === idCourant}
              className={resume.id === idCourant ? 'active' : ''}
              key={resume.id}
              onClick={() => onSelect(resume.id)}
              type="button"
            >
              <span>
                <strong>{resume.nomBande}</strong>
                <small>
                  {resume.campagneActive
                    ? `Campagne · ${resume.nomCampagne}`
                    : 'Hors campagne'}
                </small>
              </span>
              <b>{resume.id === idCourant ? 'Active' : 'Ouvrir'}</b>
            </button>
          ))}
        </div>

        {!configurationRequise && (
          <div className="campaign-manager-portable">
            <div>
              <strong>Sauvegarde portable</strong>
              <small>Disponible même avant le début d’une campagne.</small>
            </div>
            <Button onClick={onExport} type="button" variant="outline">
              <Download aria-hidden="true" /> Exporter la bande active
            </Button>
          </div>
        )}

        <form
          className="campaign-create-form"
          onSubmit={(event) => {
            event.preventDefault();
            creer();
          }}
        >
          <h3>Nouvelle bande</h3>
          <label className="campaign-faction-field">
            <span>Faction</span>
            <NativeSelect
              aria-describedby={
                factionPriseEnCharge ? undefined : 'campaign-faction-status'
              }
              aria-invalid={!factionPriseEnCharge}
              value={factionSelectionnee}
              onChange={(event) => setFactionSelectionnee(event.target.value)}
            >
              <NativeSelectOption disabled value="">
                Choisir une faction…
              </NativeSelectOption>
              {bandesBibliotheque.map((bande) => (
                <NativeSelectOption key={bande.slug} value={bande.slug}>
                  {bande.nom} · grade {bande.grade}
                  {definitionsBandes.some(
                    (definition) => definition.id === bande.slug,
                  )
                    ? ' · constructeur disponible'
                    : ''}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
          {!factionPriseEnCharge && bandeSelectionnee && (
            <output
              className="campaign-faction-status"
              id="campaign-faction-status"
            >
              <CircleAlert aria-hidden="true" />
              <span>
                <strong>{bandeSelectionnee.nom}</strong> est consultable dans la
                bibliothèque, mais ses profils ne sont pas encore indexés. La
                création reste bloquée tant que ses profils officiels ne sont
                pas indexés.{' '}
                <a
                  href={`${SOURCE_GLM}/bandes/${bandeSelectionnee.slug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Consulter sa fiche
                  <IndicationNouvelOnglet />
                </a>
              </span>
            </output>
          )}
          <Input
            aria-label="Nom de la nouvelle bande"
            maxLength={160}
            placeholder="Nom de la bande"
            value={nomBande}
            onChange={(event) => setNomBande(event.target.value)}
          />
          <Button
            disabled={!factionPriseEnCharge || !nomBande.trim()}
            type="submit"
          >
            <Plus /> Créer la bande
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
              {obtenirDefinitionBande(campagne.factionId).profils.map(
                (profil) => (
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
                ),
              )}
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

function EmptyApplicationContent({
  vue,
  recherche,
  grade,
  onCreate,
  onRechercheChange,
  onGradeChange,
  onVueChange,
}: {
  vue: Vue;
  recherche: string;
  grade: FiltreGrade;
  onCreate: (nomBande: string, factionId: FactionId) => void;
  onRechercheChange: (recherche: string) => void;
  onGradeChange: (grade: FiltreGrade) => void;
  onVueChange: (vue: Vue) => void;
}) {
  const [nomBande, setNomBande] = useState('');
  const [factionSelectionnee, setFactionSelectionnee] = useState('');

  if (vue === 'library') {
    return (
      <LibraryView
        recherche={recherche}
        grade={grade}
        onRechercheChange={onRechercheChange}
        onGradeChange={onGradeChange}
      />
    );
  }

  if (vue === 'settings') {
    return (
      <section className="product-view empty-app-settings">
        <PageHeader
          eyebrow="Paramètres"
          title="Manifeste des règles"
          description="Référentiel officiel utilisé par Trackheim. Les réglages propres à une campagne apparaîtront lorsqu’une bande sera active."
        />
        <RulesetProvenance rulesetId={rulesetOfficiel.id} variant="detailed" />
      </section>
    );
  }

  if (vue === 'warband') {
    return (
      <section className="product-view empty-warband-view">
        <PageHeader
          eyebrow="Constructeur de bande"
          title="Ma bande"
          description="Choisissez une faction et donnez un nom à votre bande. Le recrutement détaillé commence ensuite."
        />
        <form
          className="empty-warband-builder"
          onSubmit={(event) => {
            event.preventDefault();
            if (!nomBande.trim() || !factionSelectionnee) return;
            onCreate(nomBande.trim(), factionSelectionnee as FactionId);
          }}
        >
          <div>
            <p className="eyebrow">Nouvelle bande</p>
            <h2>Ouvrir un registre</h2>
            <p>
              Aucune donnée n’est créée avant la validation de ce formulaire.
            </p>
          </div>
          <label htmlFor="empty-warband-faction">
            <span>Faction</span>
            <NativeSelect
              aria-label="Faction"
              id="empty-warband-faction"
              value={factionSelectionnee}
              onChange={(event) => setFactionSelectionnee(event.target.value)}
            >
              <NativeSelectOption disabled value="">
                Choisir une faction…
              </NativeSelectOption>
              {definitionsBandes.map((definition) => (
                <NativeSelectOption key={definition.id} value={definition.id}>
                  {definition.nom}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
          <label htmlFor="empty-warband-name">
            <span>Nom de la bande</span>
            <Input
              aria-label="Nom de la nouvelle bande"
              id="empty-warband-name"
              maxLength={160}
              placeholder="Nom de la bande"
              value={nomBande}
              onChange={(event) => setNomBande(event.target.value)}
            />
          </label>
          <Button
            className="primary-action"
            disabled={!nomBande.trim() || !factionSelectionnee}
            type="submit"
          >
            <Plus aria-hidden="true" /> Créer la bande
          </Button>
        </form>
      </section>
    );
  }

  if (vue === 'overview') {
    return (
      <section className="product-view empty-app-view">
        <PageHeader
          eyebrow="Vue d’ensemble"
          title="Vue d’ensemble"
          description="Votre espace de jeu est prêt. Aucune donnée ne sera créée sans votre accord."
        />

        <section
          className="empty-overview"
          aria-labelledby="empty-overview-title"
        >
          <div className="empty-overview-copy">
            <p className="eyebrow">Premier registre</p>
            <h2 id="empty-overview-title">Votre bande commence ici</h2>
            <p>
              Choisissez une faction officielle, recrutez vos combattants puis
              suivez leur progression au fil des batailles.
            </p>
            <div className="empty-overview-actions">
              <Button
                className="primary-action"
                onClick={() => onVueChange('warband')}
                type="button"
              >
                <Users aria-hidden="true" /> Créer ma bande
              </Button>
              <Button
                className="empty-overview-library"
                onClick={() => onVueChange('library')}
                type="button"
                variant="ghost"
              >
                <BookOpen aria-hidden="true" /> Voir les bandes officielles
              </Button>
            </div>
          </div>

          <aside className="empty-overview-rules">
            <img alt="" aria-hidden="true" src="./img/trackheim-raven.png" />
            <div>
              <p className="eyebrow">Prêt pour la table</p>
              <h3>Les règles sont déjà en place</h3>
              <p>
                Profils officiels, valeur de bande, expérience, blessures et
                séquence d’après-bataille sont réunis dans le même registre.
              </p>
            </div>
          </aside>
        </section>
      </section>
    );
  }

  const page =
    vue === 'campaign'
      ? {
          eyebrow: 'Campagne',
          titre: 'Aucune campagne active',
          texte:
            'Les batailles et la progression apparaîtront ici après la création d’une bande.',
          icone: Swords,
        }
      : vue === 'homebrew'
        ? {
            eyebrow: 'Règles homebrew',
            titre: 'Aucun registre actif',
            texte:
              'Les variantes sont enregistrées séparément pour chaque bande.',
            icone: FlaskConical,
          }
        : {
            eyebrow: 'Vue d’ensemble',
            titre: 'Aucune bande active',
            texte: 'Le résumé de votre bande apparaîtra ici.',
            icone: LayoutDashboard,
          };
  const EmptyIcon = page.icone;

  return (
    <section className="product-view empty-app-view">
      <PageHeader
        eyebrow={page.eyebrow}
        title={page.eyebrow}
        description="Trackheim est prêt. Utilisez les onglets pour accéder aux différentes sections."
      />
      <div className="empty-app-panel">
        <EmptyIcon aria-hidden="true" />
        <div>
          <h2>{page.titre}</h2>
          <p>{page.texte}</p>
        </div>
      </div>
    </section>
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
            <Button
              className="primary-action"
              onClick={() => onVueChange('warband')}
            >
              <Users aria-hidden="true" /> Gérer la bande
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
  const definition = obtenirDefinitionBande(campagne.factionId);
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
          {definition.nom} ·{' '}
          {campagne.numeroBataille === 0
            ? 'aucune bataille jouée'
            : campagne.numeroBataille === 1
              ? '1re bataille'
              : `${campagne.numeroBataille}e bataille`}{' '}
          ·
          {campagne.homebrew.actifs
            ? ` ${campagne.homebrew.nomSet}, en complément des règles officielles`
            : ' règles officielles Games Workshop'}
        </p>
      </div>
      <RecruitDialog
        campagne={campagne}
        verrouillee={Boolean(campagne.batailleEnCours)}
        key={campagne.factionId}
        onCampagneChange={onCampagneChange}
      />
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
  const definition = obtenirDefinitionBande(campagne.factionId);
  return (
    <section className="metrics-grid" aria-label="Résumé de la bande">
      <MetricCard
        icon={Users}
        label="Combattants"
        value={`${synthese.effectif}`}
        unit={`/ ${definition.effectifMaximum}`}
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
    if (profil.categorie === 'Héros' || combattant.herosPromu)
      heros += quantite;
    else hommesDeMain += quantite;
    coutBande += combattant.coutAcquisitionTotal;
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
        grandeCreature: profilParId(combattant.profilId).grandeCreature,
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
        <Swords aria-hidden="true" />
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
  onChangerBande,
}: {
  campagne: EtatCampagne;
  synthese: Synthese;
  onCampagneChange: (campagne: EtatCampagne) => void;
  onChangerBande: () => void;
}) {
  const definition = obtenirDefinitionBande(campagne.factionId);
  const verrouillee = Boolean(campagne.batailleEnCours);
  function modifierCombattant(id: string, modification: Partial<Combattant>) {
    if (verrouillee) return;
    onCampagneChange({
      ...campagne,
      combattants: campagne.combattants.map((combattant) =>
        combattant.id === id ? { ...combattant, ...modification } : combattant,
      ),
    });
  }

  function retirerCombattant(id: string) {
    const combattant = campagne.combattants.find((item) => item.id === id);
    if (!combattant || combattant.chef || verrouillee) return;
    const confirme = window.confirm(
      `Renvoyer ${combattant.nom} ? Son équipement sera replacé dans le magot. Cette action est définitive.`,
    );
    if (!confirme) return;
    const inventaire = { ...campagne.inventaire };
    for (const idEquipement of combattant.equipementIds) {
      inventaire[idEquipement] =
        (inventaire[idEquipement] ?? 0) + combattant.quantite;
    }
    onCampagneChange({
      ...campagne,
      inventaire,
      combattants: campagne.combattants.filter(
        (combattant) => combattant.id !== id,
      ),
    });
  }

  return (
    <section className="product-view">
      <PageHeader
        eyebrow="Constructeur de bande"
        title="Ma bande"
        description={`Recrutez, équipez et faites progresser chaque combattant. Les limites ${definition.nom} sont contrôlées automatiquement.`}
        action={
          <div className="page-header-actions">
            <Button
              className="primary-action"
              onClick={onChangerBande}
              size="lg"
            >
              <Repeat2 aria-hidden="true" /> Changer de bande
            </Button>
            <RecruitDialog
              campagne={campagne}
              verrouillee={verrouillee}
              key={campagne.factionId}
              onCampagneChange={onCampagneChange}
            />
          </div>
        }
      />

      {verrouillee && (
        <output className="form-alert">
          <Swords aria-hidden="true" /> Une bataille est en cours. L’effectif,
          l’expérience et les statuts sont verrouillés jusqu’à la fin de la
          séquence.
        </output>
      )}

      <div className="constructeur-bande-resume">
        <strong>{synthese.coutBande} CO</strong>
        <span>
          coût historique d’acquisition · budget initial{' '}
          {definition.budgetInitial} CO
        </span>
        <div className="budget-track">
          <span
            style={{
              width: `${Math.min(100, (synthese.coutBande / definition.budgetInitial) * 100)}%`,
            }}
          />
        </div>
        <span
          className={
            synthese.coutBande > definition.budgetInitial ? 'budget-alert' : ''
          }
        >
          {definition.budgetInitial - synthese.coutBande} CO restantes
        </span>
      </div>

      <details className="warband-rules-summary">
        <summary>Règles propres à la bande</summary>
        <div>
          {definition.regles.map((regle) => (
            <p key={regle.titre}>
              <strong>{regle.titre}.</strong> {regle.description}
            </p>
          ))}
          <small>Source : {definition.source}</small>
        </div>
      </details>

      <div className="recruitment-grid">
        {definition.profils.map((profil) => {
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
              {profil.competencesDisponibles && (
                <p className="profile-skills">
                  Compétences : {profil.competencesDisponibles.join(', ')}
                </p>
              )}
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
                    {combattant.herosPromu ? ' · Héros promu' : ''}
                  </span>
                </div>
                <fieldset className="xp-control">
                  <legend className="sr-only">
                    Expérience de {combattant.nom}
                  </legend>
                  <Button
                    aria-label={`Retirer 1 point d’expérience à ${combattant.nom}`}
                    size="icon-xs"
                    variant="outline"
                    disabled={verrouillee}
                    onClick={() =>
                      modifierCombattant(combattant.id, {
                        experience: Math.max(0, combattant.experience - 1),
                      })
                    }
                  >
                    <Minus />
                  </Button>
                  <output aria-live="polite">
                    <strong>{combattant.experience}</strong> XP
                  </output>
                  <Button
                    aria-label={`Ajouter 1 point d’expérience à ${combattant.nom}`}
                    size="icon-xs"
                    variant="outline"
                    disabled={verrouillee}
                    onClick={() =>
                      modifierCombattant(combattant.id, {
                        experience: combattant.experience + 1,
                      })
                    }
                  >
                    <Plus />
                  </Button>
                </fieldset>
                <NativeSelect
                  aria-label={`Statut de ${combattant.nom}`}
                  disabled={verrouillee}
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
                  disabled={combattant.chef || verrouillee}
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
  verrouillee = false,
}: {
  campagne: EtatCampagne;
  onCampagneChange: (campagne: EtatCampagne) => void;
  verrouillee?: boolean;
}) {
  const definition = obtenirDefinitionBande(campagne.factionId);
  const profilInitial =
    definition.profils.find((item) => !item.chef)?.id ??
    definition.profils[0]!.id;
  const [ouvert, setOuvert] = useState(false);
  const [profilId, setProfilId] = useState(profilInitial);
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
  const nombreArmesCorpsACorps = equipementRecrue.filter(
    (id) => equipementParId(id).categorie === 'Corps à corps',
  ).length;
  const nombreArmesTir = equipementRecrue.filter(
    (id) => equipementParId(id).categorie === 'Tir',
  ).length;
  const limiteArmesDepassee = nombreArmesCorpsACorps > 2 || nombreArmesTir > 2;
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
  const nombreMutations = equipementRecrue.filter(
    (id) => equipementParId(id).categorie === 'Mutation',
  ).length;
  const mutationsInsuffisantes =
    nombreMutations < (profil.minimumMutations ?? 0);
  const coutEquipementsSelectionnes = equipementRecrue.reduce(
    (accumulateur, id) => {
      const equipement = equipementParId(id);
      // Un objet rare a déjà été payé au comptoir et provient donc du magot.
      if (groupeCible && equipement.rareteCommerce !== undefined) {
        return accumulateur;
      }
      const multiplicateur =
        equipement.categorie === 'Mutation' && accumulateur.mutations > 0
          ? 2
          : 1;
      return {
        total:
          accumulateur.total +
          coutEquipement(equipement, campagne, profil) * multiplicateur,
        mutations:
          accumulateur.mutations +
          (equipement.categorie === 'Mutation' ? 1 : 0),
      };
    },
    { total: 0, mutations: 0 },
  ).total;
  const coutUnitaire =
    coutProfil(profil, campagne) +
    coutEquipementsSelectionnes +
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
    calculerSynthese(campagne).effectif + quantiteDemandee >
    definition.effectifMaximum;
  const fondsInsuffisants = cout > campagne.couronnes;
  const chefDejaRecrute =
    Boolean(profil.chef) && campagne.combattants.some((item) => item.chef);
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
    setProfilId(profilInitial);
    setGroupeId('');
    setNom('');
    setQuantite(1);
    setSelectionEquipement([]);
  }

  function changerOuverture(nouvelEtat: boolean) {
    if (nouvelEtat && verrouillee) return;
    if (!nouvelEtat) reinitialiserBrouillon();
    setOuvert(nouvelEtat);
  }

  function recruter() {
    if (
      verrouillee ||
      (!groupeCible && !nom.trim()) ||
      limiteAtteinte ||
      bandePleine ||
      fondsInsuffisants ||
      chefDejaRecrute ||
      veteranIndisponible ||
      groupeDepasse ||
      stockRareInsuffisant ||
      mutationsInsuffisantes ||
      limiteArmesDepassee
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
                  combattant.coutAcquisitionTotal + cout + valeurRaresAlloues,
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
      chef: Boolean(profil.chef),
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
    const equipement = equipementParId(id);
    if (
      selectionne &&
      ((equipement.categorie === 'Corps à corps' &&
        nombreArmesCorpsACorps >= 2) ||
        (equipement.categorie === 'Tir' && nombreArmesTir >= 2))
    ) {
      return;
    }
    setSelectionEquipement((courante) =>
      selectionne ? [...courante, id] : courante.filter((item) => item !== id),
    );
  }

  function modifierQuantiteEquipement(id: string, variation: number) {
    const equipement = equipementParId(id);
    const maximum = quantiteMaxEquipement(equipement, profil);
    if (
      variation > 0 &&
      ((equipement.categorie === 'Corps à corps' &&
        nombreArmesCorpsACorps >= 2) ||
        (equipement.categorie === 'Tir' && nombreArmesTir >= 2))
    ) {
      return;
    }
    setSelectionEquipement((courante) => {
      const quantite = courante.filter((item) => item === id).length;
      const suivante = Math.max(0, Math.min(maximum, quantite + variation));
      return [
        ...courante.filter((item) => item !== id),
        ...Array.from({ length: suivante }, () => id),
      ];
    });
  }

  return (
    <Dialog open={ouvert} onOpenChange={changerOuverture}>
      <DialogTrigger
        render={
          <Button
            className="primary-action"
            disabled={verrouillee}
            size="lg"
            title={
              verrouillee
                ? 'Terminez la bataille avant de modifier l’effectif.'
                : undefined
            }
          />
        }
      >
        <UserPlus data-icon="inline-start" />
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
              Profils {definition.nom}, appliqués selon le manifeste de règles
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
                    Renforcer {groupe.nom} : {groupe.quantite}/5 ·{' '}
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
                {definition.profils.map((item) => (
                  <NativeSelectOption key={item.id} value={item.id}>
                    {item.nom} : {coutProfil(item, campagne)} CO
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
            {profil.competencesDisponibles && (
              <p>
                Tables de compétences :{' '}
                {profil.competencesDisponibles.join(', ')}.
              </p>
            )}
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
              ).map((item) => {
                const maximum = quantiteMaxEquipement(item, profil);
                const nombre = equipementRecrue.filter(
                  (id) => id === item.id,
                ).length;
                const categoriePleine =
                  (item.categorie === 'Corps à corps' &&
                    nombreArmesCorpsACorps >= 2) ||
                  (item.categorie === 'Tir' && nombreArmesTir >= 2);
                return (
                  <div className="equipment-option" key={item.id}>
                    {maximum === 1 ? (
                      <Checkbox
                        aria-label={`Ajouter ${item.nom}`}
                        checked={groupeCible ? true : nombre === 1}
                        disabled={
                          Boolean(groupeCible) ||
                          (nombre === 0 && categoriePleine)
                        }
                        onCheckedChange={(checked) =>
                          basculerEquipement(item.id, checked === true)
                        }
                      />
                    ) : (
                      <div className="equipment-quantity">
                        <Button
                          aria-label={`Retirer un exemplaire de ${item.nom}`}
                          disabled={Boolean(groupeCible) || nombre === 0}
                          onClick={() =>
                            modifierQuantiteEquipement(item.id, -1)
                          }
                          size="icon-sm"
                          type="button"
                          variant="ghost"
                        >
                          <Minus />
                        </Button>
                        <output aria-label={`Quantité de ${item.nom}`}>
                          {nombre}
                        </output>
                        <Button
                          aria-label={`Ajouter un exemplaire de ${item.nom}`}
                          disabled={
                            Boolean(groupeCible) ||
                            nombre >= maximum ||
                            categoriePleine
                          }
                          onClick={() => modifierQuantiteEquipement(item.id, 1)}
                          size="icon-sm"
                          type="button"
                          variant="ghost"
                        >
                          <Plus />
                        </Button>
                      </div>
                    )}
                    <span>
                      <strong>{item.nom}</strong>
                      <small>{item.categorie}</small>
                      {item.regleSpeciale && (
                        <small>{item.regleSpeciale}</small>
                      )}
                    </span>
                    <b>
                      {groupeCible && item.rareteCommerce !== undefined
                        ? 'Magot'
                        : `${coutEquipement(item, campagne, profil)} CO`}
                    </b>
                  </div>
                );
              })}
            </div>
          </div>

          {(limiteAtteinte ||
            bandePleine ||
            fondsInsuffisants ||
            chefDejaRecrute ||
            veteranIndisponible ||
            groupeDepasse ||
            stockRareInsuffisant ||
            mutationsInsuffisantes ||
            limiteArmesDepassee) && (
            <div className="form-alert" role="alert">
              <CircleAlert />{' '}
              {fondsInsuffisants
                ? `Trésor insuffisant : il manque ${cout - campagne.couronnes} CO.`
                : limiteArmesDepassee
                  ? 'Un combattant ne peut porter que deux armes de corps à corps et deux armes de tir.'
                  : mutationsInsuffisantes
                    ? `${profil.nom} doit recevoir au moins ${profil.minimumMutations} mutation à la création.`
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
                stockRareInsuffisant ||
                mutationsInsuffisantes ||
                limiteArmesDepassee
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
  onExport,
  onImport,
}: {
  campagne: EtatCampagne;
  onCampagneChange: (campagne: EtatCampagne) => void;
  onExport: () => void;
  onImport: (texte: string) => void;
}) {
  const synthese = calculerSynthese(campagne);
  const [nomNouvelleCampagne, setNomNouvelleCampagne] = useState('');
  const [erreurImport, setErreurImport] = useState<string | null>(null);
  const fichierImport = useRef<HTMLInputElement>(null);

  function demarrerCampagne() {
    const nom = nomNouvelleCampagne.trim();
    if (!nom) return;
    onCampagneChange({
      ...campagne,
      campagneActive: true,
      nomCampagne: nom,
    });
    setNomNouvelleCampagne('');
  }

  async function rejoindreCampagne(fichier: File | undefined) {
    if (!fichier) return;
    setErreurImport(null);
    try {
      if (fichier.size > TAILLE_MAX_PAYLOAD_CAMPAGNE + 4096) {
        throw new Error('Le fichier dépasse la limite de 512 Ko.');
      }
      onImport(await fichier.text());
    } catch (erreur) {
      setErreurImport(
        erreur instanceof Error
          ? erreur.message
          : 'La campagne n’a pas pu être importée.',
      );
    } finally {
      if (fichierImport.current) fichierImport.current.value = '';
    }
  }

  function modifierRessource(
    cle: 'couronnes' | 'fragments',
    variation: number,
  ) {
    onCampagneChange({
      ...campagne,
      [cle]: Math.max(0, campagne[cle] + variation),
    });
  }

  if (campagne.campagneActive === false) {
    return (
      <section className="product-view">
        <PageHeader
          eyebrow="Mode campagne"
          title="Entrer dans la chronique"
          description="Votre bande reste indépendante tant que vous ne l’inscrivez pas dans une campagne."
        />

        <div className="campaign-onboarding-grid">
          <section className="campaign-mode-card primary-mode">
            <span className="campaign-mode-icon" aria-hidden="true">
              <Swords />
            </span>
            <p className="eyebrow">Nouvelle campagne</p>
            <h2>Démarrer avec {campagne.nomBande}</h2>
            <p>
              La bande, son équipement et son trésor deviennent le point de
              départ de la nouvelle chronique.
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                demarrerCampagne();
              }}
            >
              <Input
                aria-label="Nom de la campagne à démarrer"
                maxLength={160}
                placeholder="Nom de la campagne"
                value={nomNouvelleCampagne}
                onChange={(event) => setNomNouvelleCampagne(event.target.value)}
              />
              <Button disabled={!nomNouvelleCampagne.trim()} type="submit">
                <Swords aria-hidden="true" /> Démarrer la campagne
              </Button>
            </form>
          </section>

          <section className="campaign-mode-card">
            <span className="campaign-mode-icon" aria-hidden="true">
              <Upload />
            </span>
            <p className="eyebrow">Campagne existante</p>
            <h2>Rejoindre depuis un registre</h2>
            <p>
              Importez le fichier JSON partagé par l’organisateur. Il sera
              conservé comme un registre distinct sur cet appareil.
            </p>
            <label className={buttonVariants({ variant: 'outline' })}>
              <Upload aria-hidden="true" /> Choisir un fichier JSON
              <input
                accept="application/json,.json"
                className="sr-only"
                onChange={(event) =>
                  void rejoindreCampagne(event.target.files?.[0])
                }
                ref={fichierImport}
                type="file"
              />
            </label>
            {erreurImport && (
              <p className="campaign-import-error" role="alert">
                {erreurImport}
              </p>
            )}
          </section>
        </div>
      </section>
    );
  }

  return (
    <section className="product-view">
      <PageHeader
        eyebrow={`Campagne · ${campagne.nomCampagne}`}
        title="Après la poussière"
        description="Faites les trois premières étapes devant votre adversaire, puis reprenez les achats quand vous le souhaitez."
        action={
          <Button onClick={onExport} type="button" variant="outline">
            <Download aria-hidden="true" /> Exporter la campagne
          </Button>
        }
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
                key={campagne.factionId}
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
              Consulter <ExternalLink aria-hidden="true" />
              <IndicationNouvelOnglet />
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
        <Button
          aria-label={`Diminuer ${label} de 1 ${unit}`}
          size="icon"
          variant="outline"
          onClick={() => onChange(-1)}
        >
          <Minus />
        </Button>
        <output aria-live="polite">
          <strong>{value}</strong>
          <span>{unit}</span>
        </output>
        <Button
          aria-label={`Augmenter ${label} de 1 ${unit}`}
          size="icon"
          variant="outline"
          onClick={() => onChange(1)}
        >
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

      <section className="project-legal-notice" aria-labelledby="legal-title">
        <div className="project-legal-heading">
          <Shield aria-hidden="true" />
          <div>
            <p className="eyebrow">Mentions et crédits</p>
            <h2 id="legal-title">Projet fan non officiel</h2>
          </div>
        </div>
        <p>
          Trackheim est une application communautaire gratuite, sans publicité,
          sans affiliation ni approbation de Games Workshop Limited. Mordheim et
          les noms associés restent la propriété de leurs titulaires respectifs.
        </p>
        <p>
          Le code propre à Trackheim est distribué sous licence MIT. Cette
          licence ne s’étend ni aux marques, ni aux règles et données de jeu, ni
          aux ressources appartenant à des tiers.
        </p>
        <p className="asset-license-note">
          Corbeau par Brett Croft via{' '}
          <a
            href="https://freepngimg.com/png/108894-pic-bird-raven-download-hq"
            target="_blank"
            rel="noreferrer"
          >
            FreePNGimg
            <IndicationNouvelOnglet />
          </a>{' '}
          sous{' '}
          <a
            href="https://creativecommons.org/licenses/by-nc/4.0/"
            target="_blank"
            rel="noreferrer license"
          >
            CC BY-NC 4.0
            <IndicationNouvelOnglet />
          </a>
          , avec teinte adaptée. Cette ressource ne permet pas un usage
          commercial.
        </p>
        <p>
          <strong>Confidentialité.</strong> Les campagnes restent dans le
          stockage local du navigateur. Trackheim ne crée aucun compte,
          n’utilise aucun cookie publicitaire, n’intègre aucun outil d’analyse
          d’audience et ne transmet pas les données de campagne. L’export JSON
          reste sous le contrôle de l’utilisateur.
        </p>
        <p>
          <strong>Conditions d’utilisation.</strong> L’application est fournie
          gratuitement et en l’état. Les joueurs restent responsables de leurs
          sauvegardes et doivent se référer aux publications officielles en cas
          de doute sur une règle.
        </p>
      </section>
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
  const [bandeSelectionnee, setBandeSelectionnee] =
    useState<BandeBibliotheque | null>(null);
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
            Voir la GLM <ExternalLink aria-hidden="true" />
            <IndicationNouvelOnglet />
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
          aria-label="Filtrer les bandes par grade"
          value={grade}
          onChange={(event) => onGradeChange(event.target.value as FiltreGrade)}
        >
          <NativeSelectOption value="tous">Tous les grades</NativeSelectOption>
          <NativeSelectOption value="1a">
            Grade 1a : officiel
          </NativeSelectOption>
          <NativeSelectOption value="1b">
            Grade 1b : publié GW
          </NativeSelectOption>
          <NativeSelectOption value="1c">
            Grade 1c : expérimental
          </NativeSelectOption>
          <NativeSelectOption value="2">
            Grade 2 : fan fiable
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
            <button
              className="library-card-main"
              type="button"
              onClick={() => setBandeSelectionnee(bande)}
              aria-label={`Consulter les informations de ${bande.nom}`}
            >
              <span className="library-card-top">
                <span className={`grade grade-${bande.grade}`}>
                  Grade {bande.grade}
                </span>
                <Users aria-hidden="true" />
              </span>
              <h3>{bande.nom}</h3>
              <p>{texteGrade(bande.grade)}</p>
              <span className="library-card-hint">Consulter la fiche</span>
            </button>
            <div className="library-card-actions">
              <a
                href={`${SOURCE_GLM}/bandes/${bande.slug}`}
                target="_blank"
                rel="noreferrer"
              >
                Fiche GLM <ExternalLink aria-hidden="true" />
                <IndicationNouvelOnglet />
              </a>
              {bande.pdfUrl && (
                <a href={bande.pdfUrl} target="_blank" rel="noreferrer">
                  <FileText aria-hidden="true" /> PDF
                  <IndicationNouvelOnglet />
                </a>
              )}
            </div>
          </article>
        ))}
      </div>

      <Dialog
        open={Boolean(bandeSelectionnee)}
        onOpenChange={(ouverte) => {
          if (!ouverte) setBandeSelectionnee(null);
        }}
      >
        <DialogContent className="band-details-dialog">
          {bandeSelectionnee ? (
            <>
              <DialogHeader>
                <span
                  className={`grade grade-${bandeSelectionnee.grade} band-details-grade`}
                >
                  Grade {bandeSelectionnee.grade}
                </span>
                <DialogTitle>{bandeSelectionnee.nom}</DialogTitle>
                <DialogDescription>
                  {texteGrade(bandeSelectionnee.grade)} Cette fiche distingue
                  les références disponibles des règles réellement intégrées
                  dans Trackheim.
                </DialogDescription>
              </DialogHeader>

              <dl className="band-details-grid">
                <div>
                  <dt>Référence</dt>
                  <dd>Grande Librairie de Mordheim</dd>
                </div>
                <div>
                  <dt>Fiche GLM</dt>
                  <dd>Disponible en ligne</dd>
                </div>
                <div>
                  <dt>PDF indexé</dt>
                  <dd>
                    {bandeSelectionnee.pdfUrl ? 'Disponible' : 'Non disponible'}
                  </dd>
                </div>
              </dl>

              <div className="band-support-state">
                <Shield aria-hidden="true" />
                <div>
                  <strong>Prise en charge Trackheim</strong>
                  <p>
                    {definitionsBandes.some(
                      (definition) => definition.id === bandeSelectionnee.slug,
                    )
                      ? 'Règles de composition et recrutement intégrées au constructeur de bande.'
                      : 'Référence consultable. Les profils de recrutement de cette bande ne sont pas encore indexés dans l’application.'}
                  </p>
                </div>
              </div>

              <DialogFooter className="band-details-actions">
                <a
                  className="source-button"
                  href={`${SOURCE_GLM}/bandes/${bandeSelectionnee.slug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ouvrir la fiche GLM <ExternalLink aria-hidden="true" />
                  <IndicationNouvelOnglet />
                </a>
                {bandeSelectionnee.pdfUrl ? (
                  <a
                    className="source-button"
                    href={bandeSelectionnee.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Lire le PDF <FileText aria-hidden="true" />
                    <IndicationNouvelOnglet />
                  </a>
                ) : null}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
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
            <Trash2 aria-hidden="true" />
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
          items={obtenirDefinitionBande(campagne.factionId).profils.map(
            (profil) => ({
              id: profil.id,
              nom: profil.nom,
              officiel: profil.cout,
              valeur: campagne.homebrew.coutsRecrues[profil.id],
            }),
          )}
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

/** Une bande neuve reçoit le budget officiel de sa faction. */
function creerEtatCampagne(
  nomBande: string,
  factionId: FactionId,
): EtatCampagne {
  const definition = obtenirDefinitionBande(factionId);
  return {
    version: 3,
    revision: 0,
    rulesetId: 'mordheim-1999-rules-review-2005-bandes-core',
    nomCampagne: 'Hors campagne',
    nomBande,
    factionId,
    grade: '1a',
    campagneActive: false,
    couronnes: definition.budgetInitial,
    fragments: 0,
    numeroBataille: 0,
    etapesApresBataille: etapesApresBataille.map(() => false),
    combattants: [],
    inventaire: {},
    batailleEnCours: null,
    parties: [],
    homebrew: {
      actifs: false,
      nomSet: `Règles de ${nomBande}`.slice(0, 160),
      description: 'Ajustements appliqués au-dessus du socle officiel.',
      coutsRecrues: {},
      coutsEquipements: {},
      regles: [],
    },
  };
}

function coutEquipement(
  equipement: Equipement,
  campagne: EtatCampagne,
  profil?: ProfilRecrue,
) {
  const coutOfficiel = profil
    ? coutEquipementPourProfil(equipement, profil)
    : equipement.cout;
  if (!campagne.homebrew.actifs) return coutOfficiel;
  return campagne.homebrew.coutsEquipements[equipement.id] ?? coutOfficiel;
}

function profilParId(id: string) {
  return obtenirProfil(id);
}

function equipementParId(id: string) {
  const equipement = equipements.find((candidat) => candidat.id === id);
  if (!equipement) throw new Error(`Équipement inconnu : ${id}`);
  return equipement;
}

function equipementsPourProfil(
  profil: ProfilRecrue,
  campagne: EtatCampagne,
  creationDeBande: boolean,
) {
  return equipements.filter((item) => {
    if (item.commerceUniquement) return false;
    if (!creationDeBande && item.rareteCommerce !== undefined) return false;
    if (!creationDeBande && item.categorie === 'Mutation') return false;
    return equipementAutorise(profil, item);
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

function normaliser(texte: string) {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function telechargerTexte(contenu: string, nomFichier: string) {
  const blob = new Blob([contenu], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichier;
  lien.hidden = true;
  document.body.append(lien);
  lien.click();
  window.setTimeout(() => {
    lien.remove();
    URL.revokeObjectURL(url);
  }, 1_000);
}

function messageErreurStockage(erreur: unknown) {
  if (erreur instanceof Error && erreur.message) return erreur.message;
  return 'Le navigateur refuse la sauvegarde locale. Exportez la bande avant de fermer la page.';
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
