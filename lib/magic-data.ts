import type {
  Combattant,
  EtatCampagne,
  FactionId,
  MarqueChaos,
} from './mordheim-data.ts';
import { obtenirFicheBandeReference } from './warbands/reference.ts';

/**
 * Profils explicitement autorisés à utiliser le répertoire magique de leur
 * bande. Cette donnée structurée évite de déduire un rôle depuis une mention
 * de « magie » ou de « sorcier » dans un texte de règle.
 */
const profilsMagiquesParFaction: Partial<Record<FactionId, readonly string[]>> =
  {
    'pilleurs-de-tombes-arabiens': [
      'ref-pilleurs-de-tombes-arabiens-mystique-nomade',
    ],
    'skavens-du-clan-pestilens': [
      'ref-skavens-du-clan-pestilens-precheur-sorcier-pestilens',
    ],
    'caravane-des-marchands': ['ref-caravane-des-marchands-magicien-caravane'],
    'fils-dhashut': ['ref-fils-dhashut-apprenti-sorcier-hashut'],
    'gardiens-de-chapelle-bretonniens': [
      'ref-gardiens-de-chapelle-bretonniens-damoiselle',
    ],
    'gobelins-de-la-nuit': ['ref-gobelins-de-la-nuit-chaman-gobelin'],
    'morts-tourmentes': [
      'ref-morts-tourmentes-liche',
      'ref-morts-tourmentes-necromancien',
    ],
    'nains-du-chaos': ['ref-nains-du-chaos-hierogrammate'],
    'arpenteurs-fimirs': ['ref-arpenteurs-fimirs-matriarche-fimir'],
    'maraudeurs-du-chaos': ['ref-maraudeurs-du-chaos-devin'],
    strigannes: ['ref-strigannes-petru-striganne'],
    'amazones-l': ['ref-amazones-l-pretresse-serpent'],
    'amazones-m': ['ref-amazones-m-pretresse'],
    'chasseurs-cornus': ['ref-chasseurs-cornus-pretre-de-taal'],
    'elfes-noirs': ['ref-elfes-noirs-sorciere'],
    'expeditions-runiques': ['ref-expeditions-runiques-forgerune'],
    'gardiens-des-tombes': ['ref-gardiens-des-tombes-pretre-liche'],
    'gobelins-des-forets': [
      'ref-gobelins-des-forets-chaman-gobelin-des-forets',
    ],
    'guerriers-fantomes': ['ref-guerriers-fantomes-tisseur-dombres'],
    'hommes-lezards': ['ref-hommes-lezards-pretre-skink'],
    'hors-la-loi-de-stirwood': ['ref-hors-la-loi-de-stirwood-moine'],
    'horde-orque': ['ref-horde-orque-chamane-orque'],
    'kermesse-du-chaos': ['ref-kermesse-du-chaos-maitre-de-ceremonie'],
    'mercenaires-ostlanders': ['ref-mercenaires-ostlanders-pretre-de-taal'],
    'pillards-hommes-betes': ['ref-pillards-hommes-betes-chaman-homme-bete'],
    'culte-des-possedes': ['possedes-magister'],
    repurgateurs: ['repurgateurs-pretre'],
    'soeurs-de-sigmar': ['soeurs-matriarche'],
    'morts-vivants': ['morts-vivants-necromancien'],
    'skavens-du-clan-eshin': ['skavens-sorcier'],
  };

export type ContexteMagie = {
  combattant?: Combattant;
  campagne?: EtatCampagne;
};

const entreesNonApprenables = new Set([
  'caravane-des-marchands\u0000Magie mineure',
  'expeditions-runiques\u0000Règles des runes mineures',
  'maraudeurs-du-chaos\u0000Rituels du Chaos',
]);

const pouvoirsMaraudeursParMarque: Record<
  Exclude<MarqueChaos, 'Arkhar' | 'Chaos Universel'>,
  ReadonlySet<string>
> = {
  Shornaal: new Set([
    'Délicieuse souffrance',
    'Danse du serpent',
    'Tourment sans fin',
    'Consternation',
    'Mille voix',
    'Tentation',
  ]),
  Tchar: new Set([
    'Bénédiction de Tchar',
    'Dissipation',
    'Clairvoyance',
    'Courroux de Tchar',
    'Récompense de Tchar',
    'Esclave du Chaos',
  ]),
  Onogal: new Set([
    "Toucher d'Onogal",
    'Furoncles',
    'Miasmes',
    'Pestilence',
    'Peau verruqueuse',
    "Pourriture d'Onogal",
  ]),
};

const pouvoirReserveLiche = 'Horreur vivante';
const pouvoirReserveNecromancien = 'Visage de la mort';

const factionParProfil = new Map<string, FactionId>();
for (const [factionId, profils] of Object.entries(profilsMagiquesParFaction)) {
  for (const profilId of profils ?? []) {
    factionParProfil.set(profilId, factionId as FactionId);
  }
}

export function profilEstLanceurMagie(
  profilId: string,
  combattant?: Combattant,
) {
  if (!factionParProfil.has(profilId)) return false;
  return !(
    factionParProfil.get(profilId) === 'maraudeurs-du-chaos' &&
    combattant?.optionsRegles?.marqueChaos === 'Arkhar'
  );
}

export function estPouvoirMagiqueApprenable(
  factionId: FactionId,
  titre: string,
) {
  return !entreesNonApprenables.has(`${factionId}\u0000${titre.trim()}`);
}

export function pouvoirsMagiquesPourProfil(
  profilId: string,
  contexte: ContexteMagie = {},
) {
  const factionId = factionParProfil.get(profilId);
  if (!factionId) return [];

  const pouvoirs =
    obtenirFicheBandeReference(factionId)
      ?.magie.filter((pouvoir) =>
        estPouvoirMagiqueApprenable(factionId, pouvoir.titre),
      )
      .map((pouvoir) => pouvoir.titre.trim()) ?? [];

  if (factionId === 'maraudeurs-du-chaos') {
    const marque = contexte.combattant?.optionsRegles?.marqueChaos;
    if (!marque || marque === 'Arkhar') return [];
    if (marque === 'Chaos Universel') {
      // Cette marque renvoie explicitement aux Rituels du Chaos du livre de
      // règles, déjà structurés par la fiche officielle des Possédés.
      const factionRituels: FactionId = 'culte-des-possedes';
      return (
        obtenirFicheBandeReference(factionRituels)
          ?.magie.filter((pouvoir) =>
            estPouvoirMagiqueApprenable(factionRituels, pouvoir.titre),
          )
          .map((pouvoir) => pouvoir.titre.trim()) ?? []
      );
    }
    const autorises = pouvoirsMaraudeursParMarque[marque];
    return pouvoirs.filter((pouvoir) => autorises.has(pouvoir));
  }

  if (factionId === 'morts-tourmentes') {
    if (profilId.endsWith('-liche')) {
      return pouvoirs.filter(
        (pouvoir) => pouvoir !== pouvoirReserveNecromancien,
      );
    }

    const pouvoirsNecromancien = pouvoirs.filter(
      (pouvoir) => pouvoir !== pouvoirReserveLiche,
    );
    const campagne = contexte.campagne;
    if (!campagne) return [];

    const liche = campagne.combattants.find(
      (combattant) => combattant.profilId === 'ref-morts-tourmentes-liche',
    );
    if (!liche) return pouvoirsNecromancien;

    const connusLiche = new Set(
      liche.competences.flatMap((competence) => {
        const prefixe = 'Sort ou prière : ';
        return competence.startsWith(prefixe)
          ? [competence.slice(prefixe.length)]
          : [];
      }),
    );
    return pouvoirsNecromancien.filter(
      (pouvoir) =>
        connusLiche.has(pouvoir) ||
        (pouvoir === pouvoirReserveNecromancien &&
          connusLiche.has(pouvoirReserveLiche)),
    );
  }

  return pouvoirs;
}

export function profilsMagiquesFaction(factionId: FactionId) {
  return profilsMagiquesParFaction[factionId] ?? [];
}
