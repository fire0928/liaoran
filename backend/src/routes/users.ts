import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

export const userRouter = Router();

// 更新用户资料
userRouter.put('/profile', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { nickname, avatar, gender, birthday, city, occupation, education } = req.body;
  const userId = req.userId!;

  const fields: string[] = [];
  const values: any[] = [];

  if (nickname !== undefined) { fields.push('nickname = ?'); values.push(nickname); }
  if (avatar !== undefined) { fields.push('avatar = ?'); values.push(avatar); }
  if (gender !== undefined) { fields.push('gender = ?'); values.push(gender); }
  if (birthday !== undefined) { fields.push('birthday = ?'); values.push(birthday); }
  if (city !== undefined) { fields.push('city = ?'); values.push(city); }
  if (occupation !== undefined) { fields.push('occupation = ?'); values.push(occupation); }
  if (education !== undefined) { fields.push('education = ?'); values.push(education); }

  if (fields.length === 0) {
    res.status(400).json({ code: 400, message: '没有需要更新的字段' });
    return;
  }

  fields.push('updated_at = datetime(\'now\')');
  values.push(userId);

  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  res.json({
    code: 0,
    data: {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      gender: user.gender,
      birthday: user.birthday,
      city: user.city,
      occupation: user.occupation,
      education: user.education,
    }
  });
});

// 每日心情打卡
userRouter.post('/checkin', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { mood, moodIntensity, note } = req.body;
  const userId = req.userId!;
  const today = new Date().toISOString().split('T')[0];

  if (!mood) {
    res.status(400).json({ code: 400, message: '请选择心情' });
    return;
  }

  const existing = db.prepare(
    'SELECT id FROM daily_checkins WHERE user_id = ? AND checkin_date = ?'
  ).get(userId, today);

  if (existing) {
    // 更新已有打卡
    db.prepare(
      'UPDATE daily_checkins SET mood = ?, mood_intensity = ?, note = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).run(mood, moodIntensity || 3, note || '', (existing as any).id);
  } else {
    db.prepare(
      'INSERT INTO daily_checkins (id, user_id, mood, mood_intensity, note, checkin_date) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(uuidv4(), userId, mood, moodIntensity || 3, note || '', today);

    // 送积分
    const addPoints = db.prepare('SELECT add_points(?, ?, ?)').run || db.prepare(
      'UPDATE point_accounts SET balance = balance + 10, lifetime_earned = lifetime_earned + 10, updated_at = datetime(\'now\') WHERE user_id = ?'
    );
    db.prepare(
      'UPDATE point_accounts SET balance = balance + 10, lifetime_earned = lifetime_earned + 10, updated_at = datetime(\'now\') WHERE user_id = ?'
    ).run(userId);

    db.prepare(
      'INSERT INTO point_records (id, user_id, amount, type, description) VALUES (?, ?, ?, ?, ?)'
    ).run(uuidv4(), userId, 10, 'checkin', '每日打卡奖励');

    // 更新画像
    db.prepare(
      'UPDATE user_portraits SET current_mood = ?, last_interaction_at = datetime(\'now\') WHERE user_id = ?'
    ).run(mood, userId);
  }

  // 计算连续打卡天数
  const records = db.prepare(
    'SELECT checkin_date FROM daily_checkins WHERE user_id = ? ORDER BY checkin_date DESC'
  ).all(userId) as any[];

  let streak = 0;
  for (let i = 0; i < records.length; i++) {
    const expected = new Date();
    expected.setDate(expected.getDate() - i);
    if (records[i].checkin_date === expected.toISOString().split('T')[0]) {
      streak++;
    } else {
      break;
    }
  }

  res.json({
    code: 0,
    data: {
      mood,
      moodIntensity: moodIntensity || 3,
      streak,
      pointsEarned: existing ? 0 : 10,
      message: existing ? '心情已更新' : '打卡成功，+10积分！'
    }
  });
});

// 获取打卡历史
userRouter.get('/checkins', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const limit = parseInt(req.query.limit as string) || 30;
  const records = db.prepare(
    'SELECT * FROM daily_checkins WHERE user_id = ? ORDER BY checkin_date DESC LIMIT ?'
  ).all(req.userId!, limit);

  res.json({ code: 0, data: records });
});

// 获取用户统计数据
userRouter.get('/stats', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const userId = req.userId!;

  const assessCount = (db.prepare(
    'SELECT COUNT(*) as cnt FROM assessment_records WHERE user_id = ?'
  ).get(userId) as any).cnt;

  const chatCount = (db.prepare(
    'SELECT COUNT(*) as cnt FROM chat_sessions WHERE user_id = ?'
  ).get(userId) as any).cnt;

  const treeholeCount = (db.prepare(
    'SELECT COUNT(*) as cnt FROM treehole_entries WHERE user_id = ? AND is_deleted = 0'
  ).get(userId) as any).cnt;

  const checkinCount = (db.prepare(
    'SELECT COUNT(*) as cnt FROM daily_checkins WHERE user_id = ?'
  ).get(userId) as any).cnt;

  // 计算连续打卡
  const records = db.prepare(
    'SELECT checkin_date FROM daily_checkins WHERE user_id = ? ORDER BY checkin_date DESC'
  ).all(userId) as any[];

  let streak = 0;
  for (let i = 0; i < records.length; i++) {
    const expected = new Date();
    expected.setDate(expected.getDate() - i);
    if (records[i].checkin_date === expected.toISOString().split('T')[0]) {
      streak++;
    } else {
      break;
    }
  }

  res.json({
    code: 0,
    data: {
      assessCount,
      chatCount,
      treeholeCount,
      checkinCount,
      streak,
    }
  });
});
