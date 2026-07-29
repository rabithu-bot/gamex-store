"use client";

import { useEffect, useRef } from "react";

// Runs `callback` immediately, then on a fixed interval — paused while the
// tab/screen is hidden and resumed (with an immediate refetch) when it
// becomes visible again, so backgrounded tabs stop hammering the API.
export function useVisiblePolling(callback, intervalMs) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    let interval = null;

    function start() {
      if (interval) return;
      callbackRef.current();
      interval = setInterval(() => callbackRef.current(), intervalMs);
    }

    function stop() {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    }

    function handleVisibility() {
      if (document.hidden) stop();
      else start();
    }

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [intervalMs]);
}
