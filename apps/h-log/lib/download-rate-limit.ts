type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

type ClientWindow = {
  count: number;
  resetAt: number;
};

export function createFixedWindowRateLimiter({ limit, windowMs }: RateLimitOptions) {
  const windows = new Map<string, ClientWindow>();

  return {
    check(clientId: string, now = Date.now()): RateLimitResult {
      const existingWindow = windows.get(clientId);
      const currentWindow =
        existingWindow && now < existingWindow.resetAt
          ? existingWindow
          : {
              count: 0,
              resetAt: now + windowMs,
            };

      if (currentWindow.count >= limit) {
        windows.set(clientId, currentWindow);

        return {
          allowed: false,
          remaining: 0,
          resetAt: currentWindow.resetAt,
          retryAfterSeconds: Math.max(1, Math.ceil((currentWindow.resetAt - now) / 1000)),
        };
      }

      const nextWindow = {
        count: currentWindow.count + 1,
        resetAt: currentWindow.resetAt,
      };
      windows.set(clientId, nextWindow);

      return {
        allowed: true,
        remaining: Math.max(0, limit - nextWindow.count),
        resetAt: nextWindow.resetAt,
        retryAfterSeconds: 0,
      };
    },
  };
}
