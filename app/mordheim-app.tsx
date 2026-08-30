'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronDown,
  CircleAlert,
  Coins,
  ExternalLink,
  FileText,
  FlaskConical,
  Gem,
  LayoutDashboard,
  Minus,
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
import {
  Progress,
  ProgressLabel,
} from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  bandesBibliotheque,
  equipements,
  etapesApresBataille,
  etatInitial,
  profilsReiklanders,
  SOURCE_GLM,
  type Combattant,
  type Equipement,
  type EtatCampagne,
  type ProfilRecrue,
  type RegleHomebrew,
  type ReglagesHomebrew,
  type Statistiques,
} from '@/lib/mordheim-data';

type Vue = 'overview' | 'warband' | 'campaign' | 'library' | 'homebrew';
type EtatSauvegarde = 'chargement' | 'sauvegarde' | 'sauvegarde-ok' | 'hors-ligne';

const ID_CAMPAGNE = 'campagne-principale';

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

export function MordheimApp() {
  const [vue, setVue] = useState<Vue>('overview');
  const [campagne, setCampagne] = useState<EtatCampagne>(etatInitial);
  const [etatSauvegarde, setEtatSauvegarde] =
    useState<EtatSauvegarde>('chargement');
  const [hydratationTerminee, setHydratationTerminee] = useState(false);

  /*
   * D1 reste la source de vérité. Le chargement initial conserve une copie
   * de démonstration utilisable si le réseau local est momentanément absent.
   */
  useEffect(() => {
    let annule = false;

    async function chargerCampagne() {
      try {
        const reponse = await fetch(`/api/campaign?id=${ID_CAMPAGNE}`);
        if (!reponse.ok) throw new Error('Chargement impossible');
        const donnees = (await reponse.json()) as {
          campagne: EtatCampagne | null;
        };
        if (!annule && donnees.campagne) {
          setCampagne(normaliserCampagne(donnees.campagne));
        }
        if (!annule) setEtatSauvegarde('sauvegarde-ok');
      } catch {
        if (!annule) setEtatSauvegarde('hors-ligne');
      } finally {
        if (!annule) setHydratationTerminee(true);
      }
    }

    void chargerCampagne();
    return () => { annule = true; };
  }, []);

  /* Une courte temporisation évite un appel D1 à chaque frappe clavier. */
  useEffect(() => {
    if (!hydratationTerminee) return;
    const minuteur = window.setTimeout(async () => {
      setEtatSauvegarde('sauvegarde');
      try {
        const reponse = await fetch('/api/campaign', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: ID_CAMPAGNE, campagne }),
        });
        if (!reponse.ok) throw new Error('Sauvegarde impossible');
        setEtatSauvegarde('sauvegarde-ok');
      } catch {
        setEtatSauvegarde('hors-ligne');
      }
    }, 650);

    return () => window.clearTimeout(minuteur);
  }, [campagne, hydratationTerminee]);

  const synthese = useMemo(() => calculerSynthese(campagne), [campagne]);

  return (
    <main className="application">
      <div className="application-layout">
        <Sidebar vue={vue} onVueChange={setVue} />

        <section className="workspace">
          <Topbar campagne={campagne} etatSauvegarde={etatSauvegarde} />

          <div className="content-wrap">
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
              <CampaignView campagne={campagne} onCampagneChange={setCampagne} />
            )}
            {vue === 'library' && <LibraryView />}
            {vue === 'homebrew' && (
              <HomebrewView campagne={campagne} onCampagneChange={setCampagne} />
            )}
          </div>
        </section>
      </div>
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
        <div className="brand-mark" aria-hidden="true"><Skull /></div>
        <div>
          <p className="brand-kicker">Mordheim</p>
          <p className="brand-title">Trackheim</p>
        </div>
      </div>

      <nav className="navigation-stack primary-navigation" aria-label="Navigation principale">
        {navigation.map(({ id, libelle, icone: Icone }) => (
          <button
            key={id}
            className={vue === id ? 'navigation-item active' : 'navigation-item'}
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
          className={vue === 'homebrew' ? 'navigation-item active' : 'navigation-item'}
          onClick={() => onVueChange('homebrew')}
          type="button"
        >
          <FlaskConical aria-hidden="true" />
          <span>Règles homebrew</span>
          <span className="new-badge">Nouveau</span>
        </button>
        <button className="navigation-item settings-navigation-item" type="button">
          <Settings2 aria-hidden="true" />
          <span>Paramètres</span>
        </button>
      </nav>

      <div className="sidebar-source">
        <Sparkles aria-hidden="true" />
        <p>Données indexées depuis la Grande Librairie de Mordheim.</p>
      </div>
    </aside>
  );
}

function Topbar({
  campagne,
  etatSauvegarde,
}: {
  campagne: EtatCampagne;
  etatSauvegarde: EtatSauvegarde;
}) {
  const libelles: Record<EtatSauvegarde, string> = {
    chargement: 'Chargement…',
    sauvegarde: 'Sauvegarde…',
    'sauvegarde-ok': 'Sauvegardé',
    'hors-ligne': 'Mode local',
  };

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Campagne active</p>
        <button className="campaign-switcher" type="button">
          <span>{campagne.nomCampagne}</span>
          <ChevronDown aria-hidden="true" />
        </button>
      </div>
      <div className="topbar-actions">
        <span className={`save-state ${etatSauvegarde}`}>{libelles[etatSauvegarde]}</span>
        <button className="search-button" type="button">
          <Search aria-hidden="true" />
          <span>Rechercher</span>
          <kbd>⌘ K</kbd>
        </button>
        <div className="avatar" aria-label="Profil de Troma">TR</div>
      </div>
    </header>
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
      <WarbandHeading
        campagne={campagne}
        onCampagneChange={onCampagneChange}
      />
      <Metrics campagne={campagne} synthese={synthese} />

      <div className="dashboard-grid">
        <section className="roster-panel">
          <div className="panel-header">
            <div><p className="eyebrow">Effectif</p><h2>Combattants</h2></div>
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
          <AfterBattleCard campagne={campagne} onCampagneChange={onCampagneChange} />
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

function Metrics({ campagne, synthese }: { campagne: EtatCampagne; synthese: Synthese }) {
  return (
    <section className="metrics-grid" aria-label="Résumé de la bande">
      <MetricCard icon={Users} label="Combattants" value={`${campagne.combattants.length}`} unit="/ 15" note={`${synthese.heros} héros · ${synthese.hommesDeMain} hommes de main`} />
      <MetricCard icon={Shield} label="Valeur de bande" value={`${synthese.valeurBande}`} note={`${synthese.experienceTotale} points d’expérience`} positive />
      <MetricCard icon={Coins} label="Trésor" value={`${campagne.couronnes}`} unit="CO" note={`${synthese.coutBande} CO investies`} />
      <MetricCard icon={Gem} label="Pierre magique" value={`${campagne.fragments}`} unit="fragments" note="À vendre pendant l’après-bataille" />
    </section>
  );
}

type Synthese = {
  heros: number;
  hommesDeMain: number;
  experienceTotale: number;
  coutBande: number;
  valeurBande: number;
};

function calculerSynthese(campagne: EtatCampagne): Synthese {
  let heros = 0;
  let hommesDeMain = 0;
  let coutBande = 0;

  for (const combattant of campagne.combattants) {
    const profil = profilParId(combattant.profilId);
    if (profil.categorie === 'Héros') heros += 1;
    else hommesDeMain += 1;
    coutBande += coutProfil(profil, campagne);
    coutBande += combattant.equipementIds.reduce(
      (total, id) => total + coutEquipement(equipementParId(id), campagne),
      0,
    );
  }

  const experienceTotale = campagne.combattants.reduce(
    (total, combattant) => total + combattant.experience,
    0,
  );

  return {
    heros,
    hommesDeMain,
    experienceTotale,
    coutBande,
    valeurBande: campagne.combattants.length * 5 + experienceTotale,
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
      <span className="metric-icon"><Icone /></span>
      <div><p>{label}</p><strong>{value} {unit && <small>{unit}</small>}</strong></div>
      <span className={positive ? 'metric-note positive' : 'metric-note'}>{note}</span>
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
          <div><h3>{combattant.nom}</h3><p>{profil.nom}</p></div>
          <span className={combattant.statut === 'Prêt' ? 'status' : 'status wounded'}>
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
  onCampagneChange,
}: {
  campagne: EtatCampagne;
  onCampagneChange: (campagne: EtatCampagne) => void;
}) {
  const terminees = campagne.etapesApresBataille.filter(Boolean).length;
  const progression = terminees * 10;

  function basculerEtape(index: number) {
    const etapes = [...campagne.etapesApresBataille];
    etapes[index] = !etapes[index];
    onCampagneChange({ ...campagne, etapesApresBataille: etapes });
  }

  return (
    <section className="after-battle-card">
      <div className="panel-header compact">
        <div><p className="eyebrow">Partie n° {campagne.numeroBataille}</p><h2>Après-bataille</h2></div>
        <span className="step-count">{terminees} / 10</span>
      </div>
      <Progress value={progression} className="campaign-progress">
        <ProgressLabel>Progression</ProgressLabel>
      </Progress>
      <ol className="step-list">
        {etapesApresBataille.map((etape, index) => {
          const terminee = campagne.etapesApresBataille[index];
          const premiereOuverte = index === campagne.etapesApresBataille.findIndex((item) => !item);

          return (
            <li
              className={terminee ? 'step-item completed' : premiereOuverte ? 'step-item current' : 'step-item pending'}
              key={etape}
            >
              <button className="step-number" onClick={() => basculerEtape(index)} type="button">
                {index + 1}
              </button>
              <p>{etape}</p>
              {terminee && <span className="check-mark">✓</span>}
              {premiereOuverte && <span className="step-dot" />}
            </li>
          );
        })}
      </ol>
      <Button className="continue-button" variant="secondary">
        Continuer la séquence
      </Button>
    </section>
  );
}

function LastBattleCard({ campagne }: { campagne: EtatCampagne }) {
  const partie = campagne.parties[0];
  if (!partie) return null;

  return (
    <section className="last-battle-card">
      <div className="battle-crest"><Swords /></div>
      <div>
        <p className="eyebrow">Dernière bataille</p>
        <h3>{partie.scenario}</h3>
        <p>Contre {partie.adversaire} · {formaterDate(partie.date)}</p>
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
    onCampagneChange({
      ...campagne,
      combattants: campagne.combattants.filter((combattant) => combattant.id !== id),
    });
  }

  return (
    <section className="product-view">
      <PageHeader
        eyebrow="Builder de bande"
        title="Ma bande"
        description="Recrutez, équipez et faites progresser chaque combattant. Les limites Reiklanders sont contrôlées automatiquement."
        action={<RecruitDialog campagne={campagne} onCampagneChange={onCampagneChange} />}
      />

      <div className="builder-summary">
        <strong>{synthese.coutBande} CO</strong>
        <span>investies sur 500 CO à la création</span>
        <div className="budget-track"><span style={{ width: `${Math.min(100, synthese.coutBande / 5)}%` }} /></div>
        <span className={synthese.coutBande > 500 ? 'budget-alert' : ''}>
          {500 - synthese.coutBande} CO restantes
        </span>
      </div>

      <div className="recruitment-grid">
        {profilsReiklanders.map((profil) => {
          const nombre = campagne.combattants.filter((item) => item.profilId === profil.id).length;
          return (
            <article className="profile-card" key={profil.id}>
              <div className="profile-card-header">
                <span>{profil.categorie}</span>
                <strong>{coutProfil(profil, campagne)} CO</strong>
              </div>
              <h3>{profil.nom}</h3>
              <p className="stat-line">{formaterStats(profil.statistiques)}</p>
              <div className="profile-card-footer">
                <span>{nombre} recruté{nombre > 1 ? 's' : ''}</span>
                <span>{profil.maximum ? `max. ${profil.maximum}` : 'sans limite'}</span>
              </div>
            </article>
          );
        })}
      </div>

      <section className="management-panel">
        <div className="panel-header">
          <div><p className="eyebrow">Feuille de bande</p><h2>{campagne.combattants.length} combattants</h2></div>
          <span className="rating-chip">Valeur {synthese.valeurBande}</span>
        </div>
        <div className="management-list">
          {campagne.combattants.map((combattant) => {
            const profil = profilParId(combattant.profilId);
            return (
              <article className="management-row" key={combattant.id}>
                <div className="fighter-avatar">{initiales(combattant.nom)}</div>
                <div className="management-identity">
                  <strong>{combattant.nom}</strong>
                  <span>{profil.nom}</span>
                </div>
                <div className="xp-control" aria-label={`Expérience de ${combattant.nom}`}>
                  <Button size="icon-xs" variant="outline" onClick={() => modifierCombattant(combattant.id, { experience: Math.max(0, combattant.experience - 1) })}><Minus /></Button>
                  <span><strong>{combattant.experience}</strong> XP</span>
                  <Button size="icon-xs" variant="outline" onClick={() => modifierCombattant(combattant.id, { experience: combattant.experience + 1 })}><Plus /></Button>
                </div>
                <NativeSelect
                  aria-label={`Statut de ${combattant.nom}`}
                  value={combattant.statut}
                  onChange={(event) => modifierCombattant(combattant.id, { statut: event.target.value as Combattant['statut'] })}
                >
                  <NativeSelectOption value="Prêt">Prêt</NativeSelectOption>
                  <NativeSelectOption value="Blessé">Blessé</NativeSelectOption>
                  <NativeSelectOption value="Absent">Absent</NativeSelectOption>
                </NativeSelect>
                <Button
                  aria-label={`Renvoyer ${combattant.nom}`}
                  size="icon-sm"
                  variant="ghost"
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
  const [nom, setNom] = useState('');
  const [selectionEquipement, setSelectionEquipement] = useState<string[]>([]);
  const profil = profilParId(profilId);
  const disponibles = equipementsPourProfil(profil);
  const cout = coutProfil(profil, campagne) + selectionEquipement.reduce(
    (total, id) => total + coutEquipement(equipementParId(id), campagne),
    0,
  );
  const nombreProfil = campagne.combattants.filter((item) => item.profilId === profilId).length;
  const limiteAtteinte = profil.maximum !== null && nombreProfil >= profil.maximum;
  const bandePleine = campagne.combattants.length >= 15;

  function recruter() {
    if (!nom.trim() || limiteAtteinte || bandePleine) return;
    const combattant: Combattant = {
      id: crypto.randomUUID(),
      nom: nom.trim(),
      profilId,
      experience: profil.experienceInitiale,
      statut: 'Prêt',
      statistiques: { ...profil.statistiques },
      equipementIds: selectionEquipement,
      notes: '',
    };

    onCampagneChange({
      ...campagne,
      couronnes: Math.max(0, campagne.couronnes - cout),
      combattants: [...campagne.combattants, combattant],
    });
    setNom('');
    setSelectionEquipement([]);
    setOuvert(false);
  }

  function basculerEquipement(id: string, selectionne: boolean) {
    setSelectionEquipement((courante) =>
      selectionne ? [...courante, id] : courante.filter((item) => item !== id),
    );
  }

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger render={<Button className="primary-action" size="lg" />}>
        <Plus data-icon="inline-start" />
        Ajouter un combattant
      </DialogTrigger>
      <DialogContent className="recruit-dialog sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Recruter un combattant</DialogTitle>
          <DialogDescription>
            Les profils et prix proviennent de la liste officielle des Mercenaires Reiklanders.
          </DialogDescription>
        </DialogHeader>

        <div className="form-grid">
          <label className="field-group" htmlFor="recruit-profile">
            <span>Profil</span>
            <NativeSelect id="recruit-profile" value={profilId} onChange={(event) => { setProfilId(event.target.value); setSelectionEquipement([]); }}>
              {profilsReiklanders.map((item) => (
                <NativeSelectOption key={item.id} value={item.id}>{item.nom} — {coutProfil(item, campagne)} CO</NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
          <label className="field-group" htmlFor="recruit-name">
            <span>Nom du combattant</span>
            <Input id="recruit-name" value={nom} onChange={(event) => setNom(event.target.value)} placeholder="Ex. Dieter le Borgne" />
          </label>
        </div>

        <div className="profile-preview">
          <div><strong>{profil.nom}</strong><span>{profil.categorie}</span></div>
          <code>{formaterStats(profil.statistiques)}</code>
          {profil.regleSpeciale && <p>{profil.regleSpeciale}</p>}
        </div>

        <div className="equipment-picker">
          <div className="section-title-row"><h3>Équipement de départ</h3><span>Première dague gratuite</span></div>
          <div className="equipment-options">
            {disponibles.map((item) => (
              <div className="equipment-option" key={item.id}>
                <Checkbox
                  aria-label={`Ajouter ${item.nom}`}
                  checked={selectionEquipement.includes(item.id)}
                  onCheckedChange={(checked) => basculerEquipement(item.id, checked === true)}
                />
                <span><strong>{item.nom}</strong><small>{item.categorie}</small></span>
                <b>{coutEquipement(item, campagne)} CO</b>
              </div>
            ))}
          </div>
        </div>

        {(limiteAtteinte || bandePleine) && (
          <div className="form-alert"><CircleAlert /> La limite de ce profil ou de la bande est atteinte.</div>
        )}

        <DialogFooter>
          <div className="dialog-total"><span>Total</span><strong>{cout} CO</strong></div>
          <Button onClick={recruter} disabled={!nom.trim() || limiteAtteinte || bandePleine}>
            Recruter
          </Button>
        </DialogFooter>
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
  function modifierRessource(cle: 'couronnes' | 'fragments', variation: number) {
    onCampagneChange({ ...campagne, [cle]: Math.max(0, campagne[cle] + variation) });
  }

  function basculer(index: number) {
    const etapes = [...campagne.etapesApresBataille];
    etapes[index] = !etapes[index];
    onCampagneChange({ ...campagne, etapesApresBataille: etapes });
  }

  return (
    <section className="product-view">
      <PageHeader
        eyebrow="Suivi de campagne"
        title="Après la poussière"
        description="Faites les trois premières étapes devant votre adversaire, puis reprenez les achats quand vous le souhaitez."
      />

      <div className="campaign-layout">
        <section className="sequence-panel">
          <div className="panel-header">
            <div><p className="eyebrow">Bataille {campagne.numeroBataille}</p><h2>Séquence d’après-bataille</h2></div>
            <span className="source-chip">LRB p. 116</span>
          </div>
          <ol className="campaign-sequence">
            {etapesApresBataille.map((etape, index) => {
              const terminee = campagne.etapesApresBataille[index];
              return (
                <li className={terminee ? 'campaign-step completed' : 'campaign-step'} key={etape}>
                  <button onClick={() => basculer(index)} type="button">
                    {terminee ? <Check /> : index + 1}
                  </button>
                  <div><strong>{etape}</strong><p>{descriptionEtape(index)}</p></div>
                  <span>{terminee ? 'Terminé' : 'À faire'}</span>
                </li>
              );
            })}
          </ol>
        </section>

        <aside className="campaign-tools">
          <ResourceCounter icon={Coins} label="Couronnes d’or" value={campagne.couronnes} unit="CO" onChange={(variation) => modifierRessource('couronnes', variation)} />
          <ResourceCounter icon={Gem} label="Pierre magique" value={campagne.fragments} unit="fragments" onChange={(variation) => modifierRessource('fragments', variation)} />
          <section className="rule-note">
            <BookOpen />
            <div><strong>Source de règles</strong><p>Grande Librairie de Mordheim — Campagne et livre de règles corrigé.</p></div>
            <a href={`${SOURCE_GLM}/campagne`} target="_blank" rel="noreferrer">Consulter <ExternalLink /></a>
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
      <div className="resource-heading"><span><Icone /></span><p>{label}</p></div>
      <div className="counter-control">
        <Button size="icon" variant="outline" onClick={() => onChange(-1)}><Minus /></Button>
        <div><strong>{value}</strong><span>{unit}</span></div>
        <Button size="icon" variant="outline" onClick={() => onChange(1)}><Plus /></Button>
      </div>
    </section>
  );
}

function LibraryView() {
  const [recherche, setRecherche] = useState('');
  const [grade, setGrade] = useState('tous');
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
        action={<a className="source-button" href={`${SOURCE_GLM}/bandes`} target="_blank" rel="noreferrer">Voir la GLM <ExternalLink /></a>}
      />

      <div className="library-toolbar">
        <div className="library-search"><Search /><Input aria-label="Rechercher une bande" value={recherche} onChange={(event) => setRecherche(event.target.value)} placeholder="Rechercher une bande…" /></div>
        <NativeSelect value={grade} onChange={(event) => setGrade(event.target.value)}>
          <NativeSelectOption value="tous">Tous les grades</NativeSelectOption>
          <NativeSelectOption value="1a">Grade 1a — officiel</NativeSelectOption>
          <NativeSelectOption value="1b">Grade 1b — publié GW</NativeSelectOption>
          <NativeSelectOption value="1c">Grade 1c — expérimental</NativeSelectOption>
          <NativeSelectOption value="2">Grade 2 — fan fiable</NativeSelectOption>
        </NativeSelect>
        <span>{resultats.length} bandes</span>
      </div>

      <div className="library-grid">
        {resultats.map((bande) => (
          <article className="library-card" key={`${bande.grade}-${bande.slug}`}>
            <div className="library-card-top"><span className={`grade grade-${bande.grade}`}>Grade {bande.grade}</span><Shield /></div>
            <h3>{bande.nom}</h3>
            <p>{texteGrade(bande.grade)}</p>
            <div className="library-card-actions">
              <a href={`${SOURCE_GLM}/bandes/${bande.slug}`} target="_blank" rel="noreferrer">Fiche GLM <ExternalLink /></a>
              {bande.pdfUrl && <a href={bande.pdfUrl} target="_blank" rel="noreferrer"><FileText /> PDF</a>}
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
  const reglesActives = campagne.homebrew.regles.filter((regle) => regle.active).length;

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

  function basculerSurchargeRecrue(id: string, active: boolean, officiel: number) {
    const valeurs = { ...campagne.homebrew.coutsRecrues };
    if (active) valeurs[id] = officiel;
    else delete valeurs[id];
    mettreAJourHomebrew({ coutsRecrues: valeurs });
  }

  function basculerSurchargeEquipement(id: string, active: boolean, officiel: number) {
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
        action={(
          <Button
            variant="outline"
            disabled={nombreSurcharges === 0}
            onClick={() => mettreAJourHomebrew({ coutsRecrues: {}, coutsEquipements: {} })}
          >
            Retirer les overrides de prix
          </Button>
        )}
      />

      <section className="homebrew-toggle">
        <div>
          <FlaskConical />
          <div>
            <strong>Appliquer « {campagne.homebrew.nomSet} »</strong>
            <p>{nombreSurcharges} overrides · {reglesActives} règles complémentaires actives</p>
          </div>
        </div>
        <Switch
          aria-label="Appliquer le set homebrew"
          checked={campagne.homebrew.actifs}
          onCheckedChange={(actifs) => mettreAJourHomebrew({ actifs })}
        />
      </section>

      <section className="overlay-map" aria-label="Ordre d’application des règles">
        <div className="overlay-node official-layer">
          <Shield />
          <span><small>Socle</small><strong>Règles officielles</strong></span>
          <b>Vanilla complet</b>
        </div>
        <span className="overlay-operator">+</span>
        <div className="overlay-node homebrew-layer">
          <FlaskConical />
          <span><small>Surcouche</small><strong>{campagne.homebrew.nomSet}</strong></span>
          <b>{nombreSurcharges + reglesActives} éléments</b>
        </div>
        <span className="overlay-operator">=</span>
        <div className="overlay-node effective-layer">
          <Sparkles />
          <span><small>Résultat</small><strong>Règles effectives</strong></span>
          <b>Vanilla + overrides</b>
        </div>
      </section>

      <section className="rule-set-card">
        <div className="panel-header">
          <div><p className="eyebrow">Identité de la surcouche</p><h2>Votre set de règles</h2></div>
          <span className={campagne.homebrew.actifs ? 'layer-status active' : 'layer-status'}>
            {campagne.homebrew.actifs ? 'Appliqué' : 'En préparation'}
          </span>
        </div>
        <div className="rule-set-fields">
          <label className="field-group" htmlFor="homebrew-set-name">
            Nom du set
            <Input
              id="homebrew-set-name"
              value={campagne.homebrew.nomSet}
              onChange={(event) => mettreAJourHomebrew({ nomSet: event.target.value })}
            />
          </label>
          <label className="field-group" htmlFor="homebrew-set-description">
            Intention de la règle maison
            <Textarea
              id="homebrew-set-description"
              value={campagne.homebrew.description}
              onChange={(event) => mettreAJourHomebrew({ description: event.target.value })}
            />
          </label>
        </div>
      </section>

      <section className="custom-rules-panel">
        <div className="panel-header">
          <div><p className="eyebrow">Compléments au livre de règles</p><h2>Règles personnalisées</h2></div>
          <AddRuleDialog onAdd={ajouterRegle} />
        </div>
        {campagne.homebrew.regles.length > 0 ? (
          <div className="custom-rule-list">
            {campagne.homebrew.regles.map((regle) => (
              <article className={regle.active ? 'custom-rule active' : 'custom-rule'} key={regle.id}>
                <Switch
                  aria-label={`Activer ${regle.titre}`}
                  checked={regle.active}
                  onCheckedChange={(active) => modifierRegle(regle.id, { active })}
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

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Plus data-icon="inline-start" />
        Ajouter une règle
      </DialogTrigger>
      <DialogContent className="homebrew-rule-dialog sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle règle complémentaire</DialogTitle>
          <DialogDescription>
            Décrivez uniquement l’écart au livre officiel. La règle vanilla reste héritée partout ailleurs.
          </DialogDescription>
        </DialogHeader>
        <div className="homebrew-rule-form">
          <label className="field-group" htmlFor="homebrew-rule-title">
            Nom de la règle
            <Input id="homebrew-rule-title" value={titre} onChange={(event) => setTitre(event.target.value)} placeholder="Ex. Prime du chasseur" />
          </label>
          <label className="field-group" htmlFor="homebrew-rule-scope">
            Portée
            <NativeSelect id="homebrew-rule-scope" value={portee} onChange={(event) => setPortee(event.target.value as RegleHomebrew['portee'])}>
              <NativeSelectOption value="Bande">Bande</NativeSelectOption>
              <NativeSelectOption value="Campagne">Campagne</NativeSelectOption>
              <NativeSelectOption value="Combat">Combat</NativeSelectOption>
              <NativeSelectOption value="Après-bataille">Après-bataille</NativeSelectOption>
            </NativeSelect>
          </label>
          <label className="field-group" htmlFor="homebrew-rule-description">
            Texte de l’override ou du complément
            <Textarea
              id="homebrew-rule-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Expliquez précisément ce qui change."
            />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOuvert(false)}>Annuler</Button>
          <Button disabled={!titre.trim() || !description.trim()} onClick={ajouter}>Ajouter au set</Button>
        </DialogFooter>
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
      <div className="panel-header"><div><p className="eyebrow">Overrides ciblés</p><h2>{title}</h2></div></div>
      <div className="price-list">
        {items.map((item) => {
          const surchargeActive = item.valeur !== undefined;
          return (
            <div className={surchargeActive ? 'price-row override-active' : 'price-row'} key={item.id}>
              <span>
                <strong>{item.nom}</strong>
                <small>Officiel : {item.officiel} CO · {surchargeActive ? 'override actif' : 'hérité en vanilla'}</small>
              </span>
              <Switch
                aria-label={`Surcharger le prix de ${item.nom}`}
                checked={surchargeActive}
                onCheckedChange={(active) => onToggle(item.id, active, item.officiel)}
              />
              <Input
                aria-label={`Prix homebrew de ${item.nom}`}
                disabled={!surchargeActive}
                type="number"
                min="0"
                value={item.valeur ?? item.officiel}
                onChange={(event) => onChange(item.id, Math.max(0, Number(event.target.value)))}
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
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>
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
    <div className="empty-state"><Icone /><strong>{title}</strong><p>{text}</p></div>
  );
}

function coutProfil(profil: ProfilRecrue, campagne: EtatCampagne) {
  if (!campagne.homebrew.actifs) return profil.cout;
  return campagne.homebrew.coutsRecrues[profil.id] ?? profil.cout;
}

/**
 * Les campagnes enregistrées avant l’atelier de règles ne contiennent que les
 * overrides de prix. Cette normalisation les enrichit sans perdre leurs choix.
 */
function normaliserCampagne(campagne: EtatCampagne): EtatCampagne {
  const homebrew = (campagne.homebrew ?? {}) as Partial<ReglagesHomebrew>;

  return {
    ...campagne,
    version: 2,
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
  return profilsReiklanders.find((profil) => profil.id === id) ?? profilsReiklanders[0];
}

function equipementParId(id: string) {
  return equipements.find((equipement) => equipement.id === id) ?? equipements[0];
}

function equipementsPourProfil(profil: ProfilRecrue) {
  return equipements.filter((item) => {
    if (profil.listeEquipement === 'tireurs') return item.listeTireurs;
    if (item.reserveAuxHeros) return profil.categorie === 'Héros';
    return true;
  });
}

function formaterStats(stats: Statistiques) {
  return `M${stats.mouvement}  CC${stats.capaciteCombat}  CT${stats.capaciteTir}  F${stats.force}  E${stats.endurance}  PV${stats.pointsVie}  I${stats.initiative}  A${stats.attaques}  Cd${stats.commandement}`;
}

function initiales(nom: string) {
  return nom.split(/\s+/).slice(0, 2).map((mot) => mot[0]?.toUpperCase()).join('');
}

function formaterDate(date: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(date));
}

function normaliser(texte: string) {
  return texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function texteGrade(grade: '1a' | '1b' | '1c' | '2') {
  if (grade === '1a') return 'Bande officielle Games Workshop.';
  if (grade === '1b') return 'Publication Games Workshop non déclarée officielle.';
  if (grade === '1c') return 'Bande expérimentale approuvée par des concepteurs.';
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
