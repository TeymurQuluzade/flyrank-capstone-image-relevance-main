import { applyMismatchGuard } from "../src/guard/mismatch-guard";
import { ImageMetadata } from "../src/schemas";

describe("applyMismatchGuard", () => {
  const foxImage: ImageMetadata = {
    subject: "fox",
    category: "animal",
    attributes: ["red", "bushy tail"],
    caption: "A red fox in the forest",
    confidence: 0.95,
  };

  const wolfImage: ImageMetadata = {
    subject: "wolf",
    category: "animal",
    attributes: ["grey", "howling"],
    caption: "A grey wolf in the wild",
    confidence: 0.90,
  };

  const landscapeImage: ImageMetadata = {
    subject: "mountain",
    category: "landscape",
    attributes: ["snowy", "tall"],
    caption: "Snowy mountain peak",
    confidence: 0.85,
  };

  it("should accept fox post with fox image", () => {
    const result = applyMismatchGuard(
      foxImage,
      "Look at this beautiful fox in the wild",
      0.9
    );
    expect(result.accepted).toBe(true);
    expect(result.reason).toMatch(/match/i);
  });

  it("should reject fox post with wolf image", () => {
    const result = applyMismatchGuard(
      wolfImage,
      "Look at this beautiful fox in the wild",
      0.9
    );
    expect(result.accepted).toBe(false);
    expect(result.reason).toMatch(/mismatch/i);
    expect(result.details?.some((d) => d.includes("fox") || d.includes("wolf"))).toBe(true);
  });

  it("should reject wolf post with fox image", () => {
    const result = applyMismatchGuard(
      foxImage,
      "Amazing wolf howling at the moon",
      0.9
    );
    expect(result.accepted).toBe(false);
    expect(result.reason).toMatch(/mismatch/i);
  });

  it("should reject when similarity is below threshold", () => {
    const result = applyMismatchGuard(
      foxImage,
      "Look at this fox",
      0.3
    );
    expect(result.accepted).toBe(false);
    expect(result.reason).toMatch(/similarity/i);
  });

  it("should reject when confidence is below threshold", () => {
    const lowConfidenceImage: ImageMetadata = {
      ...foxImage,
      confidence: 0.3,
    };
    const result = applyMismatchGuard(
      lowConfidenceImage,
      "Look at this fox",
      0.9
    );
    expect(result.accepted).toBe(false);
    expect(result.reason).toMatch(/confidence/i);
  });

  it("should accept wolf post with wolf image", () => {
    const result = applyMismatchGuard(
      wolfImage,
      "Amazing wolf howling at the moon",
      0.9
    );
    expect(result.accepted).toBe(true);
  });

  it("should accept when no animal mentioned in either", () => {
    const result = applyMismatchGuard(
      landscapeImage,
      "Beautiful scenery for a vacation",
      0.85
    );
    expect(result.accepted).toBe(true);
  });

  it("should include details about animal match", () => {
    const result = applyMismatchGuard(
      foxImage,
      "This fox looks cute",
      0.9
    );
    expect(result.details).toBeDefined();
    expect(
      result.details?.some((d) => d.toLowerCase().includes("fox"))
    ).toBe(true);
  });
});
