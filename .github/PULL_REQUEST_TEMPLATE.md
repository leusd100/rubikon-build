## Scope

<!-- One or two sentences: what does this PR change, and why? Link the roadmap item if there is one. -->

## Screenshots

<!-- Required if this PR changes anything visual. Before/after, both light situations the site
     actually renders in (no dark-mode toggle exists on this site — just before/after is enough). -->

- [ ] Not applicable — no UI change in this PR
- [ ] Screenshots attached

## Checked on

- [ ] Mobile (375px or 390px width)
- [ ] Desktop / laptop viewport
- [ ] Not applicable — no layout-affecting change

## Quality gates

- [ ] `pnpm lint` passes
- [ ] `pnpm build` succeeds locally
- [ ] Typecheck — *(no `typecheck` script exists yet; run `pnpm exec tsc --noEmit` manually until one is added)*

## Accessibility

- [ ] No new interactive element without a visible focus state or accessible name
- [ ] Not applicable

## SEO impact

- [ ] Metadata (title/description/canonical), sitemap, or robots.ts touched — describe below
- [ ] No SEO-relevant change

<!-- If touched: what changed, and why it's still correct for the pages involved. -->

## Form / analytics impact

- [ ] Changes `ProjectInquiryForm`, `InquirySection`, or `/api/leads` — describe the behavior change below
- [ ] Changes a GA4 event name or firing condition — describe below
- [ ] No form or analytics impact

## Secrets

- [ ] Confirmed no token, key, database ID, or credential is committed in this diff (see repo's
      secret-hygiene conventions — bindings are referenced by name only, values live in Cloudflare)

## Rollback notes

<!-- If this ships something risky (schema change, new endpoint, nav change): what's the fastest
     safe way to revert if it misbehaves in production? -->
