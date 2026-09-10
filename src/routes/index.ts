import { Router } from "express";
import {
  healthController,
  imageController,
  postController,
  jobController,
  matchController,
  suggestionController,
} from "../controllers";

const router = Router();

router.get("/health", healthController.healthCheck);

router.post("/images", imageController.createImage);
router.get("/images", imageController.listImages);
router.get("/images/:id", imageController.getImageById);

router.post("/posts", postController.createPost);
router.get("/posts", postController.listPosts);
router.get("/posts/:id", postController.getPostById);

router.post("/jobs/images/process", jobController.createProcessJob);
router.get("/jobs/:id", jobController.getJobStatus);

router.get("/posts/:id/images", matchController.getMatchingImages);

router.get("/suggestions/:id", suggestionController.getSuggestionById);
router.post("/suggestions/:id/approve", suggestionController.approveSuggestion);
router.post("/suggestions/:id/reject", suggestionController.rejectSuggestion);

export default router;
