import { config } from "../config";
import { ImageMetadataSchema, type ImageMetadata } from "../schemas";
import { VisionProvider } from "./types";
import { recordCost, checkBudget } from "./cost-tracker";

interface GeminiInteractionsResponse {
  response?: {
    text?: string;
  };
  usageMetadata?: {
    totalTokenCount?: number;
  };
}

const VISION_PROMPT =
  "Analyze this image and return a JSON object with: subject (main subject), category (classification), attributes (array of descriptive attributes), caption (detailed caption), confidence (0-1). Return ONLY valid JSON.";

const MAX_RETRIES = 3;

export class GeminiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public retryAfter?: number
  ) {
    super(message);
    this.name = "GeminiError";
  }

  get isTransient(): boolean {
    return this.statusCode === 429 || this.statusCode >= 500;
  }

  get isRateLimited(): boolean {
    return this.statusCode === 429;
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseRetryAfter(response: Response): number | undefined {
  const header = response.headers.get("retry-after");
  if (!header) return undefined;
  const seconds = parseInt(header, 10);
  return isNaN(seconds) ? undefined : seconds * 1000;
}

function parseRetryDelayFromBody(body: string): number | undefined {
  const match = body.match(/please retry in (\d+(?:\.\d+)?)\s*s/i);
  if (!match) return undefined;
  const seconds = parseFloat(match[1]);
  return isNaN(seconds) ? undefined : Math.ceil(seconds * 1000);
}

function extractJsonFromResponse(data: Record<string, any>): string {
  const text = data.response?.text;
  if (text) return text;

  const steps = data.response?.steps ?? data.steps;
  if (Array.isArray(steps)) {
    for (const step of steps) {
      const content = step.content ?? step.output;
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        for (const part of content) {
          if (part.text) return part.text;
        }
      }
    }
  }

  const candidates = data.candidates ?? data.response?.candidates;
  if (Array.isArray(candidates)) {
    for (const cand of candidates) {
      const parts = cand.content?.parts ?? [];
      for (const part of parts) {
        if (part.text) return part.text;
      }
    }
  }

  return JSON.stringify(data);
}

export const geminiVision: VisionProvider = {
  async analyzeImage(imageUrl: string): Promise<ImageMetadata> {
    await checkBudget();

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/interactions`;

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image (${imageResponse.status})`);
    }
    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageArrayBuffer).toString("base64");
    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

    let lastError: GeminiError | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": config.gemini.apiKey,
          },
          body: JSON.stringify({
            model: config.gemini.visionModel,
            input: [
              { type: "text", text: VISION_PROMPT },
              {
                type: "image",
                data: base64Image,
                mime_type: contentType,
              },
            ],
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          const headerDelay = parseRetryAfter(response);
          const bodyDelay = parseRetryDelayFromBody(errorBody);
          const retryAfter =
            response.status === 429
              ? Math.max(headerDelay ?? 0, bodyDelay ?? 0) || 60000
              : headerDelay;
          throw new GeminiError(
            `Gemini API error (${response.status}): ${errorBody}`,
            response.status,
            retryAfter
          );
        }

        const data = (await response.json()) as Record<string, any>;

        const text = extractJsonFromResponse(data);

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new GeminiError("No JSON found in Gemini response", 0);
        }

        const parsed = JSON.parse(jsonMatch[0]);
        const validated = ImageMetadataSchema.parse(parsed);

        const tokenCount =
          (data.usage as any)?.total_tokens ??
          (data.usageMetadata as any)?.totalTokenCount ?? 0;
        await recordCost({
          provider: "gemini",
          model: config.gemini.visionModel,
          operation: "vision_analysis",
          tokenCount,
          estimatedCost: tokenCount * 0.000001,
        });

        return validated;
      } catch (error) {
        if (error instanceof GeminiError) {
          lastError = error;

          if (!error.isTransient) {
            throw error;
          }

          if (error.isRateLimited) {
            throw error;
          }

          if (attempt < MAX_RETRIES) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
            console.log(
              `  [BACKOFF] 5xx server error, waiting ${delay}ms before retry (attempt ${attempt}/${MAX_RETRIES})`
            );
            await sleep(delay);
          }
        } else {
          throw error instanceof Error ? error : new Error(String(error));
        }
      }
    }

    throw lastError || new Error("Gemini vision failed after max retries");
  },
};
