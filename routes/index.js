import { Router } from 'express';
import AppController from '../controllers/AppController.js';
import UsersController from '../controllers/UsersController.js';
import AuthController from '../controllers/AuthController.js';
import FilesController from '../controllers/FilesController.js';

const router = Router();

/** Task 2: App status & stats */
router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);

/** Task 3: Users */
router.post('/users', UsersController.postNew);

/** Task 4: Auth */
router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisconnect);
router.get('/users/me', UsersController.getMe);

/** Task 5–7: Files */
/* create (upload/folder) */
router.post('/files', FilesController.postUpload);
/* list BEFORE id (avoid route shadowing) */
router.get('/files', FilesController.getIndex);
/* publish / unpublish BEFORE /files/:id */
router.put('/files/:id/publish', FilesController.putPublish);
router.put('/files/:id/unpublish', FilesController.putUnpublish);
/* show (last) */
router.get('/files/:id', FilesController.getShow);

export default router;

