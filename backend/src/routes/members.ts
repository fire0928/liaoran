import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

export const memberRouter = Router();

const MEMBER_PLANS = [
  { level: 0, name: '免费用户', price: 0, features: ['基础测评', '每日3次AI对话', '心情树洞(仅自己)'] },
  { level: 1, name: '月度会员', price: 29, features: ['无限AI对话', '全部测评', '树洞AI可见', '每日寄语'] },
  { level: 2, name: '季度会员', price: 79, features: ['月度会员全部权益', '每月1次专业咨询预约', '会员社群'] },
  { level: 3, name: '年度会员', price: 299, features: ['季度会员全部权益', '优先咨询通道', '专属Agent', '硬件折扣'] },
  { level: 4, name: '永久会员', price: 999, features: ['年度会员全部权益', '家族账号(3人)', '线下活动优先'] },
];

// 获取会员套餐列表
memberRouter.get('/plans', (_req, res: Response) => {
  res.json({ code: 0, data: MEMBER_PLANS });
});

// 获取用户当前会员状态
memberRouter.get('/status', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const user = db.prepare(
    'SELECT member_level, member_expired_at FROM users WHERE id = ?'
  ).get(req.userId!) as any;

  const membership = db.prepare(
    'SELECT * FROM memberships WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
  ).get(req.userId!) as any;

  const plan = MEMBER_PLANS[user?.member_level || 0];

  res.json({
    code: 0,
    data: {
      level: user?.member_level || 0,
      planName: plan?.name || '免费用户',
      expiredAt: user?.member_expired_at,
      features: plan?.features || [],
      isActive: user?.member_level > 0 && (!user?.member_expired_at || new Date(user.member_expired_at) > new Date()),
      latestMembership: membership || null,
    }
  });
});

// 开通/续费会员
memberRouter.post('/subscribe', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { level, paymentMethod } = req.body;
  const userId = req.userId!;

  if (!level || level < 1 || level > 4) {
    res.status(400).json({ code: 400, message: '无效的会员等级' });
    return;
  }

  const plan = MEMBER_PLANS[level];
  if (!plan) {
    res.status(400).json({ code: 400, message: '无效的会员方案' });
    return;
  }

  // 计算过期时间
  const now = new Date();
  let expiredAt: Date;
  switch (level) {
    case 1: expiredAt = new Date(now.setMonth(now.getMonth() + 1)); break;
    case 2: expiredAt = new Date(now.setMonth(now.getMonth() + 3)); break;
    case 3: expiredAt = new Date(now.setFullYear(now.getFullYear() + 1)); break;
    case 4: expiredAt = new Date('2099-12-31'); break;
    default: expiredAt = new Date();
  }

  // 创建会员记录
  const membershipId = uuidv4();
  db.prepare(
    'INSERT INTO memberships (id, user_id, level, started_at, expired_at, auto_renew, amount, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(membershipId, userId, level, new Date().toISOString(), expiredAt.toISOString(), 1, plan.price, paymentMethod || '积分');

  // 更新用户会员等级
  db.prepare(
    'UPDATE users SET member_level = ?, member_expired_at = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(level, expiredAt.toISOString(), userId);

  // 记录日志
  db.prepare(
    'INSERT INTO operation_logs (id, operator, action, target, detail) VALUES (?, ?, ?, ?, ?)'
  ).run(uuidv4(), userId, 'subscribe', '会员开通', `开通了${plan.name}，支付${plan.price}元`);

  res.json({
    code: 0,
    data: {
      level,
      planName: plan.name,
      expiredAt: expiredAt.toISOString(),
      message: `恭喜成为${plan.name}！`
    }
  });
});

// 积分兑换会员
memberRouter.post('/subscribe/points', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { level } = req.body;
  const userId = req.userId!;

  const POINTS_PER_MONTH = 500;
  const pointsNeeded = level === 1 ? POINTS_PER_MONTH : level === 2 ? POINTS_PER_MONTH * 2.5 : level === 3 ? POINTS_PER_MONTH * 8 : 0;

  if (level === 4) {
    res.status(400).json({ code: 400, message: '永久会员不支持积分兑换' });
    return;
  }

  const account = db.prepare('SELECT * FROM point_accounts WHERE user_id = ?').get(userId) as any;
  if (!account || account.balance < pointsNeeded) {
    res.status(400).json({ code: 400, message: `积分不足，需要${pointsNeeded}积分，当前${account?.balance || 0}积分` });
    return;
  }

  // 扣除积分
  db.prepare(
    'UPDATE point_accounts SET balance = balance - ?, lifetime_spent = lifetime_spent + ?, updated_at = datetime(\'now\') WHERE user_id = ?'
  ).run(pointsNeeded, pointsNeeded, userId);

  db.prepare(
    'INSERT INTO point_records (id, user_id, amount, type, description) VALUES (?, ?, ?, ?, ?)'
  ).run(uuidv4(), userId, -pointsNeeded, 'subscribe', `兑换${MEMBER_PLANS[level].name}`);

  // 开通会员
  const now = new Date();
  let expiredAt: Date;
  switch (level) {
    case 1: expiredAt = new Date(now.setMonth(now.getMonth() + 1)); break;
    case 2: expiredAt = new Date(now.setMonth(now.getMonth() + 3)); break;
    case 3: expiredAt = new Date(now.setFullYear(now.getFullYear() + 1)); break;
    default: expiredAt = new Date();
  }

  db.prepare(
    'UPDATE users SET member_level = ?, member_expired_at = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(level, expiredAt.toISOString(), userId);

  res.json({
    code: 0,
    data: {
      level,
      planName: MEMBER_PLANS[level].name,
      expiredAt: expiredAt.toISOString(),
      pointsUsed: pointsNeeded,
      message: `使用${pointsNeeded}积分兑换${MEMBER_PLANS[level].name}成功！`
    }
  });
});
