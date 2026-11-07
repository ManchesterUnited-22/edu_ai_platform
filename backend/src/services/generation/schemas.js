// JSON schema gửi cho Gemini (structured output). Dùng kiểu viết hoa theo REST API của Gemini.
const strings = { type: 'ARRAY', items: { type: 'STRING' } };

export const outlineJsonSchema = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    summary: { type: 'STRING' },
    sections: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { heading: { type: 'STRING' }, points: strings, keyTerms: strings },
        required: ['heading', 'points'],
      },
    },
  },
  required: ['title', 'summary', 'sections'],
};

export const lectureOutlineJsonSchema = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    objectives: strings,
    sections: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          minutes: { type: 'INTEGER' },
          points: strings,
          activity: { type: 'STRING' },
        },
        required: ['title', 'minutes', 'points', 'activity'],
      },
    },
  },
  required: ['title', 'objectives', 'sections'],
};

export const questionsJsonSchema = {
  type: 'OBJECT',
  properties: {
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          text: { type: 'STRING' },
          options: strings,
          correctIndex: { type: 'INTEGER' },
          explanation: { type: 'STRING' },
          topic: { type: 'STRING' },
          difficulty: { type: 'INTEGER' },
          sourceRef: { type: 'INTEGER' },
        },
        required: ['text', 'options', 'correctIndex', 'explanation', 'topic', 'difficulty', 'sourceRef'],
      },
    },
  },
  required: ['questions'],
};