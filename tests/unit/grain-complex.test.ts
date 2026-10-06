import { describe, expect, it } from 'vitest';
import {
  GRAIN_COMPLEX_DEFAULT,
  GRAIN_CROP_OPTIONS,
  GRAIN_SCALE_OPTIONS,
  grainComplexModel,
  grainModuleInfo,
  grainModulePress,
  type GrainComplexState,
  type GrainCrop,
  type GrainModuleKey,
  type GrainScale,
  type GrainStorage,
} from '../../app/lib/grainComplex';

// «Зберіть свій комплекс на кресленні» (/zernoskhovyshcha): the model behind the drawing, its title block, the «Будує
// RUBIKON» lists, the drawing's pointer tips and the line the inquiry form starts with.

const CROPS = GRAIN_CROP_OPTIONS.map((option) => option.value);
const STORAGES: GrainStorage[] = ['silos', 'floor', 'unknown'];
const SCALES: GrainScale[] = [0, 1, 2, 3];
const MODULES: GrainModuleKey[] = ['receiving', 'cleaning', 'drying', 'feed', 'storage', 'shipping'];

/** Every state the chips can make: each subset of crops (in option order) × preparation × storage × scale */
function everyState(): GrainComplexState[] {
  const subsets = Array.from({ length: 2 ** CROPS.length }, (_, mask) => CROPS.filter((_, index) => mask & (1 << index)));
  return subsets.flatMap((crops) =>
    [false, true].flatMap((cleaning) =>
      [false, true].flatMap((drying) =>
        STORAGES.flatMap((storage) => SCALES.map((scale) => ({ crops, cleaning, drying, storage, scale }))))));
}

const STATES = everyState();

describe('grainComplexModel', () => {
  it('opens on the whole complex at work', () => {
    const model = grainComplexModel(GRAIN_COMPLEX_DEFAULT);
    expect(model.chain).toEqual(['Приймання', 'Очищення', 'Сушіння', 'Силоси', 'Відвантаження']);
    expect(model.silos).toBe(3);
    expect(model.binCrops).toEqual(['wheat', 'corn', 'wheat']);
    expect(model.scaleLabel).toBe('1–5 тис. т');
    expect(model.own).toContain('Фундамент під сушарку');
    expect(model.partners).toEqual(['Норії та конвеєри', 'Машина очищення', 'Зерносушарка', 'Силоси', 'Бункер відвантаження']);
  });

  it('chains the modules in the order the grain passes them, in every state', () => {
    expect(STATES).toHaveLength(2 ** 6 * 2 * 2 * 3 * 4);
    for (const state of STATES) {
      const { chain } = grainComplexModel(state);
      expect(chain[0]).toBe('Приймання');
      expect(chain.at(-1)).toBe('Відвантаження');
      expect(chain.at(-2)).toBe({ silos: 'Силоси', floor: 'Підлогове сховище', unknown: 'Сховище' }[state.storage]);
      expect(chain.includes('Очищення')).toBe(state.cleaning);
      expect(chain.includes('Сушіння')).toBe(state.drying);
      // cleaning comes before drying: the dryer takes cleaned grain
      if (state.cleaning && state.drying) expect(chain.indexOf('Очищення')).toBeLessThan(chain.indexOf('Сушіння'));
      expect(chain).toHaveLength(3 + Number(state.cleaning) + Number(state.drying));
    }
  });

  it('draws a silo for every crop, more for a larger scale, never more than six', () => {
    for (const state of STATES) {
      const model = grainComplexModel(state);
      expect(model.silos).toBeGreaterThanOrEqual(Math.max(2, state.crops.length));
      expect(model.silos).toBeLessThanOrEqual(6);
      expect(model.binCrops).toHaveLength(model.silos);
      // each chosen crop has a silo of its own, in the chips' order
      expect(model.binCrops.slice(0, state.crops.length)).toEqual(state.crops);
      expect(model.zoneCrops).toEqual(state.crops.length ? state.crops : ['mixed']);
      if (!state.crops.length) expect(new Set(model.binCrops)).toEqual(new Set(['mixed']));
    }
    const silosAt = (scale: GrainScale) => grainComplexModel({ ...GRAIN_COMPLEX_DEFAULT, crops: ['wheat'], scale }).silos;
    expect(SCALES.map(silosAt)).toEqual([2, 3, 4, 5]);
    expect(grainComplexModel({ ...GRAIN_COMPLEX_DEFAULT, crops: [...CROPS], scale: 0 }).silos).toBe(6);
  });

  it('lengthens the floor store with the scale', () => {
    const lengths = SCALES.map((scale) => grainComplexModel({ ...GRAIN_COMPLEX_DEFAULT, storage: 'floor', scale }).floorLength);
    expect(lengths).toEqual([...lengths].sort((a, b) => a - b));
    expect(new Set(lengths).size).toBe(SCALES.length);
  });

  it('keeps the building part and the equipment apart: what RUBIKON builds, what the specialists supply', () => {
    for (const state of STATES) {
      const { own, partners } = grainComplexModel(state);
      expect(own.filter((item) => partners.includes(item))).toEqual([]);
      // the equipment is the specialists', never the building part's
      for (const equipment of ['Зерносушарка', 'Машина очищення', 'Силоси', 'Норії та конвеєри']) expect(own).not.toContain(equipment);
      expect(own.includes('Майданчик і опорні конструкції під очищення')).toBe(state.cleaning);
      expect(partners.includes('Машина очищення')).toBe(state.cleaning);
      expect(own.includes('Фундамент під сушарку')).toBe(state.drying);
      expect(partners.includes('Зерносушарка')).toBe(state.drying);
    }
    const floor = grainComplexModel({ ...GRAIN_COMPLEX_DEFAULT, storage: 'floor' });
    expect(floor.own).toContain('Підлогове сховище: фундаменти, підпірні стіни, каркас і покрівля');
    expect(floor.partners).toContain('Аерація й конвеєри сховища');
    const unknown = grainComplexModel({ ...GRAIN_COMPLEX_DEFAULT, storage: 'unknown' });
    expect(unknown.own).toContain('Основа або будівля — щойно визначите тип сховища');
    expect(unknown.partners).not.toContain('Силоси');
  });

  it('starts the inquiry with the chosen complex in words', () => {
    expect(grainComplexModel(GRAIN_COMPLEX_DEFAULT).inquiryText).toBe('Зерновий комплекс: пшениця, кукурудза; очищення і сушіння, силоси, орієнтовно 1–5 тис. т. ');
    expect(grainComplexModel({ crops: [], cleaning: false, drying: false, storage: 'unknown', scale: 3 }).inquiryText)
      .toBe('Зерновий комплекс: без підготовки, сховище (тип ще не визначили), орієнтовно понад 20 тис. т. ');
    expect(grainComplexModel({ crops: ['soy', 'wheat'], cleaning: false, drying: true, storage: 'floor', scale: 0 }).inquiryText)
      .toBe('Зерновий комплекс: пшениця, соя; сушіння, підлогове сховище, орієнтовно до 1 тис. т. ');
    for (const state of STATES) {
      const { inquiryText } = grainComplexModel(state);
      expect(inquiryText).toContain(GRAIN_SCALE_OPTIONS[state.scale].label);
      expect(inquiryText.endsWith('. ')).toBe(true);
    }
  });
});

describe('the drawing as a control panel', () => {
  it('names who builds what in every module, in every state', () => {
    for (const state of STATES) {
      for (const key of MODULES) {
        const info = grainModuleInfo(key, state);
        expect(info.name.length).toBeGreaterThan(0);
        expect(info.own.length).toBeGreaterThan(0);
      }
      // the storage's tip is named as the title block names it
      expect(grainComplexModel(state).chain).toContain(grainModuleInfo('storage', state).name);
    }
  });

  it('offers a press exactly where one changes the complex, and says what it will do', () => {
    for (const state of STATES) {
      for (const key of MODULES) {
        const patch = grainModulePress(key, state);
        const info = grainModuleInfo(key, state);
        expect(Boolean(info.action)).toBe(patch !== null);
        if (!patch) continue;
        const next = { ...state, ...patch };
        if (key === 'cleaning' || key === 'drying') {
          expect(next[key]).toBe(!state[key]);
          expect(info.action).toBe(state[key] ? 'Натисніть, щоб прибрати з ланцюга' : 'Натисніть, щоб додати в ланцюг');
        } else {
          // the storage swaps between silos and the floor store; an undecided one becomes silos
          expect(next.storage).toBe(state.storage === 'silos' ? 'floor' : 'silos');
          expect(info.action).toBe(next.storage === 'floor' ? 'Натисніть — підлогове сховище' : 'Натисніть — силоси');
        }
        // nothing else moves
        const untouched = (Object.keys(state) as (keyof GrainComplexState)[]).filter((field) => !(field in patch));
        for (const field of untouched) expect(next[field]).toEqual(state[field]);
      }
    }
  });

  it('keeps the crops out of a press', () => {
    const crops: GrainCrop[] = ['barley', 'rapeseed'];
    for (const key of MODULES) expect(grainModulePress(key, { ...GRAIN_COMPLEX_DEFAULT, crops })?.crops).toBeUndefined();
  });
});
