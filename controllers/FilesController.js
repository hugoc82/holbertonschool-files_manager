import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db.mjs';
import redisClient from '../utils/redis.mjs';

const VALID_TYPES = new Set(['folder', 'file', 'image']);
const DEFAULT_STORAGE = '/tmp/files_manager';

export default class FilesController {
  // ... (postUpload tel que déjà fait)

  static async getShow(req, res) {
    try {
      const token = req.header('X-Token');
      if (!token) return res.status(401).json({ error: 'Unauthorized' });

      const userIdStr = await redisClient.get(`auth_${token}`);
      if (!userIdStr) return res.status(401).json({ error: 'Unauthorized' });

      const filesCol = dbClient.db.collection('files');

      let fileId;
      try {
        fileId = new ObjectId(req.params.id);
      } catch {
        return res.status(404).json({ error: 'Not found' });
      }

      const file = await filesCol.findOne({
        _id: fileId,
        userId: new ObjectId(userIdStr),
      });

      if (!file) return res.status(404).json({ error: 'Not found' });

      return res.status(200).json({
        id: file._id.toString(),
        userId: file.userId.toString(),
        name: file.name,
        type: file.type,
        isPublic: Boolean(file.isPublic),
        parentId: file.parentId === 0 ? 0 : file.parentId?.toString(),
      });
    } catch {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  static async getIndex(req, res) {
    try {
      const token = req.header('X-Token');
      if (!token) return res.status(401).json({ error: 'Unauthorized' });

      const userIdStr = await redisClient.get(`auth_${token}`);
      if (!userIdStr) return res.status(401).json({ error: 'Unauthorized' });

      const { parentId, page = 0 } = req.query;
      const pageNum = Number.isNaN(parseInt(page, 10)) ? 0 : parseInt(page, 10);
      const limit = 20;
      const skip = pageNum * limit;

      const filesCol = dbClient.db.collection('files');

      // parentId par défaut = 0
      let parentMatch;
      if (!parentId || parentId === '0' || parentId === 0) {
        parentMatch = 0;
      } else {
        try {
          parentMatch = new ObjectId(parentId);
        } catch {
          // parentId invalide => aucun résultat
          return res.status(200).json([]);
        }
      }

      const cursor = filesCol.find({
        userId: new ObjectId(userIdStr),
        parentId: parentMatch,
      })
        .skip(skip)
        .limit(limit);

      const docs = await cursor.toArray();

      const out = docs.map((f) => ({
        id: f._id.toString(),
        userId: f.userId.toString(),
        name: f.name,
        type: f.type,
        isPublic: Boolean(f.isPublic),
        parentId: f.parentId === 0 ? 0 : f.parentId?.toString(),
      }));

      return res.status(200).json(out);
    } catch {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  static async postUpload(req, res) {
    // (garde ici exactement ta version précédente validée)
    // ...
  }
}

