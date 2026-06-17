import { readFile } from "node:fs/promises";
import path from "node:path";

import { type NextRequest, NextResponse } from "next/server";

import { createAttachmentContentDisposition } from "@/lib/download-file";
import { createFixedWindowRateLimiter } from "@/lib/download-rate-limit";

export const runtime = "nodejs";

const resumePdfLimiter = createFixedWindowRateLimiter({
  limit: 5,
  windowMs: 60_000,
});

const resumePdfPath = path.join(process.cwd(), "public", "son-hongbaek-resume.pdf");

function getClientId(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();

  return forwardedFor || realIp || "local";
}

export async function GET(request: NextRequest) {
  const rateLimit = resumePdfLimiter.check(getClientId(request));
  const rateLimitHeaders = {
    "X-RateLimit-Limit": "5",
    "X-RateLimit-Remaining": String(rateLimit.remaining),
    "X-RateLimit-Reset": String(Math.ceil(rateLimit.resetAt / 1000)),
  };

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        message: "PDF download rate limit exceeded. Please retry later.",
      },
      {
        headers: {
          ...rateLimitHeaders,
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
        status: 429,
      },
    );
  }

  try {
    const pdf = await readFile(resumePdfPath);

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        ...rateLimitHeaders,
        "Cache-Control": "private, max-age=300",
        "Content-Disposition": createAttachmentContentDisposition(
          "손홍백-자기소개서.pdf",
          "son-hongbaek-cover-letter.pdf",
        ),
        "Content-Length": String(pdf.byteLength),
        "Content-Type": "application/pdf",
      },
    });
  } catch {
    return NextResponse.json(
      {
        message: "Resume PDF file was not found.",
      },
      {
        status: 404,
      },
    );
  }
}
