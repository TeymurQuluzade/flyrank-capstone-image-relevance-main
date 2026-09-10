import { cosineSimilarity, rankBySimilarity } from "../src/embeddings/similarity";

describe("cosineSimilarity", () => {
  it("should return 1.0 for identical vectors", () => {
    const a = [1, 2, 3];
    const b = [1, 2, 3];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1.0);
  });

  it("should return 0.0 for orthogonal vectors", () => {
    const a = [1, 0];
    const b = [0, 1];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0);
  });

  it("should return -1.0 for opposite vectors", () => {
    const a = [1, 2, 3];
    const b = [-1, -2, -3];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0);
  });

  it("should return 0.0 for zero vector", () => {
    const a = [0, 0, 0];
    const b = [1, 2, 3];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0);
  });

  it("should return 0.0 when both vectors are zero", () => {
    const a = [0, 0, 0];
    const b = [0, 0, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0);
  });

  it("should handle single-element vectors", () => {
    expect(cosineSimilarity([5], [5])).toBeCloseTo(1.0);
    expect(cosineSimilarity([5], [-5])).toBeCloseTo(-1.0);
    expect(cosineSimilarity([1], [0])).toBeCloseTo(0.0);
  });

  it("should throw for different length vectors", () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow(
      "Vectors must have same length"
    );
  });

  it("should compute correct value for known vectors", () => {
    const a = [1, 2, 3, 4, 5];
    const b = [5, 4, 3, 2, 1];
    const expected =
      (1 * 5 + 2 * 4 + 3 * 3 + 4 * 2 + 5 * 1) /
      (Math.sqrt(55) * Math.sqrt(55));
    expect(cosineSimilarity(a, b)).toBeCloseTo(expected);
  });
});

describe("rankBySimilarity", () => {
  it("should rank candidates by descending similarity", () => {
    const query = [1, 0, 0];
    const candidates = [
      { imageId: "img-3", embedding: [0, 0, 1] },
      { imageId: "img-1", embedding: [1, 0, 0] },
      { imageId: "img-2", embedding: [0.707, 0.707, 0] },
    ];

    const ranked = rankBySimilarity(query, candidates);

    expect(ranked).toHaveLength(3);
    expect(ranked[0].imageId).toBe("img-1");
    expect(ranked[0].similarity).toBeCloseTo(1.0);
    expect(ranked[1].imageId).toBe("img-2");
    expect(ranked[1].similarity).toBeGreaterThan(0);
    expect(ranked[2].imageId).toBe("img-3");
    expect(ranked[2].similarity).toBeCloseTo(0.0);
  });

  it("should handle empty candidates array", () => {
    const ranked = rankBySimilarity([1, 2, 3], []);
    expect(ranked).toHaveLength(0);
  });

  it("should handle single candidate", () => {
    const ranked = rankBySimilarity([1, 0], [{ imageId: "a", embedding: [0, 1] }]);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].similarity).toBeCloseTo(0.0);
  });
});
