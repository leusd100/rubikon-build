/** Spaces, brackets, dashes, dots and pluses: what a typed or pasted number is written with besides its digits */
const WRITTEN_NUMBER = /^[\d\s()+.-]+$/;
/**
 * The digits of a Ukrainian number, its 9 national ones last: «380…» (the canonical form), «3800…» (the usual «0XX…»
 * typed after the field's «+380»), «380380…» (a full number pasted after it) or «0…» (the national form, the prefix
 * cleared). A national number never starts with 0 — that 0 is the trunk prefix.
 */
const UA_DIGITS = /^(?:380(?:0|380)?|0)([1-9]\d{8})$/;

/**
 * The inquiry's phone as the field and the lead API take it, +380 and 9 digits (`\+380[0-9]{9}`), when what the visitor
 * typed or pasted unambiguously is a Ukrainian number; anything else is returned as it is, for the field's own check to
 * name. The field starts with «+380»: the number's usual «0XX…» typed after it read «+3800XX…», the field's 13
 * characters cut its last digit, and a wrong number passed as valid (review 18.10, PDO-01).
 */
export function normalizeUaPhone(value: string): string {
  const written = value.trim();
  if (!WRITTEN_NUMBER.test(written)) return value;
  const national = UA_DIGITS.exec(written.replace(/\D/g, ''))?.[1];
  return national ? `+380${national}` : value;
}
