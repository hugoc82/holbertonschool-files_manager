import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db.mjs';
import redisClient from '../utils/redis.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALID_TYPES = new Set(['folder', 'file', 'image']);
const DEFAULT_STORAGE = '/tmp/files_manager';

export default class FilesController {
  static async postUpload(req, res) {
    try {
      // 1) Auth via X-Token
      const token = req.header('X-Token');
      if (!token) return res.status(401).json({ error: 'Unauthorized' });

      const userIdStr = await redisClient.get(`auth_${token}`);
      if (!userIdStr) return res.status(401).json({ error: 'Unauthorized' });

      const usersCol = dbClient.db.collection('users');
      const user = await usersCol.findOne({ _id: new ObjectId(userIdStr) });
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      // 2) Inputs
      const {
        name,
        type,
        parentId = 0,
        isPublic = false,
        data,
      } = req.body || {};

      if (!name) return res.status(400).json({ error: 'Missing name' });
      if (!type || !VALID_TYPES.has(type)) {
        return res.status(400).json({ error: 'Missing type' });
      }
      if (type !== 'folder' && !data) {
        return res.status(400).json({ error: 'Missing data' });
      }

      const filesCol = dbClient.db.collection('files');

      // 3) Parent checks (si parentId fourni et != 0)
      let parent = null;
      let parentIdToStore = 0;
      if (parentId && parentId !== 0 && parentId !== '0') {
        try {
          parent = await filesCol.findOne({ _id: new ObjectId(parentId) });
        } catch (_e) {
          // parentId invalide
          return res.status(400).json({ error: 'Parent not found' });
        }
        if (!parent) return res.status(400).json({ error: 'Parent not found' });
        if (parent.type !== 'folder') {
          return res.status(400).json({ error: 'Parent is not a folder' });
        }
        parentIdToStore = parent._id; // ObjectId
      } else {
        parentIdToStore = 0; // racine
      }

      // 4) Construire le document
      const doc = {
        userId: new ObjectId(user._id),
        name,
        type,
        isPublic: Boolean(isPublic),
        parentId: parentIdToStore,
      };

      // 5) Si dossier: on insère directement
      if (type === 'folder') {
        const result = await filesCol.insertOne(doc);
        return res
          .status(201)
          .json({
            id: result.insertedId.toString(),
            userId: user._id.toString(),
            name,
            type,
            isPublic: Boolean(isPublic),
            parentId: parentIdToStore === 0 ? 0 : parentIdToStore.toString(),
          });
      }

      // 6) Sinon: file/image -> stockage sur disque
      const rootFolder = process.env.FOLDER_PATH && process.env.FOLDER_PATH.trim()
        ? process.env.FOLDER_PATH.trim()
        : DEFAULT_STORAGE;

      await fs.mkdir(rootFolder, { recursive: true });

      const filename = uuidv4();
      const localPath = path.join(rootFolder, filename);

      // data est en base64
      let fileContent;
      try {
        fileContent = Buffer.from(data, 'base64');
      } catch (_e) {
        return res.status(400).json({ error: 'Missing data' });
      }

      await fs.writeFile(localPath, fileContent, { flag: 'w' });

      doc.localPath = localPath;

      const result = await filesCol.insertOne(doc);

      return res
        .status(201)
        .json({
          id: result.insertedId.toString(),
          userId: user._id.toString(),
          name,
          type,
          isPublic: Boolean(isPublic),
          parentId: parentIdToStore === 0 ? 0 : parentIdToStore.toString(),
        });
    } catch (err) {
      // console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
}

