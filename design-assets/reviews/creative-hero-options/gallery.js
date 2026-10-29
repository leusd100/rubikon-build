const concepts = {
  A: { key: 'light', title: 'Масштаб і світло', home: 'Ритм великих порталів, глибина й промінь світла. Відчуття простору та руху вперед.', about: 'Дві опори й один спільний проліт. Спокійна рівновага, матеріальність і відповідальність.' },
  B: { key: 'sculpture', title: 'Архітектурна скульптура', home: 'Монументальний артоб’єкт зі сталі, бетону й міді. Смілива форма та виразна фактура.', about: 'Точне з’єднання масивних площин. Більш камерний образ майстерності й надійності.' },
  C: { key: 'line', title: 'Від лінії до матеріалу', home: 'Тонка мідна лінія поступово стає справжнім об’ємом. Світлий, графічний образ будівництва.', about: 'Конструкція на межі креслення та матеріалу. Увага до пропорцій, деталей і думки за ними.' },
};
const mediaFiles = {"about-A-390-dark": "screens/about-A-390-dark.jpg", "about-A-430-dark": "screens/about-A-430-dark.jpg", "home-C-430-light": "screens/home-C-430-light.jpg", "about-C-430-light": "screens/about-C-430-light.jpg", "about-A-320-dark": "screens/about-A-320-dark.jpg", "home-C-390-light-text200": "screens/home-C-390-light-text200.jpg", "home-B-320-dark": "screens/home-B-320-dark.jpg", "about-B-390-light-text200": "screens/about-B-390-light-text200.jpg", "home-B-390-light": "screens/home-B-390-light.jpg", "home-C-390-dark": "screens/home-C-390-dark.jpg", "home-C-430-dark": "screens/home-C-430-dark.jpg", "about-B-390-light": "screens/about-B-390-light.jpg", "home-A-390-light": "screens/home-A-390-light.jpg", "about-A-390-light": "screens/about-A-390-light.jpg", "home-A-390-light-text200": "screens/home-A-390-light-text200.jpg", "home-C-320-dark": "screens/home-C-320-dark.jpg", "home-C-320-light": "screens/home-C-320-light.jpg", "about-C-320-light": "screens/about-C-320-light.jpg", "home-B-430-dark": "screens/home-B-430-dark.jpg", "home-B-390-dark": "screens/home-B-390-dark.jpg", "home-A-320-dark": "screens/home-A-320-dark.jpg", "about-B-320-light": "screens/about-B-320-light.jpg", "home-B-320-light": "screens/home-B-320-light.jpg", "about-A-320-light": "screens/about-A-320-light.jpg", "home-A-320-light": "screens/home-A-320-light.jpg", "home-A-430-dark": "screens/home-A-430-dark.jpg", "home-A-390-dark": "screens/home-A-390-dark.jpg", "about-C-390-light": "screens/about-C-390-light.jpg", "home-C-390-light": "screens/home-C-390-light.jpg", "about-B-430-light": "screens/about-B-430-light.jpg", "about-C-390-light-text200": "screens/about-C-390-light-text200.jpg", "home-B-430-light": "screens/home-B-430-light.jpg", "about-B-390-dark": "screens/about-B-390-dark.jpg", "about-B-430-dark": "screens/about-B-430-dark.jpg", "home-B-390-light-text200": "screens/home-B-390-light-text200.jpg", "about-C-320-dark": "screens/about-C-320-dark.jpg", "about-C-430-dark": "screens/about-C-430-dark.jpg", "about-C-390-dark": "screens/about-C-390-dark.jpg", "about-A-390-light-text200": "screens/about-A-390-light-text200.jpg", "about-A-430-light": "screens/about-A-430-light.jpg", "about-B-320-dark": "screens/about-B-320-dark.jpg", "home-A-430-light": "screens/home-A-430-light.jpg", "art-home-A": "assets/home-light.webp", "art-home-B": "assets/home-sculpture.webp", "art-home-C": "assets/home-line.webp", "art-about-A": "assets/about-light.webp", "art-about-B": "assets/about-sculpture.webp", "art-about-C": "assets/about-line.webp"};
const routeNames = { home: 'Головна', about: 'Про компанію' };
const q = id => document.getElementById(id);
let route = new URLSearchParams(location.search).get('route');
if (!Object.hasOwn(routeNames, route)) route = 'home';
let choices = {};
try {
  const saved = JSON.parse(localStorage.getItem('rubikon-creative-review-v3') || '{}');
  for (const key of Object.keys(routeNames)) if (saved && Object.hasOwn(concepts, saved[key])) choices[key] = saved[key];
} catch {}
function node(tag, text, className) {
  const item = document.createElement(tag);
  if (text !== undefined) item.textContent = text;
  if (className) item.className = className;
  return item;
}
function render() {
  const mode = q('mode').value === 'phone' ? 'phone' : 'art';
  const enlarged = mode === 'phone' && q('text').value === '200';
  if (enlarged) { q('width').value = '390'; q('theme').value = 'light'; }
  const width = ['320', '390', '430'].includes(q('width').value) ? q('width').value : '390';
  const theme = q('theme').value === 'dark' ? 'dark' : 'light';
  q('phone-options').classList.toggle('hidden', mode !== 'phone');
  q('title').textContent = routeNames[route] + ' · нові A / B / C';
  document.querySelectorAll('[data-route]').forEach(button => button.setAttribute('aria-pressed', button.dataset.route === route));
  q('cards').replaceChildren();
  for (const [letter, concept] of Object.entries(concepts)) {
    const card = node('article', undefined, 'card' + (choices[route] === letter ? ' selected' : ''));
    card.append(node('span', letter, 'letter'), node('h3', concept.title), node('p', concept[route]));
    const sourceKey = mode === 'art' ? `art-${route}-${letter}` : `${route}-${letter}-${width}-${theme}${enlarged ? '-text200' : ''}`;
    const source = mediaFiles[sourceKey];
    const link = node('a'); link.href = source; link.target = '_blank'; link.rel = 'noopener';
    const image = node('img'); image.src = source; image.alt = routeNames[route] + ': ' + letter + ' — ' + concept.title;
    image.width = mode === 'art' ? 1024 : Number(width);
    image.height = mode === 'art' ? 1536 : ({320:568,390:844,430:932}[width]);
    link.append(image);
    const select = node('button', choices[route] === letter ? 'Позначено ' + letter : 'Мій варіант ' + letter);
    select.onclick = () => { choices[route] = letter; try { localStorage.setItem('rubikon-creative-review-v3', JSON.stringify(choices)); } catch {} render(); };
    card.append(link, select); q('cards').append(card);
  }
  q('choice').textContent = Object.entries(routeNames).map(([key, name]) => name + ' ' + (choices[key] || '—')).join(' · ');
}
document.querySelectorAll('[data-route]').forEach(button => button.onclick = () => { route = button.dataset.route; render(); });
for (const id of ['mode', 'width', 'theme', 'text']) q(id).onchange = render;
render();
