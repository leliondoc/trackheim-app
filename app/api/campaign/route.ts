import { env } from 'cloudflare:workers';

import {
  TAILLE_MAX_PAYLOAD_CAMPAGNE,
  estIdentifiantCampagneValide,
  estRevisionValide,
  validerCampagneV3,
} from '@/lib/campaign-validation';
import type { EtatCampagne } from '@/lib/mordheim-data';

const CREER_TABLE = `
  CREATE TABLE IF NOT EXISTS campaign_states (
    id TEXT PRIMARY KEY NOT NULL,
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 0
  )
`;

/* L'enveloppe JSON ajoute l'identifiant et la révision autour du payload. */
const TAILLE_MAX_CORPS_REQUETE = TAILLE_MAX_PAYLOAD_CAMPAGNE + 4096;

const CREER_OU_REPRENDRE_REVISION_ZERO = `
  INSERT INTO campaign_states (id, payload, updated_at, revision)
  VALUES (?, ?, ?, 1)
  ON CONFLICT(id) DO UPDATE SET
    payload = excluded.payload,
    updated_at = excluded.updated_at,
    revision = 1
  WHERE campaign_states.revision = 0
`;

const METTRE_A_JOUR_SI_REVISION_IDENTIQUE = `
  UPDATE campaign_states
  SET payload = ?, updated_at = ?, revision = ?
  WHERE id = ? AND revision = ?
`;

type LigneCampagne = {
  payload: string;
  updated_at: string;
  revision: number;
};

type CorpsPut = {
  id?: unknown;
  campagne?: unknown;
  expectedRevision?: unknown;
};

class ErreurRequete extends Error {
  constructor(
    message: string,
    readonly statut: number,
  ) {
    super(message);
  }
}

let preparationEnCours: Promise<void> | null = null;

async function preparerBase() {
  if (!preparationEnCours) {
    preparationEnCours = preparerBaseInterne().catch((erreur) => {
      preparationEnCours = null;
      throw erreur;
    });
  }
  return preparationEnCours;
}

async function preparerBaseInterne() {
  const session = env.DB.withSession('first-primary');
  // D1 ne doit recevoir qu'une instruction SQL par requête préparée.
  await session.prepare(CREER_TABLE).run();

  if (!(await colonneRevisionPresente(session))) {
    try {
      // SQLite conserve toutes les lignes et initialise l'ancienne table à zéro.
      await session
        .prepare(
          'ALTER TABLE campaign_states ADD COLUMN revision INTEGER NOT NULL DEFAULT 0',
        )
        .run();
    } catch (erreur) {
      // Deux isolates peuvent tenter la même migration. Seule l'absence réelle
      // de la colonne après la tentative constitue un échec.
      if (!(await colonneRevisionPresente(session))) throw erreur;
    }
  }

  await reprendreRevisionsHistoriques(session);
}

async function colonneRevisionPresente(base: D1Database | D1DatabaseSession) {
  const resultat = await base
    .prepare('PRAGMA table_info(campaign_states)')
    .all<{ name: string }>();
  return resultat.results.some((colonne) => colonne.name === 'revision');
}

async function reprendreRevisionsHistoriques(
  base: D1Database | D1DatabaseSession,
) {
  const resultat = await base
    .prepare('SELECT id, payload FROM campaign_states WHERE revision = 0')
    .all<{ id: string; payload: string }>();

  for (const ligne of resultat.results) {
    const revision = extraireRevisionHistorique(ligne.payload);
    if (revision === null || revision === 0) continue;

    // La clause sur revision évite d'écraser une sauvegarde concurrente.
    await base
      .prepare(
        'UPDATE campaign_states SET revision = ? WHERE id = ? AND revision = 0',
      )
      .bind(revision, ligne.id)
      .run();
  }
}

function extraireRevisionHistorique(payload: string) {
  try {
    const valeur = JSON.parse(payload) as unknown;
    if (!estObjet(valeur) || !estRevisionValide(valeur.revision)) return null;
    return valeur.revision;
  } catch {
    // Un payload historique illisible reste intact ; GET signalera le problème.
    return null;
  }
}

export async function GET(request: Request) {
  const parametres = new URL(request.url).searchParams;
  if (parametres.get('liste') === '1') {
    try {
      await preparerBase();
      const resultat = await env.DB.withSession('first-primary')
        .prepare(
          'SELECT id, payload, updated_at, revision FROM campaign_states ORDER BY updated_at DESC LIMIT 100',
        )
        .all<LigneCampagne & { id: string }>();
      const campagnes = resultat.results.flatMap((ligne) => {
        try {
          const valeur = JSON.parse(ligne.payload) as Record<string, unknown>;
          if (
            typeof valeur.nomCampagne !== 'string' ||
            typeof valeur.nomBande !== 'string'
          )
            return [];
          return [
            {
              id: ligne.id,
              nomCampagne: valeur.nomCampagne.slice(0, 160),
              nomBande: valeur.nomBande.slice(0, 160),
              revision: ligne.revision,
              miseAJour: ligne.updated_at,
            },
          ];
        } catch {
          return [];
        }
      });
      return reponseJson({ campagnes });
    } catch (erreur) {
      console.error('Échec du catalogue des campagnes dans D1.', erreur);
      return reponseJson(
        { erreur: 'Les campagnes ne peuvent pas être listées.' },
        500,
      );
    }
  }
  const identifiants = parametres.getAll('id');

  if (
    identifiants.length !== 1 ||
    !estIdentifiantCampagneValide(identifiants[0])
  ) {
    return reponseJson(
      { erreur: 'Identifiant de campagne manquant ou invalide.' },
      400,
    );
  }

  try {
    await preparerBase();
    const ligne = await lireLigne(
      identifiants[0],
      env.DB.withSession('first-primary'),
    );

    if (!ligne) {
      return reponseJson({ campagne: null, revision: 0, miseAJour: null });
    }

    const campagne = decoderCampagneStockee(ligne);
    if (!campagne.ok) {
      return reponseJson({ erreur: campagne.erreur }, 500);
    }

    return reponseJson({
      campagne: campagne.valeur,
      revision: ligne.revision,
      miseAJour: ligne.updated_at,
    });
  } catch (erreur) {
    console.error('Échec de lecture de la campagne dans D1.', erreur);
    return reponseJson(
      { erreur: "La campagne n'a pas pu être chargée depuis la base." },
      500,
    );
  }
}

export async function PUT(request: Request) {
  let donnees: CorpsPut;
  try {
    const valeur = await lireJsonLimite(request);
    if (!estObjet(valeur)) {
      return reponseJson({ erreur: 'Le corps JSON doit être un objet.' }, 400);
    }
    donnees = valeur;
  } catch (erreur) {
    if (erreur instanceof ErreurRequete) {
      return reponseJson({ erreur: erreur.message }, erreur.statut);
    }
    return reponseJson({ erreur: 'Le corps JSON est invalide.' }, 400);
  }

  if (!estIdentifiantCampagneValide(donnees.id)) {
    return reponseJson({ erreur: 'Identifiant de campagne invalide.' }, 400);
  }
  if (!estRevisionValide(donnees.expectedRevision)) {
    return reponseJson(
      { erreur: 'La révision attendue doit être un entier positif ou nul.' },
      400,
    );
  }
  if (donnees.expectedRevision >= Number.MAX_SAFE_INTEGER) {
    return reponseJson({ erreur: 'La révision maximale a été atteinte.' }, 400);
  }

  const validation = validerCampagneV3(donnees.campagne);
  if (!validation.ok) {
    return reponseJson({ erreur: validation.erreur }, 400);
  }
  const nouvelleRevision = donnees.expectedRevision + 1;
  const campagneAStocker: EtatCampagne = {
    ...validation.campagne,
    revision: nouvelleRevision,
  };
  const payload = JSON.stringify(campagneAStocker);
  if (
    new TextEncoder().encode(payload).byteLength > TAILLE_MAX_PAYLOAD_CAMPAGNE
  ) {
    return reponseJson(
      { erreur: 'La campagne dépasse la limite de 512 Ko.' },
      413,
    );
  }

  try {
    await preparerBase();
    const maintenant = new Date().toISOString();
    const session = env.DB.withSession('first-primary');
    const resultat =
      donnees.expectedRevision === 0
        ? await session
            .prepare(CREER_OU_REPRENDRE_REVISION_ZERO)
            .bind(donnees.id, payload, maintenant)
            .run()
        : await session
            .prepare(METTRE_A_JOUR_SI_REVISION_IDENTIQUE)
            .bind(
              payload,
              maintenant,
              nouvelleRevision,
              donnees.id,
              donnees.expectedRevision,
            )
            .run();

    if ((resultat.meta.changes ?? 0) > 0) {
      return reponseJson({
        ok: true,
        campagne: campagneAStocker,
        revision: nouvelleRevision,
        miseAJour: maintenant,
      });
    }

    const ligneCourante = await lireLigne(donnees.id, session);
    if (!ligneCourante) {
      return reponseJson(
        {
          erreur:
            "Conflit de révision : la campagne n'existe plus dans la base.",
          code: 'CONFLIT_REVISION',
          campagne: null,
          revision: 0,
          miseAJour: null,
        },
        409,
      );
    }

    const campagneCourante = decoderCampagneStockee(ligneCourante);
    if (!campagneCourante.ok) {
      return reponseJson({ erreur: campagneCourante.erreur }, 500);
    }

    return reponseJson(
      {
        erreur:
          'Conflit de révision : une version plus récente doit être rechargée.',
        code: 'CONFLIT_REVISION',
        campagne: campagneCourante.valeur,
        revision: ligneCourante.revision,
        miseAJour: ligneCourante.updated_at,
      },
      409,
    );
  } catch (erreur) {
    console.error("Échec d'écriture de la campagne dans D1.", erreur);
    return reponseJson(
      { erreur: "La campagne n'a pas pu être enregistrée dans la base." },
      500,
    );
  }
}

async function lireLigne(
  id: string,
  base: D1Database | D1DatabaseSession = env.DB,
) {
  return base
    .prepare(
      'SELECT payload, updated_at, revision FROM campaign_states WHERE id = ?',
    )
    .bind(id)
    .first<LigneCampagne>();
}

function decoderCampagneStockee(ligne: LigneCampagne) {
  let valeur: unknown;
  try {
    valeur = JSON.parse(ligne.payload) as unknown;
  } catch {
    return { ok: false as const, erreur: 'La campagne stockée est illisible.' };
  }

  if (!estObjet(valeur)) {
    return { ok: false as const, erreur: 'La campagne stockée est invalide.' };
  }

  /*
   * La version publique précédente stockait un état v2 valide. Le client le
   * migre de façon déterministe en v3 puis le réenregistre au prochain changement.
   */
  if (valeur.version === 2) {
    return {
      ok: true as const,
      valeur: {
        ...valeur,
        revision: ligne.revision,
      } as unknown as EtatCampagne,
    };
  }

  const validation = validerCampagneV3({ ...valeur, revision: ligne.revision });
  if (!validation.ok) {
    return {
      ok: false as const,
      erreur: `La campagne stockée est invalide : ${validation.erreur}`,
    };
  }
  return { ok: true as const, valeur: validation.campagne };
}

async function lireJsonLimite(request: Request) {
  const tailleAnnoncee = request.headers.get('content-length');
  if (tailleAnnoncee && /^\d+$/.test(tailleAnnoncee)) {
    if (Number(tailleAnnoncee) > TAILLE_MAX_CORPS_REQUETE) {
      throw new ErreurRequete('La campagne dépasse la limite de 512 Ko.', 413);
    }
  }

  if (!request.body)
    throw new ErreurRequete('Le corps JSON est manquant.', 400);

  const lecteur = request.body.getReader();
  const morceaux: Uint8Array[] = [];
  let taille = 0;

  while (true) {
    const lecture = await lecteur.read();
    if (lecture.done) break;
    taille += lecture.value.byteLength;
    if (taille > TAILLE_MAX_CORPS_REQUETE) {
      try {
        await lecteur.cancel();
      } catch {
        // La réponse 413 reste prioritaire même si la source refuse l'annulation.
      }
      throw new ErreurRequete('La campagne dépasse la limite de 512 Ko.', 413);
    }
    morceaux.push(lecture.value);
  }

  const octets = new Uint8Array(taille);
  let position = 0;
  for (const morceau of morceaux) {
    octets.set(morceau, position);
    position += morceau.byteLength;
  }

  let texte: string;
  try {
    texte = new TextDecoder('utf-8', { fatal: true }).decode(octets);
  } catch {
    throw new ErreurRequete("Le corps n'est pas un JSON UTF-8 valide.", 400);
  }

  try {
    return JSON.parse(texte) as unknown;
  } catch {
    throw new ErreurRequete('Le corps JSON est invalide.', 400);
  }
}

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return (
    typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)
  );
}

function reponseJson(contenu: unknown, statut = 200) {
  return Response.json(contenu, {
    status: statut,
    headers: { 'cache-control': 'no-store' },
  });
}
