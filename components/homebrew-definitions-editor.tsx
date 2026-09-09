import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  equipementAutorise,
  obtenirDefinitionBande,
  obtenirEquipements,
  obtenirLimites,
  type EtatCampagne,
  type ReglagesHomebrew,
  type ProfilRecrue,
  type Equipement,
  type Statistiques,
  type Combattant,
  type CategorieCompetence,
} from '@/lib/mordheim-data';
import { validerCampagneV4 } from '@/lib/campaign-validation';
import { validerDefinitionsHomebrew } from '@/lib/homebrew-validation';

const statistiques: Array<[keyof Statistiques, string]> = [
  ['mouvement', 'Mouvement'],
  ['capaciteCombat', 'Capacité de combat'],
  ['capaciteTir', 'Capacité de tir'],
  ['force', 'Force'],
  ['endurance', 'Endurance'],
  ['pointsVie', 'Points de vie'],
  ['initiative', 'Initiative'],
  ['attaques', 'Attaques'],
  ['commandement', 'Commandement'],
];
const tables: CategorieCompetence[] = [
  'Combat',
  'Tir',
  'Érudition',
  'Force',
  'Vitesse',
  'Spécial',
];
const normaliser = (texte: string) =>
  texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

type Props = {
  campagne: EtatCampagne;
  onChange: (changements: Partial<ReglagesHomebrew>) => void;
  onCampagneChange: (campagne: EtatCampagne) => void;
};
export function HomebrewDefinitionsEditor({
  campagne,
  onChange,
  onCampagneChange,
}: Props) {
  const [onglet, setOnglet] = useState<
    'bande' | 'profils' | 'equipements' | 'membres'
  >('profils');
  const [selection, setSelection] = useState('');
  const [toutCatalogue, setToutCatalogue] = useState(false);
  const [recherche, setRecherche] = useState('');
  const definition = obtenirDefinitionBande(campagne.factionId);
  const homebrew = campagne.homebrew;
  const catalogue = obtenirEquipements({ ...homebrew, actifs: true });
  const entrees =
    onglet === 'profils'
      ? definition.profils.map((p) => homebrew.profils?.[p.id] ?? p)
      : onglet === 'equipements'
        ? catalogue.filter(
            (objet) =>
              toutCatalogue ||
              homebrew.equipements?.[objet.id] ||
              definition.profils.some((profil) =>
                equipementAutorise(
                  homebrew.profils?.[profil.id] ?? profil,
                  objet,
                ),
              ),
          )
        : campagne.combattants;
  const visibles = entrees.filter((item) =>
    normaliser(item.nom).includes(normaliser(recherche)),
  );
  function retour() {
    setSelection('');
  }
  return (
    <section className="homebrew-editor" aria-label="Éditeur homebrew">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Surcouche éditable</p>
          <h2>Personnaliser les règles de la bande</h2>
        </div>
      </div>
      <div className="homebrew-tabs" aria-label="Catégories de réglages">
        {(
          [
            ['bande', 'Bande'],
            ['profils', 'Profils'],
            ['equipements', 'Équipements'],
            ['membres', 'Membres recrutés'],
          ] as const
        ).map(([id, nom]) => (
          <Button
            key={id}
            variant={onglet === id ? 'default' : 'outline'}
            aria-pressed={onglet === id}
            onClick={() => {
              setOnglet(id);
              retour();
              setRecherche('');
            }}
          >
            {nom}
          </Button>
        ))}
      </div>
      {onglet === 'bande' ? (
        <BandForm
          key={JSON.stringify([homebrew.bande, homebrew.limites])}
          campagne={campagne}
          onSave={onChange}
        />
      ) : (
        <>
          {selection ? (
            <div className="homebrew-detail">
              <Button variant="ghost" onClick={retour}>
                Retour à la liste
              </Button>
              {onglet === 'profils' && (
                <ProfileForm
                  key={selection}
                  profil={
                    homebrew.profils?.[selection] ??
                    definition.profils.find((p) => p.id === selection)!
                  }
                  catalogue={catalogue}
                  cout={homebrew.coutsRecrues[selection]}
                  onSave={(profil) => {
                    onChange({
                      profils: { ...homebrew.profils, [selection]: profil },
                      coutsRecrues: {
                        ...homebrew.coutsRecrues,
                        [selection]: profil.cout,
                      },
                    });
                    retour();
                  }}
                  onReset={() => {
                    const profils = { ...homebrew.profils };
                    delete profils[selection];
                    const coutsRecrues = { ...homebrew.coutsRecrues };
                    delete coutsRecrues[selection];
                    onChange({ profils, coutsRecrues });
                    retour();
                  }}
                />
              )}
              {onglet === 'equipements' && (
                <EquipmentForm
                  key={selection}
                  equipement={catalogue.find((p) => p.id === selection)!}
                  onSave={(equipement) => {
                    const prix = { ...homebrew.coutsEquipements };
                    if (
                      equipement.cout !==
                        catalogue.find((item) => item.id === selection)!.cout ||
                      prix[selection] !== undefined
                    )
                      prix[selection] = equipement.cout;
                    onChange({
                      equipements: {
                        ...homebrew.equipements,
                        [selection]: equipement,
                      },
                      coutsEquipements: prix,
                    });
                    retour();
                  }}
                  onReset={() => {
                    const objets = { ...homebrew.equipements };
                    delete objets[selection];
                    const prix = { ...homebrew.coutsEquipements };
                    delete prix[selection];
                    onChange({ equipements: objets, coutsEquipements: prix });
                    retour();
                  }}
                />
              )}
              {onglet === 'membres' && (
                <MemberForm
                  campagne={campagne}
                  key={selection}
                  membre={campagne.combattants.find((p) => p.id === selection)!}
                  onSave={(membre) => {
                    onCampagneChange({
                      ...campagne,
                      combattants: campagne.combattants.map((p) =>
                        p.id === selection ? membre : p,
                      ),
                    });
                    retour();
                  }}
                />
              )}
            </div>
          ) : (
            <div className="homebrew-catalogue">
              {onglet === 'equipements' && (
                <Check
                  label="Afficher aussi les équipements des autres bandes"
                  value={toutCatalogue}
                  onChange={setToutCatalogue}
                />
              )}
              <Input
                aria-label="Rechercher un élément homebrew"
                placeholder="Rechercher…"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
              />
              <p>
                {onglet === 'membres'
                  ? 'Corrigez directement une fiche existante. Ces corrections restent enregistrées même si vous désactivez le set.'
                  : 'Sélectionnez une fiche à modifier. Les profils personnalisés sont utilisés pour les futures recrues lorsque le set est actif.'}
              </p>
              {visibles.map((item) => (
                <Button
                  variant="outline"
                  key={item.id}
                  onClick={() => setSelection(item.id)}
                  aria-label={`Personnaliser ${item.nom}`}
                >
                  <span>{item.nom}</span>
                  <span>Modifier</span>
                </Button>
              ))}
              {visibles.length === 0 && <p>Aucun élément.</p>}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  maxLength = 300,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <label className="field-group" htmlFor={id}>
      {label}
      <Input
        id={id}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function NumberField({
  label,
  value,
  onChange,
  nullable = false,
  max = 1_000_000,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  nullable?: boolean;
  max?: number;
}) {
  const id = useId();
  return (
    <label className="field-group" htmlFor={id}>
      {label}
      <Input
        id={id}
        type="number"
        min={0}
        max={max}
        step={1}
        required={!nullable}
        value={value ?? ''}
        placeholder={nullable ? 'Sans limite / non défini' : undefined}
        onChange={(e) =>
          onChange(
            e.target.value === '' && nullable ? null : Number(e.target.value),
          )
        }
      />
    </label>
  );
}
function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <label className="field-group" htmlFor={id}>
      {label}
      <Textarea
        id={id}
        maxLength={10000}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function Check({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="homebrew-check">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
function StatsForm({
  value,
  onChange,
  speciales,
  onSpeciales,
  plafonds = false,
}: {
  plafonds?: boolean;
  value: Statistiques;
  onChange: (v: Statistiques) => void;
  speciales?: Partial<Record<keyof Statistiques, string>>;
  onSpeciales?: (v: Partial<Record<keyof Statistiques, string>>) => void;
}) {
  return (
    <div className="homebrew-fields">
      {statistiques.map(([cle, nom]) => (
        <div key={cle}>
          <NumberField
            label={plafonds ? `${nom} maximum` : nom}
            value={value[cle]}
            max={1000}
            onChange={(v) => onChange({ ...value, [cle]: v ?? 0 })}
          />
          {onSpeciales && (
            <Field
              label={`${nom} spécial (facultatif)`}
              value={speciales?.[cle] ?? ''}
              maxLength={16}
              onChange={(v) => {
                const suivant = { ...speciales };
                if (v) suivant[cle] = v;
                else delete suivant[cle];
                onSpeciales(suivant);
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
function SaveFooter({
  erreur,
  onReset,
}: {
  erreur: string | null;
  onReset?: () => void;
}) {
  return (
    <div className="homebrew-form-footer">
      {erreur && <p role="alert">{erreur}</p>}
      {onReset && (
        <Button type="button" variant="outline" onClick={onReset}>
          Rétablir la fiche officielle
        </Button>
      )}
      <Button type="submit">Enregistrer les modifications</Button>
    </div>
  );
}
function BandForm({
  campagne,
  onSave,
}: {
  campagne: EtatCampagne;
  onSave: Props['onChange'];
}) {
  const officiel = obtenirDefinitionBande(campagne.factionId);
  const [bande, setBande] = useState({
    budgetInitial: officiel.budgetInitial,
    effectifMinimum: officiel.effectifMinimum,
    effectifMaximum: officiel.effectifMaximum,
    ...campagne.homebrew.bande,
  });
  const [limites, setLimites] = useState(
    obtenirLimites({ ...campagne.homebrew, actifs: true }),
  );
  const [erreur, setErreur] = useState<string | null>(null);
  return (
    <form
      className="homebrew-detail"
      onSubmit={(e) => {
        e.preventDefault();
        const erreur = validerDefinitionsHomebrew({ bande, limites });
        setErreur(erreur);
        if (!erreur) onSave({ bande, limites });
      }}
    >
      <h3>Paramètres de bande</h3>
      <p>
        Avant la première bataille, changer le budget ajuste le trésor de la
        différence lorsque le set est actif. En campagne, il reste une référence
        sans modifier le trésor.
      </p>
      <div className="homebrew-fields">
        {(
          [
            ['budgetInitial', 'Budget initial (CO)'],
            ['effectifMinimum', 'Effectif minimum'],
            ['effectifMaximum', 'Effectif maximum'],
          ] as const
        ).map(([cle, label]) => (
          <NumberField
            key={cle}
            label={label}
            value={bande[cle]}
            nullable={cle === 'effectifMaximum'}
            onChange={(v) => setBande({ ...bande, [cle]: v })}
          />
        ))}
      </div>
      <h4>Limites de recrutement et d’équipement</h4>
      <div className="homebrew-fields">
        {(
          [
            ['armesCorpsACorps', 'Armes de corps à corps maximum'],
            ['armesTir', 'Armes de tir maximum'],
            ['tailleGroupe', 'Taille maximum d’un groupe'],
            ['heros', 'Nombre maximum de héros'],
          ] as const
        ).map(([cle, label]) => (
          <NumberField
            key={cle}
            label={label}
            value={limites[cle]}
            max={cle === 'heros' ? 200 : 100}
            onChange={(v) => setLimites({ ...limites, [cle]: v ?? 0 })}
          />
        ))}
      </div>
      <SaveFooter
        erreur={erreur}
        onReset={() => onSave({ bande: {}, limites: {} })}
      />
    </form>
  );
}
function ProfileForm({
  profil,
  cout,
  catalogue,
  onSave,
  onReset,
}: {
  profil: ProfilRecrue;
  cout?: number;
  catalogue: Equipement[];
  onSave: (v: ProfilRecrue) => void;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState({ ...profil, cout: cout ?? profil.cout });
  const [recherche, setRecherche] = useState('');
  const [equipementsOuverts, setEquipementsOuverts] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  function patch(v: Partial<ProfilRecrue>) {
    setDraft({ ...draft, ...v });
  }
  const autorises =
    draft.equipementsAutorises ??
    catalogue
      .filter((item) => equipementAutorise(draft, item))
      .map((item) => item.id);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const propre = JSON.parse(JSON.stringify(draft)) as ProfilRecrue;
        const erreur = validerDefinitionsHomebrew({
          profils: { [draft.id]: propre },
        });
        setErreur(erreur);
        if (!erreur) onSave(propre);
      }}
    >
      <h3>Profil : {profil.nom}</h3>
      <div className="homebrew-fields">
        <Field
          label="Nom du profil"
          value={draft.nom}
          onChange={(nom) => patch({ nom })}
        />
        <label className="field-group">
          Catégorie
          <NativeSelect
            aria-label="Catégorie du profil"
            value={draft.categorie}
            onChange={(e) =>
              patch({ categorie: e.target.value as ProfilRecrue['categorie'] })
            }
          >
            {['Héros', 'Hommes de main'].map((v) => (
              <NativeSelectOption key={v} value={v}>
                {v}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        {(
          [
            ['cout', 'Coût du profil (CO)'],
            ['minimum', 'Minimum de ce profil'],
            ['maximum', 'Maximum de ce profil'],
            ['experienceInitiale', 'Expérience initiale'],
            ['minimumMutations', 'Mutations obligatoires'],
          ] as const
        ).map(([cle, label]) => (
          <NumberField
            key={cle}
            label={label}
            value={draft[cle] ?? (cle === 'maximum' ? null : 0)}
            nullable={cle === 'maximum'}
            onChange={(v) => patch({ [cle]: v })}
          />
        ))}
      </div>
      <div className="homebrew-checks">
        <Check
          label="Peut être chef"
          value={Boolean(draft.chef)}
          onChange={(chef) => patch({ chef })}
        />
        <Check
          label="Grande créature"
          value={Boolean(draft.grandeCreature)}
          onChange={(grandeCreature) => patch({ grandeCreature })}
        />
        <Check
          label="Gagne de l’expérience"
          value={draft.gagneExperience !== false}
          onChange={(gagneExperience) => patch({ gagneExperience })}
        />
      </div>
      <h4>Caractéristiques de départ</h4>
      <StatsForm
        value={draft.statistiques}
        onChange={(statistiques) => patch({ statistiques })}
        speciales={draft.statistiquesSpeciales}
        onSpeciales={(statistiquesSpeciales) =>
          patch({ statistiquesSpeciales })
        }
      />
      <details>
        <summary>Plafonds de progression</summary>
        <Check
          label="Définir les plafonds"
          value={Boolean(draft.maximums)}
          onChange={(active) => {
            if (active) patch({ maximums: { ...draft.statistiques } });
            else {
              const suivant = { ...draft };
              delete suivant.maximums;
              setDraft(suivant);
            }
          }}
        />
        {draft.maximums && (
          <StatsForm
            plafonds
            value={draft.maximums}
            onChange={(maximums) => patch({ maximums })}
          />
        )}
      </details>
      <h4>Tables de compétences</h4>
      <div className="homebrew-checks">
        {tables.map((table) => (
          <Check
            key={table}
            label={`Table ${table}`}
            value={draft.competencesDisponibles?.includes(table) ?? false}
            onChange={(actif) =>
              patch({
                competencesDisponibles: actif
                  ? [...(draft.competencesDisponibles ?? []), table]
                  : (draft.competencesDisponibles?.filter((v) => v !== table) ??
                    []),
              })
            }
          />
        ))}
      </div>
      <TextField
        label="Règles spéciales du profil (à résoudre à la table)"
        value={draft.regleSpeciale ?? ''}
        onChange={(regleSpeciale) => patch({ regleSpeciale })}
      />
      <details
        onToggle={(event) => setEquipementsOuverts(event.currentTarget.open)}
      >
        <summary>Équipements autorisés ({autorises.length})</summary>
        <p>
          Choisissez les objets accessibles à ce profil. Leur disponibilité à
          l’achat se règle dans la fiche de l’équipement.
        </p>
        {equipementsOuverts && (
          <>
            <Input
              aria-label="Filtrer les équipements autorisés"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un équipement…"
            />
            <div className="homebrew-equipment-access">
              {catalogue
                .filter((item) =>
                  normaliser(item.nom).includes(normaliser(recherche)),
                )
                .map((item) => (
                  <Check
                    key={item.id}
                    label={item.nom}
                    value={autorises.includes(item.id)}
                    onChange={(actif) =>
                      patch({
                        equipementsAutorises: actif
                          ? [...autorises, item.id]
                          : autorises.filter((id) => id !== item.id),
                      })
                    }
                  />
                ))}
            </div>
          </>
        )}
      </details>
      <SaveFooter erreur={erreur} onReset={onReset} />
    </form>
  );
}
function EquipmentForm({
  equipement,
  onSave,
  onReset,
}: {
  equipement: Equipement;
  onSave: (v: Equipement) => void;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState(equipement);
  const [erreur, setErreur] = useState<string | null>(null);
  function patch(v: Partial<Equipement>) {
    setDraft({ ...draft, ...v });
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const propre = JSON.parse(JSON.stringify(draft)) as Equipement;
        const erreur = validerDefinitionsHomebrew({
          equipements: { [draft.id]: propre },
        });
        setErreur(erreur);
        if (!erreur) onSave(propre);
      }}
    >
      <h3>Équipement : {equipement.nom}</h3>
      <p>
        Saisir un prix personnalisé fixe le coût au recrutement et au comptoir,
        en remplacement des éventuelles formules.
      </p>
      <div className="homebrew-fields">
        <Field
          label="Nom de l’équipement"
          value={draft.nom}
          onChange={(nom) => patch({ nom })}
        />
        <label className="field-group">
          Catégorie
          <NativeSelect
            aria-label="Catégorie de l’équipement"
            value={draft.categorie}
            onChange={(e) =>
              patch({ categorie: e.target.value as Equipement['categorie'] })
            }
          >
            {['Corps à corps', 'Tir', 'Armure', 'Divers', 'Mutation'].map(
              (v) => (
                <NativeSelectOption key={v} value={v}>
                  {v}
                </NativeSelectOption>
              ),
            )}
          </NativeSelect>
        </label>
        <NumberField
          label="Prix personnalisé (CO)"
          value={draft.cout}
          onChange={(v) =>
            patch({
              cout: v ?? 0,
              coutCommerce: v ?? 0,
              coutsParListe: {},
              coutCommerceFormule: undefined,
              prixRecrutementFormule: undefined,
              prixRecrutementMinimum: undefined,
            })
          }
        />
        <NumberField
          label="Exemplaires maximum par membre"
          value={
            draft.quantiteMax ??
            (['Tir', 'Corps à corps'].includes(draft.categorie) ? 2 : 1)
          }
          max={100}
          onChange={(v) =>
            patch({ quantiteMax: v ?? 0, quantitesMaxParProfil: {} })
          }
        />
        <NumberField
          label="Rareté (vide : objet commun)"
          value={draft.rareteCommerce ?? null}
          nullable
          onChange={(v) => patch({ rareteCommerce: !v ? undefined : v })}
        />
      </div>
      <div className="homebrew-checks">
        <Check
          label="Disponible au recrutement"
          value={!draft.commerceUniquement && !draft.achatDesactive}
          onChange={(v) =>
            patch({ commerceUniquement: !v, achatDesactive: undefined })
          }
        />
        <Check
          label="Réservé aux héros"
          value={Boolean(draft.reserveAuxHeros)}
          onChange={(v) => patch({ reserveAuxHeros: v })}
        />
        <Check
          label="Accorde la dague gratuite"
          value={Boolean(draft.accordeDagueDeBase)}
          onChange={(v) => patch({ accordeDagueDeBase: v })}
        />
      </div>
      <TextField
        label="Règles de l’équipement (à résoudre à la table)"
        value={draft.regleSpeciale ?? ''}
        onChange={(regleSpeciale) => patch({ regleSpeciale })}
      />
      <SaveFooter erreur={erreur} onReset={onReset} />
    </form>
  );
}
function MemberForm({
  membre,
  campagne,
  onSave,
}: {
  membre: Combattant;
  campagne: EtatCampagne;
  onSave: (v: Combattant) => void;
}) {
  const [draft, setDraft] = useState(membre);
  const [erreur, setErreur] = useState<string | null>(null);
  const patch = (v: Partial<Combattant>) => setDraft({ ...draft, ...v });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const membre = {
          ...draft,
          nom: draft.nom.trim(),
          competences: draft.competences.filter((v) => v.trim()),
          blessures: draft.blessures.filter((v) => v.trim()),
          progressions: draft.progressions.filter((v) => v.trim()),
        };
        const validation = validerCampagneV4(
          {
            ...campagne,
            combattants: campagne.combattants.map((p) =>
              p.id === membre.id ? membre : p,
            ),
          },
          { verifierReglesDeBande: false },
        );
        if (!validation.ok) {
          setErreur(validation.erreur);
          return;
        }
        onSave(membre);
      }}
    >
      <h3>Fiche : {membre.nom}</h3>
      <p>
        Les changements concernent ce membre ou tout son groupe. Son coût
        historique et le trésor sont conservés.
      </p>
      <Field
        label="Nom du membre"
        value={draft.nom}
        maxLength={160}
        onChange={(nom) => patch({ nom })}
      />
      <NumberField
        label="Expérience du membre"
        value={draft.experience}
        onChange={(v) => patch({ experience: v ?? 0 })}
      />
      <StatsForm
        value={draft.statistiques}
        onChange={(statistiques) => patch({ statistiques })}
        speciales={draft.statistiquesSpeciales}
        onSpeciales={(statistiquesSpeciales) =>
          patch({ statistiquesSpeciales })
        }
      />
      {(['competences', 'blessures', 'progressions'] as const).map((cle) => (
        <TextField
          key={cle}
          label={
            {
              competences: 'Compétences (une par ligne)',
              blessures: 'Blessures (une par ligne)',
              progressions: 'Progressions (une par ligne)',
            }[cle]
          }
          value={draft[cle].join('\n')}
          onChange={(v) => patch({ [cle]: v.split('\n') })}
        />
      ))}
      <TextField
        label="Notes du membre"
        value={draft.notes}
        onChange={(notes) => patch({ notes })}
      />
      <SaveFooter erreur={erreur} />
    </form>
  );
}
