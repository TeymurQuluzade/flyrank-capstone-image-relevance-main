import { query } from "../config/database";

export async function storeImageEmbedding(
  imageId: string,
  embedding: number[],
  model: string
) {
  const embeddingStr = JSON.stringify(embedding);
  const result = await query(
    `INSERT INTO image_embeddings (image_id, embedding, model)
     VALUES ($1, $2::vector, $3)
     ON CONFLICT (image_id, model) DO UPDATE SET embedding = EXCLUDED.embedding
     RETURNING *`,
    [imageId, embeddingStr, model]
  );
  return result.rows[0];
}

export async function storePostEmbedding(
  postId: string,
  embedding: number[],
  model: string
) {
  const embeddingStr = JSON.stringify(embedding);
  const result = await query(
    `INSERT INTO post_embeddings (post_id, embedding, model)
     VALUES ($1, $2::vector, $3)
     ON CONFLICT (post_id, model) DO UPDATE SET embedding = EXCLUDED.embedding
     RETURNING *`,
    [postId, embeddingStr, model]
  );
  return result.rows[0];
}

export async function getImageEmbedding(imageId: string, model: string) {
  const result = await query(
    `SELECT * FROM image_embeddings WHERE image_id = $1 AND model = $2`,
    [imageId, model]
  );
  return result.rows[0] || null;
}

export async function getPostEmbedding(postId: string, model: string) {
  const result = await query(
    `SELECT * FROM post_embeddings WHERE post_id = $1 AND model = $2`,
    [postId, model]
  );
  return result.rows[0] || null;
}

export async function getAllImageEmbeddings(model: string) {
  const result = await query(
    `SELECT ie.image_id, ie.embedding, ie.model
     FROM image_embeddings ie
     WHERE ie.model = $1`,
    [model]
  );
  return result.rows;
}

export async function getImageEmbeddingsByStatus(status: string, model: string) {
  const result = await query(
    `SELECT ie.image_id, ie.embedding, ie.model, i.status
     FROM image_embeddings ie
     JOIN images i ON i.id = ie.image_id
     WHERE i.status = $1 AND ie.model = $2`,
    [status, model]
  );
  return result.rows;
}
