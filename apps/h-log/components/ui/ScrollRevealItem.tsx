"use client";

import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type ScrollRevealItemProps = HTMLAttributes<HTMLLIElement> & {
  children: ReactNode;
  delayMs?: number;
  side?: "left" | "right";
};

export function ScrollRevealItem({
  children,
  className,
  delayMs = 0,
  side,
  style,
  ...props
}: ScrollRevealItemProps) {
  const itemRef = useRef<HTMLLIElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const item = itemRef.current;

    if (!item) {
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let frameId = 0;

    if (reduceMotion.matches || !("IntersectionObserver" in window)) {
      frameId = window.requestAnimationFrame(() => {
        setIsReady(true);
        setIsVisible(true);
      });

      return () => window.cancelAnimationFrame(frameId);
    }

    frameId = window.requestAnimationFrame(() => {
      setIsReady(true);
    });

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return;
        }

        setIsVisible(true);
        observer.unobserve(item);
      },
      {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.18,
      },
    );

    observer.observe(item);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, []);

  return (
    <li
      className={className}
      data-reveal-ready={isReady ? "true" : "false"}
      data-side={side}
      data-visible={isVisible ? "true" : "false"}
      ref={itemRef}
      style={
        {
          ...style,
          "--portfolio-reveal-delay": `${delayMs}ms`,
        } as CSSProperties
      }
      {...props}
    >
      {children}
    </li>
  );
}
