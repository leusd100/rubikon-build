# RUBIKON role icons

Eight semantic roles, one symbol each, drawn in `app/components/RoleIcon.tsx`. When a role has an
icon on one page, every page that shows that role uses the same symbol — `/yak-pratsyuiemo` first,
the competency and product pages later. A symbol is never reused for a different role; a new role
gets a new symbol only by decision.

| Role (`role`) | Symbol | Meaning | On `/yak-pratsyuiemo` |
|---|---|---|---|
| `rubikon` | I-beam in section | RUBIKON, what it does | Stage details: «RUBIKON» |
| `client` | Arrow entering a bracket | The client, inputs | Stage details: «Замовник» |
| `partner` | Two plates bolted together | Partners, interfaces between packages | Stage details: «Учасники» |
| `result` | Level mark | The result a step reaches | Each stage: «Результат» |
| `documents` | Sheet with a title block | Documents | Stage details: «Документи» |
| `scope` | Dimension line with ticks | Responsibility, the limits of a scope | «Відповідальність» section eyebrow |
| `schedule` | Schedule bars on axes | Budget and time | «Бюджет і строки» section eyebrow |
| `why` | Plumb bob | Why it matters | Stage details: «Чому це важливо» |

## Rules

- An icon always sits beside its text label and never replaces it. It is `aria-hidden` and
  `focusable="false"`; the label carries the meaning.
- A thin line drawing: 24 px grid, stroke 1.5 (about 1 px at 16 px), square caps, sharp corners,
  no fill.
- No colour of its own: `currentColor`, set to a quieter tone than the label beside it. Not the
  accent.
- 16 px beside a label. Not on every list item or factor, not in stage titles (the number is a
  stage's identity), the FAQ, the page contents or the hero.
- No new decorative use without a decision.

## Not yet

The competency and product pages, and the content icons that still come from `lucide-react`
(`/pro-nas`, `DirectionCards`, `ProcessCards`), move to these symbols later, and only where the
role is the same. `lucide-react` stays for interface marks such as phone, mail and chevrons.
