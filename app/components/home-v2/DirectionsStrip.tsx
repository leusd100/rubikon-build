// HOME «П'ять напрямів»: the header's empty right holds the five directions as small drawings on one ground line —
// hangar, silo, steel frame, footing, roof — numbered as the cards below (UX pass 2026-10, owner: «в пустих місцях …
// елементи в тему»). It draws itself as it scrolls into view where the browser can tie an animation to the scroll
// (home-v2.css); elsewhere it is simply there. Decorative: the cards say the same in words.

const STRUCTURES = [
  // 01 hangar: the gable frame, a gate
  'M18 100V62L46 44L74 62V100M18 62H74M38 100V80H54V100',
  // 02 grain: a silo, its cone, its rings, the elevator leg
  'M112 100V58H156V100M112 58L134 40L156 58M112 72H156M112 86H156M164 100V30H172V100M156 46L172 34',
  // 03 steel: a portal with a truss
  'M198 100V54H262V100M198 54L214 66L230 54L246 66L262 54M214 66H246',
  // 04 concrete: the footing, the pedestal, the anchors
  'M292 100V86H352V100M310 86V58H334V86M316 58V48M328 58V48',
  // 05 roofing: the slope with its ribs, the wall, the gutter
  'M384 100V72L446 52V100M392 70l4-6 6 4 4-6 6 4 4-6 6 4 4-6 6 4 4-6 6 4M378 72a6 6 0 0 0 12 0',
];

export function DirectionsStrip() {
  return (
    <svg className="dstrip" viewBox="0 0 464 122" focusable="false">
      {STRUCTURES.map((d) => <path key={d} className="dstrip-line" d={d} pathLength={1} />)}
      <path className="dstrip-ground" d="M0 100H464" pathLength={1} />
      {['01', '02', '03', '04', '05'].map((number, index) => (
        <text key={number} className="dstrip-number" x={46 + index * 92} y="118" textAnchor="middle">{number}</text>
      ))}
    </svg>
  );
}
