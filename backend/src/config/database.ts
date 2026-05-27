import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || './data/liaoran.db';

// sql.js database wrapper providing better-sqlite3 compatible API
class SqlJsWrapper {
  private db: any;
  private _open: boolean = false;

  private constructor(db: any) {
    this.db = db;
    this._open = true;
  }

  static async create(dbPath: string): Promise<SqlJsWrapper> {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const SQL = await initSqlJs();
    let db: any;

    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
    }

    db.run('PRAGMA foreign_keys = ON');
    return new SqlJsWrapper(db);
  }

  save() {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }

  exec(sql: string) {
    return this.db.exec(sql);
  }

  pragma(_sql: string) {
    this.db.exec(_sql);
  }

  prepare(sql: string): any {
    const self = this;
    return {
      _sql: sql,
      _db: self,

      all(...params: any[]): any[] {
        try {
          const stmt = self.db.prepare(sql);
          if (params.length > 0) {
            stmt.bind(params);
          }
          const results: any[] = [];
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();
          return results;
        } catch (e: any) {
          console.error('SQL error (all):', e.message, 'SQL:', sql, 'Params:', params);
          throw e;
        }
      },

      get(...params: any[]): any | undefined {
        try {
          const stmt = self.db.prepare(sql);
          if (params.length > 0) {
            stmt.bind(params);
          }
          let result: any;
          if (stmt.step()) {
            result = stmt.getAsObject();
          }
          stmt.free();
          return result;
        } catch (e: any) {
          console.error('SQL error (get):', e.message, 'SQL:', sql, 'Params:', params);
          throw e;
        }
      },

      run(...params: any[]) {
        try {
          self.db.run(sql, params);
          self.save();
          return {
            changes: self.db.getRowsModified(),
            lastInsertRowid: self.db.getRowsModified(),
          };
        } catch (e: any) {
          console.error('SQL error (run):', e.message, 'SQL:', sql, 'Params:', params);
          throw e;
        }
      },

      free() {}
    };
  }

  close() {
    this.db.close();
    this._open = false;
  }
}

let db: SqlJsWrapper;

export function getDatabase(): SqlJsWrapper {
  if (!db) {
    throw new Error('数据库未初始化，请先调用 initDatabase()');
  }
  return db;
}

export async function initDatabase(): Promise<void> {
  db = await SqlJsWrapper.create(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE,
      email TEXT UNIQUE,
      nickname TEXT NOT NULL DEFAULT '了然用户',
      avatar TEXT,
      gender TEXT DEFAULT 'secret',
      birthday TEXT,
      city TEXT,
      occupation TEXT,
      education TEXT,
      password_hash TEXT,
      role TEXT DEFAULT 'user',
      status TEXT DEFAULT 'active',
      member_level INTEGER DEFAULT 0,
      member_expired_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS oauth_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      access_token TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(provider, provider_id)
    );
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS memberships (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      level INTEGER NOT NULL,
      started_at TEXT NOT NULL,
      expired_at TEXT,
      auto_renew INTEGER DEFAULT 0,
      amount REAL DEFAULT 0,
      payment_method TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS point_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      balance INTEGER DEFAULT 0,
      lifetime_earned INTEGER DEFAULT 0,
      lifetime_spent INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS point_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      reference_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS user_portraits (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      personality_type TEXT,
      stress_level INTEGER DEFAULT 0,
      emotional_stability INTEGER DEFAULT 0,
      current_mood TEXT,
      risk_level TEXT DEFAULT 'low',
      last_interaction_at TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS assessment_scales (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      question_count INTEGER DEFAULT 0,
      estimated_minutes INTEGER DEFAULT 5,
      scoring_method TEXT DEFAULT 'likert4',
      score_ranges TEXT,
      status TEXT DEFAULT 'published',
      version TEXT DEFAULT '1.0',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS assessment_questions (
      id TEXT PRIMARY KEY,
      scale_id TEXT NOT NULL,
      question_order INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT DEFAULT 'scale',
      options TEXT,
      option_labels TEXT,
      dimension TEXT,
      reverse_score INTEGER DEFAULT 0,
      required INTEGER DEFAULT 1,
      FOREIGN KEY (scale_id) REFERENCES assessment_scales(id)
    );
    CREATE TABLE IF NOT EXISTS assessment_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      scale_id TEXT NOT NULL,
      scale_version TEXT,
      answers TEXT,
      raw_scores TEXT,
      standard_scores TEXT,
      ai_interpretation TEXT,
      report_url TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (scale_id) REFERENCES assessment_scales(id)
    );
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      agent_type TEXT NOT NULL DEFAULT 'general',
      channel TEXT DEFAULT 'text',
      status TEXT DEFAULT 'active',
      summary TEXT,
      started_at TEXT DEFAULT (datetime('now')),
      ended_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      ai_meta TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
    );
    CREATE TABLE IF NOT EXISTS treehole_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      mood TEXT,
      mood_intensity INTEGER,
      images TEXT,
      privacy TEXT DEFAULT 'private',
      allow_ai_analysis INTEGER DEFAULT 0,
      ai_analysis TEXT,
      review_status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      is_deleted INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS daily_checkins (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      mood TEXT NOT NULL,
      mood_intensity INTEGER,
      note TEXT,
      checkin_date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, checkin_date)
    );
    CREATE TABLE IF NOT EXISTS system_configs (
      id TEXT PRIMARY KEY,
      config_key TEXT UNIQUE NOT NULL,
      config_value TEXT,
      description TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS operation_logs (
      id TEXT PRIMARY KEY,
      operator TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT,
      detail TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS entertainment_contents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content_type TEXT NOT NULL DEFAULT 'article',
      tags TEXT,
      summary TEXT,
      body TEXT,
      cover_url TEXT,
      status TEXT DEFAULT 'draft',
      view_count INTEGER DEFAULT 0,
      interaction_count INTEGER DEFAULT 0,
      push_time TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS entertainment_tests (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      category_name TEXT NOT NULL,
      icon TEXT DEFAULT '🔮',
      description TEXT,
      test_type TEXT DEFAULT 'quiz',
      results_json TEXT,
      status TEXT DEFAULT 'published',
      sort_order INTEGER DEFAULT 0,
      view_count INTEGER DEFAULT 0,
      play_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS ai_agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      agent_type TEXT NOT NULL DEFAULT 'general',
      description TEXT,
      avatar_color TEXT DEFAULT '#E8835A',
      avatar_emoji TEXT DEFAULT '🤖',
      prompt TEXT,
      model_name TEXT DEFAULT 'gpt-4o',
      model_api_key TEXT DEFAULT '',
      model_endpoint TEXT DEFAULT '',
      temperature REAL DEFAULT 0.7,
      max_length INTEGER DEFAULT 400,
      care_frequency INTEGER DEFAULT 3,
      crisis_threshold INTEGER DEFAULT 7,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS ai_model_configs (
      id TEXT PRIMARY KEY,
      model_name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      api_type TEXT DEFAULT 'openai',
      endpoint TEXT,
      api_key TEXT,
      is_active INTEGER DEFAULT 1,
      config_json TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS admin_notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL DEFAULT 'system',
      title TEXT NOT NULL,
      content TEXT,
      link TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // 兼容旧表：缺失列补充
  try { db.exec('ALTER TABLE assessment_scales ADD COLUMN scoring_method TEXT DEFAULT \'likert4\''); } catch (e) {}
  try { db.exec('ALTER TABLE assessment_scales ADD COLUMN score_ranges TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE assessment_questions ADD COLUMN option_labels TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE ai_agents ADD COLUMN avatar_emoji TEXT DEFAULT \'🤖\''); } catch (e) {}
  try { db.exec('ALTER TABLE ai_agents ADD COLUMN model_name TEXT DEFAULT \'gpt-4o\''); } catch (e) {}
  try { db.exec('ALTER TABLE ai_agents ADD COLUMN model_api_key TEXT DEFAULT \'\''); } catch (e) {}
  try { db.exec('ALTER TABLE ai_agents ADD COLUMN model_endpoint TEXT DEFAULT \'\''); } catch (e) {}

  db.save();

  console.log('✅ 数据库初始化完成');
  await seedDefaultData();
}

async function seedDefaultData() {
  const { v4: uuidv4 } = require('uuid');
  const bcrypt = require('bcryptjs');
  const database = db;

  // === 管理员账号 ===
  const adminCount = database.prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'").get() as any;
  if (!adminCount || adminCount.cnt === 0) {
    const adminId = uuidv4();
    const hash = bcrypt.hashSync('admin123', 10);
    database.prepare(
      "INSERT INTO users (id, phone, nickname, password_hash, role, status, member_level) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(adminId, '18928751642', '管理员', hash, 'admin', 'active', 4);
    database.prepare(
      'INSERT INTO point_accounts (id, user_id, balance, lifetime_earned) VALUES (?, ?, ?, ?)'
    ).run(uuidv4(), adminId, 0, 0);
    database.prepare(
      "INSERT INTO user_portraits (id, user_id, risk_level, stress_level, emotional_stability) VALUES (?, ?, ?, ?, ?)"
    ).run(uuidv4(), adminId, 'low', 0, 5);
    console.log('✅ 默认管理员账号已创建: 18928751642 / admin123');
    db.save();
  }

  // === 测试用户数据 ===
  const testUserCount = database.prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'user' AND phone LIKE '139000%'").get() as any;
  if (!testUserCount || testUserCount.cnt === 0) {
    const testUsers = [
      { phone: '13900001111', nickname: '林小然', status: 'active', member_level: 0 },
      { phone: '13900002222', nickname: '陈默', status: 'active', member_level: 1 },
      { phone: '13900003333', nickname: '周雨晴', status: 'active', member_level: 0 },
      { phone: '13900004444', nickname: '王思远', status: 'silent', member_level: 0 },
      { phone: '13900005555', nickname: '赵轻舟', status: 'risk', member_level: 2 },
      { phone: '13900006666', nickname: '李安然', status: 'active', member_level: 0 },
      { phone: '13900007777', nickname: '孙未央', status: 'active', member_level: 0 },
      { phone: '13900008888', nickname: '吴知行', status: 'silent', member_level: 1 },
    ];

    const hash = bcrypt.hashSync('123456', 10);
    for (const u of testUsers) {
      const userId = uuidv4();
      database.prepare(
        "INSERT INTO users (id, phone, nickname, password_hash, role, status, member_level, email, city, occupation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(userId, u.phone, u.nickname, hash, 'user', u.status, u.member_level, `${u.phone}@test.com`, '深圳', '测试职业');
      database.prepare(
        'INSERT INTO point_accounts (id, user_id, balance, lifetime_earned, lifetime_spent) VALUES (?, ?, ?, ?, ?)'
      ).run(uuidv4(), userId, Math.floor(Math.random() * 800), Math.floor(Math.random() * 1000), 50);
      const riskLevel = u.status === 'risk' ? 'high' : 'low';
      const stressLevel = u.status === 'risk' ? 8 : Math.floor(Math.random() * 5);
      database.prepare(
        "INSERT INTO user_portraits (id, user_id, risk_level, stress_level, emotional_stability, current_mood) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(uuidv4(), userId, riskLevel, stressLevel, Math.floor(Math.random() * 10), '平静');
    }
    console.log('✅ 测试用户数据已创建');
    db.save();
  }

  // === 测评量表数据 ===
  const scaleCount = database.prepare('SELECT COUNT(*) as cnt FROM assessment_scales').get() as any;
  if (!scaleCount || scaleCount.cnt < 10) {
    // 清空旧数据重建
    database.exec('DELETE FROM assessment_questions');
    database.exec('DELETE FROM assessment_records');
    database.exec('DELETE FROM assessment_scales');

    const options4 = JSON.stringify([
      { label: '没有或很少时间', score: 1 },
      { label: '少部分时间', score: 2 },
      { label: '相当多时间', score: 3 },
      { label: '绝大部分或全部时间', score: 4 }
    ]);
    const options4rev = JSON.stringify([
      { label: '没有或很少时间', score: 4 },
      { label: '少部分时间', score: 3 },
      { label: '相当多时间', score: 2 },
      { label: '绝大部分或全部时间', score: 1 }
    ]);
    const phqOptions = JSON.stringify([
      { label: '完全不会', score: 0 },
      { label: '好几天', score: 1 },
      { label: '一半以上的天数', score: 2 },
      { label: '几乎每天', score: 3 }
    ]);
    const mbOptions = JSON.stringify([
      { label: '非常不同意', score: 1 },
      { label: '不同意', score: 2 },
      { label: '中立', score: 3 },
      { label: '同意', score: 4 },
      { label: '非常同意', score: 5 }
    ]);
    const boolOptions = JSON.stringify([
      { label: '是', score: 1 },
      { label: '否', score: 0 }
    ]);

    const scalesData: { id: string; name: string; category: string; description: string; question_count: number; estimated_minutes: number; scoring_method: string; score_ranges: string; questions: { text: string; options: string; dimension?: string; reverse?: boolean }[] }[] = [
      // === 分类一：情绪评估 ===
      {
        id: uuidv4(), name: '焦虑自评量表', category: 'emotion', description: '评估最近一周焦虑症状的主观感受和严重程度，广泛用于临床与心理咨询初筛', question_count: 20, estimated_minutes: 5, scoring_method: 'likert4',
        score_ranges: JSON.stringify({ normal: { range: [20, 49], label: '正常范围', desc: '无明显焦虑症状' }, mild: { range: [50, 59], label: '轻度焦虑', desc: '存在轻度焦虑，建议关注自我调节' }, moderate: { range: [60, 69], label: '中度焦虑', desc: '中度焦虑，建议寻求专业咨询' }, severe: { range: [70, 80], label: '重度焦虑', desc: '重度焦虑，需专业干预' } }),
        questions: [
          { text: '我觉得比平常容易紧张和着急', options: options4, dimension: '心理焦虑' },
          { text: '我无缘无故地感到害怕', options: options4, dimension: '心理焦虑' },
          { text: '我容易心里烦乱或觉得惊恐', options: options4, dimension: '心理焦虑' },
          { text: '我觉得我可能将要发疯', options: options4, dimension: '心理焦虑' },
          { text: '我觉得一切都很好，也不会发生什么不幸', options: options4rev, dimension: '心理焦虑', reverse: true },
          { text: '我手脚发抖打颤', options: options4, dimension: '躯体焦虑' },
          { text: '我因为头痛、颈痛和背痛而苦恼', options: options4, dimension: '躯体焦虑' },
          { text: '我感觉容易衰弱和疲乏', options: options4, dimension: '躯体焦虑' },
          { text: '我觉得心平气和，并且容易安静坐着', options: options4rev, dimension: '躯体焦虑', reverse: true },
          { text: '我觉得心跳得很快', options: options4, dimension: '躯体焦虑' },
          { text: '我因为一阵阵头晕而苦恼', options: options4, dimension: '躯体焦虑' },
          { text: '我有晕倒发作或觉得要晕倒似的', options: options4, dimension: '躯体焦虑' },
          { text: '我吸气呼气都感到很容易', options: options4rev, dimension: '躯体焦虑', reverse: true },
          { text: '我手脚麻木和刺痛', options: options4, dimension: '躯体焦虑' },
          { text: '我因为胃痛和消化不良而苦恼', options: options4, dimension: '躯体焦虑' },
          { text: '我常常要小便', options: options4, dimension: '躯体焦虑' },
          { text: '我的手常常是干燥温暖的', options: options4rev, dimension: '躯体焦虑', reverse: true },
          { text: '我脸红发热', options: options4, dimension: '躯体焦虑' },
          { text: '我容易入睡并且一夜睡得很好', options: options4rev, dimension: '心理焦虑', reverse: true },
          { text: '我做噩梦', options: options4, dimension: '心理焦虑' }
        ]
      },
      {
        id: uuidv4(), name: '抑郁筛查量表', category: 'emotion', description: '基于DSM-5标准的抑郁症状快速筛查工具，评估最近两周状态', question_count: 9, estimated_minutes: 3, scoring_method: 'phq',
        score_ranges: JSON.stringify({ normal: { range: [0, 4], label: '无抑郁', desc: '目前没有明显的抑郁症状' }, mild: { range: [5, 9], label: '轻度抑郁', desc: '存在轻微抑郁情绪，建议自我调节' }, moderate: { range: [10, 14], label: '中度抑郁', desc: '中度抑郁，强烈建议寻求专业帮助' }, severe: { range: [15, 27], label: '重度抑郁', desc: '重度抑郁，需要立即寻求专业干预' } }),
        questions: [
          { text: '做事时提不起劲或没有兴趣', options: phqOptions }, { text: '感到心情低落、沮丧或绝望', options: phqOptions },
          { text: '入睡困难、睡不安稳或睡得过多', options: phqOptions }, { text: '感觉疲倦或没有活力', options: phqOptions },
          { text: '食欲不振或吃太多', options: phqOptions }, { text: '觉得自己很糟或很失败，或让自己、家人失望', options: phqOptions },
          { text: '对事物专注有困难，例如看报纸或看电视时', options: phqOptions },
          { text: '行动或说话速度缓慢到别人已经察觉？或刚好相反——变得比平日更心神不宁', options: phqOptions },
          { text: '有不如死掉或用某种方式伤害自己的念头', options: phqOptions }
        ]
      },
      // === 分类二：人格特质 ===
      {
        id: uuidv4(), name: '大五人格量表', category: 'personality', description: '测量人格五大维度：开放性、尽责性、外向性、宜人性、神经质，助你全面了解自己的人格画像', question_count: 44, estimated_minutes: 8, scoring_method: 'likert5',
        score_ranges: JSON.stringify({ low: { range: [1, 3], label: '较低', desc: '该维度特征不显著' }, medium: { range: [3, 5], label: '中等', desc: '该维度处于普通水平' }, high: { range: [5, 7], label: '较高', desc: '该维度特征明显' } }),
        questions: [
          { text: '我是一个健谈的人', options: mbOptions, dimension: '外向性' }, { text: '我善于理解别人的感受', options: mbOptions, dimension: '宜人性' },
          { text: '我喜欢把事情做得井井有条', options: mbOptions, dimension: '尽责性' }, { text: '我经常感到忧虑和担心', options: mbOptions, dimension: '神经质' },
          { text: '我对艺术和自然有浓厚的兴趣', options: mbOptions, dimension: '开放性' }, { text: '我喜欢在人群中成为焦点', options: mbOptions, dimension: '外向性' },
          { text: '我经常会考虑别人的需要', options: mbOptions, dimension: '宜人性' }, { text: '我会按时完成分配的任务', options: mbOptions, dimension: '尽责性' },
          { text: '我容易感到压力和紧张', options: mbOptions, dimension: '神经质' }, { text: '我喜欢尝试新鲜事物', options: mbOptions, dimension: '开放性' },
          { text: '我喜欢参加各种社交活动', options: mbOptions, dimension: '外向性' }, { text: '我会主动帮助遇到困难的人', options: mbOptions, dimension: '宜人性' },
          { text: '我对细节非常关注', options: mbOptions, dimension: '尽责性' }, { text: '我常常情绪起伏较大', options: mbOptions, dimension: '神经质' },
          { text: '我有丰富的想象力', options: mbOptions, dimension: '开放性' }, { text: '我容易与人建立友谊', options: mbOptions, dimension: '外向性' },
          { text: '我很少与人发生冲突', options: mbOptions, dimension: '宜人性' }, { text: '我会提前做好计划和准备', options: mbOptions, dimension: '尽责性' },
          { text: '我容易感到悲伤和孤独', options: mbOptions, dimension: '神经质' }, { text: '我对不同的文化充满好奇', options: mbOptions, dimension: '开放性' },
          { text: '我喜欢独处胜过社交', options: JSON.stringify([{ label: '非常不同意', score: 5 }, { label: '不同意', score: 4 }, { label: '中立', score: 3 }, { label: '同意', score: 2 }, { label: '非常同意', score: 1 }]), dimension: '外向性', reverse: true },
          { text: '我有时会利用别人达到自己的目的', options: JSON.stringify([{ label: '非常不同意', score: 5 }, { label: '不同意', score: 4 }, { label: '中立', score: 3 }, { label: '同意', score: 2 }, { label: '非常同意', score: 1 }]), dimension: '宜人性', reverse: true },
          { text: '我的房间或办公桌可能会比较凌乱', options: JSON.stringify([{ label: '非常不同意', score: 5 }, { label: '不同意', score: 4 }, { label: '中立', score: 3 }, { label: '同意', score: 2 }, { label: '非常同意', score: 1 }]), dimension: '尽责性', reverse: true },
          { text: '大多数时候我心情平静', options: JSON.stringify([{ label: '非常不同意', score: 5 }, { label: '不同意', score: 4 }, { label: '中立', score: 3 }, { label: '同意', score: 2 }, { label: '非常同意', score: 1 }]), dimension: '神经质', reverse: true },
          { text: '我更喜欢熟悉和常规的事物', options: JSON.stringify([{ label: '非常不同意', score: 5 }, { label: '不同意', score: 4 }, { label: '中立', score: 3 }, { label: '同意', score: 2 }, { label: '非常同意', score: 1 }]), dimension: '开放性', reverse: true }
        ]
      },
      {
        id: uuidv4(), name: 'MBTI性格类型测试', category: 'personality', description: '帮助你了解自己在专注方式、信息获取、决策方式和生活方式上的偏好', question_count: 40, estimated_minutes: 8, scoring_method: 'mbti',
        score_ranges: JSON.stringify({ e: { label: '外向', score: 0 }, i: { label: '内向', score: 1 } }),
        questions: [
          { text: '在聚会中，你更喜欢与很多人交谈而不是与少数人深入交流', options: mbOptions, dimension: 'EI' },
          { text: '你更倾向于基于事实和细节做决定，而不是依靠直觉和比喻', options: mbOptions, dimension: 'SN' },
          { text: '在做决定时，你更看重逻辑和公平，而不是个人感受', options: mbOptions, dimension: 'TF' },
          { text: '你喜欢提前计划好事情，而不是随性而为', options: mbOptions, dimension: 'JP' },
          { text: '与他人相处后，你需要独处来恢复精力', options: JSON.stringify([{ label: '非常不同意', score: 5 }, { label: '不同意', score: 4 }, { label: '中立', score: 3 }, { label: '同意', score: 2 }, { label: '非常同意', score: 1 }]), dimension: 'EI', reverse: true },
          { text: '你常常沉浸于天马行空的想象', options: mbOptions, dimension: 'SN' },
          { text: '面对冲突，你更容易感到不安和焦虑', options: mbOptions, dimension: 'TF' },
          { text: '你习惯制定详细的日程表并严格执行', options: mbOptions, dimension: 'JP' },
          { text: '结识新朋友让你感到兴奋和充满能量', options: mbOptions, dimension: 'EI' },
          { text: '你更相信实践和经验而非理论', options: mbOptions, dimension: 'SN' },
          { text: '你认为公正比仁慈更重要', options: mbOptions, dimension: 'TF' },
          { text: '你可以在截止日期前灵活调整计划', options: JSON.stringify([{ label: '非常不同意', score: 5 }, { label: '不同意', score: 4 }, { label: '中立', score: 3 }, { label: '同意', score: 2 }, { label: '非常同意', score: 1 }]), dimension: 'JP', reverse: true },
          { text: '你更喜欢用电话或面对面交谈而不是发文字消息', options: mbOptions, dimension: 'EI' },
          { text: '你喜欢探索抽象的概念和新颖的想法', options: mbOptions, dimension: 'SN' },
          { text: '批评别人时你总是很直接', options: mbOptions, dimension: 'TF' },
          { text: '混乱无序的环境会让你感到不适', options: mbOptions, dimension: 'JP' },
          { text: '你倾向于先想再说，常常边说边整理思路', options: mbOptions, dimension: 'EI' },
          { text: '比起想象力，你更看重实际技能', options: JSON.stringify([{ label: '非常不同意', score: 5 }, { label: '不同意', score: 4 }, { label: '中立', score: 3 }, { label: '同意', score: 2 }, { label: '非常同意', score: 1 }]), dimension: 'SN', reverse: true },
          { text: '你常常会因为别人的不幸遭遇而感同身受', options: mbOptions, dimension: 'TF' },
          { text: '你享受意外和即兴的事情', options: JSON.stringify([{ label: '非常不同意', score: 5 }, { label: '不同意', score: 4 }, { label: '中立', score: 3 }, { label: '同意', score: 2 }, { label: '非常同意', score: 1 }]), dimension: 'JP', reverse: true }
        ]
      },
      // === 分类三：职业发展 ===
      {
        id: uuidv4(), name: '职业倦怠评估', category: 'career', description: '评估你在工作中是否出现情绪耗竭、去人格化和成就感降低等倦怠信号', question_count: 15, estimated_minutes: 4, scoring_method: 'likert5',
        score_ranges: JSON.stringify({ low: { range: [15, 30], label: '状态良好', desc: '工作状态健康，未发现明显倦怠' }, mild: { range: [31, 45], label: '轻度倦怠', desc: '出现轻微倦怠信号，建议及时调整' }, moderate: { range: [46, 60], label: '中度倦怠', desc: '存在明显职业倦怠，需要干预和调整' }, severe: { range: [61, 75], label: '重度倦怠', desc: '严重职业倦怠，强烈建议寻求专业支持' } }),
        questions: [
          { text: '工作让我感到情绪枯竭', options: mbOptions, dimension: '情绪耗竭' },
          { text: '下班时我常感觉精力完全耗尽', options: mbOptions, dimension: '情绪耗竭' },
          { text: '每天起床想到要面对一天的工作就感到疲惫', options: mbOptions, dimension: '情绪耗竭' },
          { text: '整天与人打交道让我感到很大压力', options: mbOptions, dimension: '情绪耗竭' },
          { text: '我感觉被工作掏空了', options: mbOptions, dimension: '情绪耗竭' },
          { text: '我对工作不像以前那么热情了', options: mbOptions, dimension: '去人格化' },
          { text: '我怀疑自己所做工作的意义', options: mbOptions, dimension: '去人格化' },
          { text: '我对工作变得不再那么用心了', options: mbOptions, dimension: '去人格化' },
          { text: '我不太关心工作中出现的问题', options: mbOptions, dimension: '去人格化' },
          { text: '我觉得自己的贡献没有被组织认可', options: mbOptions, dimension: '去人格化' },
          { text: '我能有效解决工作中出现的问题', options: JSON.stringify([{ label: '非常不同意', score: 5 }, { label: '不同意', score: 4 }, { label: '中立', score: 3 }, { label: '同意', score: 2 }, { label: '非常同意', score: 1 }]), dimension: '成就感降低', reverse: true },
          { text: '我觉得我在为组织做出有价值的贡献', options: JSON.stringify([{ label: '非常不同意', score: 5 }, { label: '不同意', score: 4 }, { label: '中立', score: 3 }, { label: '同意', score: 2 }, { label: '非常同意', score: 1 }]), dimension: '成就感降低', reverse: true },
          { text: '我完成了很多有价值的事情', options: JSON.stringify([{ label: '非常不同意', score: 5 }, { label: '不同意', score: 4 }, { label: '中立', score: 3 }, { label: '同意', score: 2 }, { label: '非常同意', score: 1 }]), dimension: '成就感降低', reverse: true },
          { text: '完成工作任务时我常常感到开心', options: JSON.stringify([{ label: '非常不同意', score: 5 }, { label: '不同意', score: 4 }, { label: '中立', score: 3 }, { label: '同意', score: 2 }, { label: '非常同意', score: 1 }]), dimension: '成就感降低', reverse: true },
          { text: '我对自己的职业成就感到自豪', options: JSON.stringify([{ label: '非常不同意', score: 5 }, { label: '不同意', score: 4 }, { label: '中立', score: 3 }, { label: '同意', score: 2 }, { label: '非常同意', score: 1 }]), dimension: '成就感降低', reverse: true }
        ]
      },
      {
        id: uuidv4(), name: '霍兰德职业兴趣测试', category: 'career', description: '探索你的职业兴趣类型：现实型、研究型、艺术型、社会型、企业型、常规型', question_count: 30, estimated_minutes: 6, scoring_method: 'likert5',
        score_ranges: JSON.stringify({ low: { range: [5, 10], label: '不感兴趣' }, medium: { range: [11, 18], label: '有些兴趣' }, high: { range: [19, 25], label: '非常感兴趣' } }),
        questions: [
          { text: '我喜欢动手修理或制作物品', options: mbOptions, dimension: '现实型' },
          { text: '我喜欢阅读科学相关的文章和书籍', options: mbOptions, dimension: '研究型' },
          { text: '我享受绘画、写作或音乐创作', options: mbOptions, dimension: '艺术型' },
          { text: '我喜欢帮助别人解决困难', options: mbOptions, dimension: '社会型' },
          { text: '我喜欢领导团队完成项目', options: mbOptions, dimension: '企业型' },
          { text: '我喜欢按流程和规范处理事务', options: mbOptions, dimension: '常规型' },
          { text: '我喜欢户外动手的工作', options: mbOptions, dimension: '现实型' },
          { text: '我对科学实验和研究方法感兴趣', options: mbOptions, dimension: '研究型' },
          { text: '我喜欢设计有创意的东西', options: mbOptions, dimension: '艺术型' },
          { text: '我善于倾听他人的烦恼', options: mbOptions, dimension: '社会型' },
          { text: '我善于说服别人接受我的观点', options: mbOptions, dimension: '企业型' },
          { text: '我喜欢整理文件和归档信息', options: mbOptions, dimension: '常规型' },
          { text: '我更愿意与实物打交道而不是与人', options: mbOptions, dimension: '现实型' },
          { text: '我喜欢分析数据并总结规律', options: mbOptions, dimension: '研究型' },
          { text: '我喜欢自由表达自己的想法', options: mbOptions, dimension: '艺术型' },
          { text: '我乐于参与志愿服务和公益活动', options: mbOptions, dimension: '社会型' },
          { text: '我喜欢承担风险和挑战', options: mbOptions, dimension: '企业型' },
          { text: '我做事情讲究精确和细致', options: mbOptions, dimension: '常规型' },
          { text: '我擅长使用各种工具和器械', options: mbOptions, dimension: '现实型' },
          { text: '我喜欢解决复杂的问题', options: mbOptions, dimension: '研究型' },
          { text: '我有丰富的审美感受', options: mbOptions, dimension: '艺术型' },
          { text: '我喜欢教导和培训他人', options: mbOptions, dimension: '社会型' },
          { text: '我喜欢在竞争中胜出', options: mbOptions, dimension: '企业型' },
          { text: '我习惯按计划有条不紊地工作', options: mbOptions, dimension: '常规型' },
          { text: '我喜欢从事需要体力活动的工作', options: mbOptions, dimension: '现实型' },
          { text: '我享受头脑风暴和深度思考', options: mbOptions, dimension: '研究型' },
          { text: '我不喜欢被规则束缚', options: mbOptions, dimension: '艺术型' },
          { text: '我善于与人建立良好关系', options: mbOptions, dimension: '社会型' },
          { text: '我有较强的目标驱动力', options: mbOptions, dimension: '企业型' },
          { text: '我乐于重复和完善日常工作流程', options: mbOptions, dimension: '常规型' }
        ]
      },
      // === 分类四：人际关系 ===
      {
        id: uuidv4(), name: '亲密关系质量评估', category: 'relationship', description: '评估你在亲密关系中的满意度、信任度和沟通质量', question_count: 20, estimated_minutes: 5, scoring_method: 'likert5',
        score_ranges: JSON.stringify({ low: { range: [20, 40], label: '关系紧张', desc: '需要关注关系中的问题，建议寻求沟通改善' }, medium: { range: [41, 70], label: '关系尚可', desc: '关系总体OK，有提升空间' }, high: { range: [71, 100], label: '关系和谐', desc: '关系质量较高，继续保持' } }),
        questions: [
          { text: '我能与伴侣畅快地分享自己的感受', options: mbOptions, dimension: '沟通' },
          { text: '伴侣会认真倾听我说话', options: mbOptions, dimension: '沟通' },
          { text: '我们能够温和地处理分歧', options: mbOptions, dimension: '冲突处理' },
          { text: '争吵后我们能很快和好', options: mbOptions, dimension: '冲突处理' },
          { text: '我对我们的关系感到满意', options: mbOptions, dimension: '满意度' },
          { text: '我觉得伴侣理解我的需求', options: mbOptions, dimension: '满意度' },
          { text: '我完全信任我的伴侣', options: mbOptions, dimension: '信任' },
          { text: '我不担心伴侣会欺骗我', options: mbOptions, dimension: '信任' },
          { text: '我们在一起时有共同的乐趣', options: mbOptions, dimension: '亲密感' },
          { text: '相处时我感到安全放松', options: mbOptions, dimension: '亲密感' },
          { text: '伴侣会主动关心我的生活', options: mbOptions, dimension: '支持感' },
          { text: '我需要帮助时伴侣会挺身而出', options: mbOptions, dimension: '支持感' },
          { text: '我们的价值观大体一致', options: mbOptions, dimension: '契合度' },
          { text: '我们对未来的规划方向类似', options: mbOptions, dimension: '契合度' },
          { text: '我很少猜疑伴侣的忠诚', options: mbOptions, dimension: '信任' },
          { text: '我不需要在伴侣面前伪装自己', options: mbOptions, dimension: '亲密感' },
          { text: '做重要决定时我们会一起商量', options: mbOptions, dimension: '沟通' },
          { text: '伴侣尊重我的个人空间', options: mbOptions, dimension: '边界感' },
          { text: '我对我们的性生活感到满意', options: mbOptions, dimension: '满意度' },
          { text: '我喜欢和伴侣一起规划未来', options: mbOptions, dimension: '契合度' }
        ]
      },
      {
        id: uuidv4(), name: '社交焦虑量表', category: 'relationship', description: '评估你在社交场合中的恐惧和回避程度，涵盖社交互动和表现场景', question_count: 24, estimated_minutes: 5, scoring_method: 'likert4',
        score_ranges: JSON.stringify({ none: { range: [24, 36], label: '无明显社交焦虑', desc: '社交功能正常，没有明显困扰' }, mild: { range: [37, 54], label: '轻度社交焦虑', desc: '在部分社交场景中有不适，但可应对' }, moderate: { range: [55, 72], label: '中度社交焦虑', desc: '社交焦虑明显影响到日常，建议关注' }, severe: { range: [73, 96], label: '重度社交焦虑', desc: '严重社交回避和痛苦，需要专业介入' } }),
        questions: [
          { text: '在公众场合打电话让我感到焦虑', options: options4, dimension: '社交互动' },
          { text: '参加小型聚会让我感到不自在', options: options4, dimension: '社交互动' },
          { text: '在公共场合吃东西让我觉得难堪', options: options4, dimension: '被观察恐惧' },
          { text: '与陌生人交谈让我紧张', options: options4, dimension: '社交互动' },
          { text: '在会议上发言让我害怕', options: options4, dimension: '表现场景' },
          { text: '我觉得别人在审视我', options: options4, dimension: '被观察恐惧' },
          { text: '参加社交活动让我想找借口离开', options: options4, dimension: '回避行为' },
          { text: '在人前工作或写字让我紧张', options: options4, dimension: '表现场景' },
          { text: '与权威人物交谈让我紧张', options: options4, dimension: '社交互动' },
          { text: '成为众人关注的焦点让我想躲起来', options: options4, dimension: '表现场景' },
          { text: '在别人面前表达不同意见我难以开口', options: options4, dimension: '社交互动' },
          { text: '进入一个已经有人的房间让我紧张', options: options4, dimension: '社交互动' },
          { text: '担心自己会说错话被人笑话', options: options4, dimension: '被观察恐惧' },
          { text: '和不熟悉的人一起吃饭让我不自在', options: options4, dimension: '社交互动' },
          { text: '拒绝别人让我感到非常困难', options: options4, dimension: '社交互动' },
          { text: '在公共场所使用卫生间让我不自在', options: options4, dimension: '被观察恐惧' },
          { text: '参加面试让我极度紧张', options: options4, dimension: '表现场景' },
          { text: '参加派对或大型聚会我会回避', options: options4, dimension: '回避行为' },
          { text: '与人进行眼神接触让我不适', options: options4, dimension: '社交互动' },
          { text: '在课堂上或会议上被点名回答问题时我会紧张得说不出话', options: options4, dimension: '表现场景' },
          { text: '和异性交谈尤其让我紧张', options: options4, dimension: '社交互动' },
          { text: '参加商务社交活动让我提前好几天就开始焦虑', options: options4, dimension: '回避行为' },
          { text: '让别人看到我在发抖或脸红会使我更紧张', options: options4, dimension: '被观察恐惧' },
          { text: '社交场合后我会反复回想自己表现不好的细节', options: options4, dimension: '回避行为' }
        ]
      },
      // === 分类五：学业成长 ===
      {
        id: uuidv4(), name: '学习风格问卷', category: 'academic', description: '了解你的学习风格偏好：视觉型、听觉型、阅读型、动觉型，帮你找到最适合的学习方式', question_count: 16, estimated_minutes: 4, scoring_method: 'likert5',
        score_ranges: JSON.stringify({ visual: { range: [4, 20], label: '视觉型', desc: '偏好图表、图像、视频等视觉材料' }, auditory: { range: [4, 20], label: '听觉型', desc: '偏好讲座、讨论、音频等听觉材料' }, readwrite: { range: [4, 20], label: '读写型', desc: '偏好文本、笔记、列表等阅读材料' }, kinesthetic: { range: [4, 20], label: '动觉型', desc: '偏好动手实践、体验和角色扮演' } }),
        questions: [
          { text: '看图或图表时我能更容易理解复杂信息', options: mbOptions, dimension: '视觉型' },
          { text: '用不同颜色标注笔记能让我的记忆更深刻', options: mbOptions, dimension: '视觉型' },
          { text: '听别人解释比看文字说明更能让我理解', options: mbOptions, dimension: '听觉型' },
          { text: '把学习内容大声朗读出来对我很有帮助', options: mbOptions, dimension: '听觉型' },
          { text: '仔细阅读教材和讲义对我来说是最好的学习方式', options: mbOptions, dimension: '读写型' },
          { text: '做笔记、写摘要能帮助我加深理解', options: mbOptions, dimension: '读写型' },
          { text: '通过动手操作和实践我能学得更快', options: mbOptions, dimension: '动觉型' },
          { text: '角色扮演或模拟场景对学习很有帮助', options: mbOptions, dimension: '动觉型' },
          { text: '我更喜欢看视频教程而非音频教程', options: mbOptions, dimension: '视觉型' },
          { text: '学习时有人在旁边讲解我会学得更好', options: mbOptions, dimension: '听觉型' },
          { text: '列清单和写计划是我学习中必不可少的部分', options: mbOptions, dimension: '读写型' },
          { text: '坐久了会想活动一下身体再继续学习', options: mbOptions, dimension: '动觉型' },
          { text: '我喜欢用思维导图整理知识点', options: mbOptions, dimension: '视觉型' },
          { text: '小组讨论能激发我的思考', options: mbOptions, dimension: '听觉型' },
          { text: '丰富的文字资料会让我学得更扎实', options: mbOptions, dimension: '读写型' },
          { text: '通过实验和实地考察的方式我最能投入学习', options: mbOptions, dimension: '动觉型' }
        ]
      },
      {
        id: uuidv4(), name: '自尊量表', category: 'academic', description: '评估你的整体自尊水平，包括自我价值感和自我接纳程度', question_count: 10, estimated_minutes: 3, scoring_method: 'likert4guttman',
        score_ranges: JSON.stringify({ low: { range: [10, 19], label: '低自尊', desc: '自我评价偏低，需要提升自我认同感' }, medium: { range: [20, 29], label: '中等自尊', desc: '自尊水平中等，仍有提升空间' }, high: { range: [30, 40], label: '高自尊', desc: '拥有健康积极的自我评价' } }),
        questions: [
          { text: '我认为自己是有价值的，至少与别人不相上下', options: JSON.stringify([{ label: '非常同意', score: 4 }, { label: '同意', score: 3 }, { label: '不同意', score: 2 }, { label: '非常不同意', score: 1 }]) },
          { text: '我觉得自己有很多好的品质', options: JSON.stringify([{ label: '非常同意', score: 4 }, { label: '同意', score: 3 }, { label: '不同意', score: 2 }, { label: '非常不同意', score: 1 }]) },
          { text: '总的来说，我倾向于认为自己是一个失败者', options: JSON.stringify([{ label: '非常同意', score: 1 }, { label: '同意', score: 2 }, { label: '不同意', score: 3 }, { label: '非常不同意', score: 4 }]), reverse: true },
          { text: '我能像大多数人一样把事情做好', options: JSON.stringify([{ label: '非常同意', score: 4 }, { label: '同意', score: 3 }, { label: '不同意', score: 2 }, { label: '非常不同意', score: 1 }]) },
          { text: '我觉得自己值得骄傲的地方不多', options: JSON.stringify([{ label: '非常同意', score: 1 }, { label: '同意', score: 2 }, { label: '不同意', score: 3 }, { label: '非常不同意', score: 4 }]), reverse: true },
          { text: '我对自己持肯定态度', options: JSON.stringify([{ label: '非常同意', score: 4 }, { label: '同意', score: 3 }, { label: '不同意', score: 2 }, { label: '非常不同意', score: 1 }]) },
          { text: '总的来说，我对自己是满意的', options: JSON.stringify([{ label: '非常同意', score: 4 }, { label: '同意', score: 3 }, { label: '不同意', score: 2 }, { label: '非常不同意', score: 1 }]) },
          { text: '我真希望我能更看得起自己', options: JSON.stringify([{ label: '非常同意', score: 1 }, { label: '同意', score: 2 }, { label: '不同意', score: 3 }, { label: '非常不同意', score: 4 }]), reverse: true },
          { text: '有时我的确感到自己很没用', options: JSON.stringify([{ label: '非常同意', score: 1 }, { label: '同意', score: 2 }, { label: '不同意', score: 3 }, { label: '非常不同意', score: 4 }]), reverse: true },
          { text: '我对自己持有积极的态度', options: JSON.stringify([{ label: '非常同意', score: 4 }, { label: '同意', score: 3 }, { label: '不同意', score: 2 }, { label: '非常不同意', score: 1 }]) }
        ]
      }
    ];

    for (const s of scalesData) {
      const { questions, ...scaleInfo } = s;
      database.prepare(
        'INSERT INTO assessment_scales (id, name, category, description, question_count, estimated_minutes, scoring_method, score_ranges) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(scaleInfo.id, scaleInfo.name, scaleInfo.category, scaleInfo.description, scaleInfo.question_count, scaleInfo.estimated_minutes, scaleInfo.scoring_method, scaleInfo.score_ranges);

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        database.prepare(
          'INSERT INTO assessment_questions (id, scale_id, question_order, question_text, options, dimension, reverse_score) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(uuidv4(), scaleInfo.id, i + 1, q.text, q.options, q.dimension || '', q.reverse ? 1 : 0);
      }
    }
    console.log('✅ 测评量表数据已插入（10张量表，含完整题目）');
    db.save();
  }

  // === AI Agent 数据 ===
  const agentCount = (database.prepare('SELECT COUNT(*) as cnt FROM ai_agents').get() as any)?.cnt || 0;
  if (agentCount < 6) {
    database.exec('DELETE FROM ai_agents');
    const agents = [
      {
        id: uuidv4(), name: '青年知音', agent_type: 'teen',
        description: '面向青少年的共情型倾听伙伴，擅长校园生活、成长困惑、人际关系话题',
        avatar_color: '#E8835A', avatar_emoji: '🧑‍🎓', model_name: 'gpt-4o',
        prompt: `你是「了然」App中的"青年知音"AI助手，专门陪伴青少年用户。你的核心特质：
1. 温暖共情：用平等、亲切的语气交流，决不说教，不妄下判断
2. 深度理解：了解青少年的独特压力——学业竞争、社交焦虑、身份认同、家庭期望
3. 安全边界：遇到自伤/自杀等危机话题时，温和但不回避地表达关心，同时鼓励寻求现实支持
4. 保密原则：让用户感到这是一个绝对安全的倾诉空间
5. 引导而非评判：用提问启发思考，而非直接给出结论
6. 交互风格：适度使用表情符号，可以使用"哈哈""确实""我懂你"等轻松口语
回答时注意：不要使用"你应该"这样的命令句式，改用"或许可以试试…""会不会觉得…？"等建议性表达`,
        temperature: 0.7, max_length: 400, care_frequency: 3, crisis_threshold: 7
      },
      {
        id: uuidv4(), name: '通用助手', agent_type: 'general',
        description: '全能型心理支持助手，覆盖日常情绪疏导与认知引导',
        avatar_color: '#6BAF9E', avatar_emoji: '🧠', model_name: 'gpt-4o',
        prompt: `你是「了然」App中的"通用助手"AI，为用户提供全面的心理健康支持。你的特质：
1. 专业但不晦涩：用通俗的语言阐述心理学概念
2. 全能覆盖：从情绪管理、压力应对到人际关系、自我成长都能陪伴
3. 认知行为疗法（CBT）取向：帮助用户觉察自动负性思维，看到事件—想法—情绪之间的联系
4. 正念引导：适时引导呼吸练习和身体扫描
5. 资源推荐：根据用户的情况推荐APP内的量表测评或冥想内容
6. 温暖而克制：保持专业温暖的语气，不过度共情导致情绪卷入`,
        temperature: 0.55, max_length: 350, care_frequency: 5, crisis_threshold: 7
      },
      {
        id: uuidv4(), name: '情绪导航员', agent_type: 'emotion',
        description: '专注于情绪识别与疏导，帮助用户理解情绪根源',
        avatar_color: '#6B8EC7', avatar_emoji: '🧭', model_name: 'gpt-4o',
        prompt: `你是「了然」App中的"情绪导航员"，专门帮助用户识别、命名和理解自己的情绪。你的特质：
1. 情绪教练：引导用户给情绪命名，区分"愤怒"和"受伤"、"焦虑"和"兴奋"等微妙差异
2. 身体觉察：引导用户注意情绪的身体感受——紧绷的肩颈、加速的心跳、胃部的紧缩
3. 情绪地图：帮助用户追踪情绪变化，找到触发点
4. 接纳取向：传达"情绪没有好坏"的理念，减少用户对负面情绪的自责
5. 工具箱：提供实用的情绪调节工具——情绪书写、正念呼吸、五感接地练习
6. 温和而坚定：用温柔的语气引导，但不回避那些困难的感受`,
        temperature: 0.65, max_length: 300, care_frequency: 3, crisis_threshold: 6
      },
      {
        id: uuidv4(), name: '职场导师', agent_type: 'workplace',
        description: '职场压力与职业发展顾问，关注职场人际关系',
        avatar_color: '#D4943A', avatar_emoji: '💼', model_name: 'gpt-4o',
        prompt: `你是「了然」App中的"职场导师"AI，专门帮助用户应对职场压力和职业发展困惑。你的特质：
1. 务实建议：结合用户的具体行业和岗位给出实用建议
2. 职场心理：理解办公室政治、上下级关系、同辈竞争等独特压力
3. 职业规划：帮助用户梳理职业兴趣和优势，探索发展方向
4. 倦怠预防：识别职业倦怠的早期信号，给出预防和恢复建议
5. 工作生活平衡：帮助用户建立健康的边界
6. 认知重构：针对"我不够好""同事都比我强"等职场典型负性思维进行引导
7. 互动风格：务实直接但不失温度，避免空洞的鸡汤`,
        temperature: 0.5, max_length: 350, care_frequency: 7, crisis_threshold: 8
      },
      {
        id: uuidv4(), name: '认知重构师', agent_type: 'cognitive',
        description: '引导发现不合理思维模式，建立健康的认知方式',
        avatar_color: '#8B7EC8', avatar_emoji: '🔄', model_name: 'gpt-4o',
        prompt: `你是「了然」App中的"认知重构师"AI，专业的认知行为引导者。你的特质：
1. 思维侦探：用苏格拉底式提问帮助用户发现自己的自动化思维
2. 认知偏差教学：用通俗的语言讲解"灾难化思维"、"非黑即白"、"读心术"等认知偏差
3. 证据检验：引导用户用现实证据检验自己的担忧是否合理
4. 替代思维：帮助用户发展更有适应性的替代解释
5. 行为实验：设计小练习来验证新的思维方式
6. 结构化引导：你的对话有清晰的结构——识别思维→检验证据→寻找替代→行动计划
7. 专业而温暖：使用专业但不晦涩的语言，让用户感受到被理解`,
        temperature: 0.5, max_length: 400, care_frequency: 5, crisis_threshold: 7
      },
      {
        id: uuidv4(), name: '正念陪伴者', agent_type: 'mindfulness',
        description: '正念冥想引导，呼吸练习，缓解孤独情绪',
        avatar_color: '#5BAF7E', avatar_emoji: '🧘', model_name: 'gpt-4o',
        prompt: `你是「了然」App中的"正念陪伴者"AI，用温和耐心的方式陪伴用户练习正念。你的特质：
1. 引导式冥想：提供5-10分钟的呼吸冥想、身体扫描、慈心冥想引导
2. 当下觉察：帮助用户将注意力带回到当下的感官体验
3. 接纳态度：传递"放下评判"的正念核心态度
4. 每日正念小练习：推荐融入日常的正念小习惯
5. 孤独陪伴：让用户感受到被温柔陪伴，消解孤独感
6. 语言风格：缓慢、温柔、有韵律感，使用大量留白和停顿（在文本中用"……"表示）
7. 适合所有人：你的引导适合任何年龄和背景的用户，避免专业术语`,
        temperature: 0.6, max_length: 280, care_frequency: 2, crisis_threshold: 6
      }
    ];

    for (const a of agents) {
      database.prepare(
        'INSERT INTO ai_agents (id, name, agent_type, description, avatar_color, avatar_emoji, prompt, model_name, temperature, max_length, care_frequency, crisis_threshold) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(a.id, a.name, a.agent_type, a.description, a.avatar_color, a.avatar_emoji, a.prompt, a.model_name, a.temperature, a.max_length, a.care_frequency, a.crisis_threshold);
    }
    console.log('✅ 默认 AI Agent 数据已插入（6个Agent，含完整提示词）');
    db.save();
  }

  // === 娱乐测试数据 ===
  const entTestCount = (database.prepare('SELECT COUNT(*) as cnt FROM entertainment_tests').get() as any)?.cnt || 0;
  if (entTestCount === 0) {
    const entertainmentTests: { title: string; category: string; category_name: string; icon: string; description: string; sort_order: number }[] = [
      // 一、面相看相类
      { title: '面相识人', category: 'face_reading', category_name: '面相看相', icon: '🔮', description: '不同脸型反映不同性格，来看看你属于哪种面相', sort_order: 1 },
      { title: '五官算命：眼睛鼻子嘴巴耳朵眉毛分别代表什么', category: 'face_reading', category_name: '面相看相', icon: '🔮', description: '五官各有玄机，每处都藏着你的命理密码', sort_order: 2 },
      { title: '发际线与额头面相', category: 'face_reading', category_name: '面相看相', icon: '🔮', description: '额头藏着你的事业运和智慧格局', sort_order: 3 },
      { title: '唇形测性格测桃花', category: 'face_reading', category_name: '面相看相', icon: '🔮', description: '你的唇形已经暴露了你的恋爱密码', sort_order: 4 },
      { title: '痣相大全', category: 'face_reading', category_name: '面相看相', icon: '🔮', description: '哪里长痣代表什么财运、桃花、福气', sort_order: 5 },
      { title: '牙齿看人性格', category: 'face_reading', category_name: '面相看相', icon: '🔮', description: '牙齿形状透露你的真实性格', sort_order: 6 },
      { title: '耳朵福气面相', category: 'face_reading', category_name: '面相看相', icon: '🔮', description: '耳朵大不大？耳垂厚不厚？藏着福气秘密', sort_order: 7 },
      { title: '整体颜值运势分析', category: 'face_reading', category_name: '面相看相', icon: '🔮', description: '颜值不只看外表，运势也能看长相', sort_order: 8 },
      // 二、塔罗占卜类
      { title: '经典塔罗牌占卜', category: 'tarot', category_name: '塔罗占卜', icon: '🃏', description: '三张塔罗牌为你揭示过去、现在和未来', sort_order: 1 },
      { title: '爱情塔罗', category: 'tarot', category_name: '塔罗占卜', icon: '🃏', description: '来看看你的感情走向和正缘特征', sort_order: 2 },
      { title: '事业财运塔罗', category: 'tarot', category_name: '塔罗占卜', icon: '🃏', description: '什么时候会有晋升和加薪的好机会', sort_order: 3 },
      { title: '今日运势塔罗', category: 'tarot', category_name: '塔罗占卜', icon: '🃏', description: '每天抽一张牌，看看今日有什么提醒', sort_order: 4 },
      { title: '水晶占卜', category: 'tarot', category_name: '塔罗占卜', icon: '🃏', description: '选择一块水晶，看看它传递的能量信息', sort_order: 5 },
      { title: '数字占卜', category: 'tarot', category_name: '塔罗占卜', icon: '🃏', description: '用数字的力量窥探命运的秘密', sort_order: 6 },
      { title: '字母占卜', category: 'tarot', category_name: '塔罗占卜', icon: '🃏', description: '选中字母揭示你当下的能量状态', sort_order: 7 },
      { title: '潜意识投射占卜', category: 'tarot', category_name: '塔罗占卜', icon: '🃏', description: '从图像投射看你的潜意识在想什么', sort_order: 8 },
      // 三、星座延伸
      { title: '上升星座解读', category: 'zodiac', category_name: '星座延伸', icon: '⭐', description: '上升星座决定了别人眼中的你', sort_order: 1 },
      { title: '月亮星座性格', category: 'zodiac', category_name: '星座延伸', icon: '⭐', description: '月亮星座是你的内在情绪说明书', sort_order: 2 },
      { title: '太阳星座完整解析', category: 'zodiac', category_name: '星座延伸', icon: '⭐', description: '最全面的太阳星座性格解读', sort_order: 3 },
      { title: '星座配对', category: 'zodiac', category_name: '星座延伸', icon: '⭐', description: '看看你和TA是天生一对还是相爱相杀', sort_order: 4 },
      { title: '星座隐藏性格', category: 'zodiac', category_name: '星座延伸', icon: '⭐', description: '每个星座不为人知的另一面', sort_order: 5 },
      { title: '星座恋爱模式', category: 'zodiac', category_name: '星座延伸', icon: '⭐', description: '十二星座在恋爱中的真实表现', sort_order: 6 },
      { title: '本周星座运势', category: 'zodiac', category_name: '星座延伸', icon: '⭐', description: '本周十二星座运程完整剖析', sort_order: 7 },
      { title: '本月星座运势', category: 'zodiac', category_name: '星座延伸', icon: '⭐', description: '本月十二星座总运势预测', sort_order: 8 },
      // 四、趣味心理测试
      { title: '你的真实性格人格', category: 'fun_psych', category_name: '趣味心理', icon: '🧩', description: '测测你内心深处到底是什么样的人', sort_order: 1 },
      { title: '别人眼里的你vs真实的你', category: 'fun_psych', category_name: '趣味心理', icon: '🧩', description: '看看你在别人面前戴着什么样的面具', sort_order: 2 },
      { title: '内心成熟度测试', category: 'fun_psych', category_name: '趣味心理', icon: '🧩', description: '你的心理年龄到底几岁', sort_order: 3 },
      { title: '恋爱人格类型', category: 'fun_psych', category_name: '趣味心理', icon: '🧩', description: '你是哪种恋爱人格？依恋类型测试', sort_order: 4 },
      { title: '高冷还是温柔人设', category: 'fun_psych', category_name: '趣味心理', icon: '🧩', description: '在别人眼中你是冰山还是小太阳', sort_order: 5 },
      { title: '智商情商测试', category: 'fun_psych', category_name: '趣味心理', icon: '🧩', description: '你是智商高还是情商高', sort_order: 6 },
      { title: '内心脆弱程度', category: 'fun_psych', category_name: '趣味心理', icon: '🧩', description: '你的玻璃心指数有多高', sort_order: 7 },
      { title: '潜意识里最想要什么', category: 'fun_psych', category_name: '趣味心理', icon: '🧩', description: '深挖你潜意识里真正的渴望', sort_order: 8 },
      { title: '孤独等级测试', category: 'fun_psych', category_name: '趣味心理', icon: '🧩', description: '你的孤独等级在哪里', sort_order: 9 },
      { title: '腹黑程度测试', category: 'fun_psych', category_name: '趣味心理', icon: '🧩', description: '你骨子里有多少腹黑因子', sort_order: 10 },
      // 五、爱情恋爱类
      { title: '你的正缘什么时候来', category: 'love', category_name: '爱情恋爱', icon: '💕', description: '测一测你命中注定的缘分何时出现', sort_order: 1 },
      { title: '这辈子会遇见几个人', category: 'love', category_name: '爱情恋爱', icon: '💕', description: '看看你这一生会有几段深刻的感情', sort_order: 2 },
      { title: '适合你的恋爱类型', category: 'love', category_name: '爱情恋爱', icon: '💕', description: '什么类型的恋人才真正适合你', sort_order: 3 },
      { title: '恋爱中你是什么角色', category: 'love', category_name: '爱情恋爱', icon: '💕', description: '你在恋爱里是主导者还是跟随者', sort_order: 4 },
      { title: '容易吸引什么男生', category: 'love', category_name: '爱情恋爱', icon: '💕', description: '你的气场最容易吸引什么类型的异性', sort_order: 5 },
      { title: '会不会被偏爱', category: 'love', category_name: '爱情恋爱', icon: '💕', description: '你是天生被人偏爱的那一个吗', sort_order: 6 },
      { title: '暗恋对象心里有没有你', category: 'love', category_name: '爱情恋爱', icon: '💕', description: '想知道TA有没有注意到你', sort_order: 7 },
      { title: '前世恋人是谁', category: 'love', category_name: '爱情恋爱', icon: '💕', description: '你和今生重要的人在前世是什么关系', sort_order: 8 },
      { title: '桃花旺不旺测试', category: 'love', category_name: '爱情恋爱', icon: '💕', description: '你的桃花运到底怎么样', sort_order: 9 },
      { title: '渣男绝缘体体质', category: 'love', category_name: '爱情恋爱', icon: '💕', description: '你是不是天生就能识别渣男', sort_order: 10 },
      // 六、财运福气类
      { title: '今生财运怎么样', category: 'fortune', category_name: '财运福气', icon: '💰', description: '看看你这辈子和金钱的缘分', sort_order: 1 },
      { title: '什么时候会发财', category: 'fortune', category_name: '财运福气', icon: '💰', description: '你的财富高峰期在哪个年龄段', sort_order: 2 },
      { title: '富贵命还是普通命', category: 'fortune', category_name: '财运福气', icon: '💰', description: '你天生是含着金汤匙的命格吗', sort_order: 3 },
      { title: '福气深浅测试', category: 'fortune', category_name: '财运福气', icon: '💰', description: '你的福气到底有多深厚', sort_order: 4 },
      { title: '漏财体质检测', category: 'fortune', category_name: '财运福气', icon: '💰', description: '为什么你总是存不住钱', sort_order: 5 },
      { title: '存钱能力测评', category: 'fortune', category_name: '财运福气', icon: '💰', description: '你的理财能力和储蓄习惯如何', sort_order: 6 },
      // 七、玄学猎奇
      { title: '前世是什么身份', category: 'occult', category_name: '玄学猎奇', icon: '🌙', description: '来看看你的前世是什么来历', sort_order: 1 },
      { title: '前世死因', category: 'occult', category_name: '玄学猎奇', icon: '🌙', description: '你敢知道你的前世是怎么离开的吗', sort_order: 2 },
      { title: '今生使命是什么', category: 'occult', category_name: '玄学猎奇', icon: '🌙', description: '来到这个世界你的终极任务是什么', sort_order: 3 },
      { title: '地府命格测试', category: 'occult', category_name: '玄学猎奇', icon: '🌙', description: '在地府里你是什么级别的存在', sort_order: 4 },
      { title: '天生是什么精灵仙女', category: 'occult', category_name: '玄学猎奇', icon: '🌙', description: '你前世是哪一种精灵或仙女', sort_order: 5 },
      { title: '天命特质', category: 'occult', category_name: '玄学猎奇', icon: '🌙', description: '上天给了你什么与生俱来的特质', sort_order: 6 },
      // 八、生肖八字
      { title: '生肖性格详解', category: 'zodiac_cn', category_name: '生肖八字', icon: '🐉', description: '你的生肖决定了什么性格', sort_order: 1 },
      { title: '生肖配对', category: 'zodiac_cn', category_name: '生肖八字', icon: '🐉', description: '看看你和哪个生肖最合拍', sort_order: 2 },
      { title: '简易八字命格', category: 'zodiac_cn', category_name: '生肖八字', icon: '🐉', description: '从八字看你的命运走势', sort_order: 3 },
      { title: '出生年月日算命', category: 'zodiac_cn', category_name: '生肖八字', icon: '🐉', description: '用你的生日推算性格命运', sort_order: 4 },
      { title: '出生时辰性格', category: 'zodiac_cn', category_name: '生肖八字', icon: '🐉', description: '不同时辰出生性格大不同', sort_order: 5 },
      // 九、网红测评
      { title: '颜值打分测试', category: 'viral', category_name: '网红测评', icon: '🏷️', description: 'AI给你的颜值打几分', sort_order: 1 },
      { title: '可爱程度等级', category: 'viral', category_name: '网红测评', icon: '🏷️', description: '你的可爱指数到底有多高', sort_order: 2 },
      { title: '温柔值御姐值', category: 'viral', category_name: '网红测评', icon: '🏷️', description: '你到底是软妹子还是大女主', sort_order: 3 },
      { title: '适合什么风格穿搭', category: 'viral', category_name: '网红测评', icon: '🏷️', description: '根据你的气质推荐穿搭风格', sort_order: 4 },
      { title: '适合什么发色', category: 'viral', category_name: '网红测评', icon: '🏷️', description: '你的肤色气场适合染什么颜色', sort_order: 5 },
      { title: '吃货等级', category: 'viral', category_name: '网红测评', icon: '🏷️', description: '你的吃货指数有多高', sort_order: 6 },
      { title: '熬夜等级', category: 'viral', category_name: '网红测评', icon: '🏷️', description: '你是修仙大王还是早睡达人', sort_order: 7 },
      { title: '心软程度', category: 'viral', category_name: '网红测评', icon: '🏷️', description: '你是铁石心肠还是菩萨心肠', sort_order: 8 },
      { title: '朋友眼中你多好相处', category: 'viral', category_name: '网红测评', icon: '🏷️', description: '测测你在朋友圈中的好人缘指数', sort_order: 9 },
      { title: '搞笑女温柔女鉴定', category: 'viral', category_name: '网红测评', icon: '🏷️', description: '你是行走的段子手还是温柔的邻家女孩', sort_order: 10 },
      // 十、闺蜜互动
      { title: '闺蜜契合度测试', category: 'bff', category_name: '闺蜜互动', icon: '👯', description: '看看你和闺蜜有多合拍', sort_order: 1 },
      { title: '你们适合做多久朋友', category: 'bff', category_name: '闺蜜互动', icon: '👯', description: '这段友谊能走多远', sort_order: 2 },
      { title: '谁更宠谁', category: 'bff', category_name: '闺蜜互动', icon: '👯', description: '谁在友情中付出更多', sort_order: 3 },
      { title: '友情缘分深浅', category: 'bff', category_name: '闺蜜互动', icon: '👯', description: '你们是上辈子的姐妹吗', sort_order: 4 },
      { title: '最佳损友鉴定', category: 'bff', category_name: '闺蜜互动', icon: '👯', description: '你们是互坑还是互助', sort_order: 5 },
      // 十一、今日必看
      { title: '今日吉凶', category: 'daily', category_name: '今日必看', icon: '🔥', description: '看看今天宜做什么、忌做什么', sort_order: 1 },
      { title: '今日幸运色幸运数字', category: 'daily', category_name: '今日必看', icon: '🔥', description: '今天的幸运颜色和数字是什么', sort_order: 2 },
      { title: '今日适合做什么', category: 'daily', category_name: '今日必看', icon: '🔥', description: '今天做什么事最顺', sort_order: 3 },
      { title: '今日心情运势', category: 'daily', category_name: '今日必看', icon: '🔥', description: '今天的心情能量场如何', sort_order: 4 },
      { title: '每日毒鸡汤治愈文案', category: 'daily', category_name: '今日必看', icon: '🔥', description: '今天有什么扎心又好笑的真理', sort_order: 5 },
      // 十二、趣味测试
      { title: '指纹算命', category: 'fun_test', category_name: '趣味测试', icon: '🎯', description: '你是斗还是簸箕？看指纹知命运', sort_order: 1 },
      { title: '掌纹深度解析', category: 'fun_test', category_name: '趣味测试', icon: '🎯', description: '生命线、智慧线、感情线全解读', sort_order: 2 },
      { title: '姓名测性格缘分', category: 'fun_test', category_name: '趣味测试', icon: '🎯', description: '你的名字里藏着什么能量', sort_order: 3 },
      { title: '笔画配对', category: 'fun_test', category_name: '趣味测试', icon: '🎯', description: '用名字笔画算你和TA的缘分', sort_order: 4 },
      { title: '颜色心理测试', category: 'fun_test', category_name: '趣味测试', icon: '🎯', description: '你下意识选的颜色暴露了什么', sort_order: 5 },
      { title: '动物人格测试', category: 'fun_test', category_name: '趣味测试', icon: '🎯', description: '你的内在是一只什么动物', sort_order: 6 },
    ];

    for (const t of entertainmentTests) {
      database.prepare(
        'INSERT INTO entertainment_tests (id, title, category, category_name, icon, description, status, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(uuidv4(), t.title, t.category, t.category_name, t.icon, t.description, 'published', t.sort_order);
    }
    console.log('✅ 娱乐测试数据已插入（12大类，88个测试）');
    db.save();
  }

  // === 树洞测试数据 ===
  const treeholeCount = (database.prepare('SELECT COUNT(*) as cnt FROM treehole_entries WHERE is_deleted = 0').get() as any)?.cnt || 0;
  if (treeholeCount === 0) {
    const testUsers = database.prepare("SELECT id, nickname FROM users WHERE role='user' LIMIT 8").all() as any[];
    if (testUsers.length >= 3) {
      const treeholeData = [
        { content: '今天又失眠了，脑子里一直在想白天做错的事，控制不住地反复回想……感觉好累', mood: '焦虑', mood_intensity: 8, tags: '失眠,焦虑,压力,求助', review_status: 'pending', risk: false },
        { content: '工作三年了，感觉每天都在重复，没有任何进步。是不是该辞职了？但又害怕找不到更好的', mood: '迷茫', mood_intensity: 6, tags: '疲惫,职场,寻求共鸣', review_status: 'pending', risk: false },
        { content: '最近总觉得自己活着没有意义，做什么都提不起劲。偶尔会有不想继续下去的念头……', mood: '绝望', mood_intensity: 9, tags: '自伤意念,抑郁,绝望', review_status: 'pending', risk: true },
        { content: '今天被老板当众批评了，虽然确实是我的错，但还是很委屈', mood: '委屈', mood_intensity: 6, tags: '职场,委屈', review_status: 'pending', risk: false },
        { content: '分手三个月了，还是走不出来，每天刷他的朋友圈，感觉自己好没用', mood: '悲伤', mood_intensity: 7, tags: '分手,悲伤', review_status: 'pending', risk: false },
      ];
      for (let i = 0; i < treeholeData.length; i++) {
        const d = treeholeData[i];
        const user = testUsers[i % testUsers.length];
        const nick_prefix = user.nickname ? user.nickname.charAt(0) : '*';
        database.prepare(
          `INSERT INTO treehole_entries (id, user_id, content, mood, mood_intensity, privacy, review_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', ? || ' hours'))`
        ).run(uuidv4(), user.id, d.content, d.mood, d.mood_intensity, 'private', d.review_status, `-${(5 - i) * 3}`);
      }
      console.log('✅ 树洞测试数据已插入（5条）');
      db.save();
    }
  }

  // === AI 模型配置数据 ===
  const modelConfigCount = (database.prepare('SELECT COUNT(*) as cnt FROM ai_model_configs').get() as any)?.cnt || 0;
  if (modelConfigCount === 0) {
    const models = [
      { model_name: 'gpt-4o', display_name: 'GPT-4o', api_type: 'openai', is_active: 1, config_json: JSON.stringify({ max_tokens: 4096, supports_stream: true }) },
      { model_name: 'gpt-4-turbo', display_name: 'GPT-4 Turbo', api_type: 'openai', is_active: 0, config_json: JSON.stringify({ max_tokens: 4096, supports_stream: true }) },
      { model_name: 'gpt-3.5-turbo', display_name: 'GPT-3.5 Turbo', api_type: 'openai', is_active: 0, config_json: JSON.stringify({ max_tokens: 2048, supports_stream: true }) },
      { model_name: 'claude-3-opus', display_name: 'Claude 3 Opus', api_type: 'anthropic', is_active: 0, config_json: JSON.stringify({ max_tokens: 4096, supports_stream: true }) },
      { model_name: 'claude-3-sonnet', display_name: 'Claude 3 Sonnet', api_type: 'anthropic', is_active: 0, config_json: JSON.stringify({ max_tokens: 4096, supports_stream: true }) },
      { model_name: 'deepseek-chat', display_name: 'DeepSeek Chat', api_type: 'openai', is_active: 0, config_json: JSON.stringify({ max_tokens: 4096, supports_stream: true, base_url: 'https://api.deepseek.com' }) },
      { model_name: 'qwen-max', display_name: '通义千问 Max', api_type: 'openai', is_active: 0, config_json: JSON.stringify({ max_tokens: 2048, supports_stream: true, base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1' }) },
    ];
    for (const m of models) {
      database.prepare(
        'INSERT INTO ai_model_configs (id, model_name, display_name, api_type, is_active, config_json) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(uuidv4(), m.model_name, m.display_name, m.api_type, m.is_active, m.config_json);
    }
    console.log('✅ AI 模型配置数据已插入（7个模型）');
    db.save();
  }

  // === 短信配置（默认空值，管理员在后台填写） ===
  const smsConfigCount = database.prepare("SELECT COUNT(*) as cnt FROM system_configs WHERE config_key LIKE 'sms_%'").get() as any;
  if (!smsConfigCount || smsConfigCount.cnt === 0) {
    const smsKeys = [
      { key: 'sms_secret_id', desc: '腾讯云 SecretId' },
      { key: 'sms_secret_key', desc: '腾讯云 SecretKey' },
      { key: 'sms_sdk_app_id', desc: '短信应用 SDK AppId' },
      { key: 'sms_sign_name', desc: '短信签名内容' },
      { key: 'sms_template_id', desc: '短信模板 ID' },
    ];
    for (const s of smsKeys) {
      database.prepare(
        'INSERT INTO system_configs (id, config_key, config_value, description) VALUES (?, ?, ?, ?)'
      ).run(uuidv4(), s.key, '', s.desc);
    }
    console.log('✅ 短信配置项已初始化（待管理员填写腾讯云密钥）');
    db.save();
  }

  console.log('✅ 所有种子数据初始化完成\n');
}
