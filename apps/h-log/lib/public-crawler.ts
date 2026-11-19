import { Readable } from "node:stream";
import type { Pool, PoolClient, QueryResultRow } from "pg";
import { readPublicBlogContent } from "./blog-postgres-repository.ts";
import { crawlerFormat, sitemapUrl } from "./blog-crawler-output.ts";
import { buildCrawlerEntries, type PostPublishCrawlerOutputEntry, type PostPublishCrawlerOutputName } from "./blog-post-publish-verification.ts";
import { collectCrawlerArtifact, type CrawlerArtifact } from "./blog-crawler-artifact.ts";
import { brainCatalog } from "./brain-catalog.ts";
import { selectPublicBrain } from "./brain.ts";
import { mergePublishedBrain } from "./brain-curation.ts";
import type { BrainSnapshot } from "./brain-capture.ts";
import { projects } from "./projects.ts";
import { prepareBlogProjection, publicReadMode, withBlogReadSnapshot } from "./public-blog-projection.ts";
import { fingerprint, type ProjectionContext } from "./public-read-model.ts";

const outputSchema = 1;
const smallOutputs = new Map<PostPublishCrawlerOutputName, { key: string; artifact: CrawlerArtifact & { body: Blob } }>();
type Visible = { sql: string; args: unknown[] };

async function* batches<Row extends QueryResultRow>(client: PoolClient, sql: string, args: unknown[], count: number, signal?: AbortSignal) {
  await client.query("declare crawler_rows no scroll cursor for " + sql, args);
  while (true) {
    signal?.throwIfAborted();
    const { rows } = await client.query<Row>(`fetch forward ${count} from crawler_rows`);
    if (rows.length) yield rows;
    if (rows.length < count) break;
  }
  await client.query("close crawler_rows");
}

async function* sitemapPaths(client: PoolClient, context: ProjectionContext, dbBrain: boolean, signal?: AbortSignal) {
  yield* ["/", "/resume", "/portfolio", ...projects.map(project => `/portfolio/${project.slug}`), "/blog", "/brain"];
  for (const node of selectPublicBrain(brainCatalog).nodes) yield `/brain/${node.id}`;
  if (dbBrain) {
    const sql = "select public_node from brain_notes where published_revision is not null order by created_at,id";
    for await (const rows of batches<{ public_node: BrainSnapshot }>(client, sql, [], 8, signal)) {
      const graph = mergePublishedBrain({ nodes: [], edges: [] }, rows.map(row => row.public_node), context.policy);
      for (const node of graph.nodes) yield `/brain/${node.id}`;
    }
  }
}

async function* entries(client: PoolClient, context: ProjectionContext, full: boolean, visible?: Visible, signal?: AbortSignal) {
  if (visible) {
    const sql = visible.sql + ` select slug, item->>'href' href, (item->>'href')||'.md' "markdownHref",
      item->>'title' title, item->>'description' description, item->>'publishedAt' "publishedAt",
      item->>'updatedAt' "updatedAt", v.content_hash "contentHash"${full ? ', v.content_markdown "contentMarkdown"' : ""}
      from visible join post_versions v on v.id=visible.current_version_id and v.post_id=visible.id
      order by date_trunc('milliseconds',listed_at) desc,slug collate "ko-x-icu",visible.id`;
    for await (const rows of batches<PostPublishCrawlerOutputEntry>(client, sql, visible.args, full ? 8 : 128, signal)) yield* rows;
    return;
  }
  const sql = `select p.slug, octet_length(v.content_markdown)::bigint + octet_length(v.content_html) bytes
    from posts p join post_versions v on v.id=p.current_version_id and v.post_id=p.id
    where p.status='published' order by date_trunc('milliseconds',coalesce(p.published_at,p.updated_at)) desc,p.slug collate "ko-x-icu",p.id`;
  for await (const rows of batches<{ slug: string; bytes: string }>(client, sql, [], 128, signal)) {
    // Source rollback must still accept an individual legacy post larger than a batch.
    for (let start = 0; start < rows.length;) {
      let end = start + 1;
      let bytes = Number(rows[start].bytes);
      while (end < rows.length && bytes + Number(rows[end].bytes) <= 2 * 1024 * 1024) {
        bytes += Number(rows[end].bytes);
        end++;
      }
      const slugs = rows.slice(start, end).map(row => row.slug);
      const store = await readPublicBlogContent(client, { privacyScanPolicy: context.policy }, slugs);
      yield* buildCrawlerEntries(store, full);
      start = end;
    }
  }
}

async function* render(client: PoolClient, name: PostPublishCrawlerOutputName, origin: string, context: ProjectionContext,
  dbBrain: boolean, visible?: Visible, signal?: AbortSignal) {
  const format = crawlerFormat(name, origin);
  yield format.prefix;
  let separator = "";
  if (name === "sitemap.xml") {
    for await (const path of sitemapPaths(client, context, dbBrain, signal)) {
      yield separator + sitemapUrl(path, origin);
      separator = format.separator;
    }
  }
  for await (const entry of entries(client, context, name === "llms-full.txt", visible, signal)) {
    yield separator + format.entry(entry);
    separator = format.separator;
  }
  yield format.suffix;
}

export async function readCrawlerResponse(pool: Pool, name: PostPublishCrawlerOutputName, origin: string, context: ProjectionContext,
  { mode = publicReadMode(), dbBrain = process.env.HLOG_BRAIN_DATABASE_ENABLED === "1", signal }: {
    mode?: ReturnType<typeof publicReadMode>; dbBrain?: boolean; signal?: AbortSignal;
  } = {}) {
  let created: CrawlerArtifact | undefined;
  try {
    const { artifact, key } = await withBlogReadSnapshot(pool, async client => {
      signal?.throwIfAborted();
      let key: string | undefined;
      let candidateHash: string | undefined;
      if (mode !== "source") {
        const visible = await (await prepareBlogProjection(client, context)).visible();
        // Every hit rechecks current markers and the active generation in this snapshot.
        if (visible.revision) key = fingerprint([outputSchema, name, origin, visible.revision, context.manifestHash,
          context.policyFingerprint, name === "sitemap.xml" && dbBrain]);
        if (name === "sitemap.xml" && dbBrain) {
          const markers = await client.query(`select 1 from brain_notes n left join public_read_sources s
            on s.kind='brain' and s.source_id=n.id where n.published_revision is not null
            and (n.public_node is null or s.metadata_revision is null or s.deleted) limit 1`);
          if (markers.rowCount) throw new Error("projection_marker_missing");
        }
        const cached = smallOutputs.get(name);
        if (mode === "projected" && cached && cached.key === key) {
          return { artifact: cached.artifact };
        }
        created = await collectCrawlerArtifact(render(client, name, origin, context, dbBrain, visible, signal));
        if (mode === "projected") return { artifact: created, key };
        candidateHash = created.hash;
        if (!(created.body instanceof Blob)) await created.body.close();
      }
      created = await collectCrawlerArtifact(render(client, name, origin, context, dbBrain, undefined, signal));
      if (candidateHash && candidateHash !== created.hash) console.error("public_crawler_shadow_mismatch");
      return { artifact: created };
    });
    signal?.throwIfAborted();
    if (key && artifact.body instanceof Blob) smallOutputs.set(name, { key, artifact: { ...artifact, body: artifact.body } });
    const body = artifact.body instanceof Blob ? artifact.body : Readable.toWeb(
      artifact.body.createReadStream({ start: 0, signal }),
      { strategy: { highWaterMark: 65536, size: chunk => chunk.byteLength } },
    ) as ReadableStream<Uint8Array>;
    const mime = name === "feed.xml" ? "application/rss+xml" : name === "sitemap.xml" ? "application/xml" : "text/plain";
    return new Response(body, { headers: {
      "cache-control": "private, no-store", "content-type": mime + "; charset=utf-8", "content-length": String(artifact.bytes),
    } });
  } catch (error) {
    if (created && !(created.body instanceof Blob)) await created.body.close();
    throw error;
  }
}
