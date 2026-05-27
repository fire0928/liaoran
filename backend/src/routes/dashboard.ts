import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../config/database';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

export const dashboardRouter = Router();

// 所有后台 API 都需要管理员认证
dashboardRouter.use(authenticate, requireAdmin);

// === 数据仪表盘 ===
dashboardRouter.get('/dashboard', (req: AuthRequest, res: Response) => {
  const db = getDatabase();

  const totalUsers = (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as any).cnt;
  const todayNewUsers = (db.prepare(
    "SELECT COUNT(*) as cnt FROM users WHERE date(created_at) = date('now')"
  ).get() as any).cnt;

  const activeSessions = (db.prepare(
    "SELECT COUNT(*) as cnt FROM chat_sessions WHERE status = 'active' AND date(started_at) = date('now')"
  ).get() as any).cnt;

  const treeholePosts = (db.prepare(
    'SELECT COUNT(*) as cnt FROM treehole_entries WHERE is_deleted = 0'
  ).get() as any).cnt;

  const totalAssessments = (db.prepare(
    'SELECT COUNT(*) as cnt FROM assessment_records'
  ).get() as any).cnt;

  const crisisAlerts = (db.prepare(
    "SELECT COUNT(*) as cnt FROM user_portraits WHERE risk_level = 'high'"
  ).get() as any).cnt;

  const memberDistribution = db.prepare(
    'SELECT member_level, COUNT(*) as cnt FROM users GROUP BY member_level ORDER BY member_level'
  ).all();

  const dailyActive = db.prepare(`
    SELECT date(day) as day, COUNT(DISTINCT user_id) as count
    FROM (
      SELECT user_id, started_at as day FROM chat_sessions
      UNION ALL
      SELECT user_id, created_at as day FROM assessment_records
      UNION ALL
      SELECT user_id, created_at as day FROM treehole_entries
    )
    WHERE day >= date('now', '-7 days')
    GROUP BY date(day)
    ORDER BY day
  `).all();

  const totalScales = (db.prepare('SELECT COUNT(*) as cnt FROM assessment_scales').get() as any).cnt;
  const totalChats = (db.prepare('SELECT COUNT(*) as cnt FROM chat_messages').get() as any).cnt;

  res.json({
    code: 0,
    data: {
      summary: {
        totalUsers,
        todayNewUsers,
        activeSessions,
        treeholePosts,
        totalAssessments,
        crisisAlerts,
        totalScales,
        totalChats,
      },
      memberDistribution,
      dailyActive,
    }
  });
});

// === 用户管理 ===
dashboardRouter.get('/users', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;
  const search = req.query.search as string || '';
  const status = req.query.status as string || '';

  let where = 'WHERE 1=1';
  const params: any[] = [];
  if (search) {
    where += ' AND (u.phone LIKE ? OR u.nickname LIKE ? OR u.email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) {
    where += ' AND u.status = ?';
    params.push(status);
  }

  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM users u ${where}`).get(...params) as any).cnt;

  params.push(limit, offset);
  const users = db.prepare(
    `SELECT u.*, p.balance as points, up.risk_level as risk_level, up.stress_level
     FROM users u
     LEFT JOIN point_accounts p ON u.id = p.user_id
     LEFT JOIN user_portraits up ON u.id = up.user_id
     ${where}
     ORDER BY u.created_at DESC
     LIMIT ? OFFSET ?`
  ).all(...params);

  res.json({
    code: 0,
    data: {
      list: users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    }
  });
});

// 用户详情
dashboardRouter.get('/users/:id', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const user = db.prepare(
    `SELECT u.*, p.balance as points, p.lifetime_earned, p.lifetime_spent,
            up.risk_level, up.stress_level, up.emotional_stability, up.current_mood, up.personality_type
     FROM users u
     LEFT JOIN point_accounts p ON u.id = p.user_id
     LEFT JOIN user_portraits up ON u.id = up.user_id
     WHERE u.id = ?`
  ).get(req.params.id) as any;

  if (!user) {
    res.status(404).json({ code: 404, message: '用户不存在' });
    return;
  }

  // 统计数
  const assessCount = (db.prepare('SELECT COUNT(*) as cnt FROM assessment_records WHERE user_id = ?').get(req.params.id) as any).cnt;
  const chatCount = (db.prepare('SELECT COUNT(*) as cnt FROM chat_sessions WHERE user_id = ?').get(req.params.id) as any).cnt;

  res.json({ code: 0, data: { ...user, assessCount, chatCount } });
});

// 更新用户
dashboardRouter.put('/users/:id', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { nickname, status, phone, email, member_level } = req.body;

  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!existing) {
    res.status(404).json({ code: 404, message: '用户不存在' });
    return;
  }

  const fields: string[] = [];
  const values: any[] = [];
  if (nickname !== undefined) { fields.push('nickname = ?'); values.push(nickname); }
  if (status !== undefined) { fields.push('status = ?'); values.push(status); }
  if (phone !== undefined) { fields.push('phone = ?'); values.push(phone); }
  if (email !== undefined) { fields.push('email = ?'); values.push(email); }
  if (member_level !== undefined) { fields.push('member_level = ?'); values.push(member_level); }
  fields.push("updated_at = datetime('now')");

  values.push(req.params.id);
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  res.json({ code: 0, message: '用户已更新' });
});

// === 测评量表管理 ===
dashboardRouter.get('/assessments', (_req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const scales = db.prepare(`
    SELECT s.*, (SELECT COUNT(*) FROM assessment_records r WHERE r.scale_id = s.id) as completions
    FROM assessment_scales s
    ORDER BY s.created_at DESC
  `).all();
  res.json({ code: 0, data: scales });
});

// 创建量表
dashboardRouter.post('/assessments', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { name, category, description } = req.body;
  if (!name) {
    res.status(400).json({ code: 400, message: '量表名称不能为空' });
    return;
  }

  const id = uuidv4();
  db.prepare(
    'INSERT INTO assessment_scales (id, name, category, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))'
  ).run(id, name, category || '未分类', description || '', 'published');

  res.json({ code: 0, data: { id, name } });
});

// 更新量表
dashboardRouter.put('/assessments/:id', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { name, category, description, status } = req.body;

  const fields: string[] = [];
  const values: any[] = [];
  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (category !== undefined) { fields.push('category = ?'); values.push(category); }
  if (description !== undefined) { fields.push('description = ?'); values.push(description); }
  if (status !== undefined) { fields.push('status = ?'); values.push(status); }
  fields.push("updated_at = datetime('now')");

  values.push(req.params.id);
  db.prepare(`UPDATE assessment_scales SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  res.json({ code: 0, message: '量表已更新' });
});

// 删除量表
dashboardRouter.delete('/assessments/:id', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  db.prepare('DELETE FROM assessment_questions WHERE scale_id = ?').run(req.params.id);
  db.prepare('DELETE FROM assessment_scales WHERE id = ?').run(req.params.id);
  res.json({ code: 0, message: '量表已删除' });
});

// 获取量表题目
dashboardRouter.get('/assessments/:id/questions', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const questions = db.prepare(
    'SELECT * FROM assessment_questions WHERE scale_id = ? ORDER BY question_order'
  ).all(req.params.id);

  // 解析 options JSON
  const parsed = (questions as any[]).map(q => ({
    ...q,
    options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
    option_labels: typeof q.option_labels === 'string' ? JSON.parse(q.option_labels) : q.option_labels,
  }));

  res.json({ code: 0, data: parsed });
});

// 添加题目
dashboardRouter.post('/assessments/:id/questions', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { question_text, options, option_labels, dimension, reverse_score, question_order } = req.body;

  const maxOrder = (db.prepare(
    'SELECT MAX(question_order) as mx FROM assessment_questions WHERE scale_id = ?'
  ).get(req.params.id) as any)?.mx || 0;

  const id = uuidv4();
  db.prepare(
    'INSERT INTO assessment_questions (id, scale_id, question_text, options, option_labels, dimension, reverse_score, question_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.params.id, question_text, JSON.stringify(options || []), JSON.stringify(option_labels || []),
       dimension || '', reverse_score ? 1 : 0, question_order || (maxOrder + 1));

  // 更新 scale 问题的数量
  db.prepare(
    'UPDATE assessment_scales SET question_count = (SELECT COUNT(*) FROM assessment_questions WHERE scale_id = ?), updated_at = datetime(\'now\') WHERE id = ?'
  ).run(req.params.id, req.params.id);

  res.json({ code: 0, data: { id } });
});

// 更新题目
dashboardRouter.put('/assessments/:scaleId/questions/:qId', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { question_text, options, option_labels, dimension, reverse_score, question_order } = req.body;

  const fields: string[] = [];
  const values: any[] = [];
  if (question_text !== undefined) { fields.push('question_text = ?'); values.push(question_text); }
  if (options !== undefined) { fields.push('options = ?'); values.push(JSON.stringify(options)); }
  if (option_labels !== undefined) { fields.push('option_labels = ?'); values.push(JSON.stringify(option_labels)); }
  if (dimension !== undefined) { fields.push('dimension = ?'); values.push(dimension); }
  if (reverse_score !== undefined) { fields.push('reverse_score = ?'); values.push(reverse_score ? 1 : 0); }
  if (question_order !== undefined) { fields.push('question_order = ?'); values.push(question_order); }

  values.push(req.params.qId);
  db.prepare(`UPDATE assessment_questions SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  res.json({ code: 0, message: '题目已更新' });
});

// 删除题目
dashboardRouter.delete('/assessments/:scaleId/questions/:qId', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  db.prepare('DELETE FROM assessment_questions WHERE id = ? AND scale_id = ?').run(req.params.qId, req.params.scaleId);

  db.prepare(
    'UPDATE assessment_scales SET question_count = (SELECT COUNT(*) FROM assessment_questions WHERE scale_id = ?), updated_at = datetime(\'now\') WHERE id = ?'
  ).run(req.params.scaleId, req.params.scaleId);

  res.json({ code: 0, message: '题目已删除' });
});

// === 树洞审核 ===
dashboardRouter.get('/treehole', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const status = req.query.status as string || '';
  let where = 'WHERE t.is_deleted = 0';
  const params: any[] = [];
  if (status) {
    where += ' AND t.review_status = ?';
    params.push(status);
  }
  const entries = db.prepare(
    `SELECT t.*, u.nickname
     FROM treehole_entries t
     JOIN users u ON t.user_id = u.id
     ${where}
     ORDER BY t.created_at DESC
     LIMIT 50`
  ).all(...params);

  res.json({ code: 0, data: entries });
});

// 审核通过
dashboardRouter.put('/treehole/:id/approve', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  db.prepare("UPDATE treehole_entries SET review_status = 'approved', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
  res.json({ code: 0, message: '已通过审核' });
});

// 审核拒绝
dashboardRouter.put('/treehole/:id/reject', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  db.prepare("UPDATE treehole_entries SET review_status = 'rejected', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
  res.json({ code: 0, message: '已拒绝' });
});

// 软删除
dashboardRouter.delete('/treehole/:id', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  db.prepare("UPDATE treehole_entries SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?").run(req.params.id);
  res.json({ code: 0, message: '已删除' });
});

// === 危机预警 ===
dashboardRouter.get('/crisis', (_req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const highRiskUsers = db.prepare(
    `SELECT up.*, u.nickname, u.phone, u.email, u.status as user_status,
            (SELECT MAX(created_at) FROM chat_sessions WHERE user_id = u.id) as last_interaction_at
     FROM user_portraits up
     JOIN users u ON up.user_id = u.id
     WHERE up.risk_level = 'high'
     ORDER BY up.updated_at DESC`
  ).all();

  res.json({ code: 0, data: highRiskUsers });
});

// === 操作日志 ===
dashboardRouter.get('/logs', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const limit = parseInt(req.query.limit as string) || 100;
  const logs = db.prepare(
    'SELECT * FROM operation_logs ORDER BY created_at DESC LIMIT ?'
  ).all(limit);

  res.json({ code: 0, data: logs });
});

// === 系统配置 ===
dashboardRouter.get('/settings', (_req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const configs = db.prepare('SELECT * FROM system_configs').all();
  res.json({ code: 0, data: configs });
});

dashboardRouter.put('/settings', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { key, value } = req.body;

  if (!key) {
    res.status(400).json({ code: 400, message: '缺少配置 key' });
    return;
  }

  const existing = db.prepare('SELECT * FROM system_configs WHERE config_key = ?').get(key);
  if (existing) {
    db.prepare("UPDATE system_configs SET config_value = ?, updated_at = datetime('now') WHERE config_key = ?").run(String(value), key);
  } else {
    db.prepare('INSERT INTO system_configs (id, config_key, config_value) VALUES (?, ?, ?)').run(uuidv4(), key, String(value));
  }

  res.json({ code: 0, message: '配置已更新' });
});
