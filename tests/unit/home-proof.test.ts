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
  provenance: 'rubikon',
  photo: { src: '/photos/test-fixture.jpg', alt: 'Тестовий кадр', width: 1600, height: 1000 },
  caption: 'Тестовий підпис.',
  attribution: 'Тестова атрибуція.',
  scope: { subject: ['Перший підтверджений рядок', 'Другий підтверджений рядок'], others: ['Роботи іншого виконавця'] },
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
    expect(markup).toContain('aspect-ratio:16 / 10');
  });

  it('identifies Serhii’s earlier work without crediting the current team', () => {
    const markup = render({ ...fixture, provenance: 'serhii-prior' });
    expect(markup).toContain('Роботи з попереднього досвіду Сергія');
    expect(markup).not.toContain('Виконала наша команда');
  });

  it('omits «Виконали інші» when nobody else worked on it, and never prints the internal case id', () => {
    const markup = render({ ...fixture, scope: { subject: ['Єдиний рядок'] } });
    expect(markup).not.toContain('Виконали інші');
    expect(markup).not.toContain('TEST-ONLY');
  });
});

// The rules a filled case must meet, written as a checker so the test can prove it fails on the shortcuts it forbids.
const problemsWith = (proof: HomeProofCase | null): string[] => {
  if (proof === null) return [];
  const problems: string[] = [];
  if (proof.publicationApproved !== true) problems.push('not approved for publication');
  if (/\/concepts\/|stock|generated|\/images\//i.test(proof.photo.src)) problems.push('photo is a concept, stock, generated or portrait image');
  for (const [name, text] of [['caption', proof.caption], ['attribution', proof.attribution], ['photo alt', proof.photo.alt]] as const) {
    if (text.trim().length === 0) problems.push(`empty ${name}`);
  }
  if (proof.scope.subject.length === 0) problems.push('no confirmed scope');
  if (proof.provenance === 'serhii-prior' && !/попередн|до створення/i.test(`${proof.caption} ${proof.attribution}`)) problems.push('prior work not identified');
  if (!(proof.photo.width > 0 && proof.photo.height > 0)) problems.push('photo has no size');
  return problems;
};

describe('homeProofCase (what HOME publishes)', () => {
  it('is either empty or a complete, approved, non-concept record', () => {
    expect(problemsWith(homeProofCase)).toEqual([]);
  });

  it('the check itself rejects the shortcuts: a concept image, no attribution, no scope', () => {
    expect(problemsWith(fixture)).toEqual([]);
    expect(problemsWith({ ...fixture, photo: { ...fixture.photo, src: '/media/concepts/direction-hangars-v2.jpg' } })).toContain('photo is a concept, stock, generated or portrait image');
    expect(problemsWith({ ...fixture, photo: { ...fixture.photo, src: '/images/founder.webp' } })).toHaveLength(1);
    expect(problemsWith({ ...fixture, attribution: '  ' })).toContain('empty attribution');
    expect(problemsWith({ ...fixture, scope: { subject: [] } })).toContain('no confirmed scope');
  });

  it('publishes the owner-approved camera photo with only the confirmed prior scope', () => {
    expect(homeProofCase?.provenance).toBe('serhii-prior');
    // HOME v2 prototype: the owner supplied the original DSCF7654 (same hangar, gable end) for this frame.
    expect(homeProofCase?.photo.src).toBe('/photos/serhii-prior-hangar-gable.jpeg');
    expect(homeProofCase?.scope.subject).toEqual(['Каркас', 'Стінові панелі', 'Покрівля']);
    expect(homeProofCase?.context).toBeUndefined();
  });
});
