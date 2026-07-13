"use client";

import { useCallback, useEffect, useState } from "react";

// Client-side brute-force friction (best-effort UX, not a security boundary).
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;
const BASE_COOLDOWN_MS = 30 * 1000;
const STORAGE_KEY = "gate-attempts";

type Attempts = { count: number; timestamp: number };

function readAttempts(): Attempts {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Attempts;
  } catch {
    // ignore corrupt/blocked storage
  }
  return { count: 0, timestamp: 0 };
}

function writeAttempts(attempts: Attempts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts));
  } catch {
    // ignore blocked storage
  }
}

export function useRateLimit() {
  const [cooldownTime, setCooldownTime] = useState(0);
  const rateLimited = cooldownTime > 0;

  useEffect(() => {
    if (cooldownTime <= 0) return;
    const timer = setTimeout(() => setCooldownTime((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldownTime]);

  const checkRateLimit = useCallback(() => {
    const attempts = readAttempts();
    const now = Date.now();
    if (now - attempts.timestamp > WINDOW_MS) {
      writeAttempts({ count: 0, timestamp: now });
      return false;
    }
    if (attempts.count >= MAX_ATTEMPTS) {
      setCooldownTime(
        Math.ceil((WINDOW_MS - (now - attempts.timestamp)) / 1000),
      );
      return true;
    }
    return false;
  }, []);

  // resume a cooldown left over from a previous visit
  useEffect(() => {
    checkRateLimit();
  }, [checkRateLimit]);

  const recordAttempt = useCallback(() => {
    const attempts = readAttempts();
    const now = Date.now();
    if (attempts.count === 0 || now - attempts.timestamp > WINDOW_MS) {
      writeAttempts({ count: 1, timestamp: now });
      return;
    }
    const count = attempts.count + 1;
    writeAttempts({ count, timestamp: attempts.timestamp });
    if (count >= 3) {
      // exponential backoff: 30s, 60s, capped at 60s
      const cooldown = Math.min(BASE_COOLDOWN_MS * 2 ** (count - 3), 60_000);
      setCooldownTime(Math.ceil(cooldown / 1000));
    }
  }, []);

  return { rateLimited, cooldownTime, checkRateLimit, recordAttempt };
}
