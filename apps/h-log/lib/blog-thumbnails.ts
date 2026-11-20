import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createPostVersionContentHash, selectPublicBlogRouteEntries, type PostAssetRecord, type PublicBlogRouteEntry } from "./blog-content-model.ts";
import { isVerifiedPublicAsset } from "./blog-diagram-assets.ts";
import type { BlogContentStore } from "./blog-public.ts";

export type PublicBlogThumbnail = { src: string; alt: string };

export async function verifyPublicBlogThumbnail(thumbnail: PublicBlogThumbnail | undefined, publicDirectory = "public") {
  const file = thumbnail && /^\/blog-assets\/thumbnails\/(([a-f0-9]{64})\.(?:png|webp))$/.exec(thumbnail.src);
  if (!file) return undefined;
  try {
    const [, filename, expectedHash] = file;
    const bytes = await readFile(join(publicDirectory, "blog-assets/thumbnails", filename));
    return createHash("sha256").update(bytes).digest("hex") === expectedHash ? thumbnail : undefined;
  } catch { return undefined; }
}

export function selectPublicBlogThumbnail(
  entry: PublicBlogRouteEntry,
  assets: readonly PostAssetRecord[],
): PublicBlogThumbnail | undefined {
  if (entry.version.contentHash !== createPostVersionContentHash(entry.version)) return undefined;

  const asset = assets.filter((candidate) =>
    candidate.type === "image" &&
    isVerifiedPublicAsset(candidate, entry.post, entry.version) &&
    /^\/blog-assets\/thumbnails\/[a-f0-9]{64}\.(png|webp)$/.test(candidate.path) &&
    candidate.path.split("/").at(-1)?.split(".")[0] === candidate.assetHash?.toLowerCase(),
  ).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.id.localeCompare(b.id))[0];

  return asset ? { src: asset.path, alt: asset.alt } : undefined;
}

export async function verifyBlogThumbnailFiles(
  store: BlogContentStore,
  publicDirectory = "public",
): Promise<BlogContentStore> {
  const paths = new Set(selectPublicBlogRouteEntries(store.posts, store.versions).flatMap((entry) => {
    const thumbnail = selectPublicBlogThumbnail(entry, store.assets ?? []);
    return thumbnail ? [thumbnail.src] : [];
  }));
  const verifiedPaths = new Set(await Promise.all([...paths].map(async (path) => {
    return (await verifyPublicBlogThumbnail({src:path,alt:""}, publicDirectory))?.src;
  })));

  return { ...store, assets: (store.assets ?? []).filter((asset) => asset.type !== "image" || verifiedPaths.has(asset.path)) };
}
