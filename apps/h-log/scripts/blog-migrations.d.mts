export const BLOG_MIGRATION_TABLES: readonly string[];

export function runBlogMigrations(connectionString?: string): Promise<{
  appliedVersions: string[];
  currentVersion: string | null;
}>;
