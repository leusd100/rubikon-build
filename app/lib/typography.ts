// Text rules for the texts set as prose: hints, legends, the frame's step and node texts (10.10, audit F103), and since
// W3-02 (25.10, PDO-44 п. 2, OD-PX-15 b) every H1–H3 and lead at the place it is rendered.

/** The words a line must not end on: one letter, and «та» (set a — leads and the long texts) */
const SHORT_WORDS = new Set(['і', 'й', 'у', 'в', 'з', 'а', 'о', 'та']);

/** A heading's line must not end on the short prepositions, conjunctions and particles either (set b): in a 28–84 px
 *  title «до / зрозумілого», «Зерно в / наявній» or «для / бізнесу» reads as a slip of the layout */
const HEADING_WORDS = new Set([...SHORT_WORDS, 'до', 'на', 'за', 'по', 'від', 'під', 'не', 'що', 'як', 'із', 'зі', 'для']);

const NBSP = '\u00A0';

const glue = (text: string, words: ReadonlySet<string>): string => {
  const parts = text.split(' ');
  return parts.reduce((line, word, index) => {
    if (index === 0) return word;
    const before = parts[index - 1].split(NBSP).at(-1) ?? '';
    const bare = before.replace(/^[«„"(]+/, '').toLowerCase();
    return `${line}${words.has(bare) ? NBSP : ' '}${word}`;
  }, '');
};

/**
 * Glues a short word — «і», «й», «у», «в», «з», «а», «о», «та» — to the word after it with a no-break space, so it is
 * never left at a line's end with its word on the next line («навантажень і / умов»). For leads and long texts: a button
 * or a tile has its own breaks, and gluing there only makes a wider word. Split on plain spaces, so a word already glued
 * (a number to its unit) is one piece and keeps its U+00A0; an opening quote or bracket before the word counts with it.
 * A short word at the very end («… до ») takes its no-break space too: the words after it are in the next element.
 */
export function keepShortWords(text: string): string {
  return glue(text, SHORT_WORDS);
}

/**
 * The heading variant: as keepShortWords, plus «до», «на», «за», «по», «від», «під», «не», «що», «як», «із», «зі», «для».
 * For the visible text of an H1–H3 only — never a <title>, a meta or Open Graph text, JSON-LD or an aria-label, which
 * keep their plain spaces. Where an inline element splits the heading after a short word («до <em>…</em>»), a no-break
 * space is not enough in every engine: that pair is a nowrap span in its component (HOME and /yak-pratsyuiemo H1).
 */
export function keepHeadingWords(text: string): string {
  return glue(text, HEADING_WORDS);
}
