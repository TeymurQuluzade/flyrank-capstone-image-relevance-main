import { Request, Response } from "express";
import { imageService } from "../services";

export async function createImage(req: Request, res: Response) {
  try {
    const { url, filename } = req.body;
    if (!url || !filename) {
      res.status(400).json({ error: "url and filename are required" });
      return;
    }

    if (typeof url !== "string" || typeof filename !== "string") {
      res.status(400).json({ error: "url and filename must be strings" });
      return;
    }

    const image = await imageService.createImage(url, filename);
    res.status(201).json(image);
  } catch (error) {
    console.error("Error creating image:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function listImages(req: Request, res: Response) {
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

    const images = await imageService.getAllImages(limit, offset);
    res.json(images);
  } catch (error) {
    console.error("Error listing images:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getImageById(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    if (!id) {
      res.status(400).json({ error: "id is required" });
      return;
    }

    const image = await imageService.getImageById(id);
    if (!image) {
      res.status(404).json({ error: "Image not found" });
      return;
    }

    res.json(image);
  } catch (error) {
    console.error("Error getting image:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
