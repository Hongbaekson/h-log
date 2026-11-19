import { createHash, randomUUID } from "node:crypto";
import { open, unlink, type FileHandle } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Small outputs can be retained once per kind. Larger ones leave the DB snapshot
// completely validated and are streamed from a private, unlinked temporary file.
export const crawlerMemoryBytes = 1024 * 1024;

export type CrawlerArtifact = { body: Blob | FileHandle; bytes: number; hash: string };

export async function collectCrawlerArtifact(parts: AsyncIterable<string>): Promise<CrawlerArtifact> {
  const hash = createHash("sha256");
  let bytes = 0;
  let chunks: Buffer<ArrayBuffer>[] = [];
  let file: FileHandle | undefined;
  try {
    for await (const part of parts) {
      const chunk = Buffer.from(part);
      hash.update(chunk);
      bytes += chunk.length;
      if (!file && bytes > crawlerMemoryBytes) {
        const path = join(tmpdir(), `hlog-crawler-${randomUUID()}`);
        file = await open(path, "wx+", 0o600);
        await unlink(path);
        await file.writeFile(Buffer.concat(chunks));
        chunks = [];
      }
      if (file) await file.writeFile(chunk);
      else chunks.push(chunk);
    }
    return { body: file ?? new Blob(chunks), bytes, hash: hash.digest("hex") };
  } catch (error) {
    await file?.close();
    throw error;
  }
}
