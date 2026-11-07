// Prisma giả lưu trong bộ nhớ, đủ dùng để test máy trạng thái xuất bản mà không cần Postgres
export function createFakePrisma({ documents = [], chunks = [] } = {}) {
  const db = {
    documents: documents.map((d) => ({ ...d })),
    chunks: chunks.map((c) => ({ embeddingId: null, pageNumber: null, ...c })),
  };

  const match = (row, where = {}) =>
    Object.entries(where).every(([key, cond]) =>
      cond && typeof cond === 'object' && 'in' in cond ? cond.in.includes(row[key]) : row[key] === cond,
    );

  const prisma = {
    db,
    failTransaction: false,
    document: {
      findUnique: async ({ where }) => {
        const d = db.documents.find((x) => x.id === where.id);
        return d ? { ...d } : null;
      },
      findMany: async ({ where } = {}) =>
        db.documents
          .filter((d) => match(d, where))
          .map((d) => ({
            ...d,
            chunks: db.chunks.filter((c) => c.documentId === d.id).map((c) => ({ id: c.id })),
          })),
      updateMany: async ({ where, data }) => {
        const rows = db.documents.filter((d) => match(d, where));
        rows.forEach((r) => Object.assign(r, data));
        return { count: rows.length };
      },
      update: async ({ where, data }) => {
        const row = db.documents.find((d) => d.id === where.id);
        Object.assign(row, data);
        return { ...row };
      },
    },
    chunk: {
      findMany: async ({ where } = {}) =>
        db.chunks
          .filter((c) => match(c, where))
          .sort((a, b) => a.chunkIndex - b.chunkIndex)
          .map((c) => ({ ...c })),
      findFirst: async ({ where }) => {
        const c = db.chunks.find((x) => match(x, where));
        return c ? { ...c } : null;
      },
      update: async ({ where, data }) => {
        const row = db.chunks.find((c) => c.id === where.id);
        Object.assign(row, data);
        return { ...row };
      },
      updateMany: async ({ where, data }) => {
        const rows = db.chunks.filter((c) => match(c, where));
        rows.forEach((r) => Object.assign(r, data));
        return { count: rows.length };
      },
    },
    // Chỉ hỗ trợ câu lệnh: UPDATE "Chunk" SET "embeddingId" = "id" WHERE "documentId" = ${id}
    $executeRaw: async (strings, ...values) => {
      db.chunks.filter((c) => c.documentId === values[0]).forEach((c) => {
        c.embeddingId = c.id;
      });
    },
    $transaction: async (arg) => {
      if (prisma.failTransaction) throw new Error('DB lỗi giữa chừng');
      return typeof arg === 'function' ? arg(prisma) : Promise.all(arg);
    },
  };
  return prisma;
}

/** Vector DB giả trong bộ nhớ (cùng giao diện với vectorStore.js). */
export function createFakeStore() {
  const byDoc = new Map(); // documentId -> Map(id -> item)
  return {
    byDoc,
    deleteByDocument: async (documentId) => {
      byDoc.delete(documentId);
    },
    upsertChunks: async (items) => {
      items.forEach((i) => {
        if (!byDoc.has(i.documentId)) byDoc.set(i.documentId, new Map());
        byDoc.get(i.documentId).set(i.id, i);
      });
    },
    listAllVectorIds: async () =>
      new Map([...byDoc].map(([docId, items]) => [docId, [...items.keys()]])),
  };
}