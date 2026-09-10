import request from "supertest";
import app from "../src/app";

jest.mock("../src/services", () => ({
  imageService: {
    createImage: jest.fn().mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      url: "https://example.com/image.jpg",
      filename: "image.jpg",
      created_at: new Date().toISOString(),
    }),
    getImageById: jest.fn().mockResolvedValue(null),
    getAllImages: jest.fn().mockResolvedValue([]),
  },
  postService: {
    createPost: jest.fn().mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440001",
      title: "Test Post",
      content: "Test content",
      created_at: new Date().toISOString(),
    }),
    getPostById: jest.fn().mockResolvedValue(null),
    getAllPosts: jest.fn().mockResolvedValue([]),
  },
}));

describe("API Endpoints", () => {
  describe("GET /health", () => {
    it("should return 200 with status ok", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe("POST /images", () => {
    it("should return 400 for invalid body (missing url)", async () => {
      const res = await request(app)
        .post("/images")
        .send({ filename: "test.jpg" });
      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid body (missing filename)", async () => {
      const res = await request(app)
        .post("/images")
        .send({ url: "https://example.com/image.jpg" });
      expect(res.status).toBe(400);
    });

    it("should return 400 for empty body", async () => {
      const res = await request(app).post("/images").send({});
      expect(res.status).toBe(400);
    });

    it("should return 400 for non-string url", async () => {
      const res = await request(app)
        .post("/images")
        .send({ url: 123, filename: "test.jpg" });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /posts", () => {
    it("should return 400 for invalid body (missing title)", async () => {
      const res = await request(app)
        .post("/posts")
        .send({ content: "Some content" });
      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid body (missing content)", async () => {
      const res = await request(app)
        .post("/posts")
        .send({ title: "Test" });
      expect(res.status).toBe(400);
    });

    it("should return 400 for empty body", async () => {
      const res = await request(app).post("/posts").send({});
      expect(res.status).toBe(400);
    });
  });

  describe("GET /images/:id", () => {
    it("should return 404 for non-existent image", async () => {
      const res = await request(app).get("/images/nonexistent-id");
      expect(res.status).toBe(404);
    });
  });
});
