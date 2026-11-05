const PAGE_IMAGES = Object.freeze({
  'home': 'home--1440--after.webp',
  'napryamky': 'napryamky--1440--after.webp',
  'angary': 'angary--1440--after.webp',
  'zernoskhovyshcha': 'zernoskhovyshcha--1440--after.webp',
  'metalokonstruktsii': 'metalokonstruktsii--1440--after.webp',
  'betonni-roboty': 'betonni-roboty--1440--after.webp',
  'pokrivelni-roboty': 'pokrivelni-roboty--1440--after.webp',
  'yak-pratsyuiemo': 'yak-pratsyuiemo--1440--after.webp',
  'pro-nas': 'pro-nas--1440--after.webp',
});

let width = 1920, scene = 2;
function set(id, src) {
  document.getElementById(id).src = src;
  document.getElementById(id + '-link').href = src;
}
function render() {
  for (const state of ['before', 'after']) set(state, 'sequence-' + width + '-' + scene + '--' + state + '.webp');
  // DOM selection chooses a constant asset; it is never copied into a URL.
  const requested = document.getElementById('route').value;
  const file = Object.hasOwn(PAGE_IMAGES, requested) ? PAGE_IMAGES[requested] : PAGE_IMAGES.napryamky;
  set('page', file);
  document.getElementById('pair').classList.toggle('mobile', width === 390);
  document.querySelectorAll('[data-width]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.width === width));
  document.querySelectorAll('[data-scene]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.scene === scene));
}
document.querySelectorAll('[data-width]').forEach(b => b.onclick = () => { width = +b.dataset.width; render(); });
document.querySelectorAll('[data-scene]').forEach(b => b.onclick = () => { scene = +b.dataset.scene; render(); });
document.getElementById('route').onchange = render;
render();
