"use client";

import { useCallback, useRef, useState } from "react";
import { useVisiblePolling } from "@/app/lib/useVisiblePolling";

const POLL_INTERVAL_MS = 1500;

export function useOrderPoll(id) {
  const [order, setOrderState] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  // Bumped on every optimistic update (send/react/edit) so an in-flight poll
  // started *before* that update can tell, once it resolves, that its
  // snapshot is now stale — without this a background poll racing an
  // optimistic send can overwrite the just-added message and flash the chat
  // back to its pre-send state until the next poll tick corrects it.
  const versionRef = useRef(0);

  const setOrder = useCallback((updater) => {
    versionRef.current += 1;
    setOrderState(updater);
  }, []);

  const refetch = useCallback(async () => {
    const versionAtStart = versionRef.current;
    const res = await fetch(`/api/orders/${id}`, { cache: "no-store" });
    if (res.ok) {
      const fresh = await res.json();
      if (versionRef.current === versionAtStart) setOrderState(fresh);
    } else if (res.status === 403) setAccessDenied(true);
    return res;
  }, [id]);

  useVisiblePolling(refetch, POLL_INTERVAL_MS);

  return { order, setOrder, accessDenied, setAccessDenied, refetch };
}
