'use client';

import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { useGrainPlanner } from './GrainPlannerProvider';

const loadPersonalizedResult = () => import('./GrainPersonalizedResult');
const GrainPersonalizedResult = lazy(loadPersonalizedResult);

/**
 * The standalone result band (#result). Before a consultation it shows the server-rendered
 * `generic` overview; after reveal, GrainPersonalizedResult. That code is fetched after the first
 * answer — well before the five themes lead to «Показати концепції» — so the first page load does
 * not carry it and the reveal never waits for it.
 */
export function GrainResultBand({ generic }: { generic: ReactNode }) {
  const { state } = useGrainPlanner();
  const consultationStarted = state.completed.length > 0 || state.answers.crops.length > 0 || state.answers.capacity !== '';

  useEffect(() => {
    if (consultationStarted) void loadPersonalizedResult();
  }, [consultationStarted]);

  if (!state.resultVisible) {
    const editingResult = state.editing !== null && state.completed.length === 5;
    return (
      <section id="result" className="page-section grain-planner-root grain-result-band is-generic" aria-labelledby="grain-overview-title">
        <div className="shell">
          {editingResult && (
            <p className="planner-editing-note" role="status">Ви змінюєте відповіді. Результат оновиться, щойно ви натиснете «Продовжити».</p>
          )}
          {generic}
        </div>
      </section>
    );
  }

  return (
    <Suspense fallback={<section id="result" className="page-section grain-planner-root grain-result-band" aria-busy="true" />}>
      <GrainPersonalizedResult />
    </Suspense>
  );
}
