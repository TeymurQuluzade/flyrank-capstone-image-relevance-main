import { Request, Response } from "express";
import { postService } from "../services";
import { embeddingRepository, suggestionRepository, imageRepository } from "../repositories";
import { config } from "../config";

export async function getMatchingImages(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    if (!id) {
      res.status(400).json({ error: "post id is required" });
      return;
    }

    const post = await postService.getPostById(id);
    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    const postEmbedding = await postService.getOrCreatePostEmbedding(id as string, post.content);
    if (!postEmbedding) {
      res.status(400).json({ error: "Could not generate embedding for post" });
      return;
    }

    const allImageEmbeddings = await embeddingRepository.getAllImageEmbeddings("gemini-embedding-2");

    const scored = allImageEmbeddings.map((ie: any) => {
      const imageEmb = ie.embedding;
      let similarity = 0;
      const len = Math.min(postEmbedding.length, imageEmb.length);
      let dotProduct = 0;
      let postNorm = 0;
      let imageNorm = 0;
      for (let i = 0; i < len; i++) {
        dotProduct += postEmbedding[i] * imageEmb[i];
        postNorm += postEmbedding[i] * postEmbedding[i];
        imageNorm += imageEmb[i] * imageEmb[i];
      }
      const denom = Math.sqrt(postNorm) * Math.sqrt(imageNorm);
      if (denom > 0) {
        similarity = dotProduct / denom;
      }
      return {
        imageId: ie.image_id,
        similarity,
      };
    });

    scored.sort((a: any, b: any) => b.similarity - a.similarity);

    const filtered = scored.filter(
      (s: any) => s.similarity >= config.thresholds.similarity
    );

    const topMatches = filtered.slice(0, 10);

    for (let i = 0; i < topMatches.length; i++) {
      const match = topMatches[i];
      const existing = await suggestionRepository.findByPostId(id);
      const alreadySuggested = existing.find((s: any) => s.image_id === match.imageId);

      if (!alreadySuggested) {
        await suggestionRepository.create(
          id as string,
          match.imageId,
          match.similarity,
          config.thresholds.confidence,
          false,
          null,
          i + 1
        );
      }
    }

    const suggestions = await suggestionRepository.findByPostId(id as string);

    res.json({
      postId: id,
      matches: suggestions,
      threshold: config.thresholds.similarity,
      totalCandidates: allImageEmbeddings.length,
      matchedCount: filtered.length,
    });
  } catch (error) {
    console.error("Error matching images:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
