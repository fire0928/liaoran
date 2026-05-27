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
    // sql.js handles pragma via exec
    this.db.exec(_sql);
  }

  prepare(sql: string): any {
    const self = this;
    return {
      _sql: sql,
      _db: self,

      // Get all rows
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

      // Get single row
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

      // Run (insert/update/delete)
      run(...params: any[]) {
        try {
          self.db.run(sql, params);
          self.save();
          return {
            changes: self.db.getRowsModified(),
            // lastInsertRowid is not directly available in sql.js
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
  `);
  db.save();

  console.log('✅ 数据库初始化完成');
  await seedDefaultData();
}

async function seedDefaultData() {
  const database = db; // use module-level db
  const count = database.prepare('SELECT COUNT(*) as cnt FROM assessment_scales').get() as any;
  if (!count || count.cnt === 0) {
    const { v4: uuidv4 } = require('uuid');
    const scales = [
      { id: uuidv4(), name: 'PHQ-9 抑郁自评量表', category: 'emotion', description: '评估最近两周内抑郁症状的出现频率和严重程度', question_count: 9, estimated_minutes: 5 },
      { id: uuidv4(), name: 'GAD-7 广泛性焦虑量表', category: 'emotion', description: '评估焦虑症状的程度，涵盖紧张、担忧、无法放松等多个维度', question_count: 7, estimated_minutes: 3 },
      { id: uuidv4(), name: 'PSS-10 感知压力量表', category: 'stress', description: '测量你对生活中压力源的主观感知程度', question_count: 10, estimated_minutes: 4 },
      { id: uuidv4(), name: 'Rosenberg 自尊量表', category: 'personality', description: '评估你的整体自尊水平，包括自我价值感和自我接纳程度', question_count: 10, estimated_minutes: 3 },
      { id: uuidv4(), name: 'SWLS 生活满意度量表', category: 'wellbeing', description: '评估你对整体生活的认知评价，从五个维度衡量满意度', question_count: 5, estimated_minutes: 2 },
      { id: uuidv4(), name: 'UCLA 孤独感量表', category: 'relationship', description: '评估主观孤独感程度，包含社交连接和情感疏离两个维度', question_count: 20, estimated_minutes: 4 }
    ];

    for (const s of scales) {
      database.prepare(
        'INSERT INTO assessment_scales (id, name, category, description, question_count, estimated_minutes) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(s.id, s.name, s.category, s.description, s.question_count, s.estimated_minutes);
    }

    // PHQ-9 题目
    const phq9Id = scales[0].id;
    const phq9Questions = [
      '做事时提不起劲或没有兴趣', '感到心情低落、沮丧或绝望',
      '入睡困难、睡不安稳或睡得过多', '感觉疲倦或没有活力',
      '食欲不振或吃太多', '觉得自己很糟或很失败，或让自己、家人失望',
      '对事物专注有困难，例如看报纸或看电视时',
      '行动或说话速度缓慢到别人已经察觉？或刚好相反——变得比平日更心神不宁',
      '有不如死掉或用某种方式伤害自己的念头'
    ];

    const options = JSON.stringify([
      { label: '完全不会', score: 0 },
      { label: '好几天', score: 1 },
      { label: '一半以上的天数', score: 2 },
      { label: '几乎每天', score: 3 }
    ]);

    phq9Questions.forEach((q, i) => {
      database.prepare(
        'INSERT INTO assessment_questions (id, scale_id, question_order, question_text, question_type, options) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(uuidv4(), phq9Id, i + 1, q, 'scale', options);
    });

    console.log('✅ 默认测评数据已插入');
    db.save();
  }
}
