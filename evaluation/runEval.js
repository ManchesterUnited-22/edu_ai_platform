// Chạy đánh giá và xuất báo cáo.
// Cách dùng (trong backend/):  npm run eval -- --class <classId> [--k 5] [--threshold 0.65] [--csv đường_dẫn]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prisma from '../backend/src/config/db.js';
import { env } from '../backend/src/config/env.js';
import { retrieve } from '../backend/src/services/rag/retriever.js';
import { aggregate, countRelevant, evaluateRow } from './metrics.js';
import { bestThreshold, sweepThresholds } from './thresholdTuning.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

/** Đọc CSV có dấu ngoặc kép, dòng đầu là tiêu đề. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const endRow = () => {
    row.push(cell);
    cell = '';
    if (row.some((c) => c.trim() !== '')) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      endRow();
    } else cell += ch;
  }
  endRow();
  const [header, ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

const pct = (v) => (v === null || v === undefined ? '-' : `${(v * 100).toFixed(1)}%`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const csvPath = path.resolve(opt('csv', path.join(here, 'goldenQA', 'golden_qa.csv')));
  const k = Number(opt('k', env.TOP_K));
  const threshold = Number(opt('threshold', env.CONFIDENCE_THRESHOLD));
  const defaultClass = opt('class', '');

  const rows = parseCsv(fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, ''))
    .map((r) => ({
      ...r,
      classId: r.classId || defaultClass,
      answerable: ['true', '1', 'yes', 'co', 'có'].includes((r.answerable ?? '').toLowerCase()),
    }))
    .filter((r) => r.question);

  if (rows.length === 0) throw new Error(`Không có câu hỏi nào trong ${csvPath}`);
  if (rows.some((r) => !r.classId)) throw new Error('Có dòng thiếu classId: thêm cột classId hoặc dùng --class');

  const chunkCache = new Map();
  const chunksOf = async (classId) => {
    if (!chunkCache.has(classId)) {
      const chunks = await prisma.chunk.findMany({
        where: { document: { classId, publishStatus: 'published' } },
        select: { id: true, text: true, documentId: true, document: { select: { fileName: true } } },
      });
      chunkCache.set(
        classId,
        chunks.map((c) => ({ id: c.id, text: c.text, documentId: c.documentId, fileName: c.document.fileName })),
      );
    }
    return chunkCache.get(classId);
  };

  const results = [];
  const warnings = [];
  for (const row of rows) {
    const hits = await retrieve({ question: row.question, classId: row.classId, topK: k });
    const relevantTotal = row.answerable ? countRelevant(await chunksOf(row.classId), row) : 0;
    if (row.answerable && relevantTotal === 0) {
      warnings.push(`Câu ${row.id}: không có đoạn nào khớp expectedDocumentId/expectedChunkHint (tài liệu chưa publish hoặc gợi ý sai)`);
    }
    results.push(evaluateRow({ row, hits, relevantTotal, k, threshold }));
    await sleep(200); // tránh vượt giới hạn gọi embedding
  }

  const summary = aggregate(results);
  const sweep = sweepThresholds(results);
  const best = bestThreshold(sweep);

  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const reportsDir = path.join(here, 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  const base = path.join(reportsDir, `eval-${stamp}`);
  fs.writeFileSync(`${base}.json`, JSON.stringify({ k, threshold, summary, sweep, best, warnings, results }, null, 2));

  const md = [
    `# Báo cáo đánh giá RAG (${new Date().toLocaleString('vi-VN')})`,
    '',
    `K = ${k}, ngưỡng hiện tại = ${threshold}, ${summary.answerable} câu có đáp án, ${summary.unanswerable} câu ngoài tài liệu`,
    '',
    '| Chỉ số | Giá trị |',
    '|---|---|',
    `| Hit-rate@${k} | ${pct(summary.hitRate)} |`,
    `| Precision@${k} | ${pct(summary.precision)} |`,
    `| Recall@${k} | ${pct(summary.recall)} |`,
    `| MRR | ${summary.mrr ?? '-'} |`,
    `| Từ chối nhầm (câu có đáp án) | ${pct(summary.falseRefusalRate)} |`,
    `| Từ chối đúng (câu ngoài tài liệu) | ${pct(summary.correctRefusalRate)} |`,
    '',
    '## Quét ngưỡng tin cậy',
    '',
    '| Ngưỡng | Trả lời đúng khi có đáp án | Từ chối đúng khi ngoài tài liệu | Cân bằng |',
    '|---|---|---|---|',
    ...sweep.map((s) => `| ${s.threshold} | ${pct(s.answerRate)} | ${pct(s.correctRefusalRate)} | ${s.balanced} |`),
    '',
    `Ngưỡng gợi ý: **${best?.threshold ?? '-'}**`,
    ...(warnings.length ? ['', '## Cảnh báo dữ liệu', ...warnings.map((w) => `- ${w}`)] : []),
  ].join('\n');
  fs.writeFileSync(`${base}.md`, md);

  console.table({
    [`Hit-rate@${k}`]: pct(summary.hitRate),
    [`Precision@${k}`]: pct(summary.precision),
    [`Recall@${k}`]: pct(summary.recall),
    MRR: summary.mrr,
    'Từ chối nhầm': pct(summary.falseRefusalRate),
    'Từ chối đúng': pct(summary.correctRefusalRate),
  });
  console.log(`Ngưỡng hiện tại ${threshold}, ngưỡng gợi ý ${best?.threshold ?? '-'}`);
  warnings.forEach((w) => console.warn(`CẢNH BÁO: ${w}`));
  console.log(`Đã ghi báo cáo: ${base}.md và .json`);
}

try {
  await main();
} catch (error) {
  console.error('Lỗi:', error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}