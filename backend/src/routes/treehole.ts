import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

export const treeholeRouter = Router();

// 获取树洞帖子列表
treeholeRouter.get('/entries', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;

  const entries = db.prepare(
    `SELECT id, user_id, content, mood, mood_intensity, privacy,
            created_at, updated_at
     FROM treehole_entries
     WHERE is_deleted = 0 AND privacy != 'private'
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  ).all(limit, offset);

  res.json({ code: 0, data: entries });
});

// 获取我的树洞
treeholeRouter.get('/my', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const entries = db.prepare(
    `SELECT * FROM treehole_entries
     WHERE user_id = ? AND is_deleted = 0
     ORDER BY created_at DESC`
  ).all(req.userId!);

  res.json({ code: 0, data: entries });
});

// 发布树洞
treeholeRouter.post('/entries', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { content, mood, moodIntensity, images, privacy } = req.body;

  if (!content || !content.trim()) {
    res.status(400).json({ code: 400, message: '请输入内容' });
    return;
  }

  const entryId = uuidv4();

  db.prepare(
    `INSERT INTO treehole_entries (id, user_id, content, mood, mood_intensity, images, privacy)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(entryId, req.userId!, content.trim(), mood || 'other', moodIntensity || 5, JSON.stringify(images || []), privacy || 'private');

  // 积分奖励
  db.prepare(
    'UPDATE point_accounts SET balance = balance + 5, lifetime_earned = lifetime_earned + 5, updated_at = datetime(\'now\') WHERE user_id = ?'
  ).run(req.userId!);

  db.prepare(
    'INSERT INTO point_records (id, user_id, amount, type, description) VALUES (?, ?, ?, ?, ?)'
  ).run(uuidv4(), req.userId!, 5, 'treehole', '发布树洞');

  // 更新画像
  if (mood) {
    db.prepare(
      'UPDATE user_portraits SET current_mood = ?, last_interaction_at = datetime(\'now\') WHERE user_id = ?'
    ).run(mood, req.userId!);
  }

  res.status(201).json({
    code: 0,
    data: {
      id: entryId,
      content: content.trim(),
      mood,
      moodIntensity: moodIntensity || 5,
      privacy: privacy || 'private',
      createdAt: new Date().toISOString(),
    },
    message: '树洞发布成功！+5积分',
  });
});

// 删除树洞
treeholeRouter.delete('/entries/:id', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();

  const entry = db.prepare(
    'SELECT * FROM treehole_entries WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId!) as any;

  if (!entry) {
    res.status(404).json({ code: 404, message: '记录不存在' });
    return;
  }

  db.prepare(
    'UPDATE treehole_entries SET is_deleted = 1, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(req.params.id);

  res.json({ code: 0, message: '已删除' });
});

// 心情统计
treeholeRouter.get('/mood-stats', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const stats = db.prepare(
    `SELECT mood, COUNT(*) as count, AVG(mood_intensity) as avg_intensity
     FROM treehole_entries
     WHERE user_id = ? AND is_deleted = 0
     GROUP BY mood
     ORDER BY count DESC`
  ).all(req.userId!);

  res.json({ code: 0, data: stats });
});
