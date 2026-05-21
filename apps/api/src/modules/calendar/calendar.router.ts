import { Router } from 'express';
import { authenticate } from '@/middlewares/auth.middleware';
import { calendarController } from './calendar.controller';

const router = Router();

// Authenticated: issue a long-lived calendar feed token
router.get('/token', authenticate, calendarController.getToken);

// Public: iCalendar feed consumed by Google Calendar / Apple Calendar / Outlook
router.get('/feed.ics', calendarController.getFeed);

export default router;
