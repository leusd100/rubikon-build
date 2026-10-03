import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HangarRealObject } from '../../app/components/angary/HangarRealObject';
import { directionPages } from '../../app/data/directionPages';
import { homeProofCase, type HomeProofCase } from '../../app/data/homeProof';

// /angary after the frame tour (owner, 03.10): HOME's one approved real hangar, in the record's words and HOME's only.

const render = (proof: HomeProofCase) => renderToStaticMarkup(createElement(HangarRealObject, { proof }));
const text = (markup: string) => markup.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('HangarRealObject', () => {
  it('shows the approved record: its photo and alt, attribution verbatim, its confirmed scope and the retouch', () => {
    expect(homeProofCase).not.toBeNull();
    const proof = homeProofCase!;
    const markup = render(proof);
    expect(markup).toContain('id="real-object"');
    expect(markup).toContain(`src="${proof.photo.src}"`);
    expect(markup).toContain(`alt="${proof.photo.alt}"`);
    expect(markup).toContain('loading="lazy"');
    expect(markup).toContain(proof.attribution);
    for (const item of proof.scope.subject) expect(markup).toContain(item);
    expect(text(markup)).toContain(`Реальний об’єкт. ${proof.caption}. Фото з ретушшю переднього плану.`);
    expect(markup).toContain('Фото об’єкта');
    expect(markup).toContain('Реалізований об’єкт до створення RUBIKON BUILD');
    expect(text(markup)).toContain('Ангар: каркас, стінові панелі, покрівля');
  });

  it('never prints the internal case id, and adds no size, place, year or number of its own', () => {
    const proof = homeProofCase!;
    const markup = render(proof);
    expect(markup).not.toContain(proof.caseId);
    // the only digits are the photo's own attributes and the WebP widths, never words on the page
    expect(text(markup)).not.toMatch(/\d/);
  });

  it('says «до створення RUBIKON BUILD» only for Serhii’s prior work', () => {
    const markup = render({ ...homeProofCase!, provenance: 'rubikon', attribution: 'Тестова атрибуція.' });
    expect(markup).not.toContain('до створення RUBIKON BUILD');
    expect(markup).toContain('Реальний об’єкт');
  });
});

describe('related directions after the form', () => {
  it('is /angary’s alone; every other direction keeps them before #inquiry with the default heading', () => {
    expect(directionPages.angary.related).toMatchObject({
      placement: 'after-inquiry',
      eyebrow: 'Окремим етапом',
      title: 'Потрібен лише один етап?',
      text: 'Фундамент, металокаркас чи покрівлю можна замовити окремо.',
    });
    for (const [id, config] of Object.entries(directionPages)) {
      if (id === 'angary') continue;
      expect(config.related?.placement, id).toBeUndefined();
      expect(config.related?.title, id).toBeUndefined();
    }
  });
});
