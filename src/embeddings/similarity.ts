export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error("Vectors must have same length");
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

interface Candidate {
  embedding: number[];
  imageId: string;
}

interface ScoredCandidate extends Candidate {
  similarity: number;
}

export function rankBySimilarity(
  queryEmbedding: number[],
  candidates: Candidate[]
): ScoredCandidate[] {
  return candidates
    .map((c) => ({
      ...c,
      similarity: cosineSimilarity(queryEmbedding, c.embedding),
    }))
    .sort((a, b) => b.similarity - a.similarity);
}
