import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Heart,
  Minus,
  Plus,
  Skull,
  Swords,
  Target,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Vue } from '@/lib/app-navigation';
import {
  equipements,
  obtenirProfil,
  type BatailleEnCours,
  type Combattant,
  type EtatCampagne,
  type SuiviCombattantBataille,
} from '@/lib/mordheim-data';

const phases: NonNullable<BatailleEnCours['phase']>[] = [
  'Mouvement',
  'Tir',
  'Corps à corps',
  'Ralliement',
];
const etats: NonNullable<SuiviCombattantBataille['etatTable']>[] = [
  'Debout',
  'À terre',
  'Sonné',
  'Hors de combat',
];

export function CombatView({
  campagne,
  onCampagneChange,
  onVueChange,
}: {
  campagne: EtatCampagne;
  onCampagneChange: (campagne: EtatCampagne) => void;
  onVueChange: (vue: Vue) => void;
}) {
  const bataille = campagne.batailleEnCours;

  function modifierBataille(
    transformation: (courante: BatailleEnCours) => BatailleEnCours,
  ) {
    if (!campagne.batailleEnCours) return;
    onCampagneChange({
      ...campagne,
      revision: campagne.revision + 1,
      batailleEnCours: transformation(campagne.batailleEnCours),
    });
  }

  function modifierSuivi(
    combattantId: string,
    modification: Partial<SuiviCombattantBataille>,
  ) {
    modifierBataille((courante) => ({
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

  if (!bataille) {
    return (
      <section className="product-view combat-view">
        <header className="page-header">
          <div>
            <p className="eyebrow">Mode table</p>
            <h1>Combat</h1>
            <p>
              Lancez une bataille depuis Campagne pour ouvrir ici le suivi des
              combattants, des états et des Points de Vie.
            </p>
          </div>
        </header>
        <section className="combat-empty-state">
          <Target aria-hidden="true" />
          <div>
            <p className="eyebrow">Aucune bataille active</p>
            <h2>La feuille de table est prête</h2>
            <p>
              L’effectif réel de {campagne.nomBande} apparaîtra dès que les
              participants et le scénario seront enregistrés.
            </p>
          </div>
          <Button onClick={() => onVueChange('campaign')} type="button">
            <Swords aria-hidden="true" /> Préparer une bataille
          </Button>
        </section>
        <section className="combat-roster-preview">
          <div>
            <p className="eyebrow">Effectif disponible</p>
            <h2>{campagne.combattants.length} entrée(s) dans le registre</h2>
          </div>
          <ul>
            {campagne.combattants.map((combattant) => (
              <li key={combattant.id}>
                <strong>{combattant.nom}</strong>
                <span>{obtenirProfil(combattant.profilId).nom}</span>
                <b>{combattant.statut}</b>
              </li>
            ))}
          </ul>
        </section>
      </section>
    );
  }

  const tour = bataille.tour ?? 1;
  const phase = bataille.phase ?? 'Mouvement';
  const participants = Object.entries(bataille.participants).flatMap(
    ([combattantId, suivi]) => {
      const combattant = campagne.combattants.find(
        (candidat) => candidat.id === combattantId,
      );
      return combattant ? [{ combattant, suivi }] : [];
    },
  );

  return (
    <section className="product-view combat-view">
      <header className="page-header combat-page-header">
        <div>
          <p className="eyebrow">Bataille {bataille.numero}</p>
          <h1>{bataille.scenario}</h1>
          <p>
            {campagne.nomBande} contre {bataille.adversaire}. Toutes les
            modifications sont enregistrées dans la bataille active.
          </p>
        </div>
        <Button
          onClick={() => onVueChange('campaign')}
          type="button"
          variant="outline"
        >
          <BookOpen aria-hidden="true" /> Après-bataille
        </Button>
      </header>

      <section className="combat-turn-panel" aria-label="Tour et phase">
        <div className="combat-round-control">
          <Button
            aria-label="Tour précédent"
            disabled={tour <= 1}
            onClick={() =>
              modifierBataille((courante) => ({
                ...courante,
                tour: Math.max(1, tour - 1),
              }))
            }
            size="icon"
            type="button"
            variant="outline"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <output aria-live="polite">
            <small>Tour</small>
            <strong>{tour}</strong>
          </output>
          <Button
            aria-label="Tour suivant"
            onClick={() =>
              modifierBataille((courante) => ({
                ...courante,
                tour: Math.min(999, tour + 1),
              }))
            }
            size="icon"
            type="button"
            variant="outline"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
        <div className="combat-phase-control">
          {phases.map((candidate) => (
            <button
              aria-pressed={phase === candidate}
              key={candidate}
              onClick={() =>
                modifierBataille((courante) => ({
                  ...courante,
                  phase: candidate,
                }))
              }
              type="button"
            >
              {candidate}
            </button>
          ))}
        </div>
      </section>

      <div className="combatant-table-grid">
        {participants.map(({ combattant, suivi }) => (
          <CombatantTableCard
            combattant={combattant}
            key={combattant.id}
            onChange={(modification) =>
              modifierSuivi(combattant.id, modification)
            }
            suivi={suivi}
          />
        ))}
      </div>

      {participants.length === 0 ? (
        <section className="combat-empty-state compact">
          <Users aria-hidden="true" />
          <div>
            <h2>Aucun participant</h2>
            <p>Revenez à la campagne et choisissez les combattants engagés.</p>
          </div>
        </section>
      ) : null}
    </section>
  );
}

function CombatantTableCard({
  combattant,
  suivi,
  onChange,
}: {
  combattant: Combattant;
  suivi: SuiviCombattantBataille;
  onChange: (modification: Partial<SuiviCombattantBataille>) => void;
}) {
  const profil = obtenirProfil(combattant.profilId);
  const pointsVieMaximum = Math.max(
    1,
    combattant.statistiques.pointsVie * Math.max(1, combattant.quantite),
  );
  const pointsVie = Math.min(
    pointsVieMaximum,
    suivi.pointsVieActuels ?? pointsVieMaximum,
  );
  const etat =
    suivi.etatTable ??
    (combattant.statut === 'Prêt' ? 'Debout' : 'Hors de combat');
  const equipement = combattant.equipementIds.map(
    (id) => equipements.find((item) => item.id === id)?.nom ?? id,
  );
  const sorts = combattant.competences
    .filter((competence) => competence.startsWith('Sort ou prière : '))
    .map((competence) => competence.replace('Sort ou prière : ', ''));
  const autresCompetences = combattant.competences.filter(
    (competence) => !competence.startsWith('Sort ou prière : '),
  );

  return (
    <article className={`combatant-table-card state-${etatNormalise(etat)}`}>
      <header>
        <div>
          <p>{profil.categorie}</p>
          <h2>{combattant.nom}</h2>
          <span>
            {profil.nom}
            {combattant.quantite > 1
              ? `, groupe de ${combattant.quantite}`
              : ''}
          </span>
        </div>
        {etat === 'Hors de combat' ? (
          <Skull aria-label="Hors de combat" />
        ) : (
          <Target aria-hidden="true" />
        )}
      </header>

      <div className="combat-stat-grid" aria-label="Caractéristiques">
        <Stat
          label="M"
          value={
            combattant.statistiquesSpeciales?.mouvement ??
            combattant.statistiques.mouvement
          }
        />
        <Stat label="CC" value={combattant.statistiques.capaciteCombat} />
        <Stat label="CT" value={combattant.statistiques.capaciteTir} />
        <Stat label="F" value={combattant.statistiques.force} />
        <Stat label="E" value={combattant.statistiques.endurance} />
        <Stat label="I" value={combattant.statistiques.initiative} />
        <Stat label="A" value={combattant.statistiques.attaques} />
        <Stat label="Cd" value={combattant.statistiques.commandement} />
      </div>

      <section
        className="combat-wounds"
        aria-label={`Points de Vie de ${combattant.nom}`}
      >
        <Heart aria-hidden="true" />
        <Button
          aria-label={`Retirer un Point de Vie à ${combattant.nom}`}
          disabled={pointsVie === 0}
          onClick={() =>
            onChange({
              pointsVieActuels: Math.max(0, pointsVie - 1),
              ...(pointsVie === 1 ? { etatTable: 'Hors de combat' } : {}),
            })
          }
          size="icon"
          type="button"
          variant="outline"
        >
          <Minus aria-hidden="true" />
        </Button>
        <output aria-live="polite">
          <strong>{pointsVie}</strong> / {pointsVieMaximum} PV
        </output>
        <Button
          aria-label={`Rendre un Point de Vie à ${combattant.nom}`}
          disabled={pointsVie === pointsVieMaximum}
          onClick={() =>
            onChange({
              pointsVieActuels: pointsVie + 1,
              ...(pointsVie === 0 ? { etatTable: 'Debout' } : {}),
            })
          }
          size="icon"
          type="button"
          variant="outline"
        >
          <Plus aria-hidden="true" />
        </Button>
      </section>

      <div
        className="combat-state-control"
        aria-label={`État de ${combattant.nom}`}
      >
        {etats.map((candidate) => (
          <button
            aria-pressed={etat === candidate}
            key={candidate}
            onClick={() =>
              onChange({
                etatTable: candidate,
                ...(candidate === 'Hors de combat'
                  ? { pointsVieActuels: 0 }
                  : pointsVie === 0
                    ? { pointsVieActuels: 1 }
                    : {}),
              })
            }
            type="button"
          >
            {candidate}
          </button>
        ))}
      </div>

      <div className="combat-achievement-grid">
        <CombatCounter
          label="Adversaires mis hors de combat"
          onChange={(value) => onChange({ ennemisHorsCombat: value })}
          value={suivi.ennemisHorsCombat}
        />
        <CombatCounter
          label="XP de scénario ou d’objectif"
          onChange={(value) => onChange({ experienceScenario: value })}
          value={suivi.experienceScenario}
        />
      </div>

      <dl className="combat-quick-rules">
        <div>
          <dt>Équipement</dt>
          <dd>{equipement.join(', ') || 'Dague gratuite'}</dd>
        </div>
        {autresCompetences.length ? (
          <div>
            <dt>Compétences</dt>
            <dd>{autresCompetences.join(', ')}</dd>
          </div>
        ) : null}
        {sorts.length ? (
          <div>
            <dt>Sorts et prières</dt>
            <dd>{sorts.join(', ')}</dd>
          </div>
        ) : null}
        {combattant.blessures.length ? (
          <div>
            <dt>Blessures</dt>
            <dd>{combattant.blessures.join(', ')}</dd>
          </div>
        ) : null}
        {profil.regleSpeciale ? (
          <div>
            <dt>Règle de profil</dt>
            <dd>{profil.regleSpeciale}</dd>
          </div>
        ) : null}
      </dl>

      <Textarea
        aria-label={`Note de combat pour ${combattant.nom}`}
        maxLength={2_000}
        onChange={(event) => onChange({ notesTable: event.target.value })}
        placeholder="Marqueurs, effets temporaires, cible..."
        rows={2}
        value={suivi.notesTable ?? ''}
      />
    </article>
  );
}

function CombatCounter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <section className="combat-counter" aria-label={label}>
      <span>{label}</span>
      <div>
        <Button
          aria-label={`Diminuer ${label}`}
          disabled={value === 0}
          onClick={() => onChange(Math.max(0, value - 1))}
          size="icon"
          type="button"
          variant="outline"
        >
          <Minus aria-hidden="true" />
        </Button>
        <output aria-live="polite">{value}</output>
        <Button
          aria-label={`Augmenter ${label}`}
          onClick={() => onChange(Math.min(999, value + 1))}
          size="icon"
          type="button"
          variant="outline"
        >
          <Plus aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <span>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

function etatNormalise(etat: string) {
  return etat
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll(' ', '-')
    .toLowerCase();
}
