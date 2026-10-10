import { describe, expect, it } from 'vitest';
import { keepShortWords } from '../../app/lib/typography';

/** «_» marks a no-break space (U+00A0) */
const nb = (text: string) => text.replaceAll('_', ' ');

// 10.10, audit F103: a one-letter word (or «та») is never left at a line's end in the configurator's long texts
describe('keepShortWords', () => {
  it('glues a short word to the word after it', () => {
    expect(keepShortWords('після розрахунку навантажень і умов майданчика')).toBe(nb('після розрахунку навантажень і_умов майданчика'));
    expect(keepShortWords('стіни та покрівля, а не паркан')).toBe(nb('стіни та_покрівля, а_не паркан'));
  });

  it('glues a chain of short words, and a capital one', () => {
    // an axis letter reads as the word it spells: «В» stays with what follows too
    expect(keepShortWords('колон А і В у прикладі')).toBe(nb('колон А_і_В_у_прикладі'));
    expect(keepShortWords('Вітер тисне. У торцевій стіні')).toBe(nb('Вітер тисне. У_торцевій стіні'));
  });

  it('keeps no-break spaces already there and reads a word glued to one', () => {
    expect(keepShortWords(nb('ширина 24_м і довжина'))).toBe(nb('ширина 24_м і_довжина'));
    expect(keepShortWords(nb('ворота_й двері'))).toBe(nb('ворота_й_двері'));
  });

  it('counts an opening quote or bracket with its word, and leaves longer words alone', () => {
    expect(keepShortWords('оберіть «а» чи (в тому числі) інше')).toBe(nb('оберіть «а» чи (в_тому числі) інше'));
    expect(keepShortWords('Це попередня схема')).toBe('Це попередня схема');
  });

  it('changes nothing else', () => {
    const text = 'Розміри, стіни, ворота й каркас видно на кресленні.';
    expect(keepShortWords(text).replaceAll(' ', ' ')).toBe(text);
  });
});
