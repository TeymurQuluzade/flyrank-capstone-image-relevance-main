import {
  imageRepository,
  embeddingRepository,
} from "../repositories";
import { geminiVision, geminiEmbedding } from "../ai";

export async function createImage(url: string, filename: string) {
  return imageRepository.create(url, filename);
}

export async function getImageById(id: string) {
  return imageRepository.findById(id);
}

export async function getAllImages(limit: number = 20, offset: number = 0) {
  return imageRepository.findAll(limit, offset);
}

export async function processImage(imageId: string) {
  const image = await imageRepository.findById(imageId);
  if (!image) {
    throw new Error(`Image not found: ${imageId}`);
  }

  await imageRepository.updateStatus(imageId, "processing");

  try {
    const metadata = await geminiVision.analyzeImage(image.url);
    await imageRepository.createMetadata(imageId, metadata);

    const captionText = `${metadata.subject} ${metadata.category} ${metadata.attributes.join(" ")} ${metadata.caption}`;
    const embedding = await geminiEmbedding.generateEmbedding(captionText);
    await embeddingRepository.storeImageEmbedding(imageId, embedding, "gemini-embedding-2");

    await imageRepository.updateStatus(imageId, "completed");

    return { imageId, status: "completed", metadata };
  } catch (error) {
    await imageRepository.updateStatus(imageId, "failed");
    throw error;
  }
}
