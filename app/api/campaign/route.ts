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
    logical_id TEXT NOT NULL DEFAULT '',
    owner_id TEXT NOT NULL DEFAULT '',
    nom_campagne TEXT NOT NULL DEFAULT '',
    nom_bande TEXT NOT NULL DEFAULT '',
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 0
  )
`;

/* L'enveloppe JSON ajoute l'identifiant et la révision autour du payload. */
const TAILLE_MAX_CORPS_REQUETE = TAILLE_MAX_PAYLOAD_CAMPAGNE + 4096;
const LIMITE_CAMPAGNES_PAR_UTILISATEUR = 100;

const CREER_OU_REPRENDRE_REVISION_ZERO = `
  INSERT INTO campaign_states (
    id, logical_id, owner_id, nom_campagne, nom_bande,
    payload, updated_at, revision
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  ON CONFLICT(id) DO UPDATE SET
    nom_campagne = excluded.nom_campagne,
    nom_bande = excluded.nom_bande,
    payload = excluded.payload,
    updated_at = excluded.updated_at,
    revision = 1
  WHERE campaign_states.revision = 0
    AND campaign_states.owner_id = excluded.owner_id
`;

const METTRE_A_JOUR_SI_REVISION_IDENTIQUE = `
  UPDATE campaign_states
  SET nom_campagne = ?, nom_bande = ?, payload = ?, updated_at = ?, revision = ?
  WHERE id = ? AND owner_id = ? AND revision = ?
`;

type LigneCampagne = {
  payload: string;
  updated_at: string;
  revision: number;
};

type LigneCatalogue = {
  id: string;
  nomCampagne: string;
  nomBande: string;
  revision: number;
  miseAJour: string;
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
const proprietairesHistoriquesRepris = new Set<string>();

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

  await ajouterColonneSiAbsente(
    session,
    'revision',
    'ALTER TABLE campaign_states ADD COLUMN revision INTEGER NOT NULL DEFAULT 0',
  );
  await ajouterColonneSiAbsente(
    session,
    'logical_id',
    "ALTER TABLE campaign_states ADD COLUMN logical_id TEXT NOT NULL DEFAULT ''",
  );
  await ajouterColonneSiAbsente(
    session,
    'owner_id',
    "ALTER TABLE campaign_states ADD COLUMN owner_id TEXT NOT NULL DEFAULT ''",
  );
  await ajouterColonneSiAbsente(
    session,
    'nom_campagne',
    "ALTER TABLE campaign_states ADD COLUMN nom_campagne TEXT NOT NULL DEFAULT ''",
  );
  await ajouterColonneSiAbsente(
    session,
    'nom_bande',
    "ALTER TABLE campaign_states ADD COLUMN nom_bande TEXT NOT NULL DEFAULT ''",
  );

  await reprendreRevisionsHistoriques(session);
  await reprendreMetadonneesHistoriques(session);
  await session
    .prepare(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_states_owner_logical
       ON campaign_states (owner_id, logical_id)`,
    )
    .run();
  await session
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_campaign_states_owner_updated
       ON campaign_states (owner_id, updated_at DESC)`,
    )
    .run();
}

async function ajouterColonneSiAbsente(
  base: D1Database | D1DatabaseSession,
  nom: string,
  instruction: string,
) {
  if (await colonnePresente(base, nom)) return;
  try {
    // SQLite conserve les lignes historiques et applique la valeur par défaut.
    await base.prepare(instruction).run();
  } catch (erreur) {
    // Deux isolates peuvent tenter la même migration au même instant.
    if (!(await colonnePresente(base, nom))) throw erreur;
  }
}

async function colonnePresente(
  base: D1Database | D1DatabaseSession,
  nom: string,
) {
  const resultat = await base
    .prepare('PRAGMA table_info(campaign_states)')
    .all<{ name: string }>();
  return resultat.results.some((colonne) => colonne.name === nom);
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

async function reprendreMetadonneesHistoriques(
  base: D1Database | D1DatabaseSession,
) {
  // Les anciens identifiants étaient à la fois logiques et physiques.
  await base
    .prepare("UPDATE campaign_states SET logical_id = id WHERE logical_id = ''")
    .run();

  const resultat = await base
    .prepare(
      `SELECT id, payload FROM campaign_states
       WHERE nom_campagne = '' OR nom_bande = ''`,
    )
    .all<{ id: string; payload: string }>();

  for (const ligne of resultat.results) {
    try {
      const valeur = JSON.parse(ligne.payload) as Record<string, unknown>;
      const nomCampagne =
        typeof valeur.nomCampagne === 'string'
          ? valeur.nomCampagne.slice(0, 160)
          : 'Campagne sans nom';
      const nomBande =
        typeof valeur.nomBande === 'string'
          ? valeur.nomBande.slice(0, 160)
          : 'Bande sans nom';
      await base
        .prepare(
          `UPDATE campaign_states SET nom_campagne = ?, nom_bande = ?
           WHERE id = ? AND (nom_campagne = '' OR nom_bande = '')`,
        )
        .bind(nomCampagne, nomBande, ligne.id)
        .run();
    } catch {
      // Un ancien payload illisible reste isolé et sera signalé par GET.
    }
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

function obtenirIdentifiantUtilisateur(request: Request) {
  const transmis = request.headers.get('oai-authenticated-user-id')?.trim();
  if (
    transmis &&
    transmis.length <= 256 &&
    !Array.from(transmis).some((caractere) => {
      const code = caractere.charCodeAt(0);
      return code < 32 || code === 127;
    })
  ) {
    return transmis;
  }

  // Le serveur Vite local ne dispose pas des en-têtes d'identité de Sites.
  const hote = new URL(request.url).hostname.toLowerCase();
  if (hote === 'localhost' || hote === '127.0.0.1' || hote === '[::1]') {
    return 'local-development';
  }
  return null;
}

function identifiantStockage(proprietaire: string, identifiantLogique: string) {
  // Le préfixe par longueur rend la composition injective, même si le sujet
  // fourni par la plateforme contient lui-même des séparateurs.
  return `${proprietaire.length}:${proprietaire}${identifiantLogique}`;
}

async function attribuerCampagnesHistoriques(
  base: D1Database | D1DatabaseSession,
  proprietaire: string,
) {
  if (proprietairesHistoriquesRepris.has(proprietaire)) return;
  /*
   * Le site est privé et réservé à son propriétaire. Cette reprise unique
   * conserve les campagnes créées avant l'arrivée du cloisonnement par sujet.
   */
  const resultat = await base
    .prepare(
      `SELECT id, logical_id FROM campaign_states
       WHERE owner_id = ''`,
    )
    .all<{ id: string; logical_id: string }>();

  for (const ligne of resultat.results) {
    const logique = ligne.logical_id || ligne.id;
    await base
      .prepare(
        `UPDATE campaign_states
         SET id = ?, logical_id = ?, owner_id = ?
         WHERE id = ? AND owner_id = ''`,
      )
      .bind(
        identifiantStockage(proprietaire, logique),
        logique,
        proprietaire,
        ligne.id,
      )
      .run();
  }
  proprietairesHistoriquesRepris.add(proprietaire);
}

export async function GET(request: Request) {
  const proprietaire = obtenirIdentifiantUtilisateur(request);
  if (!proprietaire) {
    return reponseJson({ erreur: 'Authentification requise.' }, 401);
  }

  const parametres = new URL(request.url).searchParams;
  if (parametres.get('liste') === '1') {
    try {
      await preparerBase();
      const session = env.DB.withSession('first-primary');
      await attribuerCampagnesHistoriques(session, proprietaire);
      const resultat = await session
        .prepare(
          `SELECT logical_id AS id, nom_campagne AS nomCampagne,
                  nom_bande AS nomBande, revision, updated_at AS miseAJour
           FROM campaign_states
           WHERE owner_id = ?
           ORDER BY updated_at DESC
           LIMIT ?`,
        )
        .bind(proprietaire, LIMITE_CAMPAGNES_PAR_UTILISATEUR)
        .all<LigneCatalogue>();
      return reponseJson({ campagnes: resultat.results });
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
    const session = env.DB.withSession('first-primary');
    await attribuerCampagnesHistoriques(session, proprietaire);
    const ligne = await lireLigne(
      identifiantStockage(proprietaire, identifiants[0]),
      proprietaire,
      session,
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
  const proprietaire = obtenirIdentifiantUtilisateur(request);
  if (!proprietaire) {
    return reponseJson({ erreur: 'Authentification requise.' }, 401);
  }
  if (
    request.headers
      .get('content-type')
      ?.split(';', 1)[0]
      .trim()
      .toLowerCase() !== 'application/json'
  ) {
    return reponseJson(
      { erreur: 'Le type de contenu doit être application/json.' },
      415,
    );
  }

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
  let payload: string;
  try {
    payload = JSON.stringify(campagneAStocker);
  } catch {
    return reponseJson(
      { erreur: 'La campagne ne peut pas être sérialisée.' },
      400,
    );
  }
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
    await attribuerCampagnesHistoriques(session, proprietaire);
    const identifiantPhysique = identifiantStockage(proprietaire, donnees.id);

    if (
      donnees.expectedRevision === 0 &&
      !(await lireLigne(identifiantPhysique, proprietaire, session))
    ) {
      const compteur = await session
        .prepare(
          'SELECT COUNT(*) AS total FROM campaign_states WHERE owner_id = ?',
        )
        .bind(proprietaire)
        .first<{ total: number }>();
      if ((compteur?.total ?? 0) >= LIMITE_CAMPAGNES_PAR_UTILISATEUR) {
        return reponseJson(
          {
            erreur: `La limite de ${LIMITE_CAMPAGNES_PAR_UTILISATEUR} campagnes est atteinte.`,
            code: 'LIMITE_CAMPAGNES',
          },
          409,
        );
      }
    }

    const resultat =
      donnees.expectedRevision === 0
        ? await session
            .prepare(CREER_OU_REPRENDRE_REVISION_ZERO)
            .bind(
              identifiantPhysique,
              donnees.id,
              proprietaire,
              campagneAStocker.nomCampagne,
              campagneAStocker.nomBande,
              payload,
              maintenant,
            )
            .run()
        : await session
            .prepare(METTRE_A_JOUR_SI_REVISION_IDENTIQUE)
            .bind(
              campagneAStocker.nomCampagne,
              campagneAStocker.nomBande,
              payload,
              maintenant,
              nouvelleRevision,
              identifiantPhysique,
              proprietaire,
              donnees.expectedRevision,
            )
            .run();

    if ((resultat.meta.changes ?? 0) > 0) {
      return reponseJson({
        ok: true,
        revision: nouvelleRevision,
        miseAJour: maintenant,
      });
    }

    const ligneCourante = await lireLigne(
      identifiantPhysique,
      proprietaire,
      session,
    );
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
  proprietaire: string,
  base: D1Database | D1DatabaseSession = env.DB,
) {
  return base
    .prepare(
      `SELECT payload, updated_at, revision FROM campaign_states
       WHERE id = ? AND owner_id = ?`,
    )
    .bind(id, proprietaire)
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
    headers: {
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      vary: 'oai-authenticated-user-id',
    },
  });
}
