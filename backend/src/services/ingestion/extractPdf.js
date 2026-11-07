import fs from 'node:fs/promises';
// Import thẳng file lõi: index.js của pdf-parse tự đọc file test khi chạy dưới ES Module
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

/** @returns {Promise<{pageNumber:number, text:string}[]>} */
export async function extractPdf(filePath) {
  const buffer = await fs.readFile(filePath);
  const pages = [];

  await pdfParse(buffer, {
    pagerender: async (pageData) => {
      const content = await pageData.getTextContent({ normalizeWhitespace: false });
      let lastY;
      let text = '';
      for (const item of content.items) {
        const y = item.transform[5];
        text += lastY === undefined || lastY === y ? item.str : `\n${item.str}`;
        lastY = y;
      }
      pages.push(text);
      return text;
    },
  });

  return pages.map((text, index) => ({ pageNumber: index + 1, text }));
}