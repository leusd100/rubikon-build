/**
 * The shared inquiry-attachment contract: what a page's configurator or planner hands to the one
 * inquiry form, and what /api/leads accepts back. Kind-agnostic on purpose — hangar and grain
 * specifics live with their own domains (app/lib/configurator, app/lib/planner/grain), and the
 * route wires the per-kind data validators in.
 */

export const INQUIRY_ATTACHMENT_KINDS = ['hangar-configuration', 'grain-brief'] as const;
export type InquiryAttachmentKind = (typeof INQUIRY_ATTACHMENT_KINDS)[number];

/** Characters of an attachment's text the lead stores (details.configuration). */
export const INQUIRY_ATTACHMENT_TEXT_LIMIT = 1600;
/** Characters of JSON.stringify(data) the lead stores. Larger data is dropped — never the lead. */
export const INQUIRY_ATTACHMENT_DATA_LIMIT = 6000;

export const INQUIRY_ATTACHMENT_LABELS: Record<InquiryAttachmentKind, { form: string; telegram: string; edit: string; review: string }> = {
  'hangar-configuration': {
    form: 'До заявки додано вашу конфігурацію',
    telegram: 'Конфігурація ангара',
    edit: 'Змінити у конфігураторі ↑',
    review: 'Переглянути параметри',
  },
  'grain-brief': {
    form: 'До заявки додано ваш опис задачі',
    telegram: 'Опис задачі — зерносховище',
    edit: 'Змінити в планувальнику ↑',
    review: 'Переглянути опис',
  },
};

/** The Telegram label for an attachment whose kind this server does not know. */
export const GENERIC_ATTACHMENT_TELEGRAM_LABEL = 'Додані параметри';

export type InquiryAttachmentRow = { label: string; value: string };
export type InquiryAttachmentSection = { id: string; heading: string; rows: InquiryAttachmentRow[] };
/** Structured data travelling next to the text. Self-describing: it names its own schema and version. */
export type InquiryAttachmentData = { schema: string; version: number };

export type InquiryAttachment = {
  kind: InquiryAttachmentKind;
  version: string;
  title: string;
  headline: string;
  /** The rows the form shows; every row is also a «label: value» line of `text`. */
  sections: InquiryAttachmentSection[];
  /** What the lead stores and Telegram shows, at most INQUIRY_ATTACHMENT_TEXT_LIMIT characters. */
  text: string;
  editHref: '#configurator' | '#planner';
  /** How the form's «Орієнтовні розміри» field behaves while this is attached. */
  dimensionsField: { mode: 'manual' } | { mode: 'fixed'; value: string } | { mode: 'omit' };
  data?: InquiryAttachmentData;
};

export type AttachmentStatus =
  | { status: 'untouched'; reason: null }
  | { status: 'attached'; reason: 'business-edit' | 'explicit-action' | 'result-reveal' }
  | { status: 'detached'; reason: 'explicit-detach' };

export type AttachmentEvent =
  | { type: 'business-edit' }
  | { type: 'explicit-attach' }
  | { type: 'explicit-detach' }
  | { type: 'presentation-only' }
  | { type: 'result-reveal' }
  | { type: 'reset' };

export const INITIAL_ATTACHMENT_STATUS: AttachmentStatus = { status: 'untouched', reason: null };

/**
 * One state machine for every source. The four hangar events keep the configurator's contract:
 * a business edit attaches (also after «Не додавати» — a later change is fresh intent), presentation
 * never changes anything. A planner's first result reveal attaches only what is still untouched —
 * it never overrides «Не додавати» — and «Почати спочатку» returns to untouched.
 */
export function transitionAttachment(current: AttachmentStatus, event: AttachmentEvent): AttachmentStatus {
  switch (event.type) {
    case 'business-edit':
      return { status: 'attached', reason: 'business-edit' };
    case 'explicit-attach':
      return { status: 'attached', reason: 'explicit-action' };
    case 'explicit-detach':
      return { status: 'detached', reason: 'explicit-detach' };
    case 'presentation-only':
      return current;
    case 'result-reveal':
      return current.status === 'untouched' ? { status: 'attached', reason: 'result-reveal' } : current;
    case 'reset':
      return INITIAL_ATTACHMENT_STATUS;
  }
}

export function isInquiryAttachmentKind(value: unknown): value is InquiryAttachmentKind {
  return typeof value === 'string' && (INQUIRY_ATTACHMENT_KINDS as readonly string[]).includes(value);
}

/** What the form sends as details.attachment, next to details.configuration = attachment.text. */
export type InquiryAttachmentPayload = { kind: InquiryAttachmentKind; version: string; data?: InquiryAttachmentData };

export function toInquiryAttachmentPayload(attachment: InquiryAttachment): InquiryAttachmentPayload {
  return {
    kind: attachment.kind,
    version: attachment.version,
    ...(attachment.data ? { data: attachment.data } : {}),
  };
}

export type AttachmentDataDropReason = 'too-large' | 'invalid' | 'unknown-kind';

export type ParsedLeadAttachment = {
  /** null: the kind is not one this server knows — its metadata is dropped, the text is kept. */
  kind: InquiryAttachmentKind | null;
  version: string;
  data?: unknown;
  dataDropped?: AttachmentDataDropReason;
  telegramLabel: string;
};

export type InquiryAttachmentDataValidators = Partial<Record<InquiryAttachmentKind, (data: unknown) => boolean>>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** No kind means a client from before this contract (/angary): a hangar configuration. */
function resolveLeadAttachmentKind(kind: unknown): InquiryAttachmentKind | null {
  if (kind === undefined || kind === null || kind === '') return 'hangar-configuration';
  return isInquiryAttachmentKind(kind) ? kind : null;
}

/**
 * Reads details.attachment of a lead. Nothing here can reject a lead: an unknown kind loses its
 * metadata but keeps the text under a generic label; data that is too large, invalid or of a kind
 * without a validator is dropped with the reason recorded. A payload with text but no kind is a
 * client from before this contract (/angary) and is read as a hangar configuration.
 *
 * Returns null when there is nothing attached: no text.
 */
export function parseLeadAttachment(
  raw: unknown,
  configuration: string,
  validators: InquiryAttachmentDataValidators,
): ParsedLeadAttachment | null {
  if (!configuration) return null;
  const meta = isRecord(raw) ? raw : {};
  const kind = resolveLeadAttachmentKind(meta.kind);
  const hasData = meta.data !== undefined && meta.data !== null;

  if (!kind) {
    return { kind: null, version: '', telegramLabel: GENERIC_ATTACHMENT_TELEGRAM_LABEL, ...(hasData ? { dataDropped: 'unknown-kind' as const } : {}) };
  }

  const parsed: ParsedLeadAttachment = {
    kind,
    version: typeof meta.version === 'string' ? meta.version.trim().slice(0, 60) : '',
    telegramLabel: INQUIRY_ATTACHMENT_LABELS[kind].telegram,
  };
  if (!hasData) return parsed;

  const validate = validators[kind];
  let serializedLength: number;
  try {
    serializedLength = JSON.stringify(meta.data).length;
  } catch {
    return { ...parsed, dataDropped: 'invalid' };
  }
  if (serializedLength > INQUIRY_ATTACHMENT_DATA_LIMIT) return { ...parsed, dataDropped: 'too-large' };
  if (!validate?.(meta.data)) return { ...parsed, dataDropped: 'invalid' };
  return { ...parsed, data: meta.data };
}
