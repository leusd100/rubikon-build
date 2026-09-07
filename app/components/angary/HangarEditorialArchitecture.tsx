'use client';

import ResponsiveImage from '../ResponsiveImage';
import { useHangarInquiryContext } from '../configurator/HangarInquiryContext';
import {
  CLADDING_SYSTEM_LABELS,
  ENVELOPE_LABELS,
  FOUNDATION_TYPE_LABELS,
} from '../../lib/configurator/types';

function CurrentChoice({ children }: { children: React.ReactNode }) {
  return <span className="angary-current-choice">Зараз: {children}</span>;
}

function EditorialImage({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="angary-editorial-image">
      <ResponsiveImage src={src} alt={alt} sizes="(max-width: 760px) calc(50vw - 24px), 30vw" />
    </span>
  );
}

function TransverseDiagram({ type }: { type: 'portal' | 'truss' }) {
  const truss = type === 'truss';
  return (
    <svg viewBox="0 0 520 250" role="img" aria-label={truss ? 'Схема поперечної металевої ферми з центральним рядом опор' : 'Схема поперечної портальної рами без внутрішніх опор'}>
      <path className="diagram-ground" d="M45 218H475" />
      {truss ? (
        <>
          <path className="diagram-main" d="M86 218V105M86 105L260 45L434 105M86 105H434M434 105V218M260 105V218" />
          <path className="diagram-secondary" d="M86 105L108 97.4L130 105L152 82.2L174 105L196 67.1L218 105L238 52.6L260 105L282 52.6L302 105L324 67.1L346 105L368 82.2L390 105L412 97.4L434 105" />
        </>
      ) : (
        <>
          <path className="diagram-main" d="M86 218V105L260 45L434 105V218" />
          <path className="diagram-secondary" d="M86 105L260 45L434 105" />
        </>
      )}
      <path className="diagram-accent" d="M86 230H434M86 223V237M434 223V237" />
      <text x="260" y="246" textAnchor="middle">ПРОЛІТ</text>
    </svg>
  );
}

function LongitudinalDiagram() {
  return (
    <svg viewBox="0 0 1040 300" role="img" aria-label="Поздовжній фрагмент з ритмом рам і принципом в'язей">
      <path className="diagram-ground" d="M55 244H985" />
      {[115, 300, 485, 670, 855].map((x) => (
        <path className="diagram-main" d={`M${x} 244V80L${x + 55} 56V220`} key={x} />
      ))}
      <path className="diagram-main" d="M115 80L855 80M170 56L910 56M170 220L910 220" />
      <path className="diagram-accent" d="M115 80L300 244M300 80L115 244M670 80L855 244M855 80L670 244" />
      <path className="diagram-secondary" d="M115 268H300M115 261V275M300 261V275" />
      <text x="207" y="291" textAnchor="middle">КРОК РАМ УТОЧНЮЄТЬСЯ РОЗРАХУНКОМ</text>
    </svg>
  );
}

export function HangarEditorialArchitecture() {
  const inquiry = useHangarInquiryContext();
  const state = inquiry?.state;
  const enclosure = state ? ENVELOPE_LABELS[state.envelope] : 'Холодний';
  const materials = state
    ? `${CLADDING_SYSTEM_LABELS[state.wallSystem]} / ${CLADDING_SYSTEM_LABELS[state.roofSystem]}`
    : 'Профнастил / профнастил';
  const foundation = state ? FOUNDATION_TYPE_LABELS[state.foundationType] : 'Визначити після розрахунку';
  const openings = state
    ? `${state.gates === 0 ? 'Без воріт' : `${state.gates} × ворота`}${state.doors ? ' + двері' : ''}`
    : '1 × ворота';

  return (
    <>
      <section className="page-section angary-decisions" id="decisions" aria-labelledby="angary-decisions-title">
        <div className="shell">
          <header className="angary-section-heading">
            <p className="eyebrow"><span /> Рішення, які приймаєте ви</p>
            <h2 id="angary-decisions-title">Від призначення — до зрозумілого технічного завдання</h2>
            <p>Чотири групи рішень визначають склад майбутнього об’єкта. Тут — не повтор полів, а коротке пояснення наслідків кожного вибору.</p>
          </header>

          <div className="angary-decision-list">
            <article className="angary-decision-row" data-decision="contour">
              <div className="angary-decision-copy">
                <span className="angary-decision-number">01 / КОНТУР</span>
                <CurrentChoice>{enclosure}</CurrentChoice>
                <h3>Режим роботи всередині</h3>
                <p>Температурний режим задає вимоги до огороджувального контуру. Його обирають від реального сценарію використання, а не від назви споруди.</p>
              </div>
              <div className="angary-consequence-compare" aria-label="Порівняння холодного та утепленого контуру">
                <div>
                  <strong>Холодний контур</strong>
                  <ul><li>Зберігання техніки й матеріалів</li><li>Без постійного опалення</li><li>Простіша комплектація оболонки</li></ul>
                </div>
                <div>
                  <strong>Утеплений контур</strong>
                  <ul><li>Робочі або виробничі процеси</li><li>Контрольований режим усередині</li><li>Увага до вузлів і герметичності</li></ul>
                </div>
              </div>
            </article>

            <article className="angary-decision-row is-media-first" data-decision="enclosure">
              <div className="angary-decision-copy">
                <span className="angary-decision-number">02 / ОГОРОДЖЕННЯ</span>
                <CurrentChoice>{materials}</CurrentChoice>
                <h3>Матеріал стін і покрівлі</h3>
                <p>Профнастил і сендвіч-панель дають різну комплектацію контуру. Стіни та покрівля можуть уточнюватися окремо під функцію об’єкта.</p>
              </div>
              <div className="angary-render-compare">
                <figure>
                  <EditorialImage src="/media/angary/envelope-cold.jpg" alt="Ангар з огородженням із профільованого листа" />
                  <figcaption><strong>Профнастил</strong><span>Легкий зовнішній контур</span></figcaption>
                </figure>
                <figure>
                  <EditorialImage src="/media/angary/envelope-insulated.jpg" alt="Ангар з огородженням із сендвіч-панелей" />
                  <figcaption><strong>Сендвіч-панель</strong><span>Готовий утеплений контур</span></figcaption>
                </figure>
              </div>
            </article>

            <article className="angary-decision-row" data-decision="foundation">
              <div className="angary-decision-copy">
                <span className="angary-decision-number">03 / ОСНОВА</span>
                <CurrentChoice>{foundation}</CurrentChoice>
                <h3>Основа залежить від майданчика</h3>
                <p>Тип фундаменту не можна визначити лише за виглядом ангара. Остаточне рішення приймають після вихідних даних майданчика та розрахунку.</p>
              </div>
              <div className="angary-render-compare">
                <figure>
                  <EditorialImage src="/media/angary/foundation-slab.jpg" alt="Попередня візуалізація ангара на монолітній плиті" />
                  <figcaption><strong>Монолітна плита</strong><span>Суцільна основа споруди</span></figcaption>
                </figure>
                <figure>
                  <EditorialImage src="/media/angary/foundation-isolated.jpg" alt="Попередня візуалізація окремих фундаментів під колони ангара" />
                  <figcaption><strong>Окремі фундаменти</strong><span>Опори під колони каркаса</span></figcaption>
                </figure>
              </div>
            </article>

            <article className="angary-decision-row angary-openings-row" data-decision="openings">
              <div className="angary-decision-copy">
                <span className="angary-decision-number">04 / ОТВОРИ</span>
                <CurrentChoice>{openings}</CurrentChoice>
                <h3>Рух людей і техніки</h3>
                <p>Ворота та двері прив’язуються до логістики всередині й зовні. Положення та реальні розміри уточнюємо разом із плануванням.</p>
              </div>
              <div className="angary-opening-options" aria-label="Три типи отворів">
                <div><strong>Ворота</strong><span>Для щоденного потоку техніки</span></div>
                <div><strong>Великі ворота</strong><span>Для габаритної техніки й обладнання</span></div>
                <div><strong>Двері</strong><span>Окремий рух персоналу</span></div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="page-section angary-structure" id="structure" aria-labelledby="angary-structure-title">
        <div className="shell">
          <header className="angary-section-heading angary-structure-heading">
            <p className="eyebrow"><span /> Попередня схема</p>
            <h2 id="angary-structure-title">Що визначає схему каркаса</h2>
            <p className="angary-honesty-note">Попередня конструктивна схема уточнюється після розрахунку.</p>
          </header>

          <div className="angary-transverse-grid">
            <figure className="angary-diagram">
              <TransverseDiagram type="portal" />
              <figcaption><span>ПОПЕРЕЧНА СХЕМА 01</span><strong>Портальна рама</strong><p>Вільний простір без внутрішніх опор — якщо це підтвердить розрахунок.</p></figcaption>
            </figure>
            <figure className="angary-diagram">
              <TransverseDiagram type="truss" />
              <figcaption><span>ПОПЕРЕЧНА СХЕМА 02</span><strong>Ферма та ряд опор</strong><p>Інший шлях передавання навантажень для ширших або особливих об’єктів.</p></figcaption>
            </figure>
          </div>

          <figure className="angary-diagram angary-longitudinal-diagram">
            <LongitudinalDiagram />
            <figcaption><span>ПОЗДОВЖНЯ СХЕМА</span><strong>Ритм рам і в’язі</strong><p>У попередній схемі ритм рам формується орієнтовно в діапазоні 6–8 м і уточнюється після розрахунку.</p></figcaption>
          </figure>
        </div>
      </section>

      <section className="page-section angary-process" id="process" aria-labelledby="angary-process-title">
        <div className="shell">
          <header className="angary-section-heading is-inverse">
            <p className="eyebrow light"><span /> Від конфігурації до об’єкта</p>
            <h2 id="angary-process-title">Зрозумілий шлях від першого брифу</h2>
          </header>
          <ol className="angary-process-rail">
            <li className="is-current"><span>01</span><strong>Конфігурація</strong><p>{inquiry?.isAttached ? 'Конфігурацію додано до заявки.' : 'Базову конфігурацію можна сформувати вище.'}</p></li>
            <li><span>02</span><strong>Уточнення задачі</strong><p>Звіряємо функцію, майданчик і склад робіт.</p></li>
            <li><span>03</span><strong>Розрахунок і проєктне рішення</strong><p>Перевіряємо схему та визначаємо технічні параметри.</p></li>
            <li><span>04</span><strong>Комплектація та виготовлення</strong><p>Готуємо матеріали й конструкції погодженого обсягу.</p></li>
            <li><span>05</span><strong>Монтаж</strong><p>Збираємо об’єкт і координуємо суміжні етапи.</p></li>
          </ol>
        </div>
      </section>

      <section className="page-section angary-people" id="responsibility" aria-labelledby="angary-people-title">
        <div className="shell angary-people-layout">
          <div className="angary-people-copy">
            <h2 id="angary-people-title">За кожен об’єкт відповідаємо власним ім’ям.</h2>
            <p>Працюємо в Дніпрі та області. Великі промислові й аграрні об’єкти розглядаємо по всій Україні.</p>
            <a href="/pro-nas">Про компанію <span aria-hidden="true">→</span></a>
          </div>
          <div className="angary-people-portraits">
            <figure>
              <span><ResponsiveImage src="/images/founder.webp" alt="Сергій — засновник RUBIKON BUILD" sizes="(max-width: 760px) calc(50vw - 22px), 20vw" /></span>
              <figcaption><strong>Сергій</strong><p>30+ років практичного досвіду в будівництві.</p></figcaption>
            </figure>
            <figure>
              <span><ResponsiveImage src="/images/next-generation.webp" alt="Дмитро — розвиток RUBIKON BUILD та робота з клієнтами" sizes="(max-width: 760px) calc(50vw - 22px), 20vw" /></span>
              <figcaption><strong>Дмитро</strong><p>Розвиток, комунікація з клієнтами та цифрові процеси.</p></figcaption>
            </figure>
          </div>
        </div>
      </section>
    </>
  );
}
