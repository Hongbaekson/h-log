export function resolvePublicSiteOrigin(
  requestUrl: string,
  configuredOrigin = process.env.HLOG_PUBLIC_BASE_URL,
  environment = process.env.NODE_ENV,
): string {
  if (environment === "production" && !configuredOrigin?.trim()) {
    throw new Error(
      "HLOG_PUBLIC_BASE_URL must be a public HTTPS URL in production",
    );
  }

  const candidate = configuredOrigin?.trim() || requestUrl;
  const url = new URL(candidate);

  if (
    environment === "production" &&
    (url.protocol !== "https:" ||
      url.username ||
      url.password ||
      isPrivateHostname(url.hostname))
  ) {
    throw new Error(
      "HLOG_PUBLIC_BASE_URL must be a public HTTPS URL in production",
    );
  }

  return url.origin;
}

function isPrivateHostname(hostname: string): boolean {
  const normalizedHostname = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");

  if (
    normalizedHostname === "localhost" ||
    normalizedHostname.endsWith(".localhost") ||
    normalizedHostname.endsWith(".local") ||
    normalizedHostname.endsWith(".internal") ||
    (!normalizedHostname.includes(".") && !normalizedHostname.includes(":")) ||
    normalizedHostname === "::" ||
    normalizedHostname === "::1" ||
    normalizedHostname.startsWith("::ffff:") ||
    /^(?:fc|fd)[0-9a-f]{2}:/.test(normalizedHostname) ||
    normalizedHostname.startsWith("fe80:")
  ) {
    return true;
  }

  const parts = normalizedHostname.split(".");
  const octets = parts.map(Number);

  if (
    octets.length !== 4 ||
    octets.some(
      (octet, index) =>
        !Number.isInteger(octet) ||
        octet < 0 ||
        octet > 255 ||
        String(octet) !== parts[index],
    )
  ) {
    return false;
  }

  return (
    octets[0] === 0 ||
    octets[0] === 10 ||
    octets[0] === 127 ||
    (octets[0] === 169 && octets[1] === 254) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
}
