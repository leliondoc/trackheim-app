import { env } from 'cloudflare:workers';
import type { EtatCampagne } from '@/lib/mordheim-data';

const CREER_TABLE = `
  CREATE TABLE IF NOT EXISTS campaign_states (
    id TEXT PRIMARY KEY NOT NULL,
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;

async function preparerBase() {
  // D1 ne doit recevoir qu'une instruction SQL par requête préparée.
  await env.DB.prepare(CREER_TABLE).run();
}

export async function GET(request: Request) {
  await preparerBase();
  const id = new URL(request.url).searchParams.get('id');

  if (!id) {
    return Response.json({ erreur: 'Identifiant de campagne manquant.' }, { status: 400 });
  }

  const ligne = await env.DB.prepare(
    'SELECT payload, updated_at FROM campaign_states WHERE id = ?',
  ).bind(id).first<{ payload: string; updated_at: string }>();

  if (!ligne) {
    return Response.json({ campagne: null });
  }

  return Response.json({
    campagne: JSON.parse(ligne.payload) as EtatCampagne,
    miseAJour: ligne.updated_at,
  });
}

export async function PUT(request: Request) {
  await preparerBase();
  const donnees = (await request.json()) as { id?: string; campagne?: EtatCampagne };

  if (!donnees.id || !donnees.campagne) {
    return Response.json({ erreur: 'Campagne incomplète.' }, { status: 400 });
  }

  const maintenant = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO campaign_states (id, payload, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
  ).bind(donnees.id, JSON.stringify(donnees.campagne), maintenant).run();

  return Response.json({ ok: true, miseAJour: maintenant });
}
