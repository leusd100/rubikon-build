# Rubikon Build — Working Principles

Recorded 30.08.2026 as a handoff/process note. Not tied to any single module — applies to the whole
project going forward.

## Current priority

Finish and stabilize the Rubikon Build website **v1.0** by resolving the already-agreed P0/P1/P2
roadmap (`docs/github-baseline-plan.md`, `rubikon-lead-architecture-spec`,
`docs/step-01-deployment-runbook.md`). **No new feature scope starts before that foundation is
complete and stable** — this includes Project Radar, Partner Network, and everything else in
`docs/automation-roadmap.md`.

## Evaluating any future feature

```
idea → business value → discussion → architecture → critical review → decision
     → small MVP → real validation → scale / change / drop
```

A feature is not built just because it's technically possible. Each one must solve a real, named
business problem, and gets validated in small, reversible steps — not built out fully on a hunch.

## Roles

- **Dmytro** — business/practical perspective; final call on whether a problem is worth solving and
  whether validation results justify continuing.
- **ChatGPT** — helps structure product/architecture decisions.
- **Claude** — critical technical review and implementation.

Final decisions combine all three perspectives — no single participant's read overrides the other two
on its own.

## Future infrastructure consideration: local/staging workflow (not decided, not started)

Recorded 30.08.2026. **After** v1.0 stabilization (see "Current priority" above), Rubikon Build is
considering a more professional local/staging workflow. The real problem to solve: **reproducible
testing of the app/backend before production deployment** — not "use Docker because Docker is cool."

Candidate direction, none of it implemented or decided:

- A local, reproducible environment.
- A Cloudflare-compatible local runtime via Wrangler/workerd/Miniflare.
- A local, isolated D1 instance for migrations and API testing.
- Docker as a possible wrapper for Node/pnpm/Wrangler — **only if it provides real value**, not by
  default.
- Later, a separate Cloudflare staging environment with its own staging D1 and test secrets.
- Only after staging smoke-tests pass should a change reach production.

**Docker is a candidate, not a decision.** Before adopting it, compare two options against the same
problem: (1) plain Node/pnpm + Wrangler/Cloudflare Vite local development, vs. (2) Docker +
Node/pnpm + Wrangler. Prefer the simpler option if both solve the problem equally well.

Nothing here is implemented, and this does not alter the current frozen v1.0 roadmap.
