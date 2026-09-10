import {
  jobRepository,
  imageRepository,
  embeddingRepository,
} from "../repositories";
import { geminiVision, geminiEmbedding, recordCost, GeminiError } from "../ai";
import { config } from "../config";
import { closePool, query } from "../config/database";

const CONFIDENCE_THRESHOLD = config.thresholds.confidence;
const EMBEDDING_MODEL = config.gemini.embeddingModel;
const BATCH_LIMIT = Number(process.env.BATCH_LIMIT ?? 10);

interface BatchJob {
  id: string;
  type: string;
  status: string;
  total_items: number;
  processed_items: number;
  failed_items: number;
}

interface BatchJobItem {
  id: string;
  job_id: string;
  image_id: string;
  status: string;
  error_message: string | null;
  attempts: number;
  max_attempts: number;
}

const SKIP_STATUSES = new Set(["completed", "low_confidence"]);

async function findOrCreateBatchJob(
  pendingImageIds: string[]
): Promise<BatchJob> {
  const result = await query(
    `SELECT * FROM batch_jobs WHERE type = 'image_processing' AND status IN ('pending', 'running') ORDER BY created_at DESC LIMIT 1`
  );

  if (result.rows.length > 0) {
    console.log(`Reusing existing batch job: ${result.rows[0].id}`);
    return result.rows[0];
  }

  const job = await jobRepository.createJob(
    "image_processing",
    pendingImageIds.length
  );
  console.log(`Created new batch job: ${job.id} with ${pendingImageIds.length} items`);
  return job;
}

async function processItem(
  jobItem: BatchJobItem,
  jobId: string
): Promise<{
  success: boolean;
  retriable: boolean;
  rateLimited?: boolean;
  retryAfter?: number;
}> {
  const imageId = jobItem.image_id;

  try {
    await jobRepository.updateJobItemStatus(jobItem.id, "processing");
    await imageRepository.updateStatus(imageId, "processing");

    const image = await imageRepository.findById(imageId);
    if (!image) {
      throw new Error(`Image ${imageId} not found`);
    }

    const metadata = await geminiVision.analyzeImage(image.url);
    await imageRepository.createMetadata(imageId, metadata);

    const newStatus =
      metadata.confidence < CONFIDENCE_THRESHOLD
        ? "low_confidence"
        : "completed";
    await imageRepository.updateStatus(imageId, newStatus);

    const captionText = `${metadata.subject} ${metadata.category} ${metadata.attributes.join(" ")} ${metadata.caption}`;
    const embedding = await geminiEmbedding.generateEmbedding(captionText);
    await embeddingRepository.storeImageEmbedding(
      imageId,
      embedding,
      EMBEDDING_MODEL
    );

    await recordCost({
      provider: "gemini",
      model: EMBEDDING_MODEL,
      operation: "batch_embedding",
      entityId: imageId,
      entityType: "image",
      jobId,
      tokenCount: 0,
      estimatedCost: 0,
    });

    await jobRepository.updateJobItemStatus(jobItem.id, "completed");

    console.log(
      `  [OK] Image ${imageId} -> ${newStatus} (confidence: ${metadata.confidence})`
    );
    return { success: true, retriable: false };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error(`  [FAIL] Image ${imageId}: ${errorMessage}`);

    const isGeminiError = error instanceof GeminiError;

    if (isGeminiError && error.isRateLimited) {
      await jobRepository.incrementAttempts(jobItem.id);
      await jobRepository.updateJobItemStatus(
        jobItem.id,
        "pending",
        errorMessage
      );
      await imageRepository.updateStatus(imageId, "pending");
      console.log(
        `  [RATE-LIMIT] Image ${imageId}: Gemini quota exhausted (429). Item kept pending; pausing batch to respect server retry time.`
      );
      return {
        success: false,
        retriable: true,
        rateLimited: true,
        retryAfter: error.retryAfter,
      };
    }

    const isTransient =
      isGeminiError && error.isTransient;

    if (isTransient) {
      const updatedItem = await jobRepository.incrementAttempts(jobItem.id);

      if (
        updatedItem &&
        updatedItem.attempts < updatedItem.max_attempts
      ) {
        await jobRepository.updateJobItemStatus(
          jobItem.id,
          "pending",
          errorMessage
        );
        await imageRepository.updateStatus(imageId, "pending");
        console.log(
          `  [RETRY] Will retry image ${imageId} (attempt ${updatedItem.attempts}/${updatedItem.max_attempts})`
        );
        return { success: false, retriable: true };
      }
    }

    await jobRepository.updateJobItemStatus(
      jobItem.id,
      "failed",
      errorMessage
    );
    await imageRepository.updateStatus(imageId, "failed");
    return { success: false, retriable: false };
  }
}

async function waitForRateLimit(error: GeminiError): Promise<void> {
  if (error.isRateLimited && error.retryAfter) {
    console.log(
      `  [RATE-LIMIT] Gemini requested ${error.retryAfter}ms wait, respecting Retry-After header`
    );
    await new Promise((r) => setTimeout(r, error.retryAfter!));
  } else if (error.isRateLimited) {
    const waitMs = 60000;
    console.log(
      `  [RATE-LIMIT] No Retry-After header, waiting ${waitMs / 1000}s`
    );
    await new Promise((r) => setTimeout(r, waitMs));
  } else if (error.isTransient) {
    const waitMs = 5000;
    console.log(
      `  [TRANSIENT] Server error, waiting ${waitMs / 1000}s`
    );
    await new Promise((r) => setTimeout(r, waitMs));
  }
}

async function run(): Promise<void> {
  const startTime = Date.now();
  console.log("=== Batch Processing Job Started ===\n");

  try {
    const pendingImages = await imageRepository.findByStatus("pending");
    const failedImages = await imageRepository.findByStatus("failed");
    const allCandidates = [...pendingImages, ...failedImages];

    if (allCandidates.length === 0) {
      console.log("No pending or failed images to process.");
      return;
    }

    const imagesToProcess = allCandidates.slice(0, BATCH_LIMIT);

    console.log(
      `Found ${pendingImages.length} pending + ${failedImages.length} failed = ${allCandidates.length} images to process`
    );
    console.log(
      `Processing ${imagesToProcess.length} images (batch limit: ${BATCH_LIMIT})\n`
    );

    const job = await findOrCreateBatchJob(
      imagesToProcess.map((img) => img.id)
    );

    await jobRepository.updateJobStatus(job.id, "running");

    for (const image of imagesToProcess) {
      const existingItems = await query(
        `SELECT * FROM batch_job_items WHERE job_id = $1 AND image_id = $2`,
        [job.id, image.id]
      );

      if (existingItems.rows.length === 0) {
        await jobRepository.createJobItem(job.id, image.id);
      }
    }

    const imagesToProcessIds = imagesToProcess.map((img) => img.id);
    const pendingJobItems: BatchJobItem[] = await query(
      `SELECT * FROM batch_job_items WHERE job_id = $1 AND image_id = ANY($2::uuid[]) AND status = 'pending' ORDER BY created_at ASC`,
      [job.id, imagesToProcessIds]
    ).then((r: any) => r.rows);

    let processedCount = 0;
    let failedCount = 0;
    let pausedForRateLimit = false;

    console.log(`Processing ${pendingJobItems.length} pending items...\n`);

    for (let i = 0; i < pendingJobItems.length; i++) {
      const item = pendingJobItems[i];
      console.log(
        `[${i + 1}/${pendingJobItems.length}] Processing image ${item.image_id}`
      );

      const result = await processItem(item, job.id);

      if (result.rateLimited) {
        pausedForRateLimit = true;
        const delayMs = result.retryAfter ?? 60000;
        console.log(
          `\n  [RATE-LIMIT] Quota exhausted — pausing batch. Gemini requested a ${delayMs}ms wait.`
        );
        await new Promise((r) => setTimeout(r, delayMs));
        break;
      }

      if (result.success) {
        processedCount++;
      } else {
        failedCount++;
      }

      await query(
        `UPDATE batch_jobs SET processed_items = $1, failed_items = $2 WHERE id = $3`,
        [processedCount, failedCount, job.id]
      );

      if (!result.success && !result.retriable) {
        const lastError = await query(
          `SELECT error_message FROM batch_job_items WHERE id = $1`,
          [item.id]
        ).then((r: any) => r.rows[0]?.error_message);

        if (lastError) {
          const geminiMatch = lastError.match(/Gemini API error \((\d+)\)/);
          if (geminiMatch) {
            const statusCode = parseInt(geminiMatch[1], 10);
            if (statusCode === 429 || statusCode >= 500) {
              const fakeError = new GeminiError(lastError, statusCode);
              await waitForRateLimit(fakeError);
            }
          }
        }
      }
    }

    const finishedProcessing = !pausedForRateLimit &&
      failedCount === pendingJobItems.length;
    const finalStatus = pausedForRateLimit
      ? "pending"
      : finishedProcessing
        ? "failed"
        : "completed";
    await jobRepository.updateJobStatus(job.id, finalStatus);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n=== Batch Job ${pausedForRateLimit ? "Paused (rate limit)" : "Complete"} ===`);
    console.log(`Job ID:     ${job.id}`);
    console.log(`Status:     ${finalStatus}`);
    console.log(`Processed:  ${processedCount}`);
    console.log(`Failed:     ${failedCount}`);
    console.log(`Total:      ${pendingJobItems.length}`);
    console.log(`Time:       ${elapsed}s`);
    if (pausedForRateLimit) {
      console.log(
        `\nBatch paused before finishing due to Gemini rate limits. Items were kept pending and will resume on the next run.`
      );
    }
  } catch (error) {
    console.error("Batch processing failed:", error);
    throw error;
  } finally {
    await closePool();
  }
}

run().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
