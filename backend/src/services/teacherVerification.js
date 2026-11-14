import { generateJson } from './generation/geminiClient.js';

const schema = {
  type: 'OBJECT',
  properties: {
    riskScore: { type: 'INTEGER' },
    label: { type: 'STRING', enum: ['low', 'medium', 'high'] },
    recommendedLevel: { type: 'STRING', enum: ['basic', 'verified', 'trusted'] },
    reasons: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['riskScore', 'label', 'recommendedLevel', 'reasons'],
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));

const fallbackReview = (profile) => {
  const complete = Boolean(profile.teacherType && profile.teacherSubjects && profile.teacherBio);
  const riskScore = complete ? 15 : 35;
  return {
    riskScore,
    label: riskScore >= 60 ? 'high' : riskScore >= 30 ? 'medium' : 'low',
    recommendedLevel: profile.verificationLevel === 'verified' ? 'verified' : 'basic',
    reasons: complete
      ? ['Hồ sơ đã có loại hình, môn giảng dạy và mô tả kinh nghiệm.']
      : ['Hồ sơ còn thiếu thông tin mô tả để xác minh sâu hơn.'],
    source: 'rules',
  };
};

const normalizeReview = (result, fallback) => {
  const riskScore = clamp(result?.riskScore, 0, 100);
  const label = ['low', 'medium', 'high'].includes(result?.label) ? result.label : fallback.label;
  const recommendedLevel = ['basic', 'verified', 'trusted'].includes(result?.recommendedLevel)
    ? result.recommendedLevel
    : fallback.recommendedLevel;
  const reasons = Array.isArray(result?.reasons)
    ? result.reasons.filter((reason) => typeof reason === 'string').slice(0, 5)
    : fallback.reasons;

  return {
    riskScore,
    label,
    recommendedLevel,
    reasons: reasons.length ? reasons : fallback.reasons,
    source: 'gemini',
  };
};

export async function reviewTeacherProfile(profile) {
  const fallback = fallbackReview(profile);
  try {
    const result = await generateJson({
      system: [
        'Bạn là trợ lý đánh giá hồ sơ giáo viên cho nền tảng giáo dục.',
        'Chỉ đánh giá mức đầy đủ và rủi ro của thông tin được cung cấp.',
        'Không suy đoán danh tính, tuổi, giới tính, dân tộc, tôn giáo, sức khỏe hoặc khả năng giảng dạy thật.',
        'Không tự quyết định chặn tài khoản. recommendedLevel chỉ là đề xuất để admin tham khảo.',
        'Không đề xuất trusted chỉ từ hồ sơ đăng ký; trusted cần dữ liệu uy tín tích lũy trên nền tảng.',
      ].join(' '),
      prompt: JSON.stringify({
        task: 'Đánh giá hồ sơ giáo viên và trả về đúng JSON theo schema.',
        profile: {
          teacherType: profile.teacherType ?? null,
          subjects: profile.teacherSubjects ?? null,
          bio: profile.teacherBio ?? null,
          experienceYears: profile.teacherExperienceYears ?? null,
          currentVerificationLevel: profile.verificationLevel ?? 'basic',
        },
      }),
      schema,
      temperature: 0,
      maxOutputTokens: 512,
    });
    return normalizeReview(result, fallback);
  } catch (error) {
    console.error('Không thể phân tích hồ sơ giáo viên bằng Gemini, dùng luật dự phòng:', error.message);
    return { ...fallback, fallbackReason: error.code ?? 'AI_REVIEW_FAILED' };
  }
}
