"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SCROLL_PAUSE_MS = 220;

export function useTimelineChartHighlight() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPausedRef = useRef(false);
  const lockedPlayerIdRef = useRef<string | null>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [lockedPlayerId, setLockedPlayerId] = useState<string | null>(null);
  const [previewPlayerId, setPreviewPlayerId] = useState<string | null>(null);
  const [scrollPaused, setScrollPaused] = useState(false);

  lockedPlayerIdRef.current = lockedPlayerId;

  const markScrolling = useCallback(() => {
    scrollPausedRef.current = true;
    setScrollPaused(true);
    if (scrollTimeoutRef.current)
      clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      scrollPausedRef.current = false;
      setScrollPaused(false);
    }, SCROLL_PAUSE_MS);
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element)
      return undefined;

    element.addEventListener("scroll", markScrolling, { passive: true });
    return () => {
      element.removeEventListener("scroll", markScrolling);
      if (scrollTimeoutRef.current)
        clearTimeout(scrollTimeoutRef.current);
    };
  }, [markScrolling]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape")
        return;
      lockedPlayerIdRef.current = null;
      setLockedPlayerId(null);
      setPreviewPlayerId(null);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const toggleLock = useCallback((playerId: string) => {
    setLockedPlayerId((current) => {
      const next = current === playerId ? null : playerId;
      lockedPlayerIdRef.current = next;
      return next;
    });
    setPreviewPlayerId(null);
  }, []);

  const requestPreview = useCallback((playerId: string | null) => {
    if (scrollPausedRef.current || lockedPlayerIdRef.current)
      return;
    setPreviewPlayerId(playerId);
  }, []);

  const clearPreview = useCallback(() => {
    if (lockedPlayerIdRef.current)
      return;
    setPreviewPlayerId(null);
  }, []);

  const highlightedPlayerId = lockedPlayerId ?? previewPlayerId;

  return {
    scrollRef,
    scrollPaused,
    lockedPlayerId,
    highlightedPlayerId,
    toggleLock,
    requestPreview,
    clearPreview
  };
}
