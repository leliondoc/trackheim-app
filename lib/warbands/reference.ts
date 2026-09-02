import officiellesAJson from './fiches/officielles-a.json' with { type: 'json' };
import officiellesBJson from './fiches/officielles-b.json' with { type: 'json' };
import officiellesConstructiblesJson from './fiches/officielles-constructibles.json' with { type: 'json' };
import grade1bLot1Json from './fiches/grade1b-lot1.json' with { type: 'json' };
import grade1bLot2Json from './fiches/grade1b-lot2.json' with { type: 'json' };
import catalogueLot3Json from './fiches/catalogue-lot3.json' with { type: 'json' };
import catalogueLot4Json from './fiches/catalogue-lot4.json' with { type: 'json' };
import catalogueLot5Json from './fiches/catalogue-lot5.json' with { type: 'json' };
import type { FicheBandeReference, FichesBandesReference } from './schema.ts';

const officiellesA = officiellesAJson as FichesBandesReference;
const officiellesB = officiellesBJson as FichesBandesReference;
const officiellesConstructibles =
  officiellesConstructiblesJson as FichesBandesReference;
const grade1bLot1 = grade1bLot1Json as FichesBandesReference;
const grade1bLot2 = grade1bLot2Json as FichesBandesReference;
const catalogueLot3 = catalogueLot3Json as FichesBandesReference;
const catalogueLot4 = catalogueLot4Json as FichesBandesReference;
const catalogueLot5 = catalogueLot5Json as FichesBandesReference;

function normaliserFiches(source: FichesBandesReference) {
  return Object.fromEntries(
    Object.entries(source.bandes).map(([slug, fiche]) => [
      slug,
      {
        ...fiche,
        listesEquipement: fiche.listesEquipement.map((liste) => ({
          ...liste,
          categories: liste.categories.filter(
            (categorie) => categorie.entrees.length > 0,
          ),
        })),
      },
    ]),
  ) as Record<string, FicheBandeReference>;
}

function fusionnerFiches(sources: FichesBandesReference[]) {
  const resultat: Record<string, FicheBandeReference> = {};
  for (const source of sources) {
    for (const [slug, fiche] of Object.entries(normaliserFiches(source))) {
      if (resultat[slug]) {
        throw new Error(`Fiche de bande dupliquée : ${slug}`);
      }
      resultat[slug] = fiche;
    }
  }
  return resultat;
}

/**
 * Fiches relues contre leur document source. Le constructeur possède son
 * propre modèle, plus strict, afin qu'une fiche consultable ne soit jamais
 * confondue avec une faction dont toutes les validations sont automatisées.
 */
export const fichesBandesReference = fusionnerFiches([
  officiellesA,
  officiellesB,
  officiellesConstructibles,
  grade1bLot1,
  grade1bLot2,
  catalogueLot3,
  catalogueLot4,
  catalogueLot5,
]);

export function obtenirFicheBandeReference(slug: string) {
  return fichesBandesReference[slug];
}
