"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

const LOCK_TTL_MS = 6000;
const HEARTBEAT_MS = 2000;

type LockRecord = { tabId: string; ts: number };

function getTabId() {
  if (typeof window === "undefined") return "";
  const key = "webbook-studio-tab-id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

function ensureTabId(tabIdRef: RefObject<string | null>) {
  if (!tabIdRef.current) {
    tabIdRef.current = getTabId();
  }
  return tabIdRef.current;
}

function lockStorageKey(bookId: string) {
  return `webbook-studio-editor-lock:${bookId}`;
}

function readLock(bookId: string): LockRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(lockStorageKey(bookId));
    if (!raw) return null;
    return JSON.parse(raw) as LockRecord;
  } catch {
    return null;
  }
}

function isLockHeldByOther(bookId: string, tabId: string): boolean {
  const lock = readLock(bookId);
  if (!lock) return false;
  if (lock.tabId === tabId) return false;
  return Date.now() - lock.ts < LOCK_TTL_MS;
}

/** 책당 편집기 탭 하나 — 다른 탭이 열려 있으면 blocked */
export function useEditorSessionLock(bookId: string) {
  const tabIdRef = useRef<string | null>(null);
  const ownsLockRef = useRef(false);
  const [status, setStatus] = useState<"checking" | "active" | "blocked">(
    "checking",
  );

  const acquire = useCallback(() => {
    const tabId = ensureTabId(tabIdRef);
    if (!tabId) return false;
    if (isLockHeldByOther(bookId, tabId)) {
      ownsLockRef.current = false;
      setStatus("blocked");
      return false;
    }

    localStorage.setItem(
      lockStorageKey(bookId),
      JSON.stringify({ tabId, ts: Date.now() }),
    );
    ownsLockRef.current = true;
    setStatus("active");
    return true;
  }, [bookId]);

  const release = useCallback(() => {
    if (!ownsLockRef.current) return;
    const lock = readLock(bookId);
    if (lock?.tabId === tabIdRef.current) {
      localStorage.removeItem(lockStorageKey(bookId));
    }
    ownsLockRef.current = false;
  }, [bookId]);

  const heartbeat = useCallback(() => {
    if (!ownsLockRef.current) {
      acquire();
      return;
    }
    const tabId = ensureTabId(tabIdRef);
    if (!tabId) return;
    localStorage.setItem(
      lockStorageKey(bookId),
      JSON.stringify({ tabId, ts: Date.now() }),
    );
  }, [bookId, acquire]);

  useEffect(() => {
    acquire();

    const channel = new BroadcastChannel(`webbook-studio-editor-lock:${bookId}`);

    const tryTakeLock = () => {
      acquire();
    };

    channel.addEventListener("message", (event: MessageEvent) => {
      if (event.data?.type === "released") tryTakeLock();
    });

    const onStorage = (event: StorageEvent) => {
      if (event.key === lockStorageKey(bookId)) tryTakeLock();
    };

    const interval = window.setInterval(heartbeat, HEARTBEAT_MS);

    const onPageHide = () => {
      release();
      channel.postMessage({ type: "released" });
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pagehide", onPageHide);
      release();
      channel.postMessage({ type: "released" });
      channel.close();
    };
  }, [bookId, acquire, release, heartbeat]);

  const retry = useCallback(() => {
    acquire();
  }, [acquire]);

  return { status, retry };
}
