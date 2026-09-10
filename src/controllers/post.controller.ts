import { Request, Response } from "express";
import { postService } from "../services";

export async function createPost(req: Request, res: Response) {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      res.status(400).json({ error: "title and content are required" });
      return;
    }

    if (typeof title !== "string" || typeof content !== "string") {
      res.status(400).json({ error: "title and content must be strings" });
      return;
    }

    const post = await postService.createPost(title, content);
    res.status(201).json(post);
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function listPosts(req: Request, res: Response) {
  try {
    const limit = parseInt(String(req.query.limit || "20"), 10) || 20;
    const offset = parseInt(String(req.query.offset || "0"), 10) || 0;

    if (limit < 1 || limit > 100) {
      res.status(400).json({ error: "limit must be between 1 and 100" });
      return;
    }
    if (offset < 0) {
      res.status(400).json({ error: "offset must be non-negative" });
      return;
    }

    const posts = await postService.getAllPosts(limit, offset);
    res.json(posts);
  } catch (error) {
    console.error("Error listing posts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getPostById(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    if (!id) {
      res.status(400).json({ error: "id is required" });
      return;
    }

    const post = await postService.getPostById(id);
    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    res.json(post);
  } catch (error) {
    console.error("Error getting post:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
