import { Router, Request, Response, NextFunction } from 'express';
import { dbState, memDb } from '../config/database';
import { NotificationModel } from '../models/Notification';
import { authenticateJWT } from '../middleware/auth';

const router = Router();
router.use(authenticateJWT);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    if (dbState.mode === 'mongodb') {
      const list = await NotificationModel.find({ userId }).sort({ createdAt: -1 }).limit(30).lean();
      res.json({ success: true, count: list.length, data: list });
    } else {
      const list = Array.from(memDb.notifications.values())
        .filter((n: any) => n.userId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json({ success: true, count: list.length, data: list });
    }
  } catch (error) {
    next(error);
  }
});

router.post('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id;

    if (dbState.mode === 'mongodb') {
      await NotificationModel.findOneAndUpdate({ _id: id, userId }, { isRead: true });
    } else {
      const notif = memDb.notifications.get(id);
      if (notif && notif.userId === userId) {
        notif.isRead = true;
      }
    }

    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    next(error);
  }
});

export default router;
