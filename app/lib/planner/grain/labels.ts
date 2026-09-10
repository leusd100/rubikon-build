/**
 * Display labels the decision logic writes into facts, WHY and change notes.
 *
 * Verbatim from the prototype's app/planner-logic.ts (`labels`, renamed `logicLabels`). The
 * prototype's UI keeps a second, slightly different map (e.g. `physical` reads «друга черга»
 * there, «фізичне розширення» here); the two are deliberately not merged while parity with
 * 819f163 is the contract.
 */
export const logicLabels: Record<string, string> = {
  required: 'окремі партії', shared: 'спільне зберігання можливе',
  seasonal: 'сезонне зберігання', regular: 'регулярна робота', high: 'інтенсивна логістика',
  mobile: 'мобільна техніка', stationary: 'стаціонарна механізація', combined: 'комбіноване переміщення',
  none: 'не потрібна', cleaning: 'очищення', drying: 'сушіння', both: 'очищення + сушіння',
  greenfield: 'вільна ділянка', operating: 'діючий комплекс', building: 'існуюча будівля',
  assets: 'існуючі конструкції', reconstruction: 'реконструкція', compact: 'компактний майданчик',
  space: 'є запас площі', capacity: 'більше місткості', lots: 'більше партій', handling: 'вища продуктивність',
  processing: 'додаткова технологія', physical: 'фізичне розширення',
};

// Visible WHY names what the client actually chose; the rules underneath stay generic.
export const handlingAccusative: Record<string, string> = { stationary: 'стаціонарну механізацію', combined: 'комбіноване переміщення', mobile: 'мобільну техніку' };
export const siteAccusative: Record<string, string> = { operating: 'діючий комплекс', building: 'існуючу будівлю', assets: 'наявні плиту, фундамент або конструкції', reconstruction: 'реконструкцію' };
