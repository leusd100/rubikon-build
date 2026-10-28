/**
 * parseCapacity's range pattern, rewritten without quadratic backtracking (27.10, Sonar S8786). Each expected value
 * below is what the prototype's pattern gave for that input on main 9079f47, so the rewrite is held to its answers;
 * the two were also compared on 4.2 million strings (every one up to 6 characters over digits, nine kinds of space,
 * the dashes, a letter and a comma, and random ones up to 400) with no difference.
 */
import { describe, expect, it } from 'vitest';
import { parseCapacity, type CapacityInfo } from '../../../../app/lib/planner/grain';

const known = (value: number): CapacityInfo => ({ kind: 'known', min: value, max: value });
const range = (min: number, max: number): CapacityInfo => ({ kind: 'range', min, max });
const invalid: CapacityInfo = { kind: 'invalid' };

describe('parseCapacity gives the prototype pattern\'s answers', () => {
  it.each<[string, CapacityInfo]>([
    ['8 000–10 000', range(8000, 10000)],
    [' 8000 - 10000 ', range(8000, 10000)],
    ['8000—10000', range(8000, 10000)],
    ['1-2', range(1, 2)],
    ['1 000 – 2 000', range(1000, 2000)],
    ['1\u00a0000—2\u00a0000', range(1000, 2000)],
    ['\t7\t-\t9\t', range(7, 9)],
    ['1 2 3-4 5 6', range(123, 456)],
    ['1 000\u202f000', known(1000000)],
    ['5–5', invalid],
    ['0-5', invalid],
    ['10 000–8 000', invalid],
    ['1--2', invalid],
    ['1 - 2 - 3', invalid],
    ['–5', invalid],
    ['5–', invalid],
    ['1-x', invalid],
    ['99999999999999999999-1', invalid],
    ['9007199254740993-9007199254740994', invalid],
  ])('%j', (value, expected) => {
    expect(parseCapacity(value)).toEqual(expected);
  });

  it('reads a long run of spaces in linear time: four values of 20 000+ characters well under a second', () => {
    // the prototype's pattern spent 0.7–1.8 s on each of the first three in Node (main 9079f47); this one ~1 ms
    const spaces = ' '.repeat(20_000);
    const values: [string, CapacityInfo][] = [
      [`1${spaces}x`, invalid],
      [`1${'\u00a0'.repeat(20_000)}x`, invalid],
      [`1${spaces}- x`, invalid],
      [`1${spaces}- 2`, range(1, 2)],
    ];
    const start = performance.now();
    for (const [value, expected] of values) expect(parseCapacity(value)).toEqual(expected);
    expect(performance.now() - start).toBeLessThan(1_000);
  });
});
