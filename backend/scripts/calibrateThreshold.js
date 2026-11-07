// Chọn ngưỡng tin cậy bằng dữ liệu THẬT: chấm điểm câu hỏi với các đoạn của một tài liệu.
// Không ghi gì vào DB hay Chroma (chỉ đọc chunk và gọi embedding).
//
// Chạy:  node scripts/calibrateThreshold.js <DOC_ID> "+câu nên trả lời được" "-câu ngoài tài liệu" ...
//   +  câu hỏi mà tài liệu CÓ nội dung để trả lời
//   -  câu hỏi NGOÀI tài liệu (hệ thống phải từ chối)
import prisma from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { embedDocuments, embedQuery } from '../src/services/rag/embedder.js';

const [documentId, ...args] = process.argv.slice(2);
const questions = args.map((arg) => ({
  kind: arg.startsWith('-') ? 'out' : 'in',
  text: arg.replace(/^[+-]\s*/, ''),
}));

if (!documentId || questions.length === 0) {
  console.error('Cách dùng: node scripts/calibrateThreshold.js <DOC_ID> "+câu đúng" "-câu ngoài tài liệu"');
  process.exit(1);
}

function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / Math.sqrt(na * nb);
}

const preview = (text) => text.replace(/\s+/g, ' ').slice(0, 70);

try {
  const chunks = await prisma.chunk.findMany({
    where: { documentId },
    orderBy: { chunkIndex: 'asc' },
    select: { chunkIndex: true, text: true, pageNumber: true },
  });
  if (chunks.length === 0) throw new Error('Tài liệu không có đoạn nào (sai DOC_ID hoặc chưa xử lý xong)');

  console.log(`Tài liệu có ${chunks.length} đoạn, đang embed...\n`);
  const vectors = await embedDocuments(chunks.map((c) => c.text));

  const results = [];
  for (const q of questions) {
    const qv = await embedQuery(q.text);
    const ranked = chunks
      .map((c, i) => ({ chunk: c, score: cosine(qv, vectors[i]) }))
      .sort((a, b) => b.score - a.score);

    console.log(`${q.kind === 'in' ? '[CÓ trong tài liệu]' : '[NGOÀI tài liệu]  '} ${q.text}`);
    ranked.slice(0, 3).forEach((r, i) => {
      const page = r.chunk.pageNumber ? `tr.${r.chunk.pageNumber}` : '-';
      console.log(`   ${i + 1}. ${r.score.toFixed(4)}  (${page})  ${preview(r.chunk.text)}`);
    });
    console.log('');
    results.push({ kind: q.kind, top: ranked[0].score });
  }

  const inScores = results.filter((r) => r.kind === 'in').map((r) => r.top);
  const outScores = results.filter((r) => r.kind === 'out').map((r) => r.top);
  console.log(`Ngưỡng hiện tại (CONFIDENCE_THRESHOLD): ${env.CONFIDENCE_THRESHOLD}`);

  if (inScores.length && outScores.length) {
    const lowestIn = Math.min(...inScores);
    const highestOut = Math.max(...outScores);
    console.log(`Điểm top thấp nhất của câu CÓ trong tài liệu : ${lowestIn.toFixed(4)}`);
    console.log(`Điểm top cao nhất của câu NGOÀI tài liệu     : ${highestOut.toFixed(4)}`);
    if (lowestIn > highestOut) {
      console.log(`=> Hai nhóm tách được. Gợi ý ngưỡng: ${((lowestIn + highestOut) / 2).toFixed(2)}`);
    } else {
      console.log('=> Hai nhóm CHỒNG LẤN: không có ngưỡng nào tách hoàn toàn. Thêm câu hỏi mẫu, hoặc xem lại cách chia đoạn.');
    }
  } else {
    console.log('Cần cả câu "+" và câu "-" để gợi ý ngưỡng.');
  }
} catch (error) {
  console.error('Lỗi:', error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}