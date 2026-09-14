import { deliveryModel } from '../data/deliveryModel';
import type { DeliveryFormatId, DeliveryModel, EntryStateId } from '../types/deliveryModel';
import type { DeliveryModelFaqAnswer } from '../types/directionPage';
import { formatById, startStage } from './deliveryModel';

// The shapes existing pages need, built from the Delivery Model so no page retypes a format
// label or a frozen statement. Call these from server components only and hand client components
// the resulting strings as props: importing them into a client module would ship the whole model
// in that bundle.

const model: DeliveryModel = deliveryModel;

export type FormatCard = { id: DeliveryFormatId; number: string; title: string; text: string };

/** The three formats of participation, numbered in model order. */
export function formatCards(): readonly FormatCard[] {
  return model.formats.map((format, index) => ({
    id: format.id,
    number: String(index + 1).padStart(2, '0'),
    title: format.label,
    text: format.summary,
  }));
}

export type EntryPoint = { id: EntryStateId; label: string; startStageTitle: string; startNote?: string };

/** «Що у вас уже є»: where each entry state starts. A second axis, not a fourth format. */
export function entryPoints(): readonly EntryPoint[] {
  return model.entryStates.map((state) => ({
    id: state.id,
    label: state.label,
    startStageTitle: startStage(state.id).title,
    ...(state.startNote ? { startNote: state.startNote } : {}),
  }));
}

/** «Формат співпраці» options after «Ще не визначено». The value is the label, as the form stored before v1. */
export function cooperationOptions(): readonly string[] {
  return model.formats.map((format) => format.label);
}

/** The inquiry form's saved state: a confirmation, then the frozen first-contact statement verbatim. */
export function inquirySuccessMessage(): string {
  return `Дякуємо! Запит надіслано. ${model.statements.firstContact}`;
}

/**
 * The answer to a visitor asking for «під ключ»: their phrase stays in the question, the answer
 * uses the model's formats and the frozen boundary statement.
 */
export function turnkeyAnswer(): string {
  const comprehensive = formatById('comprehensive');
  const workPackage = formatById('work-package');
  const subcontract = formatById('subcontract');
  return [
    `Так, у форматі «${comprehensive.label}»: ${comprehensive.summary}`,
    `Якщо потрібна лише частина робіт — наприклад, каркас, фундамент чи покрівля, — беремо окремий пакет у форматі «${workPackage.label}» або «${subcontract.label}».`,
    model.statements.boundary,
  ].join(' ');
}

const modelFaqAnswers: Record<DeliveryModelFaqAnswer['deliveryModelAnswer'], () => string> = {
  turnkey: turnkeyAnswer,
};

/** An FAQ answer as text: plain answers pass through, model-owned ones are written from the model. */
export function faqAnswerText(answer: string | DeliveryModelFaqAnswer): string {
  return typeof answer === 'string' ? answer : modelFaqAnswers[answer.deliveryModelAnswer]();
}
