import { ImageMetadata } from "../schemas";

export interface VisionProvider {
  analyzeImage(imageUrl: string): Promise<ImageMetadata>;
}

export interface EmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
}
