import { query } from "../config/database";

export async function create(url: string, filename: string) {
  const result = await query(
    `INSERT INTO images (url, filename) VALUES ($1, $2) RETURNING *`,
    [url, filename]
  );
  return result.rows[0];
}

export async function findById(id: string) {
  const result = await query(
    `SELECT i.*, im.id AS metadata_id, im.subject, im.category, im.attributes,
            im.caption, im.confidence, im.raw_ai_response, im.created_at AS metadata_created_at
     FROM images i
     LEFT JOIN image_metadata im ON im.image_id = i.id
     WHERE i.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function findAll(limit: number, offset: number) {
  const result = await query(
    `SELECT * FROM images ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
}

export async function updateStatus(id: string, status: string) {
  const result = await query(
    `UPDATE images SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return result.rows[0] || null;
}

export async function findByStatus(status: string) {
  const result = await query(
    `SELECT * FROM images WHERE status = $1 ORDER BY created_at DESC`,
    [status]
  );
  return result.rows;
}

export async function createMetadata(
  imageId: string,
  metadata: {
    subject: string;
    category: string;
    attributes?: any;
    caption: string;
    confidence: number;
    raw_ai_response?: any;
  }
) {
  const result = await query(
    `INSERT INTO image_metadata (image_id, subject, category, attributes, caption, confidence, raw_ai_response)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      imageId,
      metadata.subject,
      metadata.category,
      JSON.stringify(metadata.attributes ?? []),
      metadata.caption,
      metadata.confidence,
      metadata.raw_ai_response ? JSON.stringify(metadata.raw_ai_response) : null,
    ]
  );
  return result.rows[0];
}

export async function getMetadata(imageId: string) {
  const result = await query(
    `SELECT * FROM image_metadata WHERE image_id = $1`,
    [imageId]
  );
  return result.rows[0] || null;
}
