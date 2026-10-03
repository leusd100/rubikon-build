'use client';

import ResponsiveImage from '../ResponsiveImage';

// «Чому це важливо» under a configurator group (UX pass 2026-10). The four explanations used to be their own section
// after the configurator, «Рішення, які приймаєте ви» (2.9 phone screens), repeating each choice as «Зараз: …». Now the
// explanation sits under the control it explains, folded; the words and pictures are the same. «Порівняти із
// сендвіч-панеллю» is gone (2026-10): the technical view draws no cladding, so the comparison changed 0 pixels.

export type WhyTopic = 'object' | 'contour' | 'cladding' | 'foundation' | 'openings';

/** Brings the live preview into view after a demo starts (on a wide screen only when it is off screen). */
export function revealLivePreview() {
  window.requestAnimationFrame(() => {
    const preview = document.querySelector<HTMLElement>('.hc-preview-demo-status')
      ?? document.getElementById('hangar-live-preview');
    if (!preview) return;
    const rect = preview.getBoundingClientRect();
    const isMobile = window.matchMedia('(max-width: 760px)').matches;
    const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
    if (!isMobile && isVisible) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    preview.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  });
}

function WhyImage({ src, alt, title, text }: Readonly<{ src: string; alt: string; title: string; text: string }>) {
  return (
    <figure>
      <span className="hc-why-image">
        <ResponsiveImage src={src} alt={alt} sizes="(max-width: 1023px) calc(50vw - 32px), 180px" />
        <span className="hc-why-scheme">Схема</span>
      </span>
      <figcaption><strong>{title}</strong><span>{text}</span></figcaption>
    </figure>
  );
}

export function ConfiguratorWhy({ topic }: Readonly<{ topic: WhyTopic }>) {
  return (
      <details className="hc-why" data-why={topic}>
        <summary>Чому це важливо</summary>
        <div className="hc-why-body">
          {/* «Об’єкт» (03.10): a draft for Сергій Іванович — no numbers, only what each answer changes in the work */}
          {topic === 'object' && (
            <>
              <p>Ці відповіді не обов’язкові, але з ними розмова починається з вашого об’єкта, а не з ангара загалом.</p>
              <dl className="hc-why-list">
                <div><dt>Призначення</dt><dd>Від нього залежать ворота, висота всередині й температурний режим</dd></div>
                <div><dt>Проєкт</dt><dd>Готовий проєкт уже відповідає на більшість цих питань — тоді звіряємо параметри з ним</dd></div>
                <div><dt>Область</dt><dd>Снігове й вітрове навантаження залежать від того, де стоїть ангар, а з ними — каркас і покрівля</dd></div>
                <div><dt>Підйомне обладнання</dt><dd>Кран-балка чи тельфер додає навантаження на каркас: від цього залежать колони й фундаменти, тому обладнання закладають у розрахунок із самого початку</dd></div>
              </dl>
            </>
          )}
          {topic === 'contour' && (
            <>
              <p>Температурний режим задає вимоги до огороджувального контуру. Його обирають від реального сценарію використання, а не від назви споруди.</p>
              <div className="hc-why-compare">
                <div>
                  <strong>Холодний контур</strong>
                  <ul><li>Зберігання техніки й матеріалів</li><li>Без постійного опалення</li><li>Простіша комплектація оболонки</li></ul>
                </div>
                <div>
                  <strong>Утеплений контур</strong>
                  <ul><li>Робочі або виробничі процеси</li><li>Контрольований режим усередині</li><li>Увага до вузлів і герметичності</li></ul>
                </div>
              </div>
            </>
          )}
          {topic === 'cladding' && (
            <>
              <p>Профнастил формує легкий неутеплений контур. Сендвіч-панель поєднує дві металеві обшивки з утеплювачем між ними. Стіни та покрівля можуть уточнюватися окремо.</p>
              <div className="hc-why-figures">
                <WhyImage src="/media/angary/envelope-profiled-cutaway.jpg" alt="Розріз холодного контуру ангара з тонким профільованим листом і відкритим каркасом без утеплення" title="Профнастил" text="Тонкий профільований лист · без утеплення" />
                <WhyImage src="/media/angary/envelope-sandwich-cutaway.jpg" alt="Розріз утепленого контуру ангара із сендвіч-панеллю та видимим шаром утеплювача" title="Сендвіч-панель" text="Дві обшивки · утеплювач усередині" />
              </div>
            </>
          )}
          {topic === 'foundation' && (
            <>
              <p>Тип фундаменту не можна визначити лише за виглядом ангара. Остаточне рішення приймають після вихідних даних майданчика та розрахунку.</p>
              <div className="hc-why-figures">
                <WhyImage src="/media/angary/foundation-slab-detail.jpg" alt="Фрагмент ангара: колони каркаса спираються на монолітну плиту, виділену теракотовим кольором" title="Монолітна плита" text="Суцільна основа споруди" />
                <WhyImage src="/media/angary/foundation-isolated-detail.jpg" alt="Фрагмент ангара: кожна колона каркаса спирається на окремий фундамент, виділений теракотовим кольором" title="Окремі фундаменти" text="Опори під колони каркаса" />
              </div>
            </>
          )}
          {topic === 'openings' && (
            <>
              <p>Ворота та двері прив’язуються до логістики всередині й зовні. Положення та реальні розміри уточнюємо разом із плануванням.</p>
              <dl className="hc-why-list">
                <div><dt>Ворота</dt><dd>Для щоденного потоку техніки</dd></div>
                <div><dt>Великі ворота</dt><dd>Для габаритної техніки й обладнання</dd></div>
                <div><dt>Двері</dt><dd>Окремий рух персоналу</dd></div>
              </dl>
            </>
          )}
        </div>
      </details>
  );
}
