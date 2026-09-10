import { closePool } from "../src/config/database";
import { findMatchingImages } from "../src/matching";

const evaluationData = require("../data/evaluation.json") as Array<{
  postId: number;
  correctImageId: number;
  description: string;
}>;

interface TestResult {
  postId: number;
  correctImageId: number;
  description: string;
  predictedImageId: string | null;
  top1Correct: boolean;
  similarity: number | null;
}

async function run(): Promise<void> {
  console.log("=== Evaluation Script ===\n");

  try {
    const results: TestResult[] = [];
    let correctCount = 0;

    for (const testCase of evaluationData) {
      const postIdStr = String(testCase.postId);
      const correctImageIdStr = String(testCase.correctImageId);

      console.log(`Testing: ${testCase.description}`);
      console.log(`  Post ID: ${postIdStr}, Expected Image ID: ${correctImageIdStr}`);

      const matchResult = await findMatchingImages(postIdStr);

      let predictedImageId: string | null = null;
      let similarity: number | null = null;
      let top1Correct = false;

      if (matchResult.matched && matchResult.recommendation) {
        predictedImageId = matchResult.recommendation.imageId;
        similarity = matchResult.recommendation.similarity;
        top1Correct = predictedImageId === correctImageIdStr;
      }

      if (top1Correct) {
        correctCount++;
      }

      const result: TestResult = {
        postId: testCase.postId,
        correctImageId: testCase.correctImageId,
        description: testCase.description,
        predictedImageId,
        top1Correct,
        similarity,
      };
      results.push(result);

      const status = top1Correct ? "PASS" : "FAIL";
      console.log(
        `  Result: ${status} | Predicted: ${predictedImageId || "none"} | Similarity: ${similarity !== null ? similarity.toFixed(4) : "N/A"}`
      );
      console.log("");
    }

    const totalTests = evaluationData.length;
    const precision = totalTests > 0 ? correctCount / totalTests : 0;

    console.log("========================================");
    console.log("         EVALUATION RESULTS");
    console.log("========================================");
    console.log(`Total Test Cases:  ${totalTests}`);
    console.log(`Correct Top-1:     ${correctCount}`);
    console.log(`Top-1 Precision:   ${(precision * 100).toFixed(2)}%`);
    console.log("========================================");

    console.log("\nDetailed Results:");
    console.log("-".repeat(80));
    for (const r of results) {
      const status = r.top1Correct ? "PASS" : "FAIL";
      console.log(
        `[${status}] ${r.description}`
      );
      console.log(
        `       Expected: ${r.correctImageId} | Got: ${r.predictedImageId || "none"} | Sim: ${r.similarity !== null ? r.similarity.toFixed(4) : "N/A"}`
      );
    }
  } catch (error) {
    console.error("Evaluation failed:", error);
    throw error;
  } finally {
    await closePool();
  }
}

run().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
