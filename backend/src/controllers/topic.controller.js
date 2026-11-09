// Xử lý cây chủ đề, tiên quyết
import {
  createTopic,
  deleteTopic,
  listTopics,
  updateTopic,
} from '../services/graph/topicGraphService.js';
import { addPrerequisite, removePrerequisite } from '../services/graph/prerequisiteService.js';

const handle = (fn) => async (req, res, next) => {
  try {
    return await fn(req, res);
  } catch (error) {
    return next(error);
  }
};

export const list = handle(async (req, res) => res.json(await listTopics({ classId: req.classRecord.id })));

export const create = handle(async (req, res) => {
  const topic = await createTopic({ classId: req.classRecord.id, ...req.body });
  return res.status(201).json({ topic });
});

export const update = handle(async (req, res) => {
  const topic = await updateTopic({
    classId: req.classRecord.id,
    topicId: req.params.topicId,
    ...req.body,
  });
  return res.json({ topic });
});

export const remove = handle(async (req, res) => {
  await deleteTopic({ classId: req.classRecord.id, topicId: req.params.topicId });
  return res.status(204).end();
});

export const addPrereq = handle(async (req, res) => {
  await addPrerequisite({
    classId: req.classRecord.id,
    topicId: req.params.topicId,
    prerequisiteId: req.body.prerequisiteId,
  });
  return res.status(201).json({ ok: true });
});

export const removePrereq = handle(async (req, res) => {
  await removePrerequisite({
    classId: req.classRecord.id,
    topicId: req.params.topicId,
    prerequisiteId: req.params.prerequisiteId,
  });
  return res.status(204).end();
});