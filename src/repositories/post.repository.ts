import { query } from "../config/database";

export async function create(title: string, content: string) {
  const result = await query(
    `INSERT INTO posts (title, content) VALUES ($1, $2) RETURNING *`,
    [title, content]
  );
  return result.rows[0];
}

export async function findById(id: string) {
  const result = await query(
    `SELECT * FROM posts WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function findAll(limit: number, offset: number) {
  const result = await query(
    `SELECT * FROM posts ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
}
