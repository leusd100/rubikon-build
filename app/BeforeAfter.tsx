'use client';

import Image from 'next/image';
import { useState, type CSSProperties } from 'react';

export default function BeforeAfter() {
  const [position, setPosition] = useState(50);

  return (
    <div className="comparison" style={{ '--split': `${position}%` } as CSSProperties}>
      <div className="comparison-stage">
        <Image
          className="comparison-image"
          src="/images/after-renovation.jpg"
          alt="Оновлене приміщення після завершення будівельних робіт"
          fill
          sizes="(max-width: 760px) 100vw, 1240px"
          draggable={false}
        />
        <div className="comparison-before">
          <Image
            className="comparison-image"
            src="/images/before-renovation.jpg"
            alt="Приміщення під час будівельних робіт до завершення оздоблення"
            fill
            sizes="(max-width: 760px) 100vw, 1240px"
            draggable={false}
          />
        </div>

        <span className="comparison-label before-label">До</span>
        <span className="comparison-label after-label">Після</span>

        <div className="comparison-divider" aria-hidden="true">
          <span>‹</span><span>›</span>
        </div>

        <input
          className="comparison-range"
          type="range"
          min="5"
          max="95"
          value={position}
          onChange={(event) => setPosition(Number(event.target.value))}
          aria-label="Порівняти вигляд приміщення до та після робіт"
        />
      </div>
      <p className="comparison-hint">Потягніть вертикальну лінію, щоб порівняти результат</p>
    </div>
  );
}
