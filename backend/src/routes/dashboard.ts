import { Router, Response } from 'express';
import { getDatabase } from '../config/database';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

export const dashboardRouter = Router();

// === 数据仪表盘 ===
dashboardRouter.get('/dashboard', authenticate, (req: AuthRequest, res: Response) => {
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

  // 会员分布
  const memberDistribution = db.prepare(
    'SELECT member_level, COUNT(*) as cnt FROM users GROUP BY member_level ORDER BY member_level'
  ).all();

  // 每日活跃用户（近7天）
  const dailyActive = db.prepare(`
    SELECT date(created_at) as day, COUNT(DISTINCT user_id) as count
    FROM (
      SELECT user_id, created_at FROM chat_sessions
      UNION ALL
      SELECT user_id, created_at FROM assessment_records
      UNION ALL
      SELECT user_id, created_at FROM treehole_entries
    )
    WHERE created_at >= date('now', '-7 days')
    GROUP BY date(created_at)
    ORDER BY day
  `).all();

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
      },
      memberDistribution,
      dailyActive,
    }
  });
});

// === 用户管理 ===
dashboardRouter.get('/users', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  const users = db.prepare(
    `SELECT u.*, p.balance as points
     FROM users u
     LEFT JOIN point_accounts p ON u.id = p.user_id
     ORDER BY u.created_at DESC
     LIMIT ? OFFSET ?`
  ).all(limit, offset);

  const total = (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as any).cnt;

  res.json({
    code: 0,
    data: {
      list: users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    }
  });
});

// === 测评管理 ===
dashboardRouter.get('/assessments', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const scales = db.prepare('SELECT * FROM assessment_scales ORDER BY created_at DESC').all();
  res.json({ code: 0, data: scales });
});

// === 树洞审核 ===
dashboardRouter.get('/treehole', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const entries = db.prepare(
    `SELECT t.*, u.nickname
     FROM treehole_entries t
     JOIN users u ON t.user_id = u.id
     WHERE t.is_deleted = 0
     ORDER BY t.created_at DESC
     LIMIT 50`
  ).all();

  res.json({ code: 0, data: entries });
});

// === 危机预警 ===
dashboardRouter.get('/crisis', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const highRiskUsers = db.prepare(
    `SELECT up.*, u.nickname, u.phone, u.email
     FROM user_portraits up
     JOIN users u ON up.user_id = u.id
     WHERE up.risk_level = 'high'
     ORDER BY up.updated_at DESC`
  ).all();

  res.json({ code: 0, data: highRiskUsers });
});

// === 操作日志 ===
dashboardRouter.get('/logs', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const limit = parseInt(req.query.limit as string) || 100;
  const logs = db.prepare(
    'SELECT * FROM operation_logs ORDER BY created_at DESC LIMIT ?'
  ).all(limit);

  res.json({ code: 0, data: logs });
});

// === 系统配置 ===
dashboardRouter.get('/settings', authenticate, (_req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const configs = db.prepare('SELECT * FROM system_configs').all();
  res.json({ code: 0, data: configs });
});

dashboardRouter.put('/settings', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { key, value } = req.body;

  const existing = db.prepare('SELECT * FROM system_configs WHERE config_key = ?').get(key);
  if (existing) {
    db.prepare('UPDATE system_configs SET config_value = ?, updated_at = datetime(\'now\') WHERE config_key = ?').run(value, key);
  } else {
    const { v4: uuidv4 } = require('uuid');
    db.prepare('INSERT INTO system_configs (id, config_key, config_value) VALUES (?, ?, ?)').run(uuidv4(), key, value);
  }

  res.json({ code: 0, message: '配置已更新' });
});
