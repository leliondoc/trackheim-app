import { BookOpen, Search, Sparkles, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { profilEstLanceurMagie } from '@/lib/magic-data';
import { obtenirProfil, type EtatCampagne } from '@/lib/mordheim-data';
import { obtenirFicheBandeReference } from '@/lib/warbands/reference';

const prefixeSort = 'Sort ou prière : ';

export function SpellsView({
  campagne,
  onOpenFaction,
}: {
  campagne: EtatCampagne;
  onOpenFaction: (slug: string) => void;
}) {
  const [recherche, setRecherche] = useState('');
  const fiche = obtenirFicheBandeReference(campagne.factionId);
  const lanceurs = campagne.combattants
    .map((combattant) => {
      const profil = obtenirProfil(combattant.profilId);
      const sorts = combattant.competences
        .filter((competence) => competence.startsWith(prefixeSort))
        .map((competence) => competence.slice(prefixeSort.length));
      const habilite =
        sorts.length > 0 || profilEstLanceurMagie(profil.id, combattant);
      return { combattant, profil, sorts, habilite };
    })
    .filter(({ habilite }) => habilite);
  const sorts = useMemo(() => {
    const terme = normaliser(recherche.trim());
    if (!terme) return fiche?.magie ?? [];
    return (fiche?.magie ?? []).filter((sort) =>
      normaliser(`${sort.titre} ${sort.description}`).includes(terme),
    );
  }, [fiche, recherche]);

  return (
    <section className="product-view spells-view">
      <header className="page-header">
        <div>
          <p className="eyebrow">Aide de jeu</p>
          <h1>Sorts et prières</h1>
          <p>
            Les pouvoirs appris par vos combattants restent séparés du
            répertoire complet autorisé à leur bande.
          </p>
        </div>
        <Button
          onClick={() => onOpenFaction(campagne.factionId)}
          type="button"
          variant="outline"
        >
          <BookOpen aria-hidden="true" /> Fiche de la bande
        </Button>
      </header>

      <section className="known-spells-panel">
        <div className="table-tools-heading">
          <span>
            <Users aria-hidden="true" />
          </span>
          <div>
            <p className="eyebrow">Registre actif</p>
            <h2>Lanceurs et pouvoirs connus</h2>
          </div>
        </div>
        {lanceurs.length ? (
          <div className="known-spells-grid">
            {lanceurs.map(({ combattant, profil, sorts: connus }) => (
              <article key={combattant.id}>
                <header>
                  <div>
                    <h3>{combattant.nom}</h3>
                    <p>{profil.nom}</p>
                  </div>
                  <Sparkles aria-hidden="true" />
                </header>
                {connus.length ? (
                  <ul>
                    {connus.map((sort) => {
                      const amelioration =
                        combattant.ameliorationsSorts?.[sort] ?? 0;
                      const difficulteInitiale = fiche?.magie.find(
                        (pouvoir) => pouvoir.titre.trim() === sort,
                      )?.difficulte;
                      return (
                        <li key={sort}>
                          {sort}
                          {difficulteInitiale !== undefined ? (
                            <span>
                              {' '}
                              · Difficulté {difficulteInitiale - amelioration}
                              {amelioration
                                ? ` (base ${difficulteInitiale}, −${amelioration})`
                                : ''}
                            </span>
                          ) : amelioration > 0 ? (
                            <span> · Difficulté réduite de {amelioration}</span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="spells-empty-copy">
                    Aucun pouvoir encore inscrit dans ses progressions.
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="spells-empty-row">
            <Sparkles aria-hidden="true" />
            <p>
              Aucun lanceur de sorts ou de prières n’est présent dans la bande.
            </p>
          </div>
        )}
      </section>

      <section className="spell-directory-panel">
        <div className="spell-directory-header">
          <div>
            <p className="eyebrow">Répertoire de la faction</p>
            <h2>
              {fiche?.magie.length
                ? `${fiche.magie.length} pouvoir(s)`
                : 'Aucun répertoire propre'}
            </h2>
          </div>
          {fiche?.magie.length ? (
            <label className="spell-search" htmlFor="spell-directory-search">
              <Search aria-hidden="true" />
              <Input
                aria-label="Filtrer les sorts et prières"
                id="spell-directory-search"
                onChange={(event) => setRecherche(event.target.value)}
                placeholder="Nom ou effet"
                type="search"
                value={recherche}
              />
            </label>
          ) : null}
        </div>

        {sorts.length ? (
          <div className="spell-directory-grid">
            {sorts.map((sort) => (
              <article
                key={`${sort.titre}-${sort.difficulte ?? 'sans-difficulte'}`}
              >
                <header>
                  <h3>{sort.titre}</h3>
                  {sort.difficulte !== undefined ? (
                    <b>Difficulté {sort.difficulte}</b>
                  ) : null}
                </header>
                <p>{sort.description}</p>
                {sort.source ? <small>{sort.source}</small> : null}
              </article>
            ))}
          </div>
        ) : fiche?.magie.length ? (
          <div className="spells-empty-row">
            <Search aria-hidden="true" />
            <p>Aucun pouvoir ne correspond à cette recherche.</p>
          </div>
        ) : (
          <div className="spells-empty-row">
            <BookOpen aria-hidden="true" />
            <p>
              La fiche de cette bande ne contient pas de liste de magie ou de
              prières propre.
            </p>
          </div>
        )}
      </section>
    </section>
  );
}

function normaliser(texte: string) {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
