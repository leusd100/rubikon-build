import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EngineeringSignature } from '../../app/components/home-v2/EngineeringSignature';
import { homeProofCase, type HomeProofCase } from '../../app/data/homeProof';

// HOME's proof (EngineeringSignature's sheet) is reserved for ONE real, approved project. Without one it draws nothing;
// once filled it must carry the attribution and the confirmed scope, and never rest on a concept, stock or generated
// image. Its words on the page are checked by pr-critical.spec.ts and home-proof-contour.spec.ts.

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

const render = (proof: HomeProofCase | null) => renderToStaticMarkup(createElement(EngineeringSignature, { proof }));
const text = (markup: string) => markup.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('EngineeringSignature (HOME)', () => {
  it('draws no proof while there is no approved project — no empty frame, no «coming soon»', () => {
    const markup = render(null);
    expect(markup).toContain('id="engineering"');
    expect(markup).not.toContain('id="real-object"');
    expect(markup).not.toMatch(/<(?:figure|picture|img)\b/);
    expect(text(markup)).not.toMatch(/об’єкт до створення|Фото об’єкта|незабаром|скоро|coming soon/i);
  });

  it('draws the approved record’s sheet, its attribution and scope, and never prints the internal case id', () => {
    const proof = homeProofCase!;
    const markup = render(proof);
    expect(markup).toContain('id="real-object"');
    expect(markup).toContain(proof.attribution);
    for (const item of proof.scope.subject) expect(markup).toContain(item);
    expect(markup).not.toContain(proof.caseId);
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
    // HOME v2: the owner supplied a cleaned (foreground-retouched) DSCF7654 for this frame.
    expect(homeProofCase?.photo.src).toBe('/photos/serhii-prior-hangar-retouched.jpeg');
    expect(homeProofCase?.scope.subject).toEqual(['Каркас', 'Стінові панелі', 'Покрівля']);
    expect(homeProofCase?.context).toBeUndefined();
  });
});
