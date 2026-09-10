import { config } from "../config";
import { EmbeddingProvider } from "./types";
import { recordCost, checkBudget } from "./cost-tracker";

interface GeminiEmbeddingResponse {
  embedding?: {
    values?: number[];
  };
  usageMetadata?: {
    totalTokenCount?: number;
  };
}

const MAX_RETRIES = 3;

export const geminiEmbedding: EmbeddingProvider = {
  async generateEmbedding(text: string): Promise<number[]> {
    await checkBudget();

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.embeddingModel}:embedContent`;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": config.gemini.apiKey,
          },
          body: JSON.stringify({
            content: {
              parts: [{ text }],
            },
            output_dimensionality: 768,
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(
            `Gemini embedding API error (${response.status}): ${errorBody}`
          );
        }

        const data = (await response.json()) as GeminiEmbeddingResponse;

        const embedding = data.embedding?.values;
        if (!Array.isArray(embedding) || embedding.length === 0) {
          throw new Error("No embedding values returned from Gemini");
        }

        const tokenCount =
          data.usageMetadata?.totalTokenCount ?? 0;
        await recordCost({
          provider: "gemini",
          model: config.gemini.embeddingModel,
          operation: "embedding_generation",
          tokenCount,
          estimatedCost: tokenCount * 0.0000005,
        });

        return embedding;
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error(String(error));
        console.error(
          `Gemini embedding attempt ${attempt}/${MAX_RETRIES} failed:`,
          lastError.message
        );
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
    }

    throw new Error(
      `Gemini embedding failed after ${MAX_RETRIES} attempts: ${lastError?.message}`
    );
  },
};
