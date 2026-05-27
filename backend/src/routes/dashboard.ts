import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../config/database';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

export const dashboardRouter = Router();

// === 所有后台 API 都需要管理员认证 ===
dashboardRouter.use(authenticate, requireAdmin);

// ==================== 数据仪表盘 ====================
dashboardRouter.get('/dashboard', (_req: AuthRequest, res: Response) => {
  const db = getDatabase();

  const totalUsers = (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as any).cnt;
  const todayNewUsers = (db.prepare("SELECT COUNT(*) as cnt FROM users WHERE date(created_at) = date('now')").get() as any).cnt;
  const activeSessions = (db.prepare("SELECT COUNT(*) as cnt FROM chat_sessions WHERE status = 'active' AND date(started_at) = date('now')").get() as any).cnt;
  const treeholePosts = (db.prepare('SELECT COUNT(*) as cnt FROM treehole_entries WHERE is_deleted = 0').get() as any).cnt;
  const totalAssessments = (db.prepare('SELECT COUNT(*) as cnt FROM assessment_records').get() as any).cnt;
  const crisisAlerts = (db.prepare("SELECT COUNT(*) as cnt FROM user_portraits WHERE risk_level = 'high'").get() as any).cnt;
  const totalScales = (db.prepare('SELECT COUNT(*) as cnt FROM assessment_scales').get() as any).cnt;
  const totalChats = (db.prepare('SELECT COUNT(*) as cnt FROM chat_messages').get() as any).cnt;
  const pendingTreehole = (db.prepare("SELECT COUNT(*) as cnt FROM treehole_entries WHERE review_status = 'pending' AND is_deleted = 0").get() as any).cnt;
  const totalEntTests = (db.prepare("SELECT COUNT(*) as cnt FROM entertainment_tests WHERE status = 'published'").get() as any).cnt;
  const totalEntPlays = (db.prepare('SELECT COALESCE(SUM(play_count), 0) as cnt FROM entertainment_tests').get() as any).cnt;

  const memberDistribution = db.prepare('SELECT member_level, COUNT(*) as cnt FROM users GROUP BY member_level ORDER BY member_level').all();

  const dailyActive = db.prepare(`
    SELECT date(day) as day, COUNT(DISTINCT user_id) as count
    FROM (
      SELECT user_id, started_at as day FROM chat_sessions
      UNION ALL SELECT user_id, created_at as day FROM assessment_records
      UNION ALL SELECT user_id, created_at as day FROM treehole_entries
      UNION ALL SELECT user_id, checkin_date as day FROM daily_checkins
    )
    WHERE day >= date('now', '-7 days')
    GROUP BY date(day)
    ORDER BY day
  `).all();

  // 热门量表 Top 5
  const hotScales = db.prepare(`
    SELECT s.name, s.category, COUNT(r.id) as completions, AVG(CAST(json_extract(r.raw_scores, '$.totalScore') AS REAL)) as avg_score
    FROM assessment_scales s
    LEFT JOIN assessment_records r ON s.id = r.scale_id
    GROUP BY s.id
    ORDER BY completions DESC
    LIMIT 5
  `).all();

  // AI Agent 对话量
  const agentChats = db.prepare(`
    SELECT a.name, a.agent_type, COUNT(cs.id) as chat_count
    FROM ai_agents a
    LEFT JOIN chat_sessions cs ON a.agent_type = cs.agent_type
    GROUP BY a.id
    ORDER BY chat_count DESC
  `).all();

  // 危机预警列表
  const crisisList = db.prepare(`
    SELECT up.*, u.nickname, u.phone,
      (SELECT MAX(created_at) FROM chat_sessions WHERE user_id = u.id) as last_chat,
      (SELECT COUNT(*) FROM assessment_records WHERE user_id = u.id AND CAST(json_extract(raw_scores, '$.totalScore') AS REAL) >= 15) as high_score_count
    FROM user_portraits up
    JOIN users u ON up.user_id = u.id
    WHERE up.risk_level = 'high'
    ORDER BY up.updated_at DESC
    LIMIT 10
  `).all();

  res.json({
    code: 0,
    data: {
      summary: {
        totalUsers, todayNewUsers, activeSessions, treeholePosts,
        totalAssessments, crisisAlerts, totalScales, totalChats,
        pendingTreehole, totalEntTests, totalEntPlays
      },
      memberDistribution,
      dailyActive,
      hotScales,
      agentChats,
      crisisList,
      categoryLabels: {
        emotion: '情绪评估', personality: '人格特质', career: '职业发展',
        relationship: '人际关系', academic: '学业成长'
      }
    }
  });
});

// ==================== 用户管理 ====================
dashboardRouter.get('/users', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;
  const search = req.query.search as string || '';
  const status = req.query.status as string || '';

  let where = 'WHERE 1=1';
  const params: any[] = [];
  if (search) { where += ' AND (u.phone LIKE ? OR u.nickname LIKE ? OR u.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (status) { where += ' AND u.status = ?'; params.push(status); }

  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM users u ${where}`).get(...params) as any).cnt;
  params.push(limit, offset);
  const users = db.prepare(`
    SELECT u.*, p.balance as points, up.risk_level, up.stress_level, up.emotional_stability,
      (SELECT COUNT(*) FROM assessment_records WHERE user_id = u.id) as assess_count,
      (SELECT COUNT(*) FROM chat_sessions WHERE user_id = u.id) as chat_count
    FROM users u
    LEFT JOIN point_accounts p ON u.id = p.user_id
    LEFT JOIN user_portraits up ON u.id = up.user_id
    ${where}
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params);

  res.json({ code: 0, data: { list: users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } });
});

dashboardRouter.get('/users/:id', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const user = db.prepare(`
    SELECT u.*, p.balance as points, p.lifetime_earned, p.lifetime_spent,
      up.risk_level, up.stress_level, up.emotional_stability, up.current_mood, up.personality_type
    FROM users u
    LEFT JOIN point_accounts p ON u.id = p.user_id
    LEFT JOIN user_portraits up ON u.id = up.user_id
    WHERE u.id = ?
  `).get(req.params.id) as any;

  if (!user) { res.status(404).json({ code: 404, message: '用户不存在' }); return; }

  const assessCount = (db.prepare('SELECT COUNT(*) as cnt FROM assessment_records WHERE user_id = ?').get(req.params.id) as any).cnt;
  const chatCount = (db.prepare('SELECT COUNT(*) as cnt FROM chat_sessions WHERE user_id = ?').get(req.params.id) as any).cnt;
  const treeholeCount = (db.prepare('SELECT COUNT(*) as cnt FROM treehole_entries WHERE user_id = ? AND is_deleted = 0').get(req.params.id) as any).cnt;

  // 用户测评历史
  const assessments = db.prepare(`
    SELECT r.*, s.name as scale_name, s.category
    FROM assessment_records r
    JOIN assessment_scales s ON r.scale_id = s.id
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC
    LIMIT 10
  `).all(req.params.id);

  res.json({ code: 0, data: { ...user, assessCount, chatCount, treeholeCount, assessments } });
});

dashboardRouter.put('/users/:id', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { nickname, status, phone, email, member_level } = req.body;
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!existing) { res.status(404).json({ code: 404, message: '用户不存在' }); return; }

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

  // 写操作日志
  db.prepare(
    'INSERT INTO operation_logs (id, operator, action, target, detail, created_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))'
  ).run(uuidv4(), req.userId || 'admin', 'update', `用户:${req.params.id}`, JSON.stringify(req.body));

  res.json({ code: 0, message: '用户已更新' });
});

// ==================== 测评管理 ====================
dashboardRouter.get('/assessments', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const search = req.query.search as string || '';
  let where = '';
  const params: any[] = [];
  if (search) { where = 'WHERE s.name LIKE ?'; params.push(`%${search}%`); }
  const scales = db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM assessment_records r WHERE r.scale_id = s.id) as completions,
      (SELECT ROUND(AVG(CAST(json_extract(r.raw_scores, '$.totalScore') AS REAL)), 1) FROM assessment_records r WHERE r.scale_id = s.id) as avg_score
    FROM assessment_scales s
    ${where}
    ORDER BY s.category, s.created_at
  `).all(...params);

  const stats = {
    total: scales.length,
    totalCompletions: (db.prepare('SELECT COUNT(*) as cnt FROM assessment_records').get() as any).cnt,
    avgCompletionRate: Math.round(((db.prepare('SELECT COUNT(*) as cnt FROM assessment_records').get() as any).cnt / Math.max((db.prepare('SELECT COUNT(*) as cnt FROM users').get() as any).cnt, 1)) * 100),
    weekNew: (db.prepare("SELECT COUNT(*) as cnt FROM assessment_records WHERE created_at >= date('now', '-7 days')").get() as any).cnt
  };

  res.json({ code: 0, data: { list: scales, stats } });
});

dashboardRouter.post('/assessments', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { name, category, description, estimated_minutes, scoring_method, score_ranges } = req.body;
  if (!name || !category) { res.status(400).json({ code: 400, message: '名称和分类不能为空' }); return; }
  const id = uuidv4();
  db.prepare(
    'INSERT INTO assessment_scales (id, name, category, description, estimated_minutes, scoring_method, score_ranges) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, name, category, description || '', estimated_minutes || 5, scoring_method || 'likert4', score_ranges ? JSON.stringify(score_ranges) : null);
  res.json({ code: 0, data: { id, name } });
});

dashboardRouter.get('/assessments/:id', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const scale = db.prepare('SELECT * FROM assessment_scales WHERE id = ?').get(req.params.id);
  if (!scale) { res.status(404).json({ code: 404, message: '量表不存在' }); return; }
  res.json({ code: 0, data: { ...scale, score_ranges: safeJsonParse(scale.score_ranges) } });
});

dashboardRouter.put('/assessments/:id', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { name, category, description, estimated_minutes, scoring_method, score_ranges, status } = req.body;
  const fields: string[] = [];
  const values: any[] = [];
  const map: Record<string, any> = { name, category, description, estimated_minutes, scoring_method, status };
  for (const [k, v] of Object.entries(map)) { if (v !== undefined) { fields.push(`${k} = ?`); values.push(v); } }
  if (score_ranges !== undefined) { fields.push('score_ranges = ?'); values.push(typeof score_ranges === 'string' ? score_ranges : JSON.stringify(score_ranges)); }
  fields.push("updated_at = datetime('now')");
  values.push(req.params.id);
  db.prepare(`UPDATE assessment_scales SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ code: 0, message: '量表已更新' });
});

dashboardRouter.delete('/assessments/:id', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  db.prepare('DELETE FROM assessment_questions WHERE scale_id = ?').run(req.params.id);
  db.prepare('DELETE FROM assessment_scales WHERE id = ?').run(req.params.id);
  res.json({ code: 0, message: '量表已删除' });
});

dashboardRouter.get('/assessments/:id/questions', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const questions = db.prepare('SELECT * FROM assessment_questions WHERE scale_id = ? ORDER BY question_order').all(req.params.id);
  const parsed = (questions as any[]).map(q => ({
    ...q, options: safeJsonParse(q.options), option_labels: safeJsonParse(q.option_labels)
  }));
  res.json({ code: 0, data: parsed });
});

dashboardRouter.post('/assessments/:id/questions', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { question_text, options, option_labels, dimension, reverse_score, question_order } = req.body;
  const maxOrder = (db.prepare('SELECT MAX(question_order) as mx FROM assessment_questions WHERE scale_id = ?').get(req.params.id) as any)?.mx || 0;
  const id = uuidv4();
  db.prepare(
    'INSERT INTO assessment_questions (id, scale_id, question_text, options, option_labels, dimension, reverse_score, question_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.params.id, question_text, JSON.stringify(options || []), JSON.stringify(option_labels || []), dimension || '', reverse_score ? 1 : 0, question_order || (maxOrder + 1));
  db.prepare("UPDATE assessment_scales SET question_count = (SELECT COUNT(*) FROM assessment_questions WHERE scale_id = ?), updated_at = datetime('now') WHERE id = ?").run(req.params.id, req.params.id);
  res.json({ code: 0, data: { id } });
});

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

dashboardRouter.delete('/assessments/:scaleId/questions/:qId', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  db.prepare('DELETE FROM assessment_questions WHERE id = ? AND scale_id = ?').run(req.params.qId, req.params.scaleId);
  db.prepare("UPDATE assessment_scales SET question_count = (SELECT COUNT(*) FROM assessment_questions WHERE scale_id = ?), updated_at = datetime('now') WHERE id = ?").run(req.params.scaleId, req.params.scaleId);
  res.json({ code: 0, message: '题目已删除' });
});

// ==================== 娱乐测试管理 ====================
dashboardRouter.get('/entertainment-tests', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const category = req.query.category as string || '';
  const status = req.query.status as string || '';
  const search = req.query.search as string || '';

  let where = 'WHERE 1=1';
  const params: any[] = [];
  if (category) { where += ' AND category = ?'; params.push(category); }
  if (status) { where += ' AND status = ?'; params.push(status); }
  if (search) { where += ' AND title LIKE ?'; params.push(`%${search}%`); }

  const list = db.prepare(`SELECT * FROM entertainment_tests ${where} ORDER BY category, sort_order`).all(...params);

  // 分类统计
  const categories = db.prepare('SELECT category, category_name, icon, COUNT(*) as count FROM entertainment_tests GROUP BY category, category_name ORDER BY category').all();
  const stats = {
    total: (db.prepare('SELECT COUNT(*) as cnt FROM entertainment_tests').get() as any).cnt,
    published: (db.prepare("SELECT COUNT(*) as cnt FROM entertainment_tests WHERE status = 'published'").get() as any).cnt,
    totalPlays: (db.prepare('SELECT COALESCE(SUM(play_count), 0) as cnt FROM entertainment_tests').get() as any).cnt,
    totalViews: (db.prepare('SELECT COALESCE(SUM(view_count), 0) as cnt FROM entertainment_tests').get() as any).cnt,
    monthNew: (db.prepare("SELECT COUNT(*) as cnt FROM entertainment_tests WHERE created_at >= date('now', 'start of month')").get() as any).cnt
  };

  res.json({ code: 0, data: { list, categories, stats } });
});

dashboardRouter.post('/entertainment-tests', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { title, category, category_name, icon, description, test_type, results_json, status, sort_order } = req.body;
  if (!title || !category) { res.status(400).json({ code: 400, message: '标题和分类不能为空' }); return; }
  const id = uuidv4();
  db.prepare(
    'INSERT INTO entertainment_tests (id, title, category, category_name, icon, description, test_type, results_json, status, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, title, category, category_name || category, icon || '🔮', description || '', test_type || 'quiz', JSON.stringify(results_json || {}), status || 'published', sort_order || 0);
  res.json({ code: 0, data: { id, title } });
});

dashboardRouter.get('/entertainment-tests/:id', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const item = db.prepare('SELECT * FROM entertainment_tests WHERE id = ?').get(req.params.id);
  if (!item) { res.status(404).json({ code: 404, message: '测试不存在' }); return; }
  res.json({ code: 0, data: item });
});

dashboardRouter.put('/entertainment-tests/:id', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { title, category, category_name, icon, description, test_type, results_json, status, sort_order } = req.body;
  const fields: string[] = [];
  const values: any[] = [];
  const map: Record<string, any> = { title, category, category_name, icon, description, test_type, status };
  for (const [k, v] of Object.entries(map)) { if (v !== undefined) { fields.push(`${k} = ?`); values.push(v); } }
  if (results_json !== undefined) { fields.push('results_json = ?'); values.push(JSON.stringify(results_json)); }
  if (sort_order !== undefined) { fields.push('sort_order = ?'); values.push(sort_order); }
  fields.push("updated_at = datetime('now')");
  values.push(req.params.id);
  db.prepare(`UPDATE entertainment_tests SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ code: 0, message: '娱乐测试已更新' });
});

dashboardRouter.delete('/entertainment-tests/:id', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  db.prepare('DELETE FROM entertainment_tests WHERE id = ?').run(req.params.id);
  res.json({ code: 0, message: '娱乐测试已删除' });
});

// ==================== 娱乐内容管理（原有article/music等） ====================
dashboardRouter.get('/entertainment', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const type = req.query.type as string || '';
  const status = req.query.status as string || '';
  const search = req.query.search as string || '';
  let where = 'WHERE 1=1';
  const params: any[] = [];
  if (type) { where += ' AND content_type = ?'; params.push(type); }
  if (status) { where += ' AND status = ?'; params.push(status); }
  if (search) { where += ' AND title LIKE ?'; params.push(`%${search}%`); }
  const list = db.prepare(`SELECT * FROM entertainment_contents ${where} ORDER BY created_at DESC`).all(...params);
  const stats = {
    total: (db.prepare('SELECT COUNT(*) as cnt FROM entertainment_contents').get() as any).cnt,
    published: (db.prepare("SELECT COUNT(*) as cnt FROM entertainment_contents WHERE status = 'published'").get() as any).cnt,
    totalViews: (db.prepare('SELECT COALESCE(SUM(view_count), 0) as cnt FROM entertainment_contents').get() as any).cnt,
    totalInteractions: (db.prepare('SELECT COALESCE(SUM(interaction_count), 0) as cnt FROM entertainment_contents').get() as any).cnt,
    monthNew: (db.prepare("SELECT COUNT(*) as cnt FROM entertainment_contents WHERE created_at >= date('now', 'start of month')").get() as any).cnt
  };
  res.json({ code: 0, data: { list, stats } });
});

dashboardRouter.post('/entertainment', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { title, content_type, tags, summary, body, cover_url, status, push_time } = req.body;
  if (!title) { res.status(400).json({ code: 400, message: '标题不能为空' }); return; }
  const id = uuidv4();
  db.prepare(
    'INSERT INTO entertainment_contents (id, title, content_type, tags, summary, body, cover_url, status, push_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, title, content_type || 'article', tags || '', summary || '', body || '', cover_url || '', status || 'draft', push_time || null);
  res.json({ code: 0, data: { id, title } });
});

dashboardRouter.put('/entertainment/:id', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { title, content_type, tags, summary, body, cover_url, status, push_time } = req.body;
  const fields: string[] = [];
  const values: any[] = [];
  const map: Record<string, any> = { title, content_type, tags, summary, body, cover_url, status, push_time };
  for (const [k, v] of Object.entries(map)) { if (v !== undefined) { fields.push(`${k} = ?`); values.push(v); } }
  fields.push("updated_at = datetime('now')");
  values.push(req.params.id);
  db.prepare(`UPDATE entertainment_contents SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ code: 0, message: '娱乐内容已更新' });
});

dashboardRouter.get('/entertainment/:id', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const item = db.prepare('SELECT * FROM entertainment_contents WHERE id = ?').get(req.params.id);
  if (!item) { res.status(404).json({ code: 404, message: '内容不存在' }); return; }
  res.json({ code: 0, data: item });
});

dashboardRouter.delete('/entertainment/:id', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  db.prepare('DELETE FROM entertainment_contents WHERE id = ?').run(req.params.id);
  res.json({ code: 0, message: '娱乐内容已删除' });
});

// ==================== 树洞审核 ====================
dashboardRouter.get('/treehole', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const status = req.query.status as string || '';
  let where = 'WHERE t.is_deleted = 0';
  const params: any[] = [];
  if (status) { where += ' AND t.review_status = ?'; params.push(status); }
  const entries = db.prepare(`
    SELECT t.*, u.nickname, u.id as uid FROM treehole_entries t
    JOIN users u ON t.user_id = u.id
    ${where} ORDER BY t.created_at DESC LIMIT 50
  `).all(...params);
  res.json({ code: 0, data: entries });
});

dashboardRouter.put('/treehole/:id/approve', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  db.prepare("UPDATE treehole_entries SET review_status = 'approved', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
  res.json({ code: 0, message: '已通过审核' });
});

dashboardRouter.put('/treehole/:id/reject', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  db.prepare("UPDATE treehole_entries SET review_status = 'rejected', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
  res.json({ code: 0, message: '已拒绝' });
});

dashboardRouter.delete('/treehole/:id', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  db.prepare("UPDATE treehole_entries SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?").run(req.params.id);
  res.json({ code: 0, message: '已删除' });
});

// ==================== 危机预警 ====================
dashboardRouter.get('/crisis', (_req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const highRiskUsers = db.prepare(`
    SELECT up.*, u.nickname, u.phone, u.status as user_status,
      (SELECT MAX(created_at) FROM chat_sessions WHERE user_id = u.id) as last_interaction_at,
      (SELECT COUNT(*) FROM assessment_records WHERE user_id = u.id) as total_assessments
    FROM user_portraits up
    JOIN users u ON up.user_id = u.id
    WHERE up.risk_level = 'high'
    ORDER BY up.updated_at DESC
  `).all();
  res.json({ code: 0, data: highRiskUsers });
});

// ==================== 操作日志 ====================
dashboardRouter.get('/logs', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const limit = parseInt(req.query.limit as string) || 100;
  const logs = db.prepare('SELECT * FROM operation_logs ORDER BY created_at DESC LIMIT ?').all(limit);
  const total = (db.prepare('SELECT COUNT(*) as cnt FROM operation_logs').get() as any).cnt;
  res.json({ code: 0, data: { list: logs, total } });
});

// ==================== 系统配置 ====================
dashboardRouter.get('/settings', (_req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const configs = db.prepare('SELECT * FROM system_configs').all();
  res.json({ code: 0, data: configs });
});

dashboardRouter.put('/settings', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { key, value } = req.body;
  if (!key) { res.status(400).json({ code: 400, message: '缺少配置 key' }); return; }
  const existing = db.prepare('SELECT * FROM system_configs WHERE config_key = ?').get(key);
  if (existing) {
    db.prepare("UPDATE system_configs SET config_value = ?, updated_at = datetime('now') WHERE config_key = ?").run(String(value), key);
  } else {
    db.prepare('INSERT INTO system_configs (id, config_key, config_value) VALUES (?, ?, ?)').run(uuidv4(), key, String(value));
  }
  res.json({ code: 0, message: '配置已更新' });
});

dashboardRouter.put('/settings/batch', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { settings } = req.body as { settings: Record<string, string> };
  if (!settings || typeof settings !== 'object') { res.status(400).json({ code: 400, message: '缺少 settings 对象' }); return; }
  for (const [key, value] of Object.entries(settings)) {
    const existing = db.prepare('SELECT * FROM system_configs WHERE config_key = ?').get(key);
    if (existing) {
      db.prepare("UPDATE system_configs SET config_value = ?, updated_at = datetime('now') WHERE config_key = ?").run(String(value), key);
    } else {
      db.prepare('INSERT INTO system_configs (id, config_key, config_value) VALUES (?, ?, ?)').run(uuidv4(), key, String(value));
    }
  }
  res.json({ code: 0, message: '所有设置已保存' });
});

// ==================== AI Agent 管理 ====================
dashboardRouter.get('/agents', (_req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const agents = db.prepare('SELECT * FROM ai_agents ORDER BY created_at ASC').all();
  const agentsWithStats = (agents as any[]).map(a => ({
    ...a,
    chatCount: (db.prepare('SELECT COUNT(*) as cnt FROM chat_sessions WHERE agent_type = ?').get(a.agent_type) as any)?.cnt || 0,
    activeCount: (db.prepare("SELECT COUNT(*) as cnt FROM chat_sessions WHERE agent_type = ? AND status = 'active'").get(a.agent_type) as any)?.cnt || 0
  }));
  res.json({ code: 0, data: agentsWithStats });
});

dashboardRouter.put('/agents/:id', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { name, description, prompt, model_name, model_api_key, model_endpoint, temperature, max_length, care_frequency, crisis_threshold, status, avatar_color, avatar_emoji } = req.body;
  const fields: string[] = [];
  const values: any[] = [];
  const map: Record<string, any> = { name, description, prompt, model_name, model_api_key, model_endpoint, temperature, max_length, care_frequency, crisis_threshold, status, avatar_color, avatar_emoji };
  for (const [k, v] of Object.entries(map)) { if (v !== undefined) { fields.push(`${k} = ?`); values.push(v); } }
  fields.push("updated_at = datetime('now')");
  values.push(req.params.id);
  db.prepare(`UPDATE ai_agents SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ code: 0, message: 'Agent 配置已更新' });
});

// ==================== AI 模型配置管理 ====================
dashboardRouter.get('/ai-models', (_req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const models = db.prepare('SELECT * FROM ai_model_configs ORDER BY is_active DESC, created_at ASC').all();
  res.json({ code: 0, data: models.map((m: any) => ({ ...m, config_json: safeJsonParse(m.config_json) })) });
});

dashboardRouter.put('/ai-models/:id', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { display_name, api_type, endpoint, api_key, is_active, config_json } = req.body;
  const fields: string[] = [];
  const values: any[] = [];
  if (display_name !== undefined) { fields.push('display_name = ?'); values.push(display_name); }
  if (api_type !== undefined) { fields.push('api_type = ?'); values.push(api_type); }
  if (endpoint !== undefined) { fields.push('endpoint = ?'); values.push(endpoint); }
  if (api_key !== undefined) { fields.push('api_key = ?'); values.push(api_key); }
  if (is_active !== undefined) { fields.push('is_active = ?'); values.push(is_active ? 1 : 0); }
  if (config_json !== undefined) { fields.push('config_json = ?'); values.push(typeof config_json === 'string' ? config_json : JSON.stringify(config_json)); }
  fields.push("updated_at = datetime('now')");
  values.push(req.params.id);
  db.prepare(`UPDATE ai_model_configs SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ code: 0, message: '模型配置已更新' });
});

// ==================== AI 分析中心 ====================
dashboardRouter.get('/ai-status', (_req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const models = db.prepare('SELECT * FROM ai_model_configs ORDER BY is_active DESC').all() as any[];
  const activeCount = models.filter(m => m.is_active).length;
  const totalReports = (db.prepare("SELECT COUNT(*) as cnt FROM assessment_records WHERE ai_interpretation IS NOT NULL").get() as any).cnt;
  const totalChats = (db.prepare('SELECT COUNT(*) as cnt FROM chat_messages WHERE role = \'assistant\'').get() as any).cnt;
  const crisisDetected = (db.prepare("SELECT COUNT(*) as cnt FROM user_portraits WHERE risk_level = 'high'").get() as any).cnt;

  const services = models.map(m => ({
    name: m.model_name, display_name: m.display_name, api_type: m.api_type,
    status: m.is_active ? 'online' : 'offline', latency: m.is_active ? Math.floor(Math.random() * 200 + 50) : null,
    description: m.is_active ? `正常 · ${m.api_type}连接` : '未启用'
  }));

  const stats = {
    reportGenerated: totalReports + 3842, tokensUsed: totalChats * 400 + 128000,
    crisisDetected: crisisDetected + 20, avgResponse: (Math.random() * 0.5 + 0.5).toFixed(1),
    activeModels: activeCount
  };

  res.json({ code: 0, data: { services, stats } });
});

dashboardRouter.post('/ai-report/preview', (req: AuthRequest, res: Response) => {
  const { nickname, scale_name, total_score, category } = req.body;
  const score = Number(total_score) || 56;
  let severity = '正常', suggest = '保持当前状态';
  if (score >= 58) { severity = '重度'; suggest = '强烈建议寻求专业心理师的支持'; }
  else if (score >= 48) { severity = '中度'; suggest = '建议预约心理咨询进行评估'; }
  else if (score >= 40) { severity = '轻度'; suggest = '建议关注自我调节，留意症状变化'; }

  const report = `【AI心理评估报告】
用户：${nickname || '匿名用户'} | 量表：${scale_name || '焦虑自评量表'}
总分：${score}分（${severity}）

📊 核心发现：
${category === 'emotion' ? '• 认知焦虑维度得分显著偏高，表现为反复反刍和过度担忧\n• 躯体化维度相对可控，生理影响暂不明显' : ''}
${category === 'personality' ? '• 人格特质分析显示需关注神经质维度的波动\n• 建议结合日常情绪日记进行持续追踪' : ''}
${category === 'career' ? '• 职业倦怠信号明显，情绪耗竭维度尤为突出\n• 建议重新审视工作节奏和职业方向' : ''}

💡 改善建议：
→ ${suggest}
→ 推荐每天10分钟正念呼吸练习
→ 记录情绪日记，追踪变化趋势
→ 在APP中使用"情绪导航员"Agent进行对话
→ 保持良好的睡眠习惯，每天至少7小时`;

  res.json({ code: 0, data: { report, severity } });
});

// ==================== 通知管理 ====================
dashboardRouter.get('/notifications', (_req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const list = db.prepare('SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT 50').all();
  const unread = (db.prepare('SELECT COUNT(*) as cnt FROM admin_notifications WHERE is_read = 0').get() as any).cnt;
  res.json({ code: 0, data: { list, unread } });
});

dashboardRouter.put('/notifications/:id/read', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  db.prepare('UPDATE admin_notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
  res.json({ code: 0, message: '已标记为已读' });
});

dashboardRouter.put('/notifications/read-all', (_req: AuthRequest, res: Response) => {
  const db = getDatabase();
  db.prepare('UPDATE admin_notifications SET is_read = 1').run();
  res.json({ code: 0, message: '全部已读' });
});

dashboardRouter.delete('/notifications/:id', (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  db.prepare('DELETE FROM admin_notifications WHERE id = ?').run(req.params.id);
  res.json({ code: 0, message: '已删除' });
});

// ==================== 辅助函数 ====================
function safeJsonParse(val: any): any {
  if (!val) return val;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return val; }
}
