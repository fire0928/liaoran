import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

export const chatRouter = Router();

const AI_RESPONSES: Record<string, string[]> = {
  welcome: [
    '嗨！很高兴又见到你 😊 今天过得怎么样？有什么想聊聊的吗？',
    '你好呀！最近感觉如何？我在这里听着呢~',
    '终于等到你了！今天想探索些什么呢？',
  ],
  emotional: [
    '听起来你现在的感受很复杂。如果可以的话，试着用一个词来描述此刻的心情，你第一个想到的是什么？',
    '谢谢你愿意跟我分享这些。有时候情绪像天气一样变幻莫测，重要的是我们知道它在，然后慢慢等待云开雾散。',
    '我理解这种感觉。每个人都有脆弱的时候，承认它不是软弱，反而是一种勇敢 💙',
  ],
  support: [
    '你已经做得很好了。在这个快节奏的世界里，还记得照顾自己的感受，这本身就很了不起。',
    '记住，你不需要对所有事情都负责。给自己一些空间，允许自己慢下来。',
    '有一句话说得好：最好的成长往往发生在最困难的时刻之后。你正在经历的过程，本身就是珍贵的。',
  ],
  advice: [
    '我们可以从很小的步骤开始。比如今天，给自己安排一件完全"无用"但让你快乐的小事。',
    '试着做一个简单的呼吸：吸气4秒，屏住4秒，呼气6秒。重复三次。感觉有什么不同吗？',
    '有些人发现把想法写下来会有帮助。记录一下今天让你感激的三件事，哪怕是"今天喝到了一杯好咖啡"。',
  ],
  general: [
    '这是个很有趣的问题！让我们一起探讨一下。',
    '我明白你的困惑。生活中确实有很多事情需要我们慢慢去理解。',
    '嗯，让我想想...我们有时候需要从不同的角度来看待问题。你之前遇到过类似的情况吗？',
  ]
};

// 获取对话历史
chatRouter.get('/sessions', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const sessions = db.prepare(
    'SELECT * FROM chat_sessions WHERE user_id = ? AND status = ? ORDER BY started_at DESC'
  ).all(req.userId!, 'active');

  res.json({ code: 0, data: sessions });
});

// 创建新对话
chatRouter.post('/sessions', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { agentType } = req.body;
  const type = agentType || 'general';
  const sessionId = uuidv4();

  db.prepare(
    'INSERT INTO chat_sessions (id, user_id, agent_type, channel, status) VALUES (?, ?, ?, ?, ?)'
  ).run(sessionId, req.userId!, type, 'text', 'active');

  // 生成欢迎消息
  const welcomeText = AI_RESPONSES.welcome[Math.floor(Math.random() * AI_RESPONSES.welcome.length)];

  db.prepare(
    'INSERT INTO chat_messages (id, session_id, role, content, ai_meta) VALUES (?, ?, ?, ?, ?)'
  ).run(uuidv4(), sessionId, 'assistant', welcomeText, JSON.stringify({ agentType: type, model: 'mock' }));

  // 检查每日对话次数限制（免费用户）
  const user = db.prepare('SELECT member_level FROM users WHERE id = ?').get(req.userId!) as any;
  const todayStart = new Date().toISOString().split('T')[0] + 'T00:00:00';

  const todayCount = (db.prepare(
    `SELECT COUNT(*) as cnt FROM chat_sessions
     WHERE user_id = ? AND started_at >= ? AND agent_type != 'system'`
  ).get(req.userId!, todayStart) as any).cnt;

  const isFreeUser = (user?.member_level || 0) === 0;

  res.json({
    code: 0,
    data: {
      session: {
        id: sessionId,
        agentType: type,
        status: 'active',
        startedAt: new Date().toISOString(),
      },
      welcomeMessage: {
        id: uuidv4(),
        role: 'assistant',
        content: welcomeText,
        createdAt: new Date().toISOString(),
      },
      dailyLimit: isFreeUser ? { used: todayCount, max: 3 } : null,
      reminder: isFreeUser && todayCount >= 3 ? '今日免费对话次数已用完，升级会员可无限对话' : null,
    }
  });
});

// 获取对话消息
chatRouter.get('/sessions/:id/messages', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const session = db.prepare(
    'SELECT * FROM chat_sessions WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId!) as any;

  if (!session) {
    res.status(404).json({ code: 404, message: '对话不存在' });
    return;
  }

  const messages = db.prepare(
    'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC'
  ).all(req.params.id);

  res.json({ code: 0, data: { session, messages } });
});

// 发送消息
chatRouter.post('/sessions/:id/messages', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  const { content } = req.body;
  const sessionId = req.params.id;
  const userId = req.userId!;

  if (!content || !content.trim()) {
    res.status(400).json({ code: 400, message: '请输入消息内容' });
    return;
  }

  const session = db.prepare(
    'SELECT * FROM chat_sessions WHERE id = ? AND user_id = ? AND status = ?'
  ).get(sessionId, userId, 'active') as any;

  if (!session) {
    res.status(404).json({ code: 404, message: '对话不存在或已结束' });
    return;
  }

  // 保存用户消息
  const userMsgId = uuidv4();
  db.prepare(
    'INSERT INTO chat_messages (id, session_id, role, content) VALUES (?, ?, ?, ?)'
  ).run(userMsgId, sessionId, 'user', content.trim());

  // AI响应生成（模拟）
  const aiResponse = generateAIResponse(content.trim(), session.agent_type);
  const aiMsgId = uuidv4();

  db.prepare(
    'INSERT INTO chat_messages (id, session_id, role, content, ai_meta) VALUES (?, ?, ?, ?, ?)'
  ).run(aiMsgId, sessionId, 'assistant', aiResponse, JSON.stringify({
    agentType: session.agent_type,
    model: 'mock',
    tokensUsed: Math.floor(Math.random() * 500 + 100),
    latency: Math.floor(Math.random() * 800 + 200),
    safetyFiltered: false,
  }));

  // 更新画像
  db.prepare(
    'UPDATE user_portraits SET last_interaction_at = datetime(\'now\') WHERE user_id = ?'
  ).run(userId);

  // 延迟一点模拟思考
  setTimeout(() => {}, 500);

  res.json({
    code: 0,
    data: {
      userMessage: {
        id: userMsgId,
        role: 'user',
        content: content.trim(),
        createdAt: new Date().toISOString(),
      },
      aiMessage: {
        id: aiMsgId,
        role: 'assistant',
        content: aiResponse,
        createdAt: new Date().toISOString(),
      }
    }
  });
});

// 删除对话
chatRouter.delete('/sessions/:id', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  db.prepare(
    'UPDATE chat_sessions SET status = ?, ended_at = datetime(\'now\') WHERE id = ? AND user_id = ?'
  ).run('archived', req.params.id, req.userId!);

  res.json({ code: 0, message: '对话已归档' });
});

// AI回复生成
function generateAIResponse(userInput: string, agentType: string): string {
  const input = userInput.toLowerCase();
  let pool: string[];

  // 情绪关键词匹配
  const emotionKeywords = ['难过', '伤心', '孤独', '害怕', '焦虑', '紧张', '迷茫', '无聊'];
  const negativeKeywords = ['不好', '烦', '累', '压力', '痛苦', '失眠', '不开心'];

  if (emotionKeywords.some(k => input.includes(k)) || negativeKeywords.some(k => input.includes(k))) {
    pool = AI_RESPONSES.emotional;
  } else if (input.includes('怎么办') || input.includes('帮帮我') || input.includes('建议')) {
    pool = AI_RESPONSES.advice;
  } else if (input.includes('谢谢') || input.includes('好的') || input.includes('明白了')) {
    pool = AI_RESPONSES.support;
  } else {
    pool = AI_RESPONSES.general;
  }

  // 添加Agent个性化
  const agentPersonalizations: Record<string, string> = {
    teen: '（用年轻人听得懂的方式说）',
    workplace: '（从职场角度思考）',
    emotion: '（用温暖治愈的口吻）',
    entrepreneur: '（从创业者心态出发）',
    elderly: '（温和耐心地回应）',
    general: '',
  };

  const baseResponse = pool[Math.floor(Math.random() * pool.length)];
  const personalization = agentPersonalizations[agentType] || '';

  if (personalization) {
    return `${personalization} ${baseResponse}`;
  }

  // 偶尔加入换行让阅读更舒服
  const secondPool = pool[Math.floor(Math.random() * pool.length)];
  if (Math.random() > 0.6 && secondPool !== baseResponse) {
    return `${baseResponse}\n\n另外，${secondPool}`;
  }

  return baseResponse;
}
