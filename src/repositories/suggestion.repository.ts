import { query } from "../config/database";

export async function create(
  postId: string,
  imageId: string,
  similarity: number,
  confidence: number,
  accepted: boolean,
  reason: string | null,
  rank: number
) {
  const result = await query(
    `INSERT INTO suggestions (post_id, image_id, similarity, confidence, accepted, rejection_reason, rank)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [postId, imageId, similarity, confidence, accepted, reason, rank]
  );
  return result.rows[0];
}

export async function findByPostId(postId: string) {
  const result = await query(
    `SELECT * FROM suggestions WHERE post_id = $1 ORDER BY rank ASC`,
    [postId]
  );
  return result.rows;
}

export async function findById(id: string) {
  const result = await query(
    `SELECT * FROM suggestions WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function approve(id: string) {
  const result = await query(
    `UPDATE suggestions SET accepted = true, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

export async function reject(id: string, reason: string) {
  const result = await query(
    `UPDATE suggestions SET rejected = true, rejection_reason = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [reason, id]
  );
  return result.rows[0] || null;
}

export async function findByImageId(imageId: string) {
  const result = await query(
    `SELECT * FROM suggestions WHERE image_id = $1 ORDER BY rank ASC`,
    [imageId]
  );
  return result.rows;
}
