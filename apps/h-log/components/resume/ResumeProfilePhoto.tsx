"use client";

import Image from "next/image";
import { useState } from "react";

import { resumeProfile } from "@/lib/resume-profile";

export function ResumeProfilePhoto() {
  const [hasPhoto, setHasPhoto] = useState(true);

  return (
    <div
      className="hero-reveal hero-reveal-3 relative mx-auto w-full lg:mx-0 lg:justify-self-end"
      style={{ maxWidth: resumeProfile.photo.displayWidth }}
    >
      <div className="absolute -inset-2 rounded-[1.4rem] border border-cyan-300/10 bg-cyan-300/5 blur-sm" />
      <div className="relative rounded-[1.2rem] border border-slate-700/80 bg-slate-950/78 p-1.5 shadow-[0_18px_50px_rgb(8_47_73/0.18)]">
        <div className="relative aspect-[365/469] overflow-hidden rounded-2xl border border-slate-800 bg-[#080d18]">
          {hasPhoto ? (
            <Image
              alt={resumeProfile.photo.alt}
              className="h-full w-full object-cover"
              height={resumeProfile.photo.height}
              onError={() => setHasPhoto(false)}
              priority
              sizes="(min-width: 1024px) 168px, 44vw"
              src={resumeProfile.photo.src}
              width={resumeProfile.photo.width}
            />
          ) : (
            <div
              aria-label={resumeProfile.photo.alt}
              className="grid h-full place-items-center bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/40"
              role="img"
            >
              <span className="font-mono text-2xl font-bold tracking-[0.16em] text-cyan-100">
                SHB
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
