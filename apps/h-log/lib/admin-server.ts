import "server-only";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { authorizeAdminOwner } from "./admin-owner";

export async function requireAdminOwner() {
  const request = new Request("http://admin.invalid", { headers: await headers() });
  if (authorizeAdminOwner(request)) notFound();
}
