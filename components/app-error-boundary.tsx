import { Component, type ErrorInfo, type ReactNode } from 'react';

type Etat = { erreur: Error | null };

export class AppErrorBoundary extends Component<{ children: ReactNode }, Etat> {
  state: Etat = { erreur: null };

  static getDerivedStateFromError(erreur: Error): Etat {
    return { erreur };
  }

  componentDidCatch(erreur: Error, informations: ErrorInfo) {
    console.error('Erreur de rendu Trackheim', erreur, informations);
  }

  render() {
    if (!this.state.erreur) return this.props.children;
    return (
      <main className="fatal-error" role="alert">
        <p className="eyebrow">Incident de rendu</p>
        <h1>Le registre n’a pas pu être affiché</h1>
        <p>
          Votre sauvegarde locale n’a pas été supprimée. Rechargez la page pour
          reprendre là où vous vous étiez arrêté.
        </p>
        <button type="button" onClick={() => location.reload()}>
          Recharger Trackheim
        </button>
      </main>
    );
  }
}
