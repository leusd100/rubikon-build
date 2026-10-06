/**
 * Build-time release switches. Pages are statically rendered and Worker bindings live in the
 * Cloudflare dashboard, so a flag is a constant and flipping one is a one-line PR.
 *
 * `grainPlannerOnZernoskhovyshcha` turns /zernoskhovyshcha into the new grain composition — the Grain
 * Planner since Phase 5, the complex on a drawing since 06.10 (the flag kept its name). Setting it back
 * to false restores the previous page, whose content and route branch stay in the code until the cleanup
 * PR. /planner-preview renders the planner composition regardless of this flag.
 */
export const releaseFlags = {
  grainPlannerOnZernoskhovyshcha: true,
} as const;

/** Testable route decision: the rollback branch must remain real for either flag value. */
export function grainPlannerRouteMode(enabled: boolean): 'planner' | 'legacy' {
  return enabled ? 'planner' : 'legacy';
}
