import { config } from "../config";
import { ImageMetadata, GuardResult } from "../schemas";

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "it", "this", "that", "was", "are",
  "be", "has", "had", "have", "not", "so", "if", "do", "did", "does",
  "i", "you", "he", "she", "we", "they", "my", "your", "his", "her",
  "its", "our", "their", "what", "which", "who", "when", "where", "how",
  "all", "each", "than", "them", "can", "just", "will", "now", "about",
  "up", "out", "no", "yes", "very", "more", "also", "some", "any",
]);

const ANIMAL_KEYWORDS: Record<string, string[]> = {
  fox: ["fox", "foxes", "foxy"],
  wolf: ["wolf", "wolves", "wolfish"],
  dog: ["dog", "dogs", "puppy", "puppies", "canine"],
  bear: ["bear", "bears", "ursine"],
  deer: ["deer", "fawns", "doe", "buck", "stag", "cervine"],
};

function extractTerms(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

function detectAnimalMention(terms: string[]): string | null {
  for (const [animal, keywords] of Object.entries(ANIMAL_KEYWORDS)) {
    if (keywords.some((kw) => terms.includes(kw))) {
      return animal;
    }
  }
  return null;
}

function mapSubjectToAnimal(subject: string): string | null {
  const lower = subject.toLowerCase();
  for (const [animal, keywords] of Object.entries(ANIMAL_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return animal;
    }
  }
  return null;
}

export function applyMismatchGuard(
  imageMetadata: ImageMetadata,
  postContent: string,
  similarity: number
): GuardResult {
  const details: string[] = [];

  if (similarity < config.thresholds.similarity) {
    return {
      accepted: false,
      reason: "Similarity below threshold",
      details: [
        `Similarity ${similarity.toFixed(4)} is below threshold ${config.thresholds.similarity}`,
      ],
    };
  }

  if (imageMetadata.confidence < config.thresholds.confidence) {
    return {
      accepted: false,
      reason: "Image confidence below threshold",
      details: [
        `Confidence ${imageMetadata.confidence.toFixed(4)} is below threshold ${config.thresholds.confidence}`,
      ],
    };
  }

  const terms = extractTerms(postContent);
  const postAnimal = detectAnimalMention(terms);
  const imageAnimal = mapSubjectToAnimal(imageMetadata.subject);

  if (postAnimal && imageAnimal && postAnimal !== imageAnimal) {
    return {
      accepted: false,
      reason: `Animal mismatch: post discusses ${postAnimal} but image shows ${imageAnimal}`,
      details: [
        `Post mentions "${postAnimal}", image subject is "${imageMetadata.subject}"`,
      ],
    };
  }

  if (postAnimal && imageAnimal) {
    details.push(`Animal match: post and image both reference ${postAnimal}`);
  }

  const imageSubjectLower = imageMetadata.subject.toLowerCase();
  const imageCategoryLower = imageMetadata.category.toLowerCase();
  const hasSubjectOverlap = terms.some(
    (t) => imageSubjectLower.includes(t) || imageCategoryLower.includes(t)
  );

  if (!postAnimal && !imageAnimal) {
    details.push(
      hasSubjectOverlap
        ? "Subject/category keywords overlap with post content"
        : "No explicit animal mismatch detected"
    );
  }

  return {
    accepted: true,
    reason: "Subject and semantic meaning match",
    details,
  };
}
