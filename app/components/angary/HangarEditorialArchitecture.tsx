'use client';

import { company } from '../../data/company';
import { useHangarInquiryContext } from '../configurator/HangarInquiryContext';
import { revealLivePreview } from '../configurator/ConfiguratorWhy';

// The editorial architecture after the configurator. «Рішення, які приймаєте ви» moved into the configurator as
// «Чому це важливо» under each group (ConfiguratorWhy.tsx, UX pass 2026-10).

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
  function togglePresentationDemo(kind: 'frame' | 'profiled-sheet' | 'sandwich-panel') {
    const isActive = inquiry?.presentationDemo?.kind === kind;
    inquiry?.togglePresentationDemo(kind);
    if (!isActive) revealLivePreview();
  }

  return (
    <>
      <section className="page-section angary-structure" id="structure" aria-labelledby="angary-structure-title">
        <div className="shell">
          <header className="angary-section-heading angary-structure-heading">
            <p className="eyebrow"><span /> Попередня схема</p>
            <h2 id="angary-structure-title">Що визначає схему каркаса</h2>
            <button
              type="button"
              className="angary-preview-action"
              aria-pressed={inquiry?.presentationDemo?.kind === 'frame'}
              onClick={() => togglePresentationDemo('frame')}
            >
              Подивитись каркас <span aria-hidden="true">→</span>
            </button>
          </header>

          <div className="angary-transverse-grid">
            <figure className="angary-diagram">
              <TransverseDiagram type="portal" />
              <p className="angary-diagram-key"><span>Проліт</span><strong>Між крайніми опорами</strong></p>
              <figcaption><span>ПОПЕРЕЧНА СХЕМА 01</span><strong>Портальна рама</strong><p>Вільний простір без внутрішніх опор — якщо це підтвердить розрахунок.</p></figcaption>
            </figure>
            <figure className="angary-diagram">
              <TransverseDiagram type="truss" />
              <p className="angary-diagram-key"><span>Проліт</span><strong>Між крайніми опорами</strong></p>
              <figcaption><span>ПОПЕРЕЧНА СХЕМА 02</span><strong>Ферма та ряд опор</strong><p>Інший шлях передавання навантажень для ширших або особливих об’єктів.</p></figcaption>
            </figure>
          </div>

          <figure className="angary-diagram angary-longitudinal-diagram">
            <LongitudinalDiagram />
            <p className="angary-diagram-key"><span>Крок рам</span><strong>Попередньо 6–8 м · уточнюється після розрахунку проєктувальником</strong></p>
            <figcaption><span>ПОЗДОВЖНЯ СХЕМА</span><strong>Ритм рам і в’язі</strong><p>У попередній схемі ритм рам формується орієнтовно в діапазоні 6–8 м і уточнюється після розрахунку проєктувальником.</p></figcaption>
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
            <li><span>03</span><strong>Узгодження з проєктом</strong><p>Проєкт і розрахунок забезпечує замовник із проєктувальником. Узгоджуємо будівельні роботи.</p></li>
            <li><span>04</span><strong>Комплектація та виготовлення</strong><p>Готуємо матеріали й конструкції погодженого обсягу.</p></li>
            <li><span>05</span><strong>Монтаж</strong><p>Збираємо об’єкт і координуємо суміжні етапи.</p></li>
          </ol>
        </div>
      </section>

      <section className="page-section angary-people" id="responsibility" aria-labelledby="angary-people-title">
        <div className="shell angary-people-layout">
          <div className="angary-people-copy">
            <h2 id="angary-people-title">За погоджений обсяг відповідаємо особисто.</h2>
            <p>{company.geography}</p>
            <a href="/pro-nas">Про компанію <span aria-hidden="true">→</span></a>
          </div>
          <div className="angary-people-roles">
            <div><strong>Сергій Іванович Леус</strong><p>Керує будівельним напрямом і відповідає за виконання робіт.</p></div>
            <div><strong>Дмитро Сергійович Леус</strong><p>Працює з клієнтами й допомагає підготувати предметну розмову про проєкт.</p></div>
          </div>
        </div>
      </section>
    </>
  );
}
