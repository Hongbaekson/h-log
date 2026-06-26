type HeaderReader = {
  headers: {
    get(name: string): string | null;
  };
};

export function getResumePdfClientId(request: HeaderReader): string {
  const realIp = request.headers.get("x-real-ip")?.trim();

  return realIp || "local";
}
