import { z } from "zod";

// Image metadata from vision model
export const ImageMetadataSchema = z.object({
  subject: z.string().min(1),
  category: z.string().min(1),
  attributes: z.array(z.string()),
  caption: z.string().min(1),
  confidence: z.number().min(0).max(1),
});
export type ImageMetadata = z.infer<typeof ImageMetadataSchema>;

// Vision request
export const VisionRequestSchema = z.object({
  imageUrl: z.string().url(),
  imageId: z.string().uuid(),
});
export type VisionRequest = z.infer<typeof VisionRequestSchema>;

// Embedding request
export const EmbeddingRequestSchema = z.object({
  text: z.string().min(1),
  entityId: z.string().uuid(),
  entityType: z.enum(["image", "post"]),
});
export type EmbeddingRequest = z.infer<typeof EmbeddingRequestSchema>;

// Cost record
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
export type CostRecord = z.infer<typeof CostRecordSchema>;

// Mismatch guard result
export const GuardResultSchema = z.object({
  accepted: z.boolean(),
  reason: z.string(),
  details: z.array(z.string()).optional(),
});
export type GuardResult = z.infer<typeof GuardResultSchema>;

// Suggestion
export const SuggestionSchema = z.object({
  imageId: z.string().uuid(),
  postId: z.string().uuid(),
  similarity: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  accepted: z.boolean(),
  reason: z.string(),
  details: z.array(z.string()).optional(),
});
export type Suggestion = z.infer<typeof SuggestionSchema>;

// API input validation
export const CreateImageSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  filename: z.string().min(1),
});

export const CreatePostSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
});

export const CreateBatchJobSchema = z.object({
  imageIds: z.array(z.string().uuid()).optional(),
  processAll: z.boolean().default(false),
});

export const ApproveRejectSchema = z.object({
  reason: z.string().optional(),
});
