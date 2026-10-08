import type { InquiryAttachment } from '../../lib/inquiry/attachment';

// How the one inquiry form treats what a page's configurator or planner attached: whether that brief already went out
// with a saved lead, and what becomes of the visitor's own «Орієнтовні розміри» while a brief is attached.

/**
 * What identifies a brief as sent: its kind, version and the lead text it carries. A saved lead leaves this key with the
 * page (InquiryAttachmentProvider), and the attached brief counts as sent while it still has it. A change in the
 * configurator changes the text, so the changed brief is a new one and goes with the next submit (04.10).
 */
export function sentAttachmentKey(attachment: InquiryAttachment): string {
  return `${attachment.kind}@${attachment.version}\n${attachment.text}`;
}

export function isSentAttachment(attachment: InquiryAttachment | null, sentKey: string | null): boolean {
  return attachment !== null && sentKey !== null && sentAttachmentKey(attachment) === sentKey;
}

/** The sent briefs, in this browser only (08.10): no name, no phone — the brief's own text — the last 10, for 30 days */
const SENT_STORAGE_KEY = 'rubikon-inquiry-sent';
const SENT_DAYS = 30;
const SENT_KEEP = 10;

export function readSentKeys(): string[] {
  try {
    const stored = JSON.parse(window.localStorage.getItem(SENT_STORAGE_KEY) ?? 'null') as { at: number; keys: unknown } | null;
    if (!stored || typeof stored.at !== 'number' || !Array.isArray(stored.keys)) return [];
    if (Date.now() - stored.at > SENT_DAYS * 24 * 3600 * 1000) return [];
    return stored.keys.filter((key): key is string => typeof key === 'string').slice(-SENT_KEEP);
  } catch {
    return [];
  }
}

export function saveSentKeys(keys: string[]) {
  try {
    window.localStorage.setItem(SENT_STORAGE_KEY, JSON.stringify({ at: Date.now(), keys: keys.slice(-SENT_KEEP) }));
  } catch {
    // storage off: the sent state lasts this visit only
  }
}

export type DimensionsFieldView = {
  /** The visitor's own «Орієнтовні розміри» field is on the form */
  input: boolean;
  /** …and carries the lead's «Габарити» (otherwise `fixedValue` does) */
  inputNamed: boolean;
  /** The brief's sizes, submitted from a hidden field: a brief with sizes of its own, not yet sent, nothing typed */
  fixedValue: string | null;
  /** Under the visitor's field while such a brief is attached: the two sizes side by side, neither one replaced */
  note: string | null;
};

/**
 * «Орієнтовні розміри» while something is attached (sweep 03.10). A brief with sizes of its own used to remove the
 * field and send its sizes instead: what the visitor had typed there was replaced without a word and was gone after
 * «Не додавати». Now the field stays once the visitor has typed in it (`typedOnce`, so it never disappears under their
 * hands), keeps their words, and the brief's sizes stand beside it; the brief's sizes fill the lead's «Габарити» only
 * while the field is empty. A sent brief does not send its sizes again.
 */
export function dimensionsFieldView(
  field: InquiryAttachment['dimensionsField'] | null,
  typed: string,
  typedOnce: boolean,
  sent: boolean,
): DimensionsFieldView {
  const mode = field?.mode ?? 'manual';
  if (mode === 'manual') return { input: true, inputNamed: true, fixedValue: null, note: null };
  if (sent || field?.mode !== 'fixed') {
    // A sent brief's sizes went out with it: the field is the visitor's again. «omit» (the grain brief) has no sizes.
    const input = typedOnce || (sent && mode === 'fixed');
    return { input, inputNamed: input, fixedValue: null, note: null };
  }
  const fixedValue = typed.trim() === '' ? field.value : null;
  return {
    input: typedOnce,
    inputNamed: typedOnce && fixedValue === null,
    fixedValue,
    note: typedOnce ? `У конфігурації, доданій до заявки: ${field.value}.` : null,
  };
}
