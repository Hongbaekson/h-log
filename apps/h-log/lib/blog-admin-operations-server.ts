import "server-only";
import { requireAdminOwner } from "./admin-server";
import { getAdminBlogPool } from "./blog-admin-review-server";
import { readAdminAudit, readAdminJobs, type AuditQuery, type JobsQuery } from "./blog-admin-operations";
import { retryAdminJob, type JobRetryCommand } from "./blog-job-retry";

export async function executeJobRetry(command: JobRetryCommand) {
  await requireAdminOwner();
  return retryAdminJob(getAdminBlogPool(),command);
}

export async function loadAdminJobs(query: JobsQuery) {
  await requireAdminOwner();
  return readAdminJobs(getAdminBlogPool(), query);
}
export async function loadAdminAudit(query: AuditQuery) {
  await requireAdminOwner();
  return readAdminAudit(getAdminBlogPool(), query, process.env);
}
