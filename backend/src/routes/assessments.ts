import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

export const assessRouter = Router();

// 获取量表列表
assessRouter.get('/scales', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const category = req.query.category as string;

  let query = 'SELECT * FROM assessment_scales WHERE status = ?';
  const params: any[] = ['published'];

  if (category && category !== 'all') {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' ORDER BY created_at DESC';

  const scales = db.prepare(query).all(...params);

  // 获取每张量表用户完成次数
  const userId = req.userId!;
  const completedCounts = db.prepare(
    'SELECT scale_id, COUNT(*) as cnt FROM assessment_records WHERE user_id = ? GROUP BY scale_id'
  ).all(userId) as any[];

  const countMap: Record<string, number> = {};
  completedCounts.forEach((c: any) => { countMap[c.scale_id] = c.cnt; });

  const result = (scales as any[]).map(s => ({
    ...s,
    completedCount: countMap[s.id] || 0,
  }));

  res.json({ code: 0, data: result });
});

// 获取量表题目
assessRouter.get('/scales/:id/questions', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { id } = req.params;

  const scale = db.prepare('SELECT * FROM assessment_scales WHERE id = ?').get(id) as any;
  if (!scale) {
    res.status(404).json({ code: 404, message: '量表不存在' });
    return;
  }

  const questions = db.prepare(
    'SELECT * FROM assessment_questions WHERE scale_id = ? ORDER BY question_order'
  ).all(id) as any[];

  const result = questions.map(q => ({
    ...q,
    options: q.options ? JSON.parse(q.options) : null,
  }));

  res.json({
    code: 0,
    data: {
      scale: {
        id: scale.id,
        name: scale.name,
        category: scale.category,
        description: scale.description,
        questionCount: scale.question_count,
        estimatedMinutes: scale.estimated_minutes,
      },
      questions: result,
    }
  });
});

// 提交测评答案
assessRouter.post('/scales/:id/submit', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { id } = req.params;
  const { answers } = req.body;
  const userId = req.userId!;

  if (!answers || !Array.isArray(answers)) {
    res.status(400).json({ code: 400, message: '请提供答案' });
    return;
  }

  const scale = db.prepare('SELECT * FROM assessment_scales WHERE id = ?').get(id) as any;
  if (!scale) {
    res.status(404).json({ code: 404, message: '量表不存在' });
    return;
  }

  // 计算分数
  const questions = db.prepare(
    'SELECT * FROM assessment_questions WHERE scale_id = ? ORDER BY question_order'
  ).all(id) as any[];

  let totalScore = 0;
  const dimensionScores: Record<string, number> = {};

  answers.forEach((a: any, idx: number) => {
    const question = questions[idx];
    if (!question) return;

    let score = typeof a.score === 'number' ? a.score : (parseInt(a.selectedIndex) || 0);

    if (question.reverse_score) {
      const opts = JSON.parse(question.options || '[]');
      score = (opts.length - 1) - score;
    }

    totalScore += score;

    if (question.dimension) {
      dimensionScores[question.dimension] = (dimensionScores[question.dimension] || 0) + score;
    }
  });

  // 生成评分解读
  let severity = 'healthy';
  let severityLabel = '良好';
  if (totalScore >= 20) { severity = 'severe'; severityLabel = '重度'; }
  else if (totalScore >= 15) { severity = 'moderate-severe'; severityLabel = '中重度'; }
  else if (totalScore >= 10) { severity = 'moderate'; severityLabel = '中度'; }
  else if (totalScore >= 5) { severity = 'mild'; severityLabel = '轻度'; }

  const recordId = uuidv4();

  // 更新用户画像
  const portrait = db.prepare('SELECT * FROM user_portraits WHERE user_id = ?').get(userId) as any;
  if (portrait) {
    db.prepare(
      'UPDATE user_portraits SET stress_level = ?, last_interaction_at = datetime(\'now\') WHERE user_id = ?'
    ).run(Math.max(portrait.stress_level, Math.min(totalScore * 5, 100)), userId);
  }

  // 积分奖励
  db.prepare(
    'UPDATE point_accounts SET balance = balance + 20, lifetime_earned = lifetime_earned + 20, updated_at = datetime(\'now\') WHERE user_id = ?'
  ).run(userId);

  db.prepare(
    'INSERT INTO point_records (id, user_id, amount, type, description) VALUES (?, ?, ?, ?, ?)'
  ).run(uuidv4(), userId, 20, 'assessment', `完成${scale.name}测评`);

  // 保存测评记录
  db.prepare(
    'INSERT INTO assessment_records (id, user_id, scale_id, scale_version, answers, raw_scores, standard_scores, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    recordId, userId, id, scale.version,
    JSON.stringify(answers),
    JSON.stringify({ totalScore, dimensionScores, severity, severityLabel }),
    JSON.stringify({ severity, severityLabel, percentRank: Math.min(totalScore * 3, 100) }),
    new Date().toISOString()
  );

  res.json({
    code: 0,
    data: {
      recordId,
      scaleName: scale.name,
      totalScore,
      maxScore: questions.length * 3, // 假设每题最高3分
      dimensionScores,
      severity,
      severityLabel,
      interpretation: generateInterpretation(scale.name, severity, severityLabel),
      scores: {
        total: totalScore,
        severity,
        severityLabel,
      },
      completedAt: new Date().toISOString(),
      pointsEarned: 20,
    }
  });
});

// 获取用户测评历史
assessRouter.get('/history', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const userId = req.userId!;

  const records = db.prepare(
    `SELECT ar.*, s.name as scale_name, s.category as scale_category
     FROM assessment_records ar
     JOIN assessment_scales s ON ar.scale_id = s.id
     WHERE ar.user_id = ?
     ORDER BY ar.created_at DESC`
  ).all(userId) as any[];

  const result = records.map(r => ({
    ...r,
    raw_scores: r.raw_scores ? JSON.parse(r.raw_scores) : null,
    standard_scores: r.standard_scores ? JSON.parse(r.standard_scores) : null,
  }));

  res.json({ code: 0, data: result });
});

// 获取测评详情
assessRouter.get('/history/:id', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const record = db.prepare(
    `SELECT ar.*, s.name as scale_name, s.category as scale_category
     FROM assessment_records ar
     JOIN assessment_scales s ON ar.scale_id = s.id
     WHERE ar.id = ? AND ar.user_id = ?`
  ).get(req.params.id, req.userId!) as any;

  if (!record) {
    res.status(404).json({ code: 404, message: '记录不存在' });
    return;
  }

  res.json({
    code: 0,
    data: {
      ...record,
      raw_scores: record.raw_scores ? JSON.parse(record.raw_scores) : null,
      standard_scores: record.standard_scores ? JSON.parse(record.standard_scores) : null,
      answers: record.answers ? JSON.parse(record.answers) : null,
    }
  });
});

function generateInterpretation(scaleName: string, severity: string, label: string): string {
  const templates: Record<string, string> = {
    healthy: '您的测评结果显示状态良好，请继续保持健康的生活方式。',
    mild: `您的${scaleName}结果显示为${label}水平，建议关注自身情绪变化，适当调整作息和压力管理。`,
    moderate: `您的${scaleName}结果显示为${label}水平，建议寻求专业帮助或与信任的人交流感受。`,
    'moderate-severe': `您的${scaleName}结果显示为${label}，强烈建议您考虑寻求专业心理咨询师的帮助。`,
    severe: `您的${scaleName}结果显示为${label}，请尽快联系专业心理医生或拨打心理援助热线。您并不孤单，我们一直在这里。`,
  };
  return templates[severity] || templates.healthy;
}
