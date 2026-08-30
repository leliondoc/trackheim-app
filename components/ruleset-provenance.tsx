import {
  BookOpen,
  CircleAlert,
  CircleOff,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ID_RULESET,
  referencesRegles,
  rulesetGlmStrict,
  rulesetOfficiel,
  sourcesRegles,
  type AutoriteRegle,
  type CertificationRegle,
  type ManifesteRuleset,
  type SourceRegle,
} from '@/lib/mordheim-rules';
import { cn } from '@/lib/utils';

export type RulesetProvenanceProps = {
  rulesetId: string;
  variant?: 'compact' | 'detailed';
  className?: string;
};

type EntreeSource = {
  role: string;
  source: SourceRegle;
  certification: CertificationRegle;
  note: string;
};

const manifestes: Record<string, ManifesteRuleset> = {
  [rulesetOfficiel.id]: rulesetOfficiel,
  [rulesetGlmStrict.id]: rulesetGlmStrict,
};

const sourcesParId = new Map<string, SourceRegle>(
  Object.values(sourcesRegles).map((source) => [source.id, source]),
);

const libellesAutorite: Record<AutoriteRegle, string> = {
  'coeur-officiel': 'Cœur officiel',
  'errata-officiel': 'Errata officiel',
  'supplement-officiel': 'Supplément officiel',
  'edition-glm': 'Édition GLM',
  'clarification-concepteur': 'Clarification de concepteur',
  homebrew: 'Homebrew',
};

const libellesCertification: Record<CertificationRegle, string> = {
  'primaire-vérifiée': 'Primaire vérifiée',
  'secondaire-vérifiée': 'Secondaire vérifiée',
  'éditorial-glm': 'Éditorial GLM',
  'conflit-résolu': 'Conflit résolu',
  'non-vérifiée': 'Non vérifiée',
};

const libellesResolution: Record<string, string> = {
  'choix-sort-ou-priere': 'Choix d’un sort ou d’une prière',
  'tirage-aleatoire-glm': 'Tirage aléatoire selon la représentation GLM',
  'désactivée-faute-de-source-primaire': 'Désactivée faute de source primaire',
};

const conflits = [
  {
    id: 'succession-chef-lanceur-sort',
    titre: 'Succession d’un chef lanceur de sorts',
  },
  {
    id: 'reiklanders-rapiere',
    titre: 'Rapière des Reiklanders',
  },
] as const;

function trouverSource(id: string) {
  return sourcesParId.get(id);
}

function libelleResolution(manifeste: ManifesteRuleset, conflitId: string) {
  const resolution = manifeste.resolutionsConflits[conflitId];
  return resolution
    ? (libellesResolution[resolution] ?? resolution)
    : 'Non définie';
}

function construireSources(manifeste: ManifesteRuleset): EntreeSource[] {
  const coeur = trouverSource(manifeste.coeurSourceId);
  const representationFrId =
    referencesRegles.sequenceApresBataille.representationFrId ??
    sourcesRegles.livreComplet.id;
  const representationFr = trouverSource(representationFrId);
  const versionBande = trouverSource(manifeste.versionBandeId);

  const entrees: Array<EntreeSource | undefined> = [
    coeur
      ? {
          role: 'Socle',
          source: coeur,
          certification: referencesRegles.valeurBande.certification,
          note: 'Règles de campagne officielles de 1999.',
        }
      : undefined,
    ...manifeste.errataIds.map((id) => {
      const source = trouverSource(id);
      return source
        ? {
            role: 'Corrections',
            source,
            certification: referencesRegles.sequenceApresBataille.certification,
            note: 'Corrections officielles appliquées au socle de 1999.',
          }
        : undefined;
    }),
    representationFr
      ? {
          role: 'Représentation française',
          source: representationFr,
          certification: 'éditorial-glm',
          note: 'Texte français d’affichage ; son autorité reste éditoriale.',
        }
      : undefined,
    versionBande
      ? {
          role: 'Bande active',
          source: versionBande,
          certification: referencesRegles.reiklanders.certification,
          note: 'Version française des Reiklanders utilisée par ce manifeste.',
        }
      : undefined,
  ];

  return entrees.filter((entree): entree is EntreeSource => Boolean(entree));
}

function BadgesSource({ entree }: { entree: EntreeSource }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant="secondary">
        Autorité · {libellesAutorite[entree.source.autorite]}
      </Badge>
      <Badge variant="outline">
        Certification · {libellesCertification[entree.certification]}
      </Badge>
    </div>
  );
}

function LienSource({ source }: { source: SourceRegle }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-primary"
    >
      {source.titre}
      <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="sr-only">(ouvrir la source dans un nouvel onglet)</span>
    </a>
  );
}

function ManifesteInconnu({
  rulesetId,
  className,
}: Pick<RulesetProvenanceProps, 'rulesetId' | 'className'>) {
  return (
    <Card
      className={cn('border-destructive/30 bg-destructive/5', className)}
      role="alert"
      data-ruleset-id={rulesetId}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CircleAlert aria-hidden="true" className="size-4 text-destructive" />
          Manifeste de règles introuvable
        </CardTitle>
        <CardDescription>
          L’identifiant « {rulesetId} » ne correspond à aucun preset vérifié.
          Aucun manifeste de remplacement n’est affiché silencieusement.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Badge variant="outline">{ID_RULESET}</Badge>
        <Badge variant="outline">{rulesetGlmStrict.id}</Badge>
      </CardContent>
    </Card>
  );
}

function VersionCompacte({
  manifeste,
  className,
}: {
  manifeste: ManifesteRuleset;
  className?: string;
}) {
  const sources = construireSources(manifeste);
  const glmStrict = manifeste.id === rulesetGlmStrict.id;

  return (
    <section
      className={cn(
        'rounded-xl border bg-card p-3 text-sm text-card-foreground shadow-sm',
        className,
      )}
      aria-label={`Provenance du ruleset ${manifeste.nom}`}
      data-ruleset-id={manifeste.id}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-heading font-semibold">{manifeste.nom}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            1999 · Rules Review 2005 · VF GLM V1.2fFr · Reiklanders V2bFr
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">
            {glmStrict ? 'Preset GLM strict' : 'Preset officiel'}
          </Badge>
          <Badge variant="secondary">Autorité · Cœur officiel</Badge>
          <Badge variant="outline">Certification · Primaire vérifiée</Badge>
          <Badge variant="outline">VF · Éditorial GLM</Badge>
          <Badge variant="outline">
            <CircleOff aria-hidden="true" data-icon="inline-start" />
            Modules optionnels désactivés
          </Badge>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {sources.map((entree) => (
          <span key={`${entree.role}-${entree.source.id}`}>
            <span className="text-muted-foreground">{entree.role} : </span>
            <LienSource source={entree.source} />
          </span>
        ))}
      </div>

      <p className="mt-3 border-t pt-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Résolution active :</span>{' '}
        succession magique —{' '}
        {libelleResolution(manifeste, 'succession-chef-lanceur-sort')} ; rapière
        — {libelleResolution(manifeste, 'reiklanders-rapiere')}.
      </p>
    </section>
  );
}

function SourceDetaillee({ entree }: { entree: EntreeSource }) {
  return (
    <li className="rounded-lg border bg-background/60 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {entree.role}
          </p>
          <p className="mt-1">
            <LienSource source={entree.source} />
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {entree.source.version} · vérifiée le{' '}
            {entree.source.dateVerification}
          </p>
        </div>
        <BadgesSource entree={entree} />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {entree.note}
      </p>
    </li>
  );
}

function ComparaisonPresets({ actifId }: { actifId: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <div className="min-w-[42rem]">
        <div className="grid grid-cols-[minmax(9rem,1.1fr)_minmax(10rem,1fr)_minmax(10rem,1fr)] bg-muted/60 text-xs font-semibold">
          <div className="p-2.5">Point de règle</div>
          <div className="border-l p-2.5">
            Preset officiel
            {actifId === rulesetOfficiel.id ? (
              <Badge className="ml-2" variant="secondary">
                Actif
              </Badge>
            ) : null}
          </div>
          <div className="border-l p-2.5">
            GLM strict
            {actifId === rulesetGlmStrict.id ? (
              <Badge className="ml-2" variant="secondary">
                Actif
              </Badge>
            ) : null}
          </div>
        </div>
        {conflits.map((conflit) => (
          <div
            key={conflit.id}
            className="grid grid-cols-[minmax(9rem,1.1fr)_minmax(10rem,1fr)_minmax(10rem,1fr)] border-t text-xs leading-relaxed"
          >
            <div className="p-2.5 font-medium">{conflit.titre}</div>
            <div className="border-l p-2.5 text-muted-foreground">
              {libelleResolution(rulesetOfficiel, conflit.id)}
            </div>
            <div className="border-l p-2.5 text-muted-foreground">
              {libelleResolution(rulesetGlmStrict, conflit.id)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VersionDetaillee({
  manifeste,
  className,
}: {
  manifeste: ManifesteRuleset;
  className?: string;
}) {
  const sources = construireSources(manifeste);
  const glmStrict = manifeste.id === rulesetGlmStrict.id;

  return (
    <Card
      className={className}
      aria-label={`Provenance du ruleset ${manifeste.nom}`}
      data-ruleset-id={manifeste.id}
    >
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
              Manifeste de règles effectif
            </CardTitle>
            <CardDescription className="mt-1">
              {manifeste.nom} · identifiant stable {manifeste.id}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">
              {glmStrict ? 'Preset GLM strict' : 'Preset officiel'}
            </Badge>
            <Badge variant="outline">Socle 1999/2005 certifié</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <section aria-labelledby={`sources-${manifeste.id}`}>
          <h3
            id={`sources-${manifeste.id}`}
            className="mb-2 flex items-center gap-2 text-sm font-semibold"
          >
            <BookOpen aria-hidden="true" className="size-4" />
            Sources appliquées
          </h3>
          <ul className="grid gap-2 lg:grid-cols-2">
            {sources.map((entree) => (
              <SourceDetaillee
                key={`${entree.role}-${entree.source.id}`}
                entree={entree}
              />
            ))}
          </ul>
        </section>

        <section
          className="rounded-lg border border-dashed bg-muted/30 p-3"
          aria-labelledby={`modules-${manifeste.id}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3
                id={`modules-${manifeste.id}`}
                className="flex items-center gap-2 text-sm font-semibold"
              >
                <CircleOff aria-hidden="true" className="size-4" />
                Modules optionnels désactivés
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Aucun supplément, setting, homebrew ou clarification externe ne
                modifie silencieusement ce manifeste.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline">
                {manifeste.modulesOptionnels.length} module actif
              </Badge>
              <Badge variant="outline">
                {manifeste.clarifications.length} clarification active
              </Badge>
            </div>
          </div>
        </section>

        <section aria-labelledby={`conflits-${manifeste.id}`}>
          <div className="mb-2">
            <h3
              id={`conflits-${manifeste.id}`}
              className="text-sm font-semibold"
            >
              Preset officiel et GLM strict
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              La VF GLM sert de représentation dans les deux presets. Le mode
              GLM strict adopte l’arbitrage de succession magique de la
              représentation française. La rapière reste désactivée faute de
              présence vérifiée dans la liste Reiklander.
            </p>
          </div>
          <ComparaisonPresets actifId={manifeste.id} />
        </section>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Les liens donnent accès aux documents de référence. Ce panneau résume
          leur rôle et leur version sans reproduire de longs passages protégés.
        </p>
      </CardContent>
    </Card>
  );
}

export function RulesetProvenance({
  rulesetId,
  variant = 'detailed',
  className,
}: RulesetProvenanceProps) {
  const manifeste = manifestes[rulesetId];

  if (!manifeste) {
    return <ManifesteInconnu rulesetId={rulesetId} className={className} />;
  }

  if (variant === 'compact') {
    return <VersionCompacte manifeste={manifeste} className={className} />;
  }

  return <VersionDetaillee manifeste={manifeste} className={className} />;
}
