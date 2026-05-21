import path from 'path';
import fs from 'fs';
import { Router } from 'express';
import multer from 'multer';
import { requireRole } from '@/middlewares/rbac.middleware';
import { finanzasController } from './finanzas.controller';
import { AuthenticatedRequest } from '@/middlewares/auth.middleware';

const adminOnly = requireRole('CLUB_ADMIN', 'SUPER_ADMIN');

const evidenceStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const clubId = (req as AuthenticatedRequest).user?.clubId ?? 'unknown';
    const dir = path.join(process.cwd(), '..', 'web', 'public', 'evidences', clubId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const uploadEvidence = multer({
  storage: evidenceStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  },
}).single('file');

function evidenceUpload(req: any, res: any, next: any) {
  uploadEvidence(req, res, (multerErr) => {
    if (multerErr) {
      return res.status(400).json({ success: false, error: { message: multerErr.message } });
    }
    next();
  });
}

const router = Router();

router.get('/account',                              adminOnly, finanzasController.getAccount);
router.post('/account/adjust',                      adminOnly, finanzasController.adjustBalance);
router.get('/dashboard',                            adminOnly, finanzasController.getDashboard);
router.get('/categories',                           adminOnly, finanzasController.getCategories);
router.get('/payment-stats',                        adminOnly, finanzasController.getPaymentStats);
router.get('/transactions',                         adminOnly, finanzasController.getTransactions);
router.post('/transactions',                        adminOnly, finanzasController.createTransaction);
router.post('/transactions/:id/void',               adminOnly, finanzasController.voidTransaction);
router.post('/transactions/:id/evidence', adminOnly, evidenceUpload, finanzasController.addEvidence);
router.delete('/evidence/:evidenceId',              adminOnly, finanzasController.deleteEvidence);

export default router;
