import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db.mjs';
import redisClient from '../utils/redis.mjs';

export default class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Missing email' });
    if (!password) return res.status(400).json({ error: 'Missing password' });

    try {
      const usersCol = dbClient.db.collection('users');
      const existing = await usersCol.findOne({ email });
      if (existing) return res.status(400).json({ error: 'Already exist' });

      const sha1Password = crypto.createHash('sha1').update(password).digest('hex');
      const result = await usersCol.insertOne({ email, password: sha1Password });
      return res.status(201).json({ id: result.insertedId.toString(), email });
    } catch (_err) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  static async getMe(req, res) {
    try {
      const token = req.header('X-Token');
      if (!token) return res.status(401).json({ error: 'Unauthorized' });

      const key = `auth_${token}`;
      const userId = await redisClient.get(key);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const user = await dbClient.db.collection('users').findOne({ _id: new ObjectId(userId) });
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      return res.status(200).json({ id: user._id.toString(), email: user.email });
    } catch (_err) {
      return res.status(500).json({ error: 'Server error' });
    }
  }
}

