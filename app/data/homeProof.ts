/**
 * One documented object on HOME. The owner approved this camera frame and confirmed that the
 * frame, panels and roof are Serhii's prior experience, before RUBIKON BUILD. It must never be
 * presented as a RUBIKON BUILD project or attributed to the current team.
 *
 * Never fill it with a concept, stock or generated image, with a frame that has no attribution, or with a
 * scope nobody has confirmed. `publicationApproved` is a literal `true` so a draft cannot type-check;
 * tests/unit/home-proof.test.ts rejects the other shortcuts (concept/stock paths, empty scope or caption).
 */
export type HomeProofCase = {
  /** Internal register id of the evidence record. Never rendered. */
  caseId: string;
  /** Set only after the E/P/L review and the owner's per-frame decision. */
  publicationApproved: true;
  provenance: 'rubikon' | 'serhii-prior';
  photo: { src: string; alt: string; width: number; height: number };
  /** One factual sentence: what the frame shows. */
  caption: string;
  /** Whose experience this is — text supplied only after the subject (before / during the FOP) is verified. */
  attribution: string;
  /** Confirmed work by the provenance subject. Other work is optional and never implied. */
  scope: { subject: readonly string[]; others?: readonly string[] };
  /** Optional anonymised place or period. */
  context?: string;
};

export const homeProofCase: HomeProofCase | null = {
  caseId: 'SERHII-PRIOR-HANGAR-01',
  publicationApproved: true,
  provenance: 'serhii-prior',
  photo: {
    src: '/photos/serhii-prior-hangar.jpeg',
    alt: 'Збудований ангар із попереднього досвіду Сергія Леуса: фасад із двома воротами та довгий бічний корпус',
    width: 1800,
    height: 1200,
  },
  caption: 'Вид на фасад і бічний корпус ангара',
  attribution: 'Сергій працював над цим об’єктом до створення RUBIKON BUILD.',
  scope: { subject: ['Каркас', 'Стінові панелі', 'Покрівля'] },
};
