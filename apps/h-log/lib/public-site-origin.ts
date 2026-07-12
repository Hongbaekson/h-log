export function resolvePublicSiteOrigin(
  requestUrl: string,
  configuredOrigin = process.env.HLOG_PUBLIC_BASE_URL,
): string {
  const candidate = configuredOrigin?.trim() || requestUrl;

  return new URL(candidate).origin;
}
