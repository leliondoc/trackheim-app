import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';

import { RulesetProvenance } from '@/components/ruleset-provenance';
import { rulesetOfficiel, rulesetGlmStrict } from '@/lib/mordheim-rules';

it('lie la source de la bande réelle sans la certifier comme une bande du cœur', () => {
  const { rerender } = render(
    <RulesetProvenance rulesetId={rulesetOfficiel.id} factionId="strigannes" />,
  );
  const entree = screen.getByText('Bande active').closest('li')!;
  expect(
    within(entree).getByRole('link', { name: /^Strigannes/ }),
  ).toHaveAttribute(
    'href',
    'https://drive.google.com/file/d/1AsWmv_dSSu2a1cepITITqA2VhAUP0Km2/view?usp=sharing',
  );
  expect(
    within(entree).getByText('Certification · Non vérifiée'),
  ).toBeVisible();
  expect(within(entree).queryByText(/Primaire vérifiée/)).toBeNull();
  expect(within(entree).getByText(/Document en anglais/)).toBeVisible();
  expect(within(entree).getByText(/Catalogue daté du/)).toBeVisible();

  rerender(
    <RulesetProvenance
      rulesetId={rulesetGlmStrict.id}
      factionId="mercenaires-reiklanders"
    />,
  );
  const nouvelle = screen.getByText('Bande active').closest('li')!;
  expect(
    within(nouvelle).getByRole('link', { name: /^Mercenaires Reiklanders/ }),
  ).toHaveAttribute(
    'href',
    'https://drive.google.com/file/d/11E_fKx-2HqP6kfGeZstD6tJvstJYOVV5/view?usp=sharing',
  );
  expect(screen.queryByRole('link', { name: /^Strigannes/ })).toBeNull();
});

it('le résumé distingue la source de bande du socle et ne prétend pas couvrir seulement six bandes', () => {
  render(
    <RulesetProvenance
      rulesetId={rulesetOfficiel.id}
      factionId="gobelins-de-la-nuit"
      variant="compact"
    />,
  );
  expect(
    screen.getByRole('link', { name: /^Gobelins de la Nuit/ }),
  ).toBeVisible();
  expect(screen.queryByText(/six bandes officielles/)).toBeNull();
  expect(screen.queryByText('Certification · Primaire vérifiée')).toBeNull();
});

it('ne désigne aucune bande active sans faction sélectionnée', () => {
  render(<RulesetProvenance rulesetId={rulesetOfficiel.id} />);
  expect(screen.queryByText('Bande active')).toBeNull();
});
