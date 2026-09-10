import { query } from "../config/database";

export async function createJob(type: string, totalItems: number) {
  const result = await query(
    `INSERT INTO batch_jobs (type, total_items) VALUES ($1, $2) RETURNING *`,
    [type, totalItems]
  );
  return result.rows[0];
}

export async function updateJobStatus(id: string, status: string) {
  let sql = "";
  let params: any[] = [];

  switch (status) {
    case "running":
      sql = `UPDATE batch_jobs SET status = $1, started_at = NOW() WHERE id = $2 RETURNING *`;
      params = [status, id];
      break;
    case "completed":
      sql = `UPDATE batch_jobs SET status = $1, completed_at = NOW() WHERE id = $2 RETURNING *`;
      params = [status, id];
      break;
    case "failed":
      sql = `UPDATE batch_jobs SET status = $1, completed_at = NOW() WHERE id = $2 RETURNING *`;
      params = [status, id];
      break;
    default:
      sql = `UPDATE batch_jobs SET status = $1 WHERE id = $2 RETURNING *`;
      params = [status, id];
  }

  const result = await query(sql, params);
  return result.rows[0] || null;
}

export async function findJobById(id: string) {
  const result = await query(
    `SELECT * FROM batch_jobs WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function createJobItem(jobId: string, imageId: string) {
  const result = await query(
    `INSERT INTO batch_job_items (job_id, image_id) VALUES ($1, $2) RETURNING *`,
    [jobId, imageId]
  );
  return result.rows[0];
}

export async function updateJobItemStatus(
  id: string,
  status: string,
  errorMessage?: string
) {
  const result = await query(
    `UPDATE batch_job_items SET status = $1, error_message = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
    [status, errorMessage || null, id]
  );
  return result.rows[0] || null;
}

export async function findJobItems(jobId: string) {
  const result = await query(
    `SELECT * FROM batch_job_items WHERE job_id = $1 ORDER BY created_at ASC`,
    [jobId]
  );
  return result.rows;
}

export async function incrementAttempts(id: string) {
  const result = await query(
    `UPDATE batch_job_items SET attempts = attempts + 1, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

export async function getPendingJobItems(jobId: string) {
  const result = await query(
    `SELECT * FROM batch_job_items WHERE job_id = $1 AND status = 'pending' ORDER BY created_at ASC`,
    [jobId]
  );
  return result.rows;
}
