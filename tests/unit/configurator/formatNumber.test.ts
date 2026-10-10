import { afterEach, describe, expect, it, vi } from 'vitest';

// The configurator's numbers (10.10, audit F80): one formatter per precision, made once, printing exactly what
// `toLocaleString('uk-UA', …)` printed at each of the seven places that used to build a formatter per call

const load = async () => {
  vi.resetModules();
  return import('../../../app/lib/configurator/formatNumber');
};

describe('formatNumber', () => {
  const OriginalNumberFormat = Intl.NumberFormat;
  afterEach(() => {
    Intl.NumberFormat = OriginalNumberFormat;
  });

  it('prints what toLocaleString printed, for every precision the configurator uses', async () => {
    const { formatNumber } = await load();
    const values = [0, 1, 2.1, 4, 7.5, 8.25, 10.56, 10.6, 12.04, 24, 50, 60, 120, 1440, 1440.5, 3600, 12_345.678, -3.25, 0.05];
    for (const value of values) {
      expect(formatNumber(value)).toBe(value.toLocaleString('uk-UA', { maximumFractionDigits: 1 }));
      expect(formatNumber(value, 1)).toBe(value.toLocaleString('uk-UA', { maximumFractionDigits: 1 }));
      expect(formatNumber(value, 2)).toBe(value.toLocaleString('uk-UA', { maximumFractionDigits: 2 }));
      // the area: toLocaleString with no options at all
      expect(formatNumber(value, 3)).toBe(value.toLocaleString('uk-UA'));
    }
  });

  it('writes the decimal comma and parts thousands with a non-breaking space', async () => {
    const { formatNumber } = await load();
    expect(formatNumber(7.5)).toBe('7,5');
    expect(formatNumber(10.56)).toBe('10,6');
    expect(formatNumber(10.56, 2)).toBe('10,56');
    expect(formatNumber(24)).toBe('24');
    expect(formatNumber(1440, 3)).toBe('1\u00A0440');
    expect(formatNumber(12_345.678, 3)).toBe('12\u00A0345,678');
  });

  it('makes one formatter per precision, however many numbers it prints', async () => {
    let constructed = 0;
    // counts the formatters made, and makes them
    class CountedNumberFormat extends OriginalNumberFormat {
      constructor(...args: ConstructorParameters<typeof Intl.NumberFormat>) {
        super(...args);
        constructed += 1;
      }
    }
    Intl.NumberFormat = CountedNumberFormat as typeof Intl.NumberFormat;
    const { formatNumber } = await load();
    for (let step = 0; step < 200; step += 1) {
      formatNumber(10 + step / 10);
      formatNumber(10 + step / 10, 2);
      formatNumber(240 * step, 3);
    }
    expect(constructed).toBe(3);
  });
});
