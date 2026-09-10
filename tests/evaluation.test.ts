import { findMatchingImages } from "../src/matching/matcher";
import * as repositories from "../src/repositories";
import { geminiEmbedding } from "../src/ai";

jest.mock("../src/repositories");
jest.mock("../src/ai");

const mockPostRepository = repositories.postRepository as jest.Mocked<typeof repositories.postRepository>;
const mockImageRepository = repositories.imageRepository as jest.Mocked<typeof repositories.imageRepository>;
const mockEmbeddingRepository = repositories.embeddingRepository as jest.Mocked<typeof repositories.embeddingRepository>;
const mockSuggestionRepository = repositories.suggestionRepository as jest.Mocked<typeof repositories.suggestionRepository>;
const mockGeminiEmbedding = geminiEmbedding as jest.Mocked<typeof geminiEmbedding>;

function calculateTop1Precision(
  results: Array<{ postId: string; expectedImageId: string; matchedImageId: string | null }>
): number {
  if (results.length === 0) return 0;
  const correctCount = results.filter(
    (r) => r.matchedImageId === r.expectedImageId
  ).length;
  return correctCount / results.length;
}

describe("Top-1 Precision Evaluation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should calculate precision correctly when all matches are correct", async () => {
    const post = {
      id: "post-1",
      title: "Cute fox",
      content: "Look at this fox",
      created_at: new Date(),
    };

    mockPostRepository.findById.mockResolvedValue(post);
    mockEmbeddingRepository.getPostEmbedding.mockResolvedValue({
      embedding: JSON.stringify([0.1, 0.2, 0.3]),
    });
    mockEmbeddingRepository.getAllImageEmbeddings.mockResolvedValue([
      { image_id: "img-fox-1", embedding: JSON.stringify([0.1, 0.2, 0.3]) },
    ]);
    mockImageRepository.findById.mockResolvedValue({
      id: "img-fox-1",
      url: "https://example.com/fox.jpg",
      filename: "fox.jpg",
      subject: "fox",
      category: "animal",
      attributes: ["red"],
      caption: "A fox",
      confidence: 0.95,
      status: "processed",
      created_at: new Date(),
    });
    mockSuggestionRepository.create.mockResolvedValue({
      id: "sug-1",
      post_id: "post-1",
      image_id: "img-fox-1",
      similarity: 1.0,
      confidence: 0.95,
      accepted: true,
      reason: "Match found",
      rank: 1,
      created_at: new Date(),
    });

    const result = await findMatchingImages("post-1");

    const evalResults = [
      {
        postId: "post-1",
        expectedImageId: "img-fox-1",
        matchedImageId: result.recommendation?.imageId ?? null,
      },
    ];

    const precision = calculateTop1Precision(evalResults);
    expect(precision).toBe(1.0);
  });

  it("should calculate precision as 0 when no matches are correct", async () => {
    const post = {
      id: "post-1",
      title: "Cute fox",
      content: "Look at this fox",
      created_at: new Date(),
    };

    mockPostRepository.findById.mockResolvedValue(post);
    mockEmbeddingRepository.getPostEmbedding.mockResolvedValue({
      embedding: JSON.stringify([0.1, 0.2]),
    });
    mockEmbeddingRepository.getAllImageEmbeddings.mockResolvedValue([
      { image_id: "img-wolf-1", embedding: JSON.stringify([0.1, 0.2]) },
    ]);
    mockImageRepository.findById.mockResolvedValue({
      id: "img-wolf-1",
      url: "https://example.com/wolf.jpg",
      filename: "wolf.jpg",
      subject: "wolf",
      category: "animal",
      attributes: ["grey"],
      caption: "A wolf",
      confidence: 0.9,
      status: "processed",
      created_at: new Date(),
    });
    mockSuggestionRepository.create.mockResolvedValue({
      id: "sug-1",
      post_id: "post-1",
      image_id: "img-wolf-1",
      similarity: 1.0,
      confidence: 0.9,
      accepted: false,
      reason: "Animal mismatch: fox vs wolf",
      rank: 1,
      created_at: new Date(),
    });

    const result = await findMatchingImages("post-1");

    const evalResults = [
      {
        postId: "post-1",
        expectedImageId: "img-fox-1",
        matchedImageId: result.recommendation?.imageId ?? null,
      },
    ];

    const precision = calculateTop1Precision(evalResults);
    expect(precision).toBe(0);
  });

  it("should calculate fractional precision across multiple results", () => {
    const evalResults = [
      { postId: "p1", expectedImageId: "correct-1", matchedImageId: "correct-1" },
      { postId: "p2", expectedImageId: "correct-2", matchedImageId: "wrong-2" },
      { postId: "p3", expectedImageId: "correct-3", matchedImageId: "correct-3" },
      { postId: "p4", expectedImageId: "correct-4", matchedImageId: "wrong-4" },
    ];

    const precision = calculateTop1Precision(evalResults);
    expect(precision).toBe(0.5);
  });

  it("should return 0 for empty results", () => {
    const precision = calculateTop1Precision([]);
    expect(precision).toBe(0);
  });

  it("should treat null matched image as incorrect", () => {
    const evalResults = [
      { postId: "p1", expectedImageId: "correct-1", matchedImageId: null },
    ];

    const precision = calculateTop1Precision(evalResults);
    expect(precision).toBe(0);
  });
});
