export function normalizePublicSourceUrl(value: string): string {
  const trimmed = value.trim();
  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("source url must be an absolute HTTPS URL");
  }

  if (url.protocol !== "https:") {
    throw new Error("source url must be an absolute HTTPS URL");
  }

  if (url.username || url.password || isInternalHostname(url.hostname)) {
    throw new Error("source url must be a public HTTPS URL");
  }

  return url.toString();
}

export function tryNormalizePublicSourceUrl(value: string): string | undefined {
  try {
    return normalizePublicSourceUrl(value);
  } catch {
    return undefined;
  }
}

function isInternalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    !host.includes(".")
  ) {
    return true;
  }

  const ipv4Parts = parseIpv4(host);

  if (ipv4Parts) {
    const [first = 0, second = 0] = ipv4Parts;

    return (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      first === 169 && second === 254 ||
      first === 172 && second >= 16 && second <= 31 ||
      first === 192 && second === 168
    );
  }

  return (
    host === "::1" ||
    host.startsWith("fc") ||
    host.startsWith("fd") ||
    host.startsWith("fe80:")
  );
}

function parseIpv4(host: string): number[] | undefined {
  const parts = host.split(".");

  if (parts.length !== 4) {
    return undefined;
  }

  const numbers = parts.map((part) => Number(part));

  if (
    numbers.some(
      (part, index) =>
        !Number.isInteger(part) ||
        part < 0 ||
        part > 255 ||
        String(part) !== parts[index],
    )
  ) {
    return undefined;
  }

  return numbers;
}
