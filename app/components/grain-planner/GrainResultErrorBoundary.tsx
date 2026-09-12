'use client';

import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode; onRetry: () => void };
type State = { failed: boolean };

/** A failed optional result chunk must not take the planner, attached form, or page down with it. */
export class GrainResultErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <section id="result" className="page-section grain-planner-root grain-result-band grain-result-error" aria-labelledby="grain-result-error-title">
        <div className="shell">
          <p className="eyebrow">Персональний результат</p>
          <h2 id="grain-result-error-title">Не вдалося завантажити персональний результат</h2>
          <p>Ваші відповіді та опис для заявки збережені. Спробуйте завантажити результат ще раз або перейдіть до короткої форми нижче.</p>
          <div className="grain-result-error-actions">
            <button type="button" className="button button-primary" onClick={this.props.onRetry}>Спробувати ще раз</button>
            <a className="button planner-button-outline" href="#inquiry">Перейти до заявки</a>
          </div>
        </div>
      </section>
    );
  }
}
