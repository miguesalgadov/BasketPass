import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { playersController } from './players.controller';
import { requireRole } from '@/middlewares/rbac.middleware';

const uploadDir = path.join(process.cwd(), '../web/public/players');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, _file, cb) => cb(null, `${(req as any).user.id}.jpg`),
});
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
}).single('avatar');

const router = Router();

router.get('/', playersController.getAll);
router.get('/me', playersController.getMe);
router.get('/me/dashboard', playersController.getDashboard);
router.post('/me/avatar', uploadAvatar, playersController.uploadAvatar);
router.post('/import', requireRole('CLUB_ADMIN'), playersController.importPlayers);
router.get('/:id', playersController.getById);
router.post('/', requireRole('CLUB_ADMIN', 'COACH'), playersController.create);
router.patch('/:id', requireRole('CLUB_ADMIN', 'COACH'), playersController.update);
router.delete('/:id', requireRole('CLUB_ADMIN'), playersController.deactivate);

export default router;
