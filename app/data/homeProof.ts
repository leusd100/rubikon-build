/**
 * The one place on HOME where a real, approved project belongs (inside #services, between «Хто виконує»
 * and «Формат участі»). It is EMPTY on purpose: until an object has passed the evidence standard AND the
 * owner has approved its exact frames and text, `homeProofCase` stays `null`, the slot renders nothing and
 * the page reads complete without it.
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
  photo: { src: string; alt: string; width: number; height: number };
  /** One factual sentence: what the frame shows. */
  caption: string;
  /** Whose experience this is — text supplied only after the subject (before / during the FOP) is verified. */
  attribution: string;
  /** Confirmed scope, split by who executed it. `others` may be omitted when nobody else worked on it. */
  scope: { ours: readonly string[]; others?: readonly string[] };
  /** Optional anonymised place or period. */
  context?: string;
};

export const homeProofCase: HomeProofCase | null = null;
