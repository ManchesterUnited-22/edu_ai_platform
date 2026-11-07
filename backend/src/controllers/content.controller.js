// Xử lý nội dung AI sinh (đề cương, outline bài giảng)
import {
  deleteContent,
  getContent,
  listContents,
  transitionContent,
  updateContent,
} from '../services/generation/contentService.js';
import { generateLectureOutline } from '../services/generation/lectureOutlineService.js';
import { generateOutline } from '../services/generation/outlineService.js';

const handle = (fn) => async (req, res, next) => {
  try {
    return await fn(req, res);
  } catch (error) {
    return next(error);
  }
};

export const createOutline = handle(async (req, res) => {
  const content = await generateOutline({
    classId: req.classRecord.id,
    authorId: req.user.id,
    ...req.body,
  });
  return res.status(201).json({ content });
});

export const createLectureOutline = handle(async (req, res) => {
  const content = await generateLectureOutline({
    classId: req.classRecord.id,
    authorId: req.user.id,
    ...req.body,
  });
  return res.status(201).json({ content });
});

export const list = handle(async (req, res) => {
  const { type, status } = req.query;
  const contents = await listContents({
    user: req.user,
    classId: req.classRecord.id,
    type: ['outline', 'lecture_outline'].includes(type) ? type : undefined,
    status: ['draft', 'reviewed', 'published', 'revoked'].includes(status) ? status : undefined,
  });
  return res.json({ contents });
});

export const detail = handle(async (req, res) => {
  const content = await getContent({ user: req.user, contentId: req.params.contentId });
  return res.json({ content });
});

export const update = handle(async (req, res) => {
  const content = await updateContent({
    user: req.user,
    contentId: req.params.contentId,
    title: req.body.title,
    body: req.body.body,
  });
  return res.json({ content });
});

const transition = (action) =>
  handle(async (req, res) => {
    const content = await transitionContent({
      user: req.user,
      contentId: req.params.contentId,
      action,
    });
    return res.json({ content });
  });

export const review = transition('review');
export const publish = transition('publish');
export const unpublish = transition('unpublish');

export const remove = handle(async (req, res) => {
  await deleteContent({ user: req.user, contentId: req.params.contentId });
  return res.status(204).send();
});