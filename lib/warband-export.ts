import {
  equipements,
  obtenirDefinitionBande,
  obtenirProfil,
  type Combattant,
  type EtatCampagne,
  type Statistiques,
} from './mordheim-data.ts';
import { calculerValeurBande } from './mordheim-rules.ts';

const nomsStatistiques: Array<[keyof Statistiques, string]> = [
  ['mouvement', 'M'],
  ['capaciteCombat', 'CC'],
  ['capaciteTir', 'CT'],
  ['force', 'F'],
  ['endurance', 'E'],
  ['pointsVie', 'PV'],
  ['initiative', 'I'],
  ['attaques', 'A'],
  ['commandement', 'Cd'],
];

export function nomBaseExport(campagne: EtatCampagne) {
  const nom = campagne.nomBande
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return nom || 'bande-trackheim';
}

export function construireExportTexteSimple(campagne: EtatCampagne) {
  const definition = obtenirDefinitionBande(campagne.factionId);
  const lignes = [
    campagne.nomBande,
    `${definition.nom} | valeur ${valeurBande(campagne)} | ${campagne.couronnes} CO`,
    campagne.campagneActive
      ? `Campagne : ${campagne.nomCampagne} | ${campagne.numeroBataille} bataille(s)`
      : 'Bande indépendante',
    '',
    'COMBATTANTS',
  ];

  if (campagne.combattants.length === 0) lignes.push('Aucun combattant.');
  for (const combattant of campagne.combattants) {
    const profil = obtenirProfil(combattant.profilId);
    const quantite = combattant.quantite > 1 ? ` x${combattant.quantite}` : '';
    const equipement =
      nomsEquipements(combattant).join(', ') || 'Dague gratuite';
    lignes.push(
      `${combattant.nom}${quantite} | ${profil.nom} | XP ${combattant.experience} | ${combattant.statut} | ${equipement}`,
    );
  }

  return `${lignes.join('\n')}\n`;
}

export function construireExportTexteDetaille(campagne: EtatCampagne) {
  const definition = obtenirDefinitionBande(campagne.factionId);
  const lignes = [
    'TRACKHEIM | FEUILLE DE BANDE',
    campagne.nomBande,
    definition.nom,
    `Grade ${campagne.grade} | valeur ${valeurBande(campagne)} | trésor ${campagne.couronnes} CO | pierre magique ${campagne.fragments}`,
    campagne.campagneActive
      ? `Campagne : ${campagne.nomCampagne} | bataille ${campagne.numeroBataille}`
      : 'Bande indépendante',
  ];

  for (const combattant of campagne.combattants) {
    const profil = obtenirProfil(combattant.profilId);
    lignes.push(
      '',
      `${combattant.nom}${combattant.quantite > 1 ? ` x${combattant.quantite}` : ''}`,
      `${profil.nom} | ${combattant.chef ? 'Chef | ' : ''}${combattant.statut} | XP ${combattant.experience}`,
      ligneStatistiques(combattant),
      `Équipement : ${nomsEquipements(combattant).join(', ') || 'Dague gratuite'}`,
      `Compétences : ${combattant.competences.join(', ') || 'Aucune'}`,
      `Blessures : ${combattant.blessures.join(', ') || 'Aucune'}`,
      `Progressions : ${combattant.progressions.join(', ') || 'Aucune'}`,
    );
    if (combattant.notes.trim())
      lignes.push(`Notes : ${combattant.notes.trim()}`);
  }

  const inventaire = Object.entries(campagne.inventaire)
    .filter(([, quantite]) => quantite > 0)
    .map(([id, quantite]) => {
      const nom = equipements.find((item) => item.id === id)?.nom ?? id;
      return `${nom} x${quantite}`;
    });
  lignes.push('', `Magot : ${inventaire.join(', ') || 'Vide'}`);

  if (campagne.parties.length) {
    lignes.push('', 'HISTORIQUE');
    for (const partie of campagne.parties) {
      lignes.push(
        `${partie.date} | ${partie.scenario} | ${partie.adversaire} | ${partie.resultat}`,
      );
    }
  }

  return `${lignes.join('\n')}\n`;
}

export function construireFeuilleImprimable(campagne: EtatCampagne) {
  const definition = obtenirDefinitionBande(campagne.factionId);
  const combattants = campagne.combattants
    .map((combattant) => {
      const profil = obtenirProfil(combattant.profilId);
      const cellules = nomsStatistiques
        .map(([cle, libelle]) => {
          const valeur =
            combattant.statistiquesSpeciales?.[cle] ??
            combattant.statistiques[cle];
          return `<td><small>${libelle}</small><strong>${echapper(String(valeur))}</strong></td>`;
        })
        .join('');
      return `<article class="fighter">
        <header><div><h2>${echapper(combattant.nom)}</h2><p>${echapper(profil.nom)}${combattant.quantite > 1 ? `, groupe de ${combattant.quantite}` : ''}</p></div><b>${echapper(combattant.statut)} · ${combattant.experience} XP</b></header>
        <table aria-label="Caractéristiques de ${echapper(combattant.nom)}"><tbody><tr>${cellules}</tr></tbody></table>
        <dl>
          <div><dt>Équipement</dt><dd>${echapper(nomsEquipements(combattant).join(', ') || 'Dague gratuite')}</dd></div>
          <div><dt>Compétences</dt><dd>${echapper(combattant.competences.join(', ') || 'Aucune')}</dd></div>
          <div><dt>Blessures</dt><dd>${echapper(combattant.blessures.join(', ') || 'Aucune')}</dd></div>
          ${combattant.notes.trim() ? `<div><dt>Notes</dt><dd>${echapper(combattant.notes.trim())}</dd></div>` : ''}
        </dl>
      </article>`;
    })
    .join('');

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>${echapper(campagne.nomBande)} | Trackheim</title>
<style>
@page { size: A4; margin: 12mm; }
* { box-sizing: border-box; }
body { margin: 0; color: #211914; background: white; font: 10pt/1.35 Georgia, serif; }
header.hero { display: flex; justify-content: space-between; gap: 20px; border-bottom: 3px solid #6d2a24; padding-bottom: 8px; }
h1 { margin: 0; font-size: 25pt; } h2 { margin: 0; font-size: 14pt; }
p { margin: 2px 0 0; } .summary { text-align: right; }
.roster { display: grid; gap: 7mm; margin-top: 8mm; }
.fighter { break-inside: avoid; border: 1px solid #8b765d; padding: 4mm; }
.fighter > header { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 3mm; }
.fighter header p, .fighter header b { color: #684f3f; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
td { border: 1px solid #c8b99e; padding: 2mm; text-align: center; }
td small, td strong { display: block; } td small { color: #755f4d; font-size: 7pt; }
dl { display: grid; gap: 1mm; margin: 3mm 0 0; } dl div { display: grid; grid-template-columns: 28mm 1fr; }
dt { font-weight: 700; } dd { margin: 0; }
footer { margin-top: 7mm; border-top: 1px solid #c8b99e; padding-top: 3mm; color: #755f4d; font-size: 8pt; }
@media print { body { print-color-adjust: exact; } }
</style></head><body>
<header class="hero"><div><p>TRACKHEIM · FEUILLE DE BANDE</p><h1>${echapper(campagne.nomBande)}</h1><p>${echapper(definition.nom)} · grade ${echapper(campagne.grade)}</p></div>
<div class="summary"><b>Valeur ${valeurBande(campagne)}</b><p>${campagne.couronnes} CO · ${campagne.fragments} fragment(s)</p><p>${echapper(campagne.campagneActive ? campagne.nomCampagne : 'Bande indépendante')}</p></div></header>
<main class="roster">${combattants || '<p>Aucun combattant recruté.</p>'}</main>
<footer>Document généré depuis les données locales de Trackheim. Vérifiez les règles particulières de la bande avant la partie.</footer>
</body></html>`;
}

function valeurBande(campagne: EtatCampagne) {
  return calculerValeurBande(
    campagne.combattants.map((combattant) => ({
      quantite: combattant.quantite,
      experience: combattant.experience,
      grandeCreature: obtenirProfil(combattant.profilId).grandeCreature,
    })),
  );
}

function nomsEquipements(combattant: Combattant) {
  return combattant.equipementIds.map(
    (id) => equipements.find((item) => item.id === id)?.nom ?? id,
  );
}

function ligneStatistiques(combattant: Combattant) {
  return nomsStatistiques
    .map(([cle, libelle]) => {
      const valeur =
        combattant.statistiquesSpeciales?.[cle] ?? combattant.statistiques[cle];
      return `${libelle} ${valeur}`;
    })
    .join(' | ');
}

function echapper(valeur: string) {
  return valeur
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
