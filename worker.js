// worker.js (ESM pur, compatible checker)
// Lance: npm run start-worker  (ajoute "start-worker": "node worker.js" dans package.json)
import Queue from 'bull';
import imageThumbnail from 'image-thumbnail';
import { promises as fs } from 'fs';
import { ObjectId } from 'mongodb';
import dbClient from './utils/db.mjs';

// Queue Bull (utilise Redis local par défaut: 127.0.0.1:6379)
const fileQueue = new Queue('fileQueue');

fileQueue.process(async (job, done) => {
  try {
    const { fileId, userId } = job.data || {};
    if (!fileId) throw new Error('Missing fileId');
    if (!userId) throw new Error('Missing userId');

    const filesCol = dbClient.db.collection('files');
    let _id;
    try { _id = new ObjectId(fileId); } catch { throw new Error('File not found'); }

    const file = await filesCol.findOne({ _id, userId: new ObjectId(userId) });
    if (!file) throw new Error('File not found');
    if (!file.localPath) throw new Error('File not found');

    // Génère 3 thumbnails: 500, 250, 100
    const sizes = [500, 250, 100];
    for (const width of sizes) {
      try {
        const buffer = await imageThumbnail(file.localPath, { width });
        const outPath = `${file.localPath}_${width}`;
        await fs.writeFile(outPath, buffer, { flag: 'w' });
      } catch (e) {
        // On continue les autres tailles même si une échoue
      }
    }

    return done();
  } catch (err) {
    return done(err);
  }
});

// Log minimal
fileQueue.on('error', () => {});
fileQueue.on('failed', () => {});

