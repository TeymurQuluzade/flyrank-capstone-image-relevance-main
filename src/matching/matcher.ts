import {
  embeddingRepository,
  postRepository,
  imageRepository,
  suggestionRepository,
} from "../repositories";
import { cosineSimilarity, rankBySimilarity } from "../embeddings/similarity";
import { applyMismatchGuard } from "../guard/mismatch-guard";
import { config } from "../config";
import { geminiEmbedding } from "../ai";
import { ImageMetadata } from "../schemas";

interface MatchResult {
  matched: boolean;
  recommendation?: {
    imageId: string;
    similarity: number;
    reason: string;
    details?: string[];
  };
  alternatives?: Array<{
    imageId: string;
    similarity: number;
    reason: string;
  }>;
  reason?: string;
  details?: string[];
}

const TOP_CANDIDATES = 10;

export async function findMatchingImages(postId: string): Promise<MatchResult> {
  const post = await postRepository.findById(postId);
  if (!post) {
    return {
      matched: false,
      reason: "Post not found",
      details: [`No post found with ID ${postId}`],
    };
  }

  const postText = `${post.title} ${post.content}`;

  let postEmbeddingRow = await embeddingRepository.getPostEmbedding(
    postId,
    config.gemini.embeddingModel
  );

  if (!postEmbeddingRow) {
    const embedding = await geminiEmbedding.generateEmbedding(postText);
    postEmbeddingRow = await embeddingRepository.storePostEmbedding(
      postId,
      embedding,
      config.gemini.embeddingModel
    );
  }

  const postEmbedding: number[] =
    typeof postEmbeddingRow.embedding === "string"
      ? JSON.parse(postEmbeddingRow.embedding)
      : postEmbeddingRow.embedding;

  const imageEmbeddings = await embeddingRepository.getAllImageEmbeddings(
    config.gemini.embeddingModel
  );

  if (!imageEmbeddings.length) {
    return {
      matched: false,
      reason: "No image embeddings available",
      details: ["No images have been processed for embedding yet"],
    };
  }

  const candidates = imageEmbeddings.map((row) => ({
    imageId: row.image_id,
    embedding:
      typeof row.embedding === "string"
        ? JSON.parse(row.embedding)
        : row.embedding,
  }));

  const ranked = rankBySimilarity(postEmbedding, candidates);
  const topCandidates = ranked.slice(0, TOP_CANDIDATES);

  const alternatives: MatchResult["alternatives"] = [];
  let recommendation: MatchResult["recommendation"] = undefined;
  let allDetails: string[] = [];

  for (let i = 0; i < topCandidates.length; i++) {
    const candidate = topCandidates[i];

    const image = await imageRepository.findById(candidate.imageId);
    if (!image) {
      allDetails.push(`Image ${candidate.imageId} not found, skipping`);
      continue;
    }

    const metadata: ImageMetadata = {
      subject: image.subject || "unknown",
      category: image.category || "unknown",
      attributes: Array.isArray(image.attributes) ? image.attributes : [],
      caption: image.caption || "",
      confidence: parseFloat(image.confidence) || 0,
    };

    const guardResult = applyMismatchGuard(
      metadata,
      postText,
      candidate.similarity
    );

    await suggestionRepository.create(
      postId,
      candidate.imageId,
      candidate.similarity,
      metadata.confidence,
      guardResult.accepted,
      guardResult.reason,
      i + 1
    );

    if (!recommendation && guardResult.accepted) {
      recommendation = {
        imageId: candidate.imageId,
        similarity: candidate.similarity,
        reason: guardResult.reason,
        details: guardResult.details,
      };
    } else if (guardResult.accepted || !recommendation) {
      alternatives.push({
        imageId: candidate.imageId,
        similarity: candidate.similarity,
        reason: guardResult.reason,
      });
    }

    if (guardResult.details) {
      allDetails.push(
        ...guardResult.details.map((d) => `[${candidate.imageId}] ${d}`)
      );
    }
  }

  if (recommendation) {
    return {
      matched: true,
      recommendation,
      alternatives: alternatives.filter(
        (a) => a.imageId !== recommendation!.imageId
      ),
      details: allDetails,
    };
  }

  return {
    matched: false,
    reason: "No suitable image found after mismatch guard",
    alternatives,
    details: allDetails,
  };
}
