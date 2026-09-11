/**
 * Build-time release switches. Pages are statically rendered and Worker bindings live in the
 * Cloudflare dashboard, so a flag is a constant and flipping one is a one-line PR.
 *
 * `grainPlannerOnZernoskhovyshcha` stays false until Phase 4 wires the new composition into
 * /zernoskhovyshcha. /planner-preview renders that composition regardless of this flag.
 */
export const releaseFlags = {
  grainPlannerOnZernoskhovyshcha: false,
} as const;
