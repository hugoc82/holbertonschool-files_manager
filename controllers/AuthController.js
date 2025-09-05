import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db.mjs';
import redisClient from '../utils/redis.mjs';

const TOKEN_TTL_SECONDS = 24 * 60 * 60; // 24h

export default class AuthController {
  static async getConnect(req, res) {
    try {
      const auth = req.header('Authorization') || '';
      if (!auth.startsWith('Basic ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const b64 = auth.slice('Basic '.length);
      let email = '';
      let password = '';
      try {
        const [e, p] = Buffer.from(b64, 'base64').toString('utf-8').split(':');
        email = e || '';
        password = p || '';
      } catch (_e) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!email || !password) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // hash SHA1 comme en création
      const sha1Password = crypto.createHash('sha1').update(password).digest('hex');

      const user = await dbClient.db.collection('users').findOne({ email, password: sha1Password });
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = uuidv4();
      const key = `auth_${token}`;

      await redisClient.set(key, user._id.toString(), TOKEN_TTL_SECONDS);

      return res.status(200).json({ token });
    } catch (_err) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  static async getDisconnect(req, res) {
    try {
      const token = req.header('X-Token');
      if (!token) return res.status(401).json({ error: 'Unauthorized' });

      const key = `auth_${token}`;
      const userId = await redisClient.get(key);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      await redisClient.del(key);
      return res.status(204).send();
    } catch (_err) {
      return res.status(500).json({ error: 'Server error' });
    }
  }
}

