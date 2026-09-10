import {
  postRepository,
  embeddingRepository,
} from "../repositories";
import { geminiEmbedding } from "../ai";

const EMBEDDING_MODEL = "gemini-embedding-2";

export async function createPost(title: string, content: string) {
  return postRepository.create(title, content);
}

export async function getPostById(id: string) {
  return postRepository.findById(id);
}

export async function getAllPosts(limit: number = 20, offset: number = 0) {
  return postRepository.findAll(limit, offset);
}

export async function getOrCreatePostEmbedding(postId: string, content: string) {
  const existing = await embeddingRepository.getPostEmbedding(postId, EMBEDDING_MODEL);
  if (existing) {
    return existing.embedding;
  }

  const embedding = await geminiEmbedding.generateEmbedding(content);
  await embeddingRepository.storePostEmbedding(postId, embedding, EMBEDDING_MODEL);
  return embedding;
}
