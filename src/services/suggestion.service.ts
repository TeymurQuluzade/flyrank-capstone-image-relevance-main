import { suggestionRepository } from "../repositories";
import { query } from "../config/database";

export async function getSuggestionById(id: string) {
  return suggestionRepository.findById(id);
}

export async function getSuggestionsByPostId(postId: string) {
  return suggestionRepository.findByPostId(postId);
}

export async function approveSuggestion(id: string, reason?: string) {
  const suggestion = await suggestionRepository.findById(id);
  if (!suggestion) {
    throw new Error(`Suggestion not found: ${id}`);
  }

  const updated = await suggestionRepository.approve(id);

  await query(
    `INSERT INTO suggestion_reviews (suggestion_id, action, reason)
     VALUES ($1, 'approved', $2)`,
    [id, reason || null]
  );

  return updated;
}

export async function rejectSuggestion(id: string, reason?: string) {
  const suggestion = await suggestionRepository.findById(id);
  if (!suggestion) {
    throw new Error(`Suggestion not found: ${id}`);
  }

  const updated = await suggestionRepository.reject(id, reason || "No reason provided");

  await query(
    `INSERT INTO suggestion_reviews (suggestion_id, action, reason)
     VALUES ($1, 'rejected', $2)`,
    [id, reason || null]
  );

  return updated;
}
