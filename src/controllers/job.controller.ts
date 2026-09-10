import { Request, Response } from "express";
import { jobRepository } from "../repositories";
import { imageRepository } from "../repositories";

export async function createProcessJob(req: Request, res: Response) {
  try {
    const { imageIds, processAll } = req.body || {};

    let targetImageIds: string[] = [];

    if (processAll === true) {
      const pendingImages = await imageRepository.findByStatus("pending");
      targetImageIds = pendingImages.map((img: any) => img.id);
    } else if (Array.isArray(imageIds) && imageIds.length > 0) {
      targetImageIds = imageIds;
    } else {
      res.status(400).json({ error: "Provide imageIds array or set processAll to true" });
      return;
    }

    if (targetImageIds.length === 0) {
      res.status(400).json({ error: "No images to process" });
      return;
    }

    const job = await jobRepository.createJob("image_processing", targetImageIds.length);
    await jobRepository.updateJobStatus(job.id, "running");

    for (const imageId of targetImageIds) {
      await jobRepository.createJobItem(job.id, imageId);
    }

    res.status(201).json({
      jobId: job.id,
      totalItems: targetImageIds.length,
      status: "running",
    });
  } catch (error) {
    console.error("Error creating batch job:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getJobStatus(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    if (!id) {
      res.status(400).json({ error: "id is required" });
      return;
    }

    const job = await jobRepository.findJobById(id);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const items = await jobRepository.findJobItems(id as string);

    res.json({
      ...job,
      items,
    });
  } catch (error) {
    console.error("Error getting job status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
