// Text rules for the long texts set as prose: hints, legends, the frame's step and node texts (10.10, audit F103).

/** The words a line must not end on: one letter, and «та» */
const SHORT_WORDS = new Set(['і', 'й', 'у', 'в', 'з', 'а', 'о', 'та']);

/**
 * Glues a short word — «і», «й», «у», «в», «з», «а», «о», «та» — to the word after it with a no-break space, so it is
 * never left at a line's end with its word on the next line («навантажень і / умов»). For long texts only: a button or
 * a tile has its own breaks, and gluing there only makes a wider word. Split on plain spaces, so a word already glued
 * (a number to its unit) is one piece and keeps its U+00A0; an opening quote or bracket before the word counts with it.
 */
export function keepShortWords(text: string): string {
  const words = text.split(' ');
  return words.reduce((line, word, index) => {
    if (index === 0) return word;
    const before = words[index - 1].split(' ').at(-1) ?? '';
    const bare = before.replace(/^[«„"(]+/, '').toLowerCase();
    return `${line}${SHORT_WORDS.has(bare) ? ' ' : ' '}${word}`;
  }, '');
}
