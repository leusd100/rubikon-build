'use client';

import { ChevronDown } from 'lucide-react';
import { useRef, useState } from 'react';
import { grainPlannerPresentation } from '../../data/grainPlannerPresentation';
import {
  buildCandidates,
  buildDrivers,
  comparisonCell,
  comparisonRows,
  driverExplanation,
  type Answers,
  type CandidateKey,
} from '../../lib/planner/grain';
import { ApproachCard } from '../planner/ApproachCard';
import { ComparisonTable } from '../planner/ComparisonTable';
import { DriverPills } from '../planner/DriverPills';
import { PlannerTabs } from '../planner/PlannerTabs';
import { ResultHeading } from '../planner/ResultHeading';
import { scrollAfterRender } from '../planner/plannerScroll';
import { GrainCandidateVisual } from './GrainCandidateVisual';
import { GrainConceptDetail } from './GrainConceptDetail';

/** The comparison route: drivers, approach cards, side-by-side table and each approach in depth. */
export function GrainCandidateComparison({ answers, narrow }: { answers: Answers; narrow: boolean }) {
  const presentation = grainPlannerPresentation.result;
  const candidates = buildCandidates(answers);
  const drivers = buildDrivers(answers);
  const [driverOpen, setDriverOpen] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [selected, setSelected] = useState<CandidateKey | null>(null);
  // Phones: each approach is its own disclosure, and several can be open at once for comparison.
  const [expanded, setExpanded] = useState<CandidateKey[]>([]);
  const explorerRef = useRef<HTMLDivElement>(null);
  // After an edit the set can change; fall back to the first approach still shown.
  const active = candidates.some((item) => item.key === selected) ? (selected as CandidateKey) : candidates[0].key;
  const collapsed = (block: 'conceptDetail' | 'comparison') => narrow && presentation.collapsedOnMobile.includes(block);

  const table = (
    <ComparisonTable
      caption="Порівняння підходів для вашого сценарію"
      cornerLabel="Для вашого сценарію"
      columns={candidates.map((item) => item.title)}
      rows={comparisonRows(answers).map((row) => ({ label: row, cells: candidates.map((item) => comparisonCell(item.key, row)) }))}
    />
  );

  return (
    <div className="planner-outcome">
      <ResultHeading
        id="grain-result-title"
        eyebrow="Концепції для порівняння"
        heading="Для вашої задачі є кілька підходів, які варто розглянути."
        lead="Це не рейтинг: кожна картка показана лише за конкретними даними сценарію, а остаточне рішення визначає проєктування."
      />
      <DriverPills
        id="grain-driver-explanation"
        label="Найбільше впливають"
        drivers={drivers.map((driver) => ({ label: driver, explanation: driverExplanation(driver) }))}
        open={driverOpen}
        onToggle={(driver) => setDriverOpen(driverOpen === driver ? null : driver)}
      />
      <div className={`planner-approach-grid is-count-${candidates.length}`}>
        {candidates.map((candidate) => (
          <ApproachCard
            key={candidate.key}
            category={candidate.category}
            label={candidate.label}
            title={candidate.title}
            summary={candidate.summary}
            visual={<GrainCandidateVisual type={candidate.key} />}
            reason={presentation.whyPlacement === 'card' ? candidate.reasons[0] : undefined}
            actionLabel="Дослідити концепцію"
            onAction={() => {
              setSelected(candidate.key);
              setExpanded((current) => (current.includes(candidate.key) ? current : [...current, candidate.key]));
              scrollAfterRender(() => explorerRef.current?.querySelector(`[data-concept="${candidate.key}"]`) ?? explorerRef.current);
            }}
          />
        ))}
      </div>

      {collapsed('comparison') ? (
        <details className="planner-disclosure">
          <summary>Порівняти поруч</summary>
          {table}
        </details>
      ) : (
        <>
          <div className="planner-compare-action">
            <button type="button" className="button planner-button-outline" aria-expanded={compareOpen} aria-controls="grain-comparison" onClick={() => setCompareOpen(!compareOpen)}>
              {compareOpen ? 'Сховати порівняння' : 'Порівняти поруч'} <ChevronDown aria-hidden="true" />
            </button>
          </div>
          <div id="grain-comparison" hidden={!compareOpen}>{compareOpen && table}</div>
        </>
      )}

      <div className="planner-explorer" ref={explorerRef} data-planner-anchor>
        {collapsed('conceptDetail') ? (
          candidates.map((candidate) => (
            <details
              className="planner-disclosure"
              key={candidate.key}
              data-concept={candidate.key}
              open={expanded.includes(candidate.key)}
              onToggle={(event) => {
                const open = event.currentTarget.open;
                setExpanded((current) => (open
                  ? (current.includes(candidate.key) ? current : [...current, candidate.key])
                  : current.filter((key) => key !== candidate.key)));
              }}
            >
              <summary>{candidate.title}</summary>
              <GrainConceptDetail candidate={candidate} />
            </details>
          ))
        ) : (
          <PlannerTabs
            idBase="grain-concept"
            label="Концепції для порівняння"
            tabs={candidates.map((candidate) => ({ id: candidate.key, label: candidate.title }))}
            active={active}
            onChange={(id) => setSelected(id as CandidateKey)}
          >
            {(id) => {
              const candidate = candidates.find((item) => item.key === id);
              return candidate ? <GrainConceptDetail candidate={candidate} /> : null;
            }}
          </PlannerTabs>
        )}
      </div>
    </div>
  );
}
