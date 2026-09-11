# Lead `details` JSON format

`leads.details` is a TEXT column holding one JSON object per lead. The comment in
`migrations/0001_create_leads.sql` lists only the five original keys; an applied migration is not
edited, so this file is the current format. New keys never needed a migration and never will while
they stay inside this object.

| Key | Since | Content |
| --- | --- | --- |
| `location`, `dimensions`, `cooperation`, `startDate` | initial | Trimmed strings, at most 100 characters each. `dimensions` is `''` when the attachment omits the field (grain brief). |
| `comment` | initial | Trimmed string, at most 800 characters. |
| `configuration` | configurator handoff | The attachment's text, at most 1 600 characters (`INQUIRY_ATTACHMENT_TEXT_LIMIT`); `''` when nothing is attached. Same key and same text as before the shared contract. |
| `attachmentKind` | shared inquiry attachment | `'hangar-configuration'` or `'grain-brief'`. Text without a kind is a client from before the contract and is stored as `'hangar-configuration'`. An unknown kind is not stored. |
| `attachmentVersion` | shared inquiry attachment | The source's version, at most 60 characters — `hangar-configurator@1.0.0`, `grain-planner@1.0.0`. Absent for legacy payloads. |
| `attachmentData` | shared inquiry attachment | Structured data, kept only when its kind's validator accepts it and `JSON.stringify` is at most 6 000 characters (`INQUIRY_ATTACHMENT_DATA_LIMIT`). Grain: `GrainPlannerStateV1` (`validateGrainPlannerState`). The hangar configuration carries no data. |
| `attachmentDataDropped` | shared inquiry attachment | Why sent data was not kept: `'too-large'`, `'invalid'`, or `'unknown-kind'`. |

A lead without an attachment stores exactly the six original keys, in their original order.

## Rules

- **The lead is worth more than its attachment.** Nothing in `details.attachment` can turn a request
  into a 400: unknown kinds, invalid or oversized data are dropped (and recorded), never the lead.
  See `parseLeadAttachment` in `app/lib/inquiry/attachment.ts`.
- **Telegram** gets `«{INQUIRY_ATTACHMENT_LABELS[kind].telegram}:\n{configuration}»` — «Конфігурація
  ангара» for the hangar (byte-for-byte as before), «Опис задачі — зерносховище» for the grain brief,
  «Додані параметри» for an unknown kind. Structured data is stored, never sent to Telegram.
- **Deploy order does not matter.** A new client against the old API sends an extra key the old API
  ignores; an old client against the new API is read as a legacy hangar configuration.
