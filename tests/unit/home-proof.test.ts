import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HomeProofSlot } from '../../app/components/HomeSections';
import { homeProofCase, type HomeProofCase } from '../../app/data/homeProof';

// The HOME proof slot is reserved for ONE real, approved project. Until then it is empty and draws nothing; once
// filled it must carry the attribution and the confirmed scope, and never rest on a concept, stock or generated image.

// A synthetic fixture: it exists only in this test and is not a project.
const fixture: HomeProofCase = {
  caseId: 'TEST-ONLY',
  publicationApproved: true,
  photo: { src: '/photos/test-fixture.jpg', alt: 'Тестовий кадр', width: 1600, height: 1000 },
  caption: 'Тестовий підпис.',
  attribution: 'Тестова атрибуція.',
  scope: { ours: ['Перший підтверджений рядок', 'Другий підтверджений рядок'], others: ['Роботи іншого виконавця'] },
  context: 'Тестовий контекст.',
};

const render = (proof: HomeProofCase | null) => renderToStaticMarkup(createElement(HomeProofSlot, { proof }));

describe('HomeProofSlot', () => {
  it('renders nothing while there is no approved project — no empty frame, no «coming soon»', () => {
    expect(render(null)).toBe('');
  });

  it('shows the photo, the one-line caption, the attribution and the scope split by who did it', () => {
    const markup = render(fixture);
    expect(markup).toContain('class="home-proof"');
    expect(markup).toContain('Тестовий підпис.');
    expect(markup).toContain('Тестова атрибуція.');
    expect(markup).toContain('Виконала наша команда');
    expect(markup).toContain('Перший підтверджений рядок');
    expect(markup).toContain('Виконали інші');
    expect(markup).toContain('Роботи іншого виконавця');
    expect(markup).toContain('Тестовий контекст.');
    expect(markup).toContain('aspect-ratio:1600 / 1000');
  });

  it('omits «Виконали інші» when nobody else worked on it, and never prints the internal case id', () => {
    const markup = render({ ...fixture, scope: { ours: ['Єдиний рядок'] } });
    expect(markup).not.toContain('Виконали інші');
    expect(markup).not.toContain('TEST-ONLY');
  });
});

describe('homeProofCase (what HOME publishes)', () => {
  it('is either empty or a complete, approved, non-concept record', () => {
    if (homeProofCase === null) return; // the current, honest state
    expect(homeProofCase.publicationApproved).toBe(true);
    expect(homeProofCase.photo.src).not.toMatch(/\/concepts\/|stock|generated|\/images\//i);
    for (const text of [homeProofCase.caption, homeProofCase.attribution, homeProofCase.photo.alt]) {
      expect(text.trim().length).toBeGreaterThan(0);
    }
    expect(homeProofCase.scope.ours.length).toBeGreaterThan(0);
    expect(homeProofCase.photo.width).toBeGreaterThan(0);
    expect(homeProofCase.photo.height).toBeGreaterThan(0);
  });
});
