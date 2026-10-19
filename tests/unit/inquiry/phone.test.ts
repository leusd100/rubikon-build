import { describe, expect, it } from 'vitest';
import { normalizeUaPhone } from '../../../app/lib/inquiry/phone';

// The inquiry's phone field starts with «+380» and takes +380 and 9 digits. A visitor in Ukraine types the number the
// way it is written, «067…», after that prefix, or pastes it with spaces: those unambiguous ways become +380XXXXXXXXX
// before the field is checked (review 18.10, PDO-01: «0671234567» after the prefix was sent as «+380067123456»).
// Anything else comes back as typed, for the field's own check to name.

describe('normalizeUaPhone', () => {
  it.each([
    ['+380671234567', 'the canonical form'],
    ['+3800671234567', '«0XX…» typed after the «+380» prefix'],
    ['0671234567', 'the national form, the prefix cleared'],
    ['+38 067 123 45 67', 'pasted with spaces'],
    ['+38 (067) 123-45-67', 'pasted with brackets and dashes'],
    ['380671234567', 'the country code without its plus'],
    ['+380+380671234567', 'a full number pasted after the prefix'],
    ['+380 67 123 45 67', 'spaces after the prefix'],
    [' +380671234567 ', 'surrounding spaces'],
  ])('%s (%s) → +380671234567', (input) => {
    expect(normalizeUaPhone(input)).toBe('+380671234567');
  });

  it.each([
    ['+380', 'the prefix alone: the field is empty, not mistyped'],
    ['', 'nothing'],
    ['+38067', 'too short'],
    ['+3806712345678', 'one digit too many'],
    ['+380067123456', 'a 0 and only 8 digits after +380: a digit is missing, nothing to restore'],
    ['+3800067123456', 'two zeros'],
    ['+380abc671234567', 'letters are not separators'],
    ['+48 512 345 678', 'not a Ukrainian number'],
  ])('%s (%s) stays as typed', (input) => {
    expect(normalizeUaPhone(input)).toBe(input);
  });
});
