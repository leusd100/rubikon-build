import type { Answers } from '../../../lib/planner/grain';

export type GrainQuestionProps = {
  answers: Answers;
  answer: <K extends keyof Answers>(key: K, value: Answers[K]) => void;
};
