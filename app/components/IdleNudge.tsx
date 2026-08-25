"use client";
import { useEffect } from "react";

// Renders nothing. Mount it while a flow is "active" and give it a `key`
// that changes on every real interaction — remounting restarts the timer
// from the latest interaction, no manual reset logic needed.
export function IdleNudge({ delayMs = 20000, onIdle }: { delayMs?: number; onIdle: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onIdle, delayMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delayMs]);
  return null;
}
