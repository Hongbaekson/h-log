import { authorizeAdminOwner, adminPrivateHeaders } from "./admin-owner.ts";

export { adminPrivateHeaders as brainPrivateHeaders };

export function authorizeBrainOwner(
  request: Request,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): Response | null {
  const denied = authorizeAdminOwner(request, environment);
  if (denied) return denied;
  return environment.HLOG_BRAIN_DATABASE_ENABLED === "1"
    ? null : new Response(null, { status: 404, headers: adminPrivateHeaders });
}
