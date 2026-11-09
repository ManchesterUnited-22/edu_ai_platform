// Sinh bộ câu hỏi trắc nghiệm bằng structured output, lọc chặt trước khi lưu (luôn ở trạng thái draft)
import { z } from 'zod';
import defaultPrisma from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { generatedQuestionSchema } from '../../validators/question.validator.js';
import { loadPrompt } from './promptLoader.js';
import { questionsJsonSchema } from './schemas.js';
import { buildGenerationPrompt, loadSourceChunks } from './sourceChunks.js';
import { generateValidated } from './structured.js';

// Phương án trỏ sang phương án khác ("Cả A và B", "Tất cả các đáp án trên"...) sẽ hỏng khi xáo trộn
const REFERS_TO_OTHER_OPTIONS =
  /(tất cả|cả)\s+(các\s+)?(đáp án|phương án)|không\s+có\s+(đáp án|phương án)\s+nào|\bcả\s+[a-d]\s*(và|,)\s*[a-d]\b/i;

export const normalizeKey = (text) =>
  text
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[?.!\s]+$/, '')
    .trim();

/** Xáo trộn vị trí phương án (mô hình hay đặt đáp án đúng ở cùng một vị trí) và cập nhật correctIndex. */
export function shuffleOptions(question, random = Math.random) {
  const items = question.options.map((text, i) => ({ text, correct: i === question.correctIndex }));
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return {
    ...question,
    options: items.map((o) => o.text),
    correctIndex: items.findIndex((o) => o.correct),
  };
}

/**
 * Lọc câu hỏi thô do AI trả về: bỏ câu sai cấu trúc, trỏ nguồn không tồn tại, phương án mập mờ,
 * trùng câu đã có/trùng trong lô; xáo trộn phương án. Dùng chung cho ngân hàng câu hỏi và quiz luyện tập.
 * @returns {{accepted: object[], skipped: {invalid:number, badSource:number, badOptions:number, duplicate:number}}}
 */
export function filterGeneratedQuestions(rawQuestions, chunks, { count, seen = new Set(), random = Math.random }) {
  const skipped = { invalid: 0, badSource: 0, badOptions: 0, duplicate: 0 };
  const accepted = [];

  for (const raw of rawQuestions) {
    if (accepted.length >= count) break;

    const parsed = generatedQuestionSchema.safeParse(raw);
    if (!parsed.success) {
      skipped.invalid += 1;
      continue;
    }
    const q = parsed.data;
    if (q.sourceRef > chunks.length) {
      skipped.badSource += 1; // trỏ tới đoạn tài liệu không tồn tại -> nghi bịa
      continue;
    }
    if (q.options.some((o) => REFERS_TO_OTHER_OPTIONS.test(o))) {
      skipped.badOptions += 1;
      continue;
    }
    const key = normalizeKey(q.text);
    if (seen.has(key)) {
      skipped.duplicate += 1;
      continue;
    }
    seen.add(key);
    accepted.push({
      ...shuffleOptions(q, random),
      sourceChunkId: chunks[q.sourceRef - 1].id,
      sourceIndex: q.sourceRef - 1,
    });
  }
  return { accepted, skipped };
}

const neutral = z.object({ questions: z.array(z.unknown()) });

/** Gọi AI sinh câu hỏi thô từ các đoạn tài liệu. */
export async function requestRawQuestions({ chunks, count, difficulty, topic }, deps = {}) {
  const { questions } = await generateValidated(
    {
      system: loadPrompt('questionGeneration'),
      prompt: buildGenerationPrompt(chunks, [
        `Số câu hỏi cần soạn: ${count}`,
        difficulty
          ? `Độ khó mong muốn: ${difficulty} (1 nhớ, 2 hiểu, 3 vận dụng)`
          : 'Độ khó: trộn đều các mức 1, 2, 3',
        topic && `Chủ đề trọng tâm: ${topic}`,
      ]),
      jsonSchema: questionsJsonSchema,
      zodSchema: neutral,
    },
    deps,
  );
  return questions;
}

export async function generateQuestions(
  { classId, documentIds, count = 10, difficulty, topic },
  deps = {},
) {
  const prisma = deps.prisma ?? defaultPrisma;
  const random = deps.random ?? Math.random;

  const chunks = await loadSourceChunks({ classId, documentIds }, deps);
  const rawQuestions = await requestRawQuestions({ chunks, count, difficulty, topic }, deps);

  const existing = await prisma.question.findMany({ where: { classId }, select: { text: true } });
  const seen = new Set(existing.map((q) => normalizeKey(q.text)));
  const { accepted, skipped } = filterGeneratedQuestions(rawQuestions, chunks, { count, seen, random });

  if (accepted.length === 0) {
    throw new AppError('AI không soạn được câu hỏi hợp lệ nào, hãy thử lại', 502, 'GENERATION_INVALID');
  }

  const created = await prisma.$transaction(
    accepted.map((q) =>
      prisma.question.create({
        data: {
          classId,
          sourceChunkId: q.sourceChunkId,
          text: q.text,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
          topic: q.topic || null,
          difficulty: q.difficulty,
        },
        select: QUESTION_SELECT,
      }),
    ),
  );

  return { requested: count, created: created.length, skipped, questions: created };
}

export const QUESTION_SELECT = {
  id: true,
  classId: true,
  sourceChunkId: true,
  text: true,
  options: true,
  correctIndex: true,
  explanation: true,
  topic: true,
  difficulty: true,
  status: true,
  createdAt: true,
};