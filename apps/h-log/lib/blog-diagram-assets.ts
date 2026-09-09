import {
  isCurrentPublishedVersion,
  type PostAssetRecord,
  type PostRecord,
  type PostVersionRecord,
} from "./blog-content-model.ts";

export function isRenderableDiagramAsset(
  asset: PostAssetRecord,
  post: PostRecord,
  version: PostVersionRecord,
): boolean {
  return (
    isCurrentPublishedVersion(post, version) &&
    asset.type === "diagram" &&
    asset.postId === post.id &&
    asset.postVersionId === version.id &&
    asset.status === "ready" &&
    asset.verifiedAt !== null &&
    isAssetHash(asset.assetHash) &&
    asset.alt.trim().length > 0 &&
    isPublicSafeDiagramAssetPath(asset.path)
  );
}

function isPublicSafeDiagramAssetPath(assetPath: string): boolean {
  return (
    assetPath.startsWith("/blog-assets/") &&
    /\.(png|svg|webp)$/i.test(assetPath) &&
    !assetPath.includes("\\") &&
    !assetPath.includes("..") &&
    !assetPath.includes("://") &&
    !assetPath.startsWith("//")
  );
}

function isAssetHash(assetHash: string | null): assetHash is string {
  return assetHash !== null && /^[a-f0-9]{64}$/i.test(assetHash);
}
