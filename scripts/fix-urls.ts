import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'image_relevance',
});

const updates = [
  { filename: 'wolf-01.jpg', url: 'https://images.unsplash.com/photo-1734855526206-7bd8c262beb6?w=800' },
  { filename: 'red-fox-05.jpg', url: 'https://images.unsplash.com/photo-1682479672124-6996483fd4a1?w=800' },
  { filename: 'red-fox-09.jpg', url: 'https://images.unsplash.com/photo-1689631281436-0123773c8cff?w=800' },
  { filename: 'dog-02.jpg', url: 'https://images.unsplash.com/photo-1750967028589-e303192ebfb3?w=800' },
];

(async () => {
  const client = await pool.connect();
  try {
    for (const { filename, url } of updates) {
      await client.query('UPDATE images SET url = $1, status = $2 WHERE filename = $3', [url, 'pending', filename]);
      console.log(`Updated ${filename} -> ${url}`);
    }
    // Clear old metadata and embeddings for these images
    const res = await client.query("SELECT id FROM images WHERE filename IN ('wolf-01.jpg', 'red-fox-05.jpg', 'red-fox-09.jpg', 'dog-02.jpg')");
    for (const row of res.rows) {
      await client.query('DELETE FROM image_metadata WHERE image_id = $1', [row.id]);
      await client.query('DELETE FROM image_embeddings WHERE image_id = $1', [row.id]);
      console.log(`Cleared metadata/embeddings for ${row.id}`);
    }
    console.log('Done');
  } finally {
    client.release();
    await pool.end();
  }
})();
