import { config } from "../config";
import { query } from "../config/database";

interface CostRecordInput {
  provider: string;
  model: string;
  operation: string;
  entityId?: string;
  entityType?: "image" | "post";
  jobId?: string;
  tokenCount?: number;
  estimatedCost: number;
}

export async function recordCost(record: CostRecordInput): Promise<void> {
  await query(
    `INSERT INTO ai_cost_records (provider, model, operation, entity_id, entity_type, job_id, token_count, estimated_cost)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      record.provider,
      record.model,
      record.operation,
      record.entityId ?? null,
      record.entityType ?? null,
      record.jobId ?? null,
      record.tokenCount ?? null,
      record.estimatedCost,
    ]
  );
}

export async function getTotalCost(): Promise<number> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const result = await query(
    `SELECT COALESCE(SUM(estimated_cost), 0) AS total_cost
     FROM ai_cost_records
     WHERE created_at >= $1`,
    [periodStart]
  );

  return parseFloat(result.rows[0].total_cost);
}

export async function checkBudget(): Promise<void> {
  const totalCost = await getTotalCost();
  if (totalCost >= config.budget.maxAiCost) {
    throw new Error(
      `AI budget exceeded: $${totalCost.toFixed(4)} / $${config.budget.maxAiCost.toFixed(2)}`
    );
  }
}
