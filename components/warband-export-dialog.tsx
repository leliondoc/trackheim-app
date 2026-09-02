import { Download, FileJson, FileText, Printer } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { EtatCampagne } from '@/lib/mordheim-data';
import {
  construireExportTexteDetaille,
  construireExportTexteSimple,
  construireFeuilleImprimable,
  nomBaseExport,
} from '@/lib/warband-export';

export function WarbandExportDialog({
  campagne,
  onExportJson,
}: {
  campagne: EtatCampagne;
  onExportJson: () => void;
}) {
  const [erreur, setErreur] = useState<string | null>(null);

  function exporterTexte(detaille: boolean) {
    const contenu = detaille
      ? construireExportTexteDetaille(campagne)
      : construireExportTexteSimple(campagne);
    telecharger(
      contenu,
      `${nomBaseExport(campagne)}-${detaille ? 'detail' : 'resume'}.txt`,
      'text/plain',
    );
  }

  function imprimer() {
    setErreur(null);
    const feuille = window.open('', '_blank', 'width=960,height=760');
    if (!feuille) {
      setErreur(
        'Le navigateur a bloqué la feuille. Autorisez les fenêtres pour lancer l’impression PDF.',
      );
      return;
    }
    feuille.opener = null;
    const documentPrepare = new DOMParser().parseFromString(
      construireFeuilleImprimable(campagne),
      'text/html',
    );
    const racine = feuille.document.importNode(
      documentPrepare.documentElement,
      true,
    );
    feuille.document.replaceChild(racine, feuille.document.documentElement);
    feuille.focus();
    void feuille.document.fonts.ready.then(() => {
      feuille.requestAnimationFrame(() => feuille.print());
    });
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button className="export-trigger" type="button" variant="outline">
            <Download aria-hidden="true" /> Exporter
          </Button>
        }
      />
      <DialogContent className="export-dialog">
        <DialogHeader>
          <DialogTitle>Exporter {campagne.nomBande}</DialogTitle>
          <DialogDescription>
            Choisissez une sauvegarde réimportable, une feuille texte ou une
            mise en page prête à imprimer en PDF.
          </DialogDescription>
        </DialogHeader>
        <div className="export-options">
          <button onClick={onExportJson} type="button">
            <FileJson aria-hidden="true" />
            <span>
              <strong>Sauvegarde JSON</strong>
              <small>Pour restaurer ou transférer la bande.</small>
            </span>
          </button>
          <button onClick={() => exporterTexte(false)} type="button">
            <FileText aria-hidden="true" />
            <span>
              <strong>Résumé texte</strong>
              <small>Une ligne lisible par combattant.</small>
            </span>
          </button>
          <button onClick={() => exporterTexte(true)} type="button">
            <FileText aria-hidden="true" />
            <span>
              <strong>Texte détaillé</strong>
              <small>Caractéristiques, équipement et historique.</small>
            </span>
          </button>
          <button onClick={imprimer} type="button">
            <Printer aria-hidden="true" />
            <span>
              <strong>Imprimer ou enregistrer en PDF</strong>
              <small>Feuille A4 mise en page pour la table.</small>
            </span>
          </button>
        </div>
        {erreur ? (
          <p className="export-error" role="alert">
            {erreur}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function telecharger(contenu: string, nom: string, type: string) {
  const blob = new Blob([contenu], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nom;
  lien.hidden = true;
  document.body.append(lien);
  lien.click();
  window.setTimeout(() => {
    lien.remove();
    URL.revokeObjectURL(url);
  }, 1_000);
}
