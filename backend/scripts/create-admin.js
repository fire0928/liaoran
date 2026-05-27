const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, '..', 'data', 'liaoran.db');

function safeAlter(db, table, col, type, def) {
  try {
    const r = db.exec(`PRAGMA table_info(${table})`);
    const cols = r[0].values.map(v => v[1]);
    if (!cols.includes(col)) {
      db.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${type} ${def ? 'DEFAULT ' + def : ''}`);
      console.log(`  [+] ${table}.${col}`);
    }
  } catch(e) { /* already exists */ }
}

async function main() {
  const SQL = await initSqlJs();
  const b = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(b);
  
  console.log('检查并修复表结构...');
  
  // users 表缺失列
  safeAlter(db, 'users', 'role', "TEXT", "'user'");
  
  // point_accounts 表
  try {
    db.run(`CREATE TABLE IF NOT EXISTS point_accounts (
      user_id TEXT PRIMARY KEY, balance INTEGER DEFAULT 0, 
      lifetime_earned INTEGER DEFAULT 0, lifetime_spent INTEGER DEFAULT 0,
      created_at TEXT, updated_at TEXT
    )`);
  } catch(e) {}
  safeAlter(db, 'point_accounts', 'balance', 'INTEGER', '0');
  safeAlter(db, 'point_accounts', 'lifetime_earned', 'INTEGER', '0');
  safeAlter(db, 'point_accounts', 'lifetime_spent', 'INTEGER', '0');
  safeAlter(db, 'point_accounts', 'created_at', 'TEXT');
  safeAlter(db, 'point_accounts', 'updated_at', 'TEXT');
  
  // user_portraits 表
  try {
    db.run(`CREATE TABLE IF NOT EXISTS user_portraits (
      user_id TEXT PRIMARY KEY, personality_type TEXT, 
      stress_level INTEGER DEFAULT 0, emotional_stability INTEGER DEFAULT 50, 
      current_mood TEXT, risk_level TEXT DEFAULT 'low', 
      created_at TEXT, updated_at TEXT
    )`);
  } catch(e) {}
  safeAlter(db, 'user_portraits', 'stress_level', 'INTEGER', '0');
  safeAlter(db, 'user_portraits', 'emotional_stability', 'INTEGER', '50');
  safeAlter(db, 'user_portraits', 'current_mood', 'TEXT');
  safeAlter(db, 'user_portraits', 'risk_level', "TEXT", "'low'");
  safeAlter(db, 'user_portraits', 'created_at', 'TEXT');
  safeAlter(db, 'user_portraits', 'updated_at', 'TEXT');
  
  const phone = '18928751642';
  const passwordHash = bcrypt.hashSync('Fire0928', 10);
  const now = new Date().toISOString();
  
  const rows = db.exec(`SELECT id, role FROM users WHERE phone='${phone}'`);
  
  if (rows.length > 0 && rows[0].values.length > 0) {
    const uid = rows[0].values[0][0];
    console.log(`用户已存在 (${uid.slice(0,8)}), 升级为管理员...`);
    db.run("UPDATE users SET role='admin', password_hash=? WHERE id=?", [passwordHash, uid]);
  } else {
    const uid = uuidv4();
    db.run('INSERT INTO users (id, phone, nickname, password_hash, role, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
      [uid, phone, '管理员', passwordHash, 'admin', 'active', now, now]);
    console.log('创建管理员账号...');
    
    const pt = db.exec(`SELECT user_id FROM point_accounts WHERE user_id='${uid}'`);
    if (!pt.length || !pt[0].values.length) {
      db.run('INSERT INTO point_accounts (user_id, balance, lifetime_earned, lifetime_spent, created_at, updated_at) VALUES (?,?,?,?,?,?)',
        [uid, 10000, 10000, 0, now, now]);
    }
  }
  
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  console.log(`\n✅ 管理员账号就绪`);
  console.log(`   手机号: ${phone}`);
  console.log(`   密码: Fire0928`);
  db.close();
}
main().catch(e => { console.error(e); process.exit(1); });
