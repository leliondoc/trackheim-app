import {
  BookOpen,
  ChevronDown,
  FlaskConical,
  Home,
  Minus,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Stamp,
  Swords,
  Target,
  Users,
} from 'lucide-react';
import { Fragment } from 'react';

import { hashPourVue, type Vue } from '@/lib/app-navigation';
import type { EtatCampagne } from '@/lib/mordheim-data';

export type EtatSauvegarde =
  | 'chargement'
  | 'sauvegarde'
  | 'sauvegarde-ok'
  | 'erreur';

const navigation: Array<{
  id: Vue;
  libelle: string;
  icone: typeof Home;
}> = [
  { id: 'overview', libelle: 'Vue d’ensemble', icone: Home },
  { id: 'warband', libelle: 'Ma bande', icone: Users },
  { id: 'combat', libelle: 'Mode combat', icone: Target },
  { id: 'spells', libelle: 'Sorts', icone: Sparkles },
  { id: 'campaign', libelle: 'Campagne', icone: Swords },
  { id: 'library', libelle: 'Bibliothèque', icone: BookOpen },
];

export function Sidebar({
  vue,
  onVueChange,
}: {
  vue: Vue;
  onVueChange: (vue: Vue) => void;
}) {
  function lienVue(
    id: Vue,
    libelle: string,
    Icone: typeof Home,
    classeSupplementaire = '',
    nouveau = false,
  ) {
    const actif = vue === id;
    return (
      <a
        aria-label={libelle}
        aria-current={actif ? 'page' : undefined}
        className={`navigation-item ${classeSupplementaire} ${actif ? 'active' : ''}`.trim()}
        href={hashPourVue(id)}
        onClick={(event) => {
          event.preventDefault();
          onVueChange(id);
        }}
      >
        <Icone aria-hidden="true" />
        <span>{libelle}</span>
        {nouveau && (
          <span className="new-badge" aria-hidden="true">
            Nouveau
          </span>
        )}
      </a>
    );
  }

  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-mark" aria-hidden="true">
          <img
            alt=""
            src={`${import.meta.env.BASE_URL}img/trackheim-raven.png`}
          />
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
        {navigation.map(({ id, libelle, icone }) => (
          <Fragment key={id}>{lienVue(id, libelle, icone)}</Fragment>
        ))}
      </nav>

      <div className="sidebar-separator" />
      <p className="sidebar-label">Outils</p>
      <nav className="navigation-stack tools-navigation" aria-label="Outils">
        {lienVue('homebrew', 'Règles homebrew', FlaskConical, '', true)}
        {lienVue(
          'settings',
          'Paramètres',
          Settings2,
          'settings-navigation-item',
        )}
      </nav>

      <div className="sidebar-source">
        <Stamp aria-hidden="true" />
        <div>
          <strong className="unofficial-label">Projet fan non officiel</strong>
          <p>Données indexées depuis la Grande Librairie de Mordheim.</p>
          <a
            className="raven-credit"
            href="https://freepngimg.com/png/108894-pic-bird-raven-download-hq"
            target="_blank"
            rel="noreferrer license"
          >
            Corbeau : Brett Croft · CC BY-NC 4.0 · teinte adaptée
            <IndicationNouvelOnglet />
          </a>
        </div>
      </div>
    </aside>
  );
}

export function Topbar({
  campagne,
  erreurSauvegarde,
  etatSauvegarde,
  rechercheOuverte,
  tailleTexte,
  tailleTexteMaximale,
  tailleTexteMinimale,
  onCampagnes,
  onAugmenterTailleTexte,
  onDiminuerTailleTexte,
  onRecherche,
}: {
  campagne: EtatCampagne | null;
  erreurSauvegarde: string | null;
  etatSauvegarde: EtatSauvegarde;
  rechercheOuverte: boolean;
  tailleTexte: number;
  tailleTexteMaximale: boolean;
  tailleTexteMinimale: boolean;
  onCampagnes: () => void;
  onAugmenterTailleTexte: () => void;
  onDiminuerTailleTexte: () => void;
  onRecherche: () => void;
}) {
  const libelles: Record<EtatSauvegarde, string> = {
    chargement: 'Chargement…',
    sauvegarde: 'Sauvegarde…',
    'sauvegarde-ok': 'Enregistré sur cet appareil',
    erreur: 'Sauvegarde locale impossible',
  };

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">
          {!campagne
            ? 'Trackheim'
            : campagne.campagneActive === false
              ? 'Bande active'
              : 'Campagne active'}
        </p>
        {campagne ? (
          <button
            className="campaign-switcher"
            onClick={onCampagnes}
            type="button"
          >
            <span>
              {campagne.campagneActive === false
                ? campagne.nomBande
                : campagne.nomCampagne}
            </span>
            <ChevronDown aria-hidden="true" />
          </button>
        ) : (
          <p className="campaign-switcher campaign-switcher-empty">
            Aucune bande active
          </p>
        )}
      </div>
      <div className="topbar-actions">
        {campagne && (
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
        <div className="text-scale-control" aria-label="Taille du texte">
          <button
            aria-label="Réduire la taille du texte"
            disabled={tailleTexteMinimale}
            onClick={onDiminuerTailleTexte}
            type="button"
          >
            <Minus aria-hidden="true" />
          </button>
          <output aria-live="polite">{tailleTexte} %</output>
          <button
            aria-label="Augmenter la taille du texte"
            disabled={tailleTexteMaximale}
            onClick={onAugmenterTailleTexte}
            type="button"
          >
            <Plus aria-hidden="true" />
          </button>
        </div>
        <button
          aria-expanded={rechercheOuverte}
          aria-haspopup="dialog"
          aria-keyshortcuts="Control+K Meta+K"
          aria-label={
            campagne
              ? 'Ouvrir la recherche globale'
              : 'Rechercher dans la bibliothèque'
          }
          className="search-button"
          onClick={onRecherche}
          type="button"
        >
          <Search aria-hidden="true" />
          <span>Rechercher</span>
          {campagne && <kbd aria-hidden="true">Ctrl K</kbd>}
        </button>
        <div className="avatar" aria-label="Profil de Troma">
          TR
        </div>
      </div>
    </header>
  );
}

export function IndicationNouvelOnglet() {
  return <span className="sr-only"> (s’ouvre dans un nouvel onglet)</span>;
}
