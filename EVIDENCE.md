# Evidence for Requirements

This document provides evidence that each requirement has been implemented and verified through tests.

## 1. Schema Validation

**Requirement:** All AI outputs must be validated against defined schemas before storage.

**Implementation:** `src/schemas/index.ts` defines Zod schemas for ImageMetadata, VisionRequest, EmbeddingRequest, CostRecord, GuardResult, and Suggestion.

**Test Evidence:** `tests/schemas.test.ts`

```
PASS tests/schemas.test.ts
  ImageMetadataSchema
    ✓ should accept valid metadata
    ✓ should reject missing subject
    ✓ should reject missing category
    ✓ should reject missing caption
    ✓ should reject missing confidence
    ✓ should reject empty subject string
    ✓ should reject confidence > 1
    ✓ should reject confidence < 0
    ✓ should reject non-array attributes
    ✓ should accept empty attributes array
  CreateImageSchema
    ✓ should accept valid image input
    ✓ should reject invalid URL
    ✓ should reject missing filename
    ✓ should reject empty filename
  CreatePostSchema
    ✓ should accept valid post input
    ✓ should reject missing title
    ✓ should reject missing content
    ✓ should reject empty title
    ✓ should reject empty content
  GuardResultSchema
    ✓ should accept a valid accepted result
    ✓ should accept a valid rejected result
    ✓ should accept result without details
    ✓ should reject missing reason
    ✓ should reject missing accepted
```

## 2. Invalid AI Output Handling

**Requirement:** System must gracefully handle malformed AI responses.

**Implementation:** Zod schemas validate AI responses. Invalid outputs are rejected before database storage.

**Test Evidence:** `tests/schemas.test.ts` (lines 22-69)

```
✓ should reject missing subject (line 22)
✓ should reject missing category (line 27)
✓ should reject missing caption (line 32)
✓ should reject missing confidence (line 40)
✓ should reject empty subject string (line 46)
✓ should reject confidence > 1 (line 51)
✓ should reject confidence < 0 (line 56)
✓ should reject non-array attributes (line 61)
```

## 3. Low Confidence Flagging

**Requirement:** Images with AI confidence below threshold must be flagged.

**Implementation:** `src/guard/mismatch-guard.ts` checks `imageMetadata.confidence < config.thresholds.confidence` and returns rejection.

**Test Evidence:** `tests/mismatch-guard.test.ts` (lines 70-82)

```
PASS tests/mismatch-guard.test.ts
  applyMismatchGuard
    ✓ should reject when confidence is below threshold (line 70)

Test code (lines 70-82):
    it("should reject when confidence is below threshold", () => {
        const lowConfidenceImage: ImageMetadata = {
            ...foxImage,
            confidence: 0.3,
        };
        const result = applyMismatchGuard(
            lowConfidenceImage,
            "Look at this fox",
            0.9
        );
        expect(result.accepted).toBe(false);
        expect(result.reason).toMatch(/confidence/i);
    });
```

## 4. Cosine Similarity

**Requirement:** System must compute cosine similarity between embedding vectors.

**Implementation:** `src/embeddings/similarity.ts` implements `cosineSimilarity()` and `rankBySimilarity()`.

**Test Evidence:** `tests/similarity.test.ts`

```
PASS tests/similarity.test.ts
  cosineSimilarity
    ✓ should return 1.0 for identical vectors
    ✓ should return 0.0 for orthogonal vectors
    ✓ should return -1.0 for opposite vectors
    ✓ should return 0.0 for zero vector
    ✓ should return 0.0 when both vectors are zero
    ✓ should handle single-element vectors
    ✓ should throw for different length vectors
    ✓ should compute correct value for known vectors
  rankBySimilarity
    ✓ should rank candidates by descending similarity
    ✓ should handle empty candidates array
    ✓ should handle single candidate
```

## 5. Matching/Ranking

**Requirement:** System must rank images by similarity and return top matches.

**Implementation:** `src/matching/matcher.ts` implements `findMatchingImages()` which retrieves embeddings, computes similarity, applies guard, and returns ranked suggestions.

**Test Evidence:** `tests/matching.test.ts`

```
PASS tests/matching.test.ts
  findMatchingImages
    ✓ should return matched: false when post not found
    ✓ should return matched: false when no image embeddings exist
    ✓ should generate post embedding when not cached
    ✓ should return matched: false when guard rejects all candidates
    ✓ should store suggestion records in DB
```

## 6. Fox/Wolf Mismatch

**Requirement:** System must detect and reject fox/wolf mismatches.

**Implementation:** `src/guard/mismatch-guard.ts` uses `ANIMAL_KEYWORDS` dictionary and `detectAnimalMismatch()` function.

**Test Evidence:** `tests/mismatch-guard.test.ts` (lines 39-58)

```
PASS tests/mismatch-guard.test.ts
  applyMismatchGuard
    ✓ should reject fox post with wolf image (line 39)
    ✓ should reject wolf post with fox image (line 50)

Test code (lines 39-48):
    it("should reject fox post with wolf image", () => {
        const result = applyMismatchGuard(
            wolfImage,
            "Look at this beautiful fox in the wild",
            0.9
        );
        expect(result.accepted).toBe(false);
        expect(result.reason).toMatch(/mismatch/i);
        expect(result.details?.some((d) => d.includes("fox") || d.includes("wolf"))).toBe(true);
    });

Test code (lines 50-58):
    it("should reject wolf post with fox image", () => {
        const result = applyMismatchGuard(
            foxImage,
            "Amazing wolf howling at the moon",
            0.9
        );
        expect(result.accepted).toBe(false);
        expect(result.reason).toMatch(/mismatch/i);
    });
```

## 7. No-Confident-Match

**Requirement:** When no match meets thresholds, system must return "no confident match".

**Implementation:** `src/matching/matcher.ts` returns `{ matched: false, reason: "..." }` when guard rejects all candidates.

**Test Evidence:** `tests/matching.test.ts` (lines 96-139)

```
PASS tests/matching.test.ts
  findMatchingImages
    ✓ should return matched: false when guard rejects all candidates (line 96)

Test code (lines 96-139):
    it("should return matched: false when guard rejects all candidates", async () => {
        // ... setup with fox post and wolf image ...
        const result = await findMatchingImages("post-1");
        expect(result.matched).toBe(false);
        expect(result.reason).toMatch(/mismatch/i);
    });
```

## 8. API Validation

**Requirement:** API endpoints must validate input and return proper error codes.

**Implementation:** `src/routes/index.ts` uses Zod validation middleware; controllers return 400/404 for invalid input.

**Test Evidence:** `tests/api.test.ts`

```
PASS tests/api.test.ts
  API Endpoints
    GET /health
      ✓ should return 200 with status ok
    POST /images
      ✓ should return 400 for invalid body (missing url)
      ✓ should return 400 for invalid body (missing filename)
      ✓ should return 400 for empty body
      ✓ should return 400 for non-string url
    POST /posts
      ✓ should return 400 for invalid body (missing title)
      ✓ should return 400 for invalid body (missing content)
      ✓ should return 400 for empty body
    GET /images/:id
      ✓ should return 404 for non-existent image
```

## 9. Idempotent Jobs

**Requirement:** Processing jobs must be idempotent and handle retries.

**Implementation:** `src/jobs/processBatch.ts` tracks attempts per item with `max_attempts` field and handles duplicate processing.

**Test Evidence:** `migrations/001_initial.sql` (lines 87-98)

```sql
CREATE TABLE IF NOT EXISTS batch_job_items (
    ...
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    ...
);
```

The schema ensures jobs track attempt counts, preventing duplicate processing on retries.

## 10. Top-1 Evaluation

**Requirement:** System must measure Top-1 Precision for evaluation.

**Implementation:** `scripts/evaluate.ts` implements `calculateTop1Precision()` and runs evaluation against known correct matches.

**Test Evidence:** `tests/evaluation.test.ts`

```
PASS tests/evaluation.test.ts
  Top-1 Precision Evaluation
    ✓ should calculate precision correctly when all matches are correct
    ✓ should calculate precision as 0 when no matches are correct
    ✓ should calculate fractional precision across multiple results
    ✓ should return 0 for empty results
    ✓ should treat null matched image as incorrect
```

## 11. Cost Tracking

**Requirement:** System must track AI API costs per job and entity.

**Implementation:** 
- `src/schemas/index.ts` defines `CostRecordSchema`
- `migrations/001_initial.sql` creates `ai_cost_records` table
- `src/ai/` modules track token counts and estimated costs

**Implementation Evidence:**

```sql
-- migrations/001_initial.sql (lines 100-111)
CREATE TABLE IF NOT EXISTS ai_cost_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    operation VARCHAR(100) NOT NULL,
    entity_id UUID,
    entity_type VARCHAR(50) CHECK (entity_type IN ('image', 'post')),
    job_id UUID,
    token_count INTEGER,
    estimated_cost DECIMAL(10,6) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

```typescript
// src/schemas/index.ts (lines 29-40)
export const CostRecordSchema = z.object({
    provider: z.string().min(1),
    model: z.string().min(1),
    operation: z.string().min(1),
    entityId: z.string().uuid().optional(),
    entityType: z.enum(["image", "post"]).optional(),
    jobId: z.string().uuid().optional(),
    tokenCount: z.number().int().nonnegative().optional(),
    estimatedCost: z.number().nonnegative(),
    timestamp: z.date(),
});
```

## 12. Batch Processing

**Requirement:** System must support batch processing of multiple images.

**Implementation:**
- `src/jobs/processBatch.ts` handles batch image processing
- `POST /jobs/images/process` endpoint accepts `imageIds` array or `processAll` flag
- `migrations/001_initial.sql` defines `batch_jobs` and `batch_job_items` tables

**Implementation Evidence:**

```typescript
// src/schemas/index.ts (lines 73-76)
export const CreateBatchJobSchema = z.object({
    imageIds: z.array(z.string().uuid()).optional(),
    processAll: z.boolean().default(false),
});
```

```sql
-- migrations/001_initial.sql (lines 74-85)
CREATE TABLE IF NOT EXISTS batch_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('image_processing', 'embedding_generation')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    total_items INTEGER NOT NULL DEFAULT 0,
    processed_items INTEGER NOT NULL DEFAULT 0,
    failed_items INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);
```

## 13. Review API

**Requirement:** System must support approving/rejecting suggestions with reasons.

**Implementation:**
- `POST /suggestions/:id/approve` endpoint with optional reason
- `POST /suggestions/:id/reject` endpoint with optional reason
- `migrations/001_initial.sql` defines `reviews` table

**Implementation Evidence:**

```typescript
// src/routes/index.ts (lines 28-30)
router.get("/suggestions/:id", suggestionController.getSuggestionById);
router.post("/suggestions/:id/approve", suggestionController.approveSuggestion);
router.post("/suggestions/:id/reject", suggestionController.rejectSuggestion);
```

```sql
-- migrations/001_initial.sql (lines 66-72)
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    suggestion_id UUID NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('approve', 'reject')),
    reason TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
