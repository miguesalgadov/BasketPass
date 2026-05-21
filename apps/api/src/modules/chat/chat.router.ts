import { Router } from 'express';
import { chatController } from './chat.controller';

const router = Router();

router.get('/', chatController.getMessages);
router.post('/', chatController.send);

export default router;
