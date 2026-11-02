import "server-only";
import { requireAdminOwner } from "./admin-server";
import { readAdminMonitoring } from "./admin-monitoring";

export async function loadAdminMonitoring() {
  await requireAdminOwner();
  return readAdminMonitoring(process.env.HLOG_ADMIN_PROMETHEUS_ORIGIN);
}
