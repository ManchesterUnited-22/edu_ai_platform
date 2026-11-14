import { generateJson } from './generation/geminiClient.js';
import { extractPages } from './ingestion/pipeline.js';
import { resolveUploadPath } from '../utils/files.js';

const schema = {
  type: 'OBJECT',
  properties: {
    score: { type: 'INTEGER' },
    label: { type: 'STRING', enum: ['low', 'medium', 'high'] },
    reasons: { type: 'ARRAY', items: { type: 'STRING' } },
    missing: { type: 'ARRAY', items: { type: 'STRING' } },
    suspicious: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['score', 'label', 'reasons', 'missing', 'suspicious'],
};

const requirements = {
  active_teacher: 'CCCD hoặc hộ chiếu và thẻ giáo viên, hợp đồng giảng dạy, bằng chuyên môn hoặc xác nhận đơn vị.',
  retired_teacher: 'CCCD hoặc hộ chiếu và quyết định nghỉ hưu, sổ hưu trí hoặc bằng Sư phạm cũ.',
  teaching_student: 'CCCD hoặc hộ chiếu, thẻ sinh viên còn hạn và bảng điểm gần nhất.',
  new_graduate: 'CCCD hoặc hộ chiếu, bằng tốt nghiệp, giấy chứng nhận tạm thời hoặc bảng điểm có xác nhận.',
  language_teacher: 'CCCD hoặc hộ chiếu và bằng ngôn ngữ hoặc chứng chỉ ngoại ngữ hợp lệ.',
};

const fallback = (track, documents) => {
  const hasIdentity = documents.some((doc) => doc.kind === 'identity');
  const hasProfessional = documents.some((doc) => doc.kind !== 'identity');
  const missing = [];
  if (!hasIdentity) missing.push('Thiếu giấy tờ định danh');
  if (!hasProfessional) missing.push('Thiếu giấy tờ chuyên môn');
  const score = missing.length ? 35 : 20;
  return {
    score,
    label: missing.length ? 'medium' : 'low',
    reasons: [`Hồ sơ được kiểm tra theo yêu cầu nhóm: ${requirements[track]}`],
    missing,
    suspicious: [],
    source: 'rules',
  };
};

const normalize = (result, safeFallback) => ({
  score: Math.min(100, Math.max(0, Number(result?.score) || safeFallback.score)),
  label: ['low', 'medium', 'high'].includes(result?.label) ? result.label : safeFallback.label,
  reasons: Array.isArray(result?.reasons) ? result.reasons.filter((item) => typeof item === 'string').slice(0, 8) : safeFallback.reasons,
  missing: Array.isArray(result?.missing) ? result.missing.filter((item) => typeof item === 'string').slice(0, 8) : safeFallback.missing,
  suspicious: Array.isArray(result?.suspicious) ? result.suspicious.filter((item) => typeof item === 'string').slice(0, 8) : safeFallback.suspicious,
  source: 'gemini',
});

export async function reviewVerification({ track, documents }) {
  const safeFallback = fallback(track, documents);
  const extracted = [];
  for (const document of documents) {
    const pages = await extractPages(document.mimeType, resolveUploadPath(document.filePath));
    extracted.push({
      kind: document.kind,
      fileName: document.fileName,
      text: pages.map((page) => page.text).join('\n').slice(0, 12000),
    });
  }

  try {
    const result = await generateJson({
      system: [
        'Bạn là trợ lý kiểm tra hồ sơ giáo viên.',
        'Chỉ đánh giá tính đầy đủ, tính nhất quán và dấu hiệu bất thường trong nội dung được cung cấp.',
        'Không khẳng định giấy tờ là thật nếu không có nguồn xác minh chính thức.',
        'Không quyết định khóa hoặc cấp quyền; Admin là người quyết định cuối cùng.',
      ].join(' '),
      prompt: JSON.stringify({
        track,
        requirements: requirements[track],
        documents: extracted,
      }),
      schema,
      temperature: 0,
      maxOutputTokens: 1024,
    });
    return normalize(result, safeFallback);
  } catch (error) {
    console.error('Không thể phân tích hồ sơ xác minh giáo viên bằng Gemini:', error.message);
    return { ...safeFallback, fallbackReason: error.code ?? 'VERIFICATION_AI_FAILED' };
  }
}
