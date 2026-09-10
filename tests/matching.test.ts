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

describe("findMatchingImages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return matched: false when post not found", async () => {
    mockPostRepository.findById.mockResolvedValue(null);

    const result = await findMatchingImages("nonexistent-post-id");

    expect(result.matched).toBe(false);
    expect(result.reason).toBe("Post not found");
  });

  it("should return matched: false when no image embeddings exist", async () => {
    mockPostRepository.findById.mockResolvedValue({
      id: "post-1",
      title: "Cute fox",
      content: "Look at this fox",
      created_at: new Date(),
    });
    mockEmbeddingRepository.getPostEmbedding.mockResolvedValue({
      embedding: JSON.stringify([0.1, 0.2, 0.3]),
    });
    mockEmbeddingRepository.getAllImageEmbeddings.mockResolvedValue([]);

    const result = await findMatchingImages("post-1");

    expect(result.matched).toBe(false);
    expect(result.reason).toBe("No image embeddings available");
  });

  it("should generate post embedding when not cached", async () => {
    const mockPost = {
      id: "post-1",
      title: "Cute fox",
      content: "Look at this fox",
      created_at: new Date(),
    };

    mockPostRepository.findById.mockResolvedValue(mockPost);
    mockEmbeddingRepository.getPostEmbedding.mockResolvedValue(null);
    mockGeminiEmbedding.generateEmbedding.mockResolvedValue([0.5, 0.5, 0.5]);
    mockEmbeddingRepository.storePostEmbedding.mockResolvedValue({
      embedding: JSON.stringify([0.5, 0.5, 0.5]),
    });
    mockEmbeddingRepository.getAllImageEmbeddings.mockResolvedValue([
      { image_id: "img-1", embedding: JSON.stringify([0.5, 0.5, 0.5]) },
    ]);
    mockImageRepository.findById.mockResolvedValue({
      id: "img-1",
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
      image_id: "img-1",
      similarity: 1.0,
      confidence: 0.95,
      accepted: true,
      reason: "Match found",
      rank: 1,
      created_at: new Date(),
    });

    const result = await findMatchingImages("post-1");

    expect(mockGeminiEmbedding.generateEmbedding).toHaveBeenCalledWith(
      "Cute fox Look at this fox"
    );
    expect(mockEmbeddingRepository.storePostEmbedding).toHaveBeenCalled();
    expect(result.matched).toBe(true);
  });

  it("should return matched: false when guard rejects all candidates", async () => {
    const mockPost = {
      id: "post-1",
      title: "Cute fox",
      content: "Look at this fox in the wild",
      created_at: new Date(),
    };

    mockPostRepository.findById.mockResolvedValue(mockPost);
    mockEmbeddingRepository.getPostEmbedding.mockResolvedValue({
      embedding: JSON.stringify([0.1, 0.2, 0.3]),
    });
    mockEmbeddingRepository.getAllImageEmbeddings.mockResolvedValue([
      { image_id: "img-1", embedding: JSON.stringify([0.1, 0.2, 0.3]) },
    ]);
    mockImageRepository.findById.mockResolvedValue({
      id: "img-1",
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
      image_id: "img-1",
      similarity: 1.0,
      confidence: 0.9,
      accepted: false,
      reason: "Animal mismatch",
      rank: 1,
      created_at: new Date(),
    });

    const result = await findMatchingImages("post-1");

    expect(result.matched).toBe(false);
    expect(result.reason).toMatch(/mismatch/i);
  });

  it("should store suggestion records in DB", async () => {
    const mockPost = {
      id: "post-1",
      title: "Cute fox",
      content: "Look at this fox",
      created_at: new Date(),
    };

    mockPostRepository.findById.mockResolvedValue(mockPost);
    mockEmbeddingRepository.getPostEmbedding.mockResolvedValue({
      embedding: JSON.stringify([0.1, 0.2]),
    });
    mockEmbeddingRepository.getAllImageEmbeddings.mockResolvedValue([
      { image_id: "img-1", embedding: JSON.stringify([0.1, 0.2]) },
      { image_id: "img-2", embedding: JSON.stringify([0.3, 0.4]) },
    ]);
    mockImageRepository.findById.mockImplementation(async (id: string) => ({
      id,
      url: `https://example.com/${id}.jpg`,
      filename: `${id}.jpg`,
      subject: "fox",
      category: "animal",
      attributes: [],
      caption: "A fox",
      confidence: 0.95,
      status: "processed",
      created_at: new Date(),
    }));
    mockSuggestionRepository.create.mockResolvedValue({
      id: "sug-1",
      post_id: "post-1",
      image_id: "img-1",
      similarity: 1.0,
      confidence: 0.95,
      accepted: true,
      reason: "Match",
      rank: 1,
      created_at: new Date(),
    });

    await findMatchingImages("post-1");

    expect(mockSuggestionRepository.create).toHaveBeenCalledTimes(2);
  });
});
