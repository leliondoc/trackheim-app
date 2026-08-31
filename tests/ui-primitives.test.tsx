import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AppErrorBoundary } from '@/components/app-error-boundary';
import { Alert } from '@/components/ui/alert';
import { CardTitle } from '@/components/ui/card';

function ComposantEnErreur(): ReactNode {
  throw new Error('Erreur de test');
}

describe('fondations accessibles de l’interface', () => {
  it('ne rend pas une information statique assertive par défaut', () => {
    render(<Alert>Information</Alert>);
    expect(screen.getByText('Information')).not.toHaveAttribute(
      'role',
      'alert',
    );
  });

  it('permet un vrai niveau de titre dans les cartes', () => {
    render(<CardTitle as="h2">Séquence</CardTitle>);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Séquence',
    );
  });

  it('affiche une reprise sûre après une erreur de rendu', () => {
    const espion = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    render(
      <AppErrorBoundary>
        <ComposantEnErreur />
      </AppErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Le registre n’a pas pu être affiché',
    );
    espion.mockRestore();
  });
});
