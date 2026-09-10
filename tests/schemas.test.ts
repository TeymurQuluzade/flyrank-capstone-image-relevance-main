import {
  ImageMetadataSchema,
  CreateImageSchema,
  CreatePostSchema,
  GuardResultSchema,
} from "../src/schemas";

describe("ImageMetadataSchema", () => {
  const validMetadata = {
    subject: "fox",
    category: "animal",
    attributes: ["red", "bushy tail"],
    caption: "A red fox in a forest",
    confidence: 0.95,
  };

  it("should accept valid metadata", () => {
    const result = ImageMetadataSchema.safeParse(validMetadata);
    expect(result.success).toBe(true);
  });

  it("should reject missing subject", () => {
    const { subject, ...noSubject } = validMetadata;
    const result = ImageMetadataSchema.safeParse(noSubject);
    expect(result.success).toBe(false);
  });

  it("should reject missing category", () => {
    const { category, ...noCategory } = validMetadata;
    const result = ImageMetadataSchema.safeParse(noCategory);
    expect(result.success).toBe(false);
  });

  it("should reject missing caption", () => {
    const { caption, ...noCaption } = validMetadata;
    const result = ImageMetadataSchema.safeParse(noCaption);
    expect(result.success).toBe(false);
  });

  it("should reject missing confidence", () => {
    const { confidence, ...noConfidence } = validMetadata;
    const result = ImageMetadataSchema.safeParse(noConfidence);
    expect(result.success).toBe(false);
  });

  it("should reject empty subject string", () => {
    const result = ImageMetadataSchema.safeParse({ ...validMetadata, subject: "" });
    expect(result.success).toBe(false);
  });

  it("should reject confidence > 1", () => {
    const result = ImageMetadataSchema.safeParse({ ...validMetadata, confidence: 1.5 });
    expect(result.success).toBe(false);
  });

  it("should reject confidence < 0", () => {
    const result = ImageMetadataSchema.safeParse({ ...validMetadata, confidence: -0.5 });
    expect(result.success).toBe(false);
  });

  it("should reject non-array attributes", () => {
    const result = ImageMetadataSchema.safeParse({ ...validMetadata, attributes: "red" });
    expect(result.success).toBe(false);
  });

  it("should accept empty attributes array", () => {
    const result = ImageMetadataSchema.safeParse({ ...validMetadata, attributes: [] });
    expect(result.success).toBe(true);
  });
});

describe("CreateImageSchema", () => {
  it("should accept valid image input", () => {
    const result = CreateImageSchema.safeParse({
      url: "https://example.com/image.jpg",
      filename: "fox.jpg",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid URL", () => {
    const result = CreateImageSchema.safeParse({
      url: "not-a-url",
      filename: "fox.jpg",
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing filename", () => {
    const result = CreateImageSchema.safeParse({
      url: "https://example.com/image.jpg",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty filename", () => {
    const result = CreateImageSchema.safeParse({
      url: "https://example.com/image.jpg",
      filename: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("CreatePostSchema", () => {
  it("should accept valid post input", () => {
    const result = CreatePostSchema.safeParse({
      title: "Cute fox",
      content: "Look at this fox in the wild",
    });
    expect(result.success).toBe(true);
  });

  it("should reject missing title", () => {
    const result = CreatePostSchema.safeParse({
      content: "Look at this fox",
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing content", () => {
    const result = CreatePostSchema.safeParse({
      title: "Cute fox",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty title", () => {
    const result = CreatePostSchema.safeParse({
      title: "",
      content: "Look at this fox",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty content", () => {
    const result = CreatePostSchema.safeParse({
      title: "Cute fox",
      content: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("GuardResultSchema", () => {
  it("should accept a valid accepted result", () => {
    const result = GuardResultSchema.safeParse({
      accepted: true,
      reason: "Subject and semantic meaning match",
      details: ["Animal match: fox"],
    });
    expect(result.success).toBe(true);
  });

  it("should accept a valid rejected result", () => {
    const result = GuardResultSchema.safeParse({
      accepted: false,
      reason: "Animal mismatch",
    });
    expect(result.success).toBe(true);
  });

  it("should accept result without details", () => {
    const result = GuardResultSchema.safeParse({
      accepted: true,
      reason: "Match found",
    });
    expect(result.success).toBe(true);
  });

  it("should reject missing reason", () => {
    const result = GuardResultSchema.safeParse({
      accepted: true,
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing accepted", () => {
    const result = GuardResultSchema.safeParse({
      reason: "Match found",
    });
    expect(result.success).toBe(false);
  });
});
