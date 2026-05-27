const initSqlJs = require('sql.js');
const fs = require('fs');
async function main() {
  const S = await initSqlJs();
  const b = fs.readFileSync('data/liaoran.db');
  const d = new S.Database(b);
  const tables = ['chat_sessions','assessment_records','treehole_entries','assessment_scales','chat_messages','daily_checkins','operation_logs','system_configs','refresh_tokens'];
  for (const t of tables) {
    try {
      const r = d.exec(`PRAGMA table_info(${t})`);
      if (r.length > 0) {
        const cols = r[0].values.map(v => v[1]);
        console.log(`${t}: ${cols.join(', ')}`);
      }
    } catch(e) {
      console.log(`${t}: NOT FOUND`);
    }
  }
  d.close();
}
main();
