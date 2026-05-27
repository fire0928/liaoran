import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../config/database';
import { generateToken, authenticate, AuthRequest } from '../middleware/auth';

export const authRouter = Router();

// 发送验证码（模拟）
authRouter.post('/send-code', (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone) {
    res.status(400).json({ code: 400, message: '请输入手机号' });
    return;
  }
  // 模拟发送验证码
  console.log(`📱 验证码发送到 ${phone}: 123456`);
  res.json({ code: 0, message: '验证码已发送（测试环境: 123456）' });
});

// 手机号登录/注册
authRouter.post('/login', (req: Request, res: Response) => {
  const { phone, code } = req.body;
  const db = getDatabase();

  if (!phone) {
    res.status(400).json({ code: 400, message: '请输入手机号' });
    return;
  }

  // 测试环境验证码
  if (code && code !== '123456') {
    res.status(400).json({ code: 400, message: '验证码错误' });
    return;
  }

  // 查找或创建用户
  let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as any;

  if (!user) {
    const userId = uuidv4();
    const nickname = `了然用户${phone.slice(-4)}`;
    db.prepare(
      'INSERT INTO users (id, phone, nickname, member_level) VALUES (?, ?, ?, ?)'
    ).run(userId, phone, nickname, 0);

    // 创建积分账户
    db.prepare(
      'INSERT INTO point_accounts (id, user_id, balance) VALUES (?, ?, ?)'
    ).run(uuidv4(), userId, 500); // 新用户赠送500积分

    // 创建画像
    db.prepare(
      'INSERT INTO user_portraits (id, user_id, risk_level) VALUES (?, ?, ?)'
    ).run(uuidv4(), userId, 'low');

    user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  }

  const token = generateToken(user.id, user.role || 'user');
  const refreshToken = uuidv4();

  // 存储refresh token
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  db.prepare(
    'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)'
  ).run(uuidv4(), user.id, refreshToken, expiresAt.toISOString());

  // 更新最后交互时间
  db.prepare(
    'UPDATE user_portraits SET last_interaction_at = datetime(\'now\') WHERE user_id = ?'
  ).run(user.id);

  // 创建操作日志
  db.prepare(
    'INSERT INTO operation_logs (id, operator, action, target, detail) VALUES (?, ?, ?, ?, ?)'
  ).run(uuidv4(), user.nickname, 'login', '用户登录', `用户 ${user.nickname} 登录系统`);

  res.json({
    code: 0,
    data: {
      token,
      refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar,
        gender: user.gender,
        memberLevel: user.member_level,
      }
    }
  });
});

// 管理员密码登录（手机号+密码）
authRouter.post('/login/admin', (req: Request, res: Response) => {
  const { phone, password } = req.body;
  const db = getDatabase();

  if (!phone || !password) {
    res.status(400).json({ code: 400, message: '请输入手机号和密码' });
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as any;
  if (!user) {
    res.status(401).json({ code: 401, message: '账号或密码错误' });
    return;
  }

  if (!user.password_hash) {
    res.status(401).json({ code: 401, message: '该账号未设置密码' });
    return;
  }

  if (user.role !== 'admin') {
    res.status(403).json({ code: 403, message: '非管理员账号' });
    return;
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ code: 401, message: '账号或密码错误' });
    return;
  }

  const token = generateToken(user.id, 'admin');

  // 记录操作日志
  db.prepare(
    'INSERT INTO operation_logs (id, operator, action, target, detail) VALUES (?, ?, ?, ?, ?)'
  ).run(uuidv4(), user.nickname || '管理员', 'admin_login', '管理员登录', `管理员 ${user.nickname} 登录后台`);

  res.json({
    code: 0,
    data: {
      token,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar,
        role: user.role,
      }
    }
  });
});

// 邮箱密码登录
authRouter.post('/login/email', (req: Request, res: Response) => {
  const { email, password } = req.body;
  const db = getDatabase();

  if (!email || !password) {
    res.status(400).json({ code: 400, message: '请输入邮箱和密码' });
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user) {
    res.status(401).json({ code: 401, message: '邮箱或密码错误' });
    return;
  }

  if (!user.password_hash) {
    res.status(401).json({ code: 401, message: '该账户未设置密码，请使用手机号登录' });
    return;
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ code: 401, message: '邮箱或密码错误' });
    return;
  }

  const token = generateToken(user.id, 'user');
  res.json({
    code: 0,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatar: user.avatar,
        memberLevel: user.member_level,
      }
    }
  });
});

// 注册（邮箱+密码）
authRouter.post('/register', (req: Request, res: Response) => {
  const { email, password, nickname } = req.body;
  const db = getDatabase();

  if (!email || !password) {
    res.status(400).json({ code: 400, message: '请输入邮箱和密码' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    res.status(409).json({ code: 409, message: '该邮箱已被注册' });
    return;
  }

  const userId = uuidv4();
  const hashedPassword = bcrypt.hashSync(password, 10);
  const displayName = nickname || `用户${email.split('@')[0]}`;

  db.prepare(
    'INSERT INTO users (id, email, nickname, password_hash, member_level) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, email, displayName, hashedPassword, 0);

  db.prepare(
    'INSERT INTO point_accounts (id, user_id, balance) VALUES (?, ?, ?)'
  ).run(uuidv4(), userId, 500);

  db.prepare(
    'INSERT INTO user_portraits (id, user_id, risk_level) VALUES (?, ?, ?)'
  ).run(uuidv4(), userId, 'low');

  const token = generateToken(userId, 'user');

  res.status(201).json({
    code: 0,
    data: {
      token,
      user: { id: userId, email, nickname: displayName, memberLevel: 0 }
    }
  });
});

// 获取当前用户信息
authRouter.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const user = db.prepare(
    'SELECT id, phone, email, nickname, avatar, gender, birthday, city, occupation, education, member_level, status, created_at FROM users WHERE id = ?'
  ).get(req.userId!) as any;

  if (!user) {
    res.status(404).json({ code: 404, message: '用户不存在' });
    return;
  }

  const portrait = db.prepare('SELECT * FROM user_portraits WHERE user_id = ?').get(req.userId!) as any;
  const points = db.prepare('SELECT balance FROM point_accounts WHERE user_id = ?').get(req.userId!) as any;
  const checkins = db.prepare(
    'SELECT COUNT(*) as cnt FROM daily_checkins WHERE user_id = ? AND checkin_date = date(\'now\')'
  ).get(req.userId!) as any;

  res.json({
    code: 0,
    data: {
      ...user,
      memberLevel: user.member_level,
      riskLevel: portrait?.risk_level || 'low',
      points: points?.balance || 0,
      checkedInToday: checkins?.cnt > 0,
    }
  });
});

// 登出
authRouter.post('/logout', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(req.userId!);
  res.json({ code: 0, message: '已登出' });
});
