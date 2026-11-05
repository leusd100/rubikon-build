const PAGE_IMAGES = Object.freeze({
  'home': {
    1440: { before: 'home--1440--before.webp', after: 'home--1440--after.webp' },
    390: { before: 'home--390--before.webp', after: 'home--390--after.webp' },
  },
  'napryamky': {
    1440: { before: 'napryamky--1440--before.webp', after: 'napryamky--1440--after.webp' },
    390: { before: 'napryamky--390--before.webp', after: 'napryamky--390--after.webp' },
  },
  'angary': {
    1440: { before: 'angary--1440--before.webp', after: 'angary--1440--after.webp' },
    390: { before: 'angary--390--before.webp', after: 'angary--390--after.webp' },
  },
  'zernoskhovyshcha': {
    1440: { before: 'zernoskhovyshcha--1440--before.webp', after: 'zernoskhovyshcha--1440--after.webp' },
    390: { before: 'zernoskhovyshcha--390--before.webp', after: 'zernoskhovyshcha--390--after.webp' },
  },
  'metalokonstruktsii': {
    1440: { before: 'metalokonstruktsii--1440--before.webp', after: 'metalokonstruktsii--1440--after.webp' },
    390: { before: 'metalokonstruktsii--390--before.webp', after: 'metalokonstruktsii--390--after.webp' },
  },
  'betonni-roboty': {
    1440: { before: 'betonni-roboty--1440--before.webp', after: 'betonni-roboty--1440--after.webp' },
    390: { before: 'betonni-roboty--390--before.webp', after: 'betonni-roboty--390--after.webp' },
  },
  'pokrivelni-roboty': {
    1440: { before: 'pokrivelni-roboty--1440--before.webp', after: 'pokrivelni-roboty--1440--after.webp' },
    390: { before: 'pokrivelni-roboty--390--before.webp', after: 'pokrivelni-roboty--390--after.webp' },
  },
  'yak-pratsyuiemo': {
    1440: { before: 'yak-pratsyuiemo--1440--before.webp', after: 'yak-pratsyuiemo--1440--after.webp' },
    390: { before: 'yak-pratsyuiemo--390--before.webp', after: 'yak-pratsyuiemo--390--after.webp' },
  },
  'pro-nas': {
    1440: { before: 'pro-nas--1440--before.webp', after: 'pro-nas--1440--after.webp' },
    390: { before: 'pro-nas--390--before.webp', after: 'pro-nas--390--after.webp' },
  },
});

let sw = 1920, scene = 5, pw = 1440;
function image(id, src) {
  document.getElementById(id).src = src;
  document.getElementById(id + '-link').href = src;
}
function pics(prefix, key) {
  for (const state of ['before', 'after']) image(prefix + '-' + state, key + '--' + state + '.webp');
}
function render() {
  pics('seq', 'sequence-' + sw + '-' + scene);
  // DOM selection chooses a constant asset; it is never copied into a URL.
  const requested = document.getElementById('route').value;
  const page = Object.hasOwn(PAGE_IMAGES, requested) ? PAGE_IMAGES[requested] : PAGE_IMAGES.napryamky;
  const files = page[pw === 390 ? 390 : 1440];
  image('page-before', files.before);
  image('page-after', files.after);
  document.getElementById('sequence').classList.toggle('mobile', sw === 390);
  document.getElementById('pages').classList.toggle('mobile', pw === 390);
  for (const b of document.querySelectorAll('[data-w]')) b.setAttribute('aria-pressed', +b.dataset.w === sw);
  for (const b of document.querySelectorAll('[data-i]')) b.setAttribute('aria-pressed', +b.dataset.i === scene);
  for (const b of document.querySelectorAll('[data-page-w]')) b.setAttribute('aria-pressed', +b.dataset.pageW === pw);
}
document.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { sw = +b.dataset.w; render(); });
document.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { scene = +b.dataset.i; render(); });
document.querySelectorAll('[data-page-w]').forEach(b => b.onclick = () => { pw = +b.dataset.pageW; render(); });
document.getElementById('route').onchange = render;
render();
