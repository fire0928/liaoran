const initSqlJs = require('sql.js');
const fs = require('fs');
async function main() {
  const S = await initSqlJs();
  const b = fs.readFileSync('data/liaoran.db');
  const d = new S.Database(b);
  const r = d.exec('PRAGMA table_info(users)');
  console.log(JSON.stringify(r[0].values, null, 2));
  d.close();
}
main();
