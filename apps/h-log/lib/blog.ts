import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

export type BlogPostStatus = "draft" | "published";

export type BlogPostSummary = {
  description: string;
  publishedAt: string;
  slug: string;
  status: BlogPostStatus;
  tags: string[];
  title: string;
};

export type BlogPost = BlogPostSummary & {
  content: string;
};

export type BlogLoaderOptions = {
  contentDir?: string;
};

const defaultContentDir = join(process.cwd(), "content", "blog");
const postFilePattern = /\.(md|mdx)$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function getBlogPosts(options: BlogLoaderOptions = {}): BlogPostSummary[] {
  return loadBlogPosts(options)
    .filter((post) => post.status === "published")
    .sort(compareNewestFirst)
    .map(toBlogPostSummary);
}

export function getBlogPostBySlug(
  slug: string,
  options: BlogLoaderOptions = {},
): BlogPost | undefined {
  return loadBlogPosts(options)
    .filter((post) => post.status === "published")
    .find((post) => post.slug === slug);
}

function loadBlogPosts(options: BlogLoaderOptions): BlogPost[] {
  const contentDir = options.contentDir ?? defaultContentDir;

  if (!existsSync(contentDir)) {
    return [];
  }

  return readdirSync(contentDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && postFilePattern.test(entry.name))
    .map((entry) => {
      const filePath = join(contentDir, entry.name);
      return parseBlogPostFile(filePath, readFileSync(filePath, "utf8"));
    });
}

function parseBlogPostFile(filePath: string, fileContent: string): BlogPost {
  const frontmatter = parseFrontmatter(filePath, fileContent);
  const slug = basename(filePath).replace(postFilePattern, "");

  if (!slugPattern.test(slug)) {
    throw new Error(`${filePath}: invalid blog slug "${slug}"`);
  }

  const title = readRequiredString(frontmatter.data, "title", filePath);
  const description = readRequiredString(frontmatter.data, "description", filePath);
  const publishedAt = readRequiredString(frontmatter.data, "publishedAt", filePath);
  const status = readStatus(frontmatter.data, filePath);
  const tags = readTags(frontmatter.data, filePath);

  if (Number.isNaN(Date.parse(publishedAt))) {
    throw new Error(`${filePath}: invalid publishedAt "${publishedAt}"`);
  }

  return {
    content: frontmatter.content.trimStart(),
    description,
    publishedAt,
    slug,
    status,
    tags,
    title,
  };
}

function parseFrontmatter(filePath: string, fileContent: string) {
  const match = fileContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);

  if (!match) {
    throw new Error(`${filePath}: missing frontmatter block`);
  }

  const data: Record<string, string | string[]> = {};
  const frontmatter = match[1] ?? "";

  for (const line of frontmatter.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf(":");

    if (separatorIndex === -1) {
      throw new Error(`${filePath}: invalid frontmatter line "${trimmed}"`);
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    data[key] = parseFrontmatterValue(filePath, key, rawValue);
  }

  return {
    content: fileContent.slice(match[0].length),
    data,
  };
}

function parseFrontmatterValue(filePath: string, key: string, value: string) {
  if (value.startsWith("[") || value.endsWith("]")) {
    if (!value.startsWith("[") || !value.endsWith("]")) {
      throw new Error(`${filePath}: invalid array frontmatter field "${key}"`);
    }

    const arrayValue = value.slice(1, -1).trim();

    if (!arrayValue) {
      return [];
    }

    return arrayValue.split(",").map((item) => unquote(item.trim()));
  }

  return unquote(value);
}

function unquote(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function readRequiredString(
  data: Record<string, string | string[]>,
  field: string,
  filePath: string,
) {
  const value = data[field];

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${filePath}: missing required frontmatter field "${field}"`);
  }

  return value;
}

function readStatus(
  data: Record<string, string | string[]>,
  filePath: string,
): BlogPostStatus {
  const status = readRequiredString(data, "status", filePath);

  if (status !== "draft" && status !== "published") {
    throw new Error(`${filePath}: invalid status "${status}"`);
  }

  return status;
}

function readTags(data: Record<string, string | string[]>, filePath: string) {
  const tags = data.tags;

  if (!Array.isArray(tags)) {
    throw new Error(`${filePath}: missing required frontmatter field "tags"`);
  }

  return tags;
}

function toBlogPostSummary(post: BlogPost): BlogPostSummary {
  return {
    description: post.description,
    publishedAt: post.publishedAt,
    slug: post.slug,
    status: post.status,
    tags: post.tags,
    title: post.title,
  };
}

function compareNewestFirst(a: BlogPostSummary, b: BlogPostSummary) {
  return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
}
