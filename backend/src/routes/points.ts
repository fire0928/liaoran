import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

export const pointsRouter = Router();

// 获取积分余额
pointsRouter.get('/balance', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const account = db.prepare('SELECT * FROM point_accounts WHERE user_id = ?').get(req.userId!) as any;

  if (!account) {
    res.json({ code: 0, data: { balance: 0, lifetimeEarned: 0, lifetimeSpent: 0 } });
    return;
  }

  res.json({
    code: 0,
    data: {
      balance: account.balance,
      lifetimeEarned: account.lifetime_earned,
      lifetimeSpent: account.lifetime_spent,
    }
  });
});

// 获取积分记录
pointsRouter.get('/records', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const limit = parseInt(req.query.limit as string) || 50;
  const records = db.prepare(
    'SELECT * FROM point_records WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(req.userId!, limit);

  res.json({ code: 0, data: records });
});
