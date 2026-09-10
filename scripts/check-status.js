const { Pool } = require('pg');
const p = new Pool({ host: 'localhost', port: 5432, user: 'postgres', password: 'postgres', database: 'image_relevance' });
p.query("SELECT id, filename, url, status FROM images WHERE status IN ('pending', 'failed') ORDER BY status, filename")
  .then(r => { console.log(JSON.stringify(r.rows, null, 2)); p.end(); });
