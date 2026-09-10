import dotenv from "dotenv";
dotenv.config();

export const config = {
  database: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "image_relevance",
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    visionModel: process.env.GEMINI_VISION_MODEL || "gemini-3.6-flash",
    embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2",
  },
  app: {
    port: parseInt(process.env.APP_PORT || "3000", 10),
    host: process.env.APP_HOST || "localhost",
  },
  thresholds: {
    similarity: parseFloat(process.env.SIMILARITY_THRESHOLD || "0.55"),
    confidence: parseFloat(process.env.CONFIDENCE_THRESHOLD || "0.7"),
  },
  budget: {
    maxAiCost: parseFloat(process.env.MAX_AI_COST || "10.00"),
  },
} as const;
