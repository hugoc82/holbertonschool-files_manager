import crypto from 'crypto';
import dbClient from '../utils/db.mjs';

export default class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body || {};

    if (!email) return res.status(400).json({ error: 'Missing email' });
    if (!password) return res.status(400).json({ error: 'Missing password' });

    try {
      const usersCol = dbClient.db.collection('users');

      // Déjà existant ?
      const existing = await usersCol.findOne({ email });
      if (existing) return res.status(400).json({ error: 'Already exist' });

      // Hash SHA1
      const sha1Password = crypto.createHash('sha1').update(password).digest('hex');

      // Insertion
      const result = await usersCol.insertOne({ email, password: sha1Password });

      return res.status(201).json({ id: result.insertedId.toString(), email });
    } catch (err) {
      // En cas d’erreur DB imprévue
      return res.status(500).json({ error: 'Server error' });
    }
  }
}

