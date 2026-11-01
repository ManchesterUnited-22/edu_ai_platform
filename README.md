# Nền tảng hỗ trợ học tập ứng dụng AI (RAG) – bản JavaScript

Đồ án cơ sở 4 – Ngô Văn Lập (24IT137) – GVHD: TS. Huỳnh Ngọc Thọ.

Nền tảng đa vai trò (Giáo viên – Học sinh – Phụ huynh) tích hợp RAG:
chunking → embedding (Google text-embedding-004) → vector search (ChromaDB, cosine)
→ ngưỡng tin cậy → sinh câu trả lời bằng Gemini kèm trích dẫn nguồn.

## Công nghệ (100% JavaScript)
- Backend: Node.js 20 + Express (ES Modules), Prisma + PostgreSQL
- Vector DB: ChromaDB | Graph DB: Neo4j
- LLM: Gemini API (`@google/generative-ai`, structured output)
- OCR: tesseract.js (tiếng Việt) | PDF: pdf-parse | Word: mammoth
- Frontend: React + Vite (JSX)

## Chạy nhanh
```bash
cp .env.example .env      # điền GEMINI_API_KEY
make up                   # docker compose
make migrate
make seed
```
- Frontend: http://localhost:5173
- API: http://localhost:8000/health

## Chạy không dùng Docker
```bash
cd backend  && npm install && npm run dev
cd frontend && npm install && npm run dev
```

## Cấu trúc
- `backend/`    API + RAG engine + xử lý tài liệu
- `frontend/`   giao diện 3 vai trò
- `evaluation/` golden QA set, đo hit-rate/precision/recall
- `docs/`       thiết kế, wireframe, báo cáo
- `data/`       dữ liệu chạy cục bộ (không commit)
