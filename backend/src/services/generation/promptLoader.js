// Đọc file prompt trong src/prompts (có cache)
import fs from 'node:fs';

const cache = new Map();

export function loadPrompt(name) {
  if (!cache.has(name)) {
    const text = fs.readFileSync(new URL(`../../prompts/${name}.txt`, import.meta.url), 'utf8');
    cache.set(name, text.trim());
  }
  return cache.get(name);
}