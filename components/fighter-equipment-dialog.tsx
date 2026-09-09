import { useState } from 'react';
import { PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  compterArmesDeTir,
  coutEquipementPourProfil,
  equipementAutorise,
  equipements,
  obtenirProfil,
  quantiteMaxEquipement,
  type Combattant,
  type EtatCampagne,
} from '@/lib/mordheim-data';

/** Entre les batailles, les objets retirés restent dans le magot. */
export function FighterEquipmentDialog({
  campagne,
  combattant,
  onCampagneChange,
}: {
  campagne: EtatCampagne;
  combattant: Combattant;
  onCampagneChange: (campagne: EtatCampagne) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [selection, setSelection] = useState('');
  const verrouillee = Boolean(campagne.batailleEnCours);
  const profil = obtenirProfil(combattant.profilId);
  const disponibles = equipements.filter(
    (item) =>
      !item.achatDesactive &&
      item.categorie !== 'Mutation' &&
      equipementAutorise(
        profil,
        item,
        profil.categorie === 'Héros' || combattant.herosPromu === true,
      ),
  );
  const objet = disponibles.find((item) => item.id === selection);
  const stock = objet ? (campagne.inventaire[objet.id] ?? 0) : 0;
  const depuisMagot = stock >= combattant.quantite;
  const aAcheter = Math.max(0, combattant.quantite - stock);
  const prix = objet
    ? campagne.homebrew.actifs &&
      campagne.homebrew.coutsEquipements[objet.id] !== undefined
      ? campagne.homebrew.coutsEquipements[objet.id]
      : coutEquipementPourProfil(objet, profil)
    : 0;
  const cout = prix * aAcheter;
  const nouveauxIds = objet
    ? [...combattant.equipementIds, objet.id]
    : combattant.equipementIds;
  const limiteDepassee = Boolean(
    objet &&
    (nouveauxIds.filter((id) => id === objet.id).length >
      quantiteMaxEquipement(objet, profil) ||
      compterArmesDeTir(nouveauxIds) > 2 ||
      nouveauxIds.filter(
        (id) =>
          equipements.find((item) => item.id === id)?.categorie ===
          'Corps à corps',
      ).length > 2),
  );
  const achatImpossible = Boolean(
    objet &&
    !depuisMagot &&
    (objet.rareteCommerce !== undefined ||
      objet.commerceUniquement ||
      objet.prixRecrutementFormule),
  );
  const erreur = limiteDepassee
    ? 'La limite d’armes ou d’exemplaires autorisés est atteinte.'
    : achatImpossible
      ? `Il faut ${combattant.quantite} exemplaire(s) dans le magot. Achetez cet objet au comptoir après une bataille.`
      : cout > 0 && cout > campagne.couronnes
        ? `Trésor insuffisant : il manque ${cout - campagne.couronnes} CO.`
        : null;

  function ajouter() {
    if (!objet || erreur || verrouillee) return;
    const inventaire = { ...campagne.inventaire };
    const restant = Math.max(0, stock - combattant.quantite);
    if (restant) inventaire[objet.id] = restant;
    else delete inventaire[objet.id];
    onCampagneChange({
      ...campagne,
      couronnes: campagne.couronnes - cout,
      inventaire,
      combattants: campagne.combattants.map((item) =>
        item.id === combattant.id
          ? {
              ...item,
              equipementIds: nouveauxIds,
              coutAcquisitionTotal: item.coutAcquisitionTotal + cout,
            }
          : item,
      ),
    });
    setSelection('');
  }

  function retirer(position: number) {
    const id = combattant.equipementIds[position];
    if (
      verrouillee ||
      !id ||
      equipements.find((item) => item.id === id)?.categorie === 'Mutation'
    )
      return;
    onCampagneChange({
      ...campagne,
      inventaire: {
        ...campagne.inventaire,
        [id]: (campagne.inventaire[id] ?? 0) + combattant.quantite,
      },
      combattants: campagne.combattants.map((item) =>
        item.id === combattant.id
          ? {
              ...item,
              equipementIds: item.equipementIds.filter(
                (_, index) => index !== position,
              ),
            }
          : item,
      ),
    });
  }

  return (
    <Dialog
      open={ouvert}
      onOpenChange={(etat) => {
        if (etat && verrouillee) return;
        setOuvert(etat);
        setSelection('');
      }}
    >
      <DialogTrigger
        render={
          <Button
            className="justify-self-start"
            size="sm"
            variant="outline"
            disabled={verrouillee}
            aria-label={`Modifier l’équipement de ${combattant.nom}`}
          />
        }
      >
        <PackageOpen /> Équipement
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Équipement de {combattant.nom}</DialogTitle>
          <DialogDescription>
            Les modifications sont enregistrées immédiatement. Les objets
            retirés retournent au magot sans remboursement.
            {combattant.quantite > 1 &&
              ` Chaque modification concerne les ${combattant.quantite} membres du groupe.`}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {combattant.dagueDeBase && <p>Dague de base incluse gratuitement.</p>}
          {combattant.equipementIds.map((id, index) => {
            const item = equipements.find((entree) => entree.id === id)!;
            return (
              <div
                className="flex items-center justify-between gap-2"
                key={`${id}-${index}`}
              >
                <span>{item.nom}</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={verrouillee || item.categorie === 'Mutation'}
                  onClick={() => retirer(index)}
                  aria-label={`Remettre ${item.nom} au magot`}
                >
                  Magot
                </Button>
              </div>
            );
          })}
        </div>
        <label className="field-group">
          <span>Objet à équiper</span>
          <NativeSelect
            value={selection}
            onChange={(event) => setSelection(event.target.value)}
            disabled={verrouillee}
          >
            <NativeSelectOption value="">Choisir un objet</NativeSelectOption>
            {disponibles.map((item) => (
              <NativeSelectOption key={item.id} value={item.id}>
                {item.nom} · Magot : {campagne.inventaire[item.id] ?? 0}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        {objet && (
          <p>
            {depuisMagot
              ? 'Prélevé dans le magot, sans dépense.'
              : `${aAcheter} exemplaire(s) à acheter · ${cout} CO`}
          </p>
        )}
        {erreur && (
          <p className="form-alert" role="alert">
            {erreur}
          </p>
        )}
        <Button
          disabled={!objet || Boolean(erreur) || verrouillee}
          onClick={ajouter}
        >
          {depuisMagot ? 'Équiper depuis le magot' : 'Acheter et équiper'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
