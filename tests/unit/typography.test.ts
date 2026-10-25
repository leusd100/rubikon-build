import { describe, expect, it } from 'vitest';
import { keepHeadingWords, keepShortWords } from '../../app/lib/typography';

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

// W3-02 (25.10, PDO-44 п. 2, OD-PX-15 b): a heading's line never ends on a short preposition, conjunction or particle
// either; the leads keep set (a)
describe('keepHeadingWords', () => {
  it('glues the heading set (b): set (a) and «до», «на», «за», «по», «від», «під», «не», «що», «як», «із», «зі», «для»', () => {
    expect(keepHeadingWords('Зерно в наявній будівлі')).toBe(nb('Зерно в_наявній будівлі'));
    expect(keepHeadingWords('Від огляду основи до перевірки герметичності')).toBe(nb('Від_огляду основи до_перевірки герметичності'));
    expect(keepHeadingWords('П’ять напрямів для бізнесу й агросектору')).toBe(nb('П’ять напрямів для_бізнесу й_агросектору'));
    expect(keepHeadingWords('Вартість визначає склад комплексу, а не одна цифра за тонну'))
      .toBe(nb('Вартість визначає склад комплексу, а_не_одна цифра за_тонну'));
    expect(keepHeadingWords('Розкажіть, що потрібно побудувати')).toBe(nb('Розкажіть, що_потрібно побудувати'));
    for (const word of ['на', 'по', 'під', 'як', 'із', 'зі']) expect(keepHeadingWords(`слово ${word} слово`)).toBe(nb(`слово ${word}_слово`));
  });

  it('leaves the lead set alone: keepShortWords does not glue the prepositions of set (b)', () => {
    expect(keepShortWords('Від огляду основи до перевірки')).toBe('Від огляду основи до перевірки');
    expect(keepShortWords('для бізнесу й агросектору')).toBe(nb('для бізнесу й_агросектору'));
  });

  it('glues a short word that ends the text (the words after it are in the next element) and keeps glued numbers', () => {
    expect(keepHeadingWords('Від задачі — до ')).toBe(nb('Від_задачі — до_'));
    expect(keepHeadingWords(nb('ангар 24_м на ділянці'))).toBe(nb('ангар 24_м на_ділянці'));
  });

  it('changes nothing but spaces, and nothing in a title without a short word', () => {
    const title = 'Що потрібно для попередньої оцінки покрівлі?';
    expect(keepHeadingWords(title).replaceAll('\u00A0', ' ')).toBe(title);
    expect(keepHeadingWords('Металоконструкції')).toBe('Металоконструкції');
    expect(keepHeadingWords('Каркаси будівель')).toBe('Каркаси будівель');
  });
});
