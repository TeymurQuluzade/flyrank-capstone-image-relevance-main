import { Request, Response } from "express";
import { suggestionService } from "../services";

export async function getSuggestionById(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    if (!id) {
      res.status(400).json({ error: "id is required" });
      return;
    }

    const suggestion = await suggestionService.getSuggestionById(id);
    if (!suggestion) {
      res.status(404).json({ error: "Suggestion not found" });
      return;
    }

    res.json(suggestion);
  } catch (error) {
    console.error("Error getting suggestion:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function approveSuggestion(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    if (!id) {
      res.status(400).json({ error: "id is required" });
      return;
    }

    const { reason } = req.body || {};

    const suggestion = await suggestionService.approveSuggestion(id, reason);
    res.json(suggestion);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message.includes("not found")) {
      res.status(404).json({ error: message });
      return;
    }
    console.error("Error approving suggestion:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function rejectSuggestion(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    if (!id) {
      res.status(400).json({ error: "id is required" });
      return;
    }

    const { reason } = req.body || {};

    const suggestion = await suggestionService.rejectSuggestion(id, reason);
    res.json(suggestion);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message.includes("not found")) {
      res.status(404).json({ error: message });
      return;
    }
    console.error("Error rejecting suggestion:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
