import { ObjectId } from 'mongodb';
import dbClient from '../utils/db.mjs';
import redisClient from '../utils/redis.mjs';

// ...

export default class FilesController {
  // ... postUpload reste tel quel

  static async getShow(req, res) {
    try {
      const token = req.header('X-Token');
      if (!token) return res.status(401).json({ error: 'Unauthorized' });

      let userIdStr = null;
      try {
        userIdStr = await redisClient.get(`auth_${token}`);
      } catch {
        // si Redis v2/v3 renvoie une erreur, on traite comme non autorisé
      }
      if (!userIdStr) return res.status(401).json({ error: 'Unauthorized' });

      let fileId;
      try {
        fileId = new ObjectId(req.params.id);
      } catch {
        return res.status(404).json({ error: 'Not found' });
      }

      const filesCol = dbClient.db.collection('files');
      const file = await filesCol.findOne({ _id: fileId, userId: new ObjectId(userIdStr) });
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

      let userIdStr = null;
      try {
        userIdStr = await redisClient.get(`auth_${token}`);
      } catch {
        // Redis down → on considère non autorisé
      }
      if (!userIdStr) return res.status(401).json({ error: 'Unauthorized' });

      const page = parseInt(req.query.page, 10);
      const pageNum = Number.isFinite(page) && page >= 0 ? page : 0;
      const limit = 20;
      const skip = pageNum * limit;

      const filesCol = dbClient.db.collection('files');

      // parentId sans validation forte (spéc du sujet)
      let parentMatch = 0;
      if (typeof req.query.parentId !== 'undefined' && req.query.parentId !== '0' && req.query.parentId !== 0) {
        try {
          parentMatch = new ObjectId(req.query.parentId);
        } catch {
          // parentId invalide => retourne liste vide (spéc: pas de validation, juste vide)
          return res.status(200).json([]);
        }
      }

      const pipeline = [
        { $match: { userId: new ObjectId(userIdStr), parentId: parentMatch } },
        { $sort: { _id: 1 } },
        { $skip: skip },
        { $limit: limit },
      ];

      const docs = await filesCol.aggregate(pipeline).toArray();

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
}

