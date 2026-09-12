'use client';

import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { useGrainPlanner } from './GrainPlannerProvider';
import { GrainResultErrorBoundary } from './GrainResultErrorBoundary';

type PersonalizedResultModule = typeof import('./GrainPersonalizedResult');
let failedPersonalizedResultUrl: string | null = null;

async function loadPersonalizedResult(): Promise<PersonalizedResultModule> {
  try {
    return await import('./GrainPersonalizedResult');
  } catch (error) {
    const url = error instanceof Error ? /https?:\/\/\S+/.exec(error.message)?.[0] : undefined;
    if (url) failedPersonalizedResultUrl = url;
    throw error;
  }
}

async function retryPersonalizedResult(): Promise<PersonalizedResultModule> {
  const resourceUrl = failedPersonalizedResultUrl ?? performance.getEntriesByType('resource')
    .map((entry) => entry.name)
    .find((name) => /GrainPersonalizedResult.*\.(?:js|tsx)/.test(name));
  if (!resourceUrl) return loadPersonalizedResult();
  const retryUrl = new URL(resourceUrl, window.location.href);
  retryUrl.searchParams.set('retry', String(Date.now()));
  return import(/* @vite-ignore */ retryUrl.href) as Promise<PersonalizedResultModule>;
}
const GrainPersonalizedResult = lazy(loadPersonalizedResult);
const RetryPersonalizedResult = lazy(retryPersonalizedResult);

/**
 * The standalone result band (#result). Before a consultation it shows the server-rendered
 * `generic` overview; after reveal, GrainPersonalizedResult. That code is fetched after the first
 * answer — well before the five themes lead to «Показати концепції» — so the first page load does
 * not carry it and the reveal never waits for it.
 */
export function GrainResultBand({ generic }: { generic: ReactNode }) {
  const { state } = useGrainPlanner();
  const [loadAttempt, setLoadAttempt] = useState(0);
  const consultationStarted = state.completed.length > 0 || state.answers.crops.length > 0 || state.answers.capacity !== '';

  useEffect(() => {
    if (consultationStarted) void loadPersonalizedResult().catch(() => undefined);
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
    <GrainResultErrorBoundary key={loadAttempt} onRetry={() => setLoadAttempt((attempt) => attempt + 1)}>
      <Suspense fallback={<section id="result" className="page-section grain-planner-root grain-result-band" aria-busy="true" />}>
        {loadAttempt === 0 ? <GrainPersonalizedResult /> : <RetryPersonalizedResult />}
      </Suspense>
    </GrainResultErrorBoundary>
  );
}
