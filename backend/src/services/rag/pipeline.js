// Orchestrator: câu hỏi -> chống injection -> retrieve -> ngưỡng tin cậy -> generate -> trích dẫn
import { detectPromptInjection, INJECTION_MESSAGE } from '../safety/promptInjection.js';
import { applyCitations } from './citation.js';
import {
  hasEnoughEvidence,
  isRefusalAnswer,
  NO_DOC_MESSAGE,
  selectEvidence,
} from './confidence.js';
import { generateAnswer } from './generator.js';
import { buildAnswerPrompt } from './promptBuilder.js';
import { retrieve } from './retriever.js';

const refusal = (reason, answer, topScore) => ({
  answer,
  citations: [],
  refused: true,
  reason, // injection | no_evidence | model_refused
  topScore,
});

/**
 * @param {{question:string, classId:string}} input
 * @param {object} deps chỉ để test: retrieve, generate, threshold, prisma, embedQuery, store
 * @returns {Promise<{answer:string, citations:object[], refused:boolean, reason:string|null, topScore:number|null}>}
 */
export async function answerQuestion({ question, classId }, deps = {}) {
  if (detectPromptInjection(question).flagged) {
    return refusal('injection', INJECTION_MESSAGE, null);
  }

  const retrieveFn = deps.retrieve ?? retrieve;
  const generate = deps.generate ?? generateAnswer;

  const hits = await retrieveFn({ question, classId }, deps);
  const topScore = hits.length > 0 ? Math.round(hits[0].score * 10000) / 10000 : 0;

  // Ngưỡng tin cậy: không đủ căn cứ thì từ chối NGAY, không gọi mô hình ngôn ngữ
  if (!hasEnoughEvidence(topScore, deps.threshold)) {
    return refusal('no_evidence', NO_DOC_MESSAGE, topScore);
  }

  const evidence = selectEvidence(hits, deps.threshold);
  const raw = await generate(buildAnswerPrompt(question, evidence));

  if (isRefusalAnswer(raw)) {
    return refusal('model_refused', NO_DOC_MESSAGE, topScore);
  }

  const { answer, citations } = applyCitations(raw, evidence);
  return { answer, citations, refused: false, reason: null, topScore };
}