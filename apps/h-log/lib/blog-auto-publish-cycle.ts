import { requiredPublishJobTypes } from "./blog-content-model.ts";

type AutoPublishGenerationResult = {
  postId: string;
  status: string;
};

type RequiredWorkerResult = {
  status: "failed" | "idle" | "retrying" | "succeeded";
};

export async function runAutoPublishCycle({
  generate,
  runRequiredWorkerOnce,
}: {
  generate(): Promise<AutoPublishGenerationResult>;
  runRequiredWorkerOnce(postId: string): Promise<RequiredWorkerResult>;
}): Promise<{
  generationStatus: string;
  postId: string;
  status: "completed";
  workerRuns: number;
}> {
  const generation = await generate();
  const maxWorkerRuns = requiredPublishJobTypes.length + 1;

  for (let workerRuns = 1; workerRuns <= maxWorkerRuns; workerRuns += 1) {
    const worker = await runRequiredWorkerOnce(generation.postId);

    if (worker.status === "idle") {
      return {
        generationStatus: generation.status,
        postId: generation.postId,
        status: "completed",
        workerRuns,
      };
    }

    if (worker.status !== "succeeded") {
      throw new Error(
        `required publish worker stopped with ${worker.status}`,
      );
    }
  }

  throw new Error(
    `required publish worker did not become idle after ${maxWorkerRuns} runs`,
  );
}
