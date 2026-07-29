"use client";

import { useCallback, useState } from "react";
import { useVisiblePolling } from "@/app/lib/useVisiblePolling";

const POLL_INTERVAL_MS = 1500;

export function useOrderPoll(id) {
  const [order, setOrder] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const refetch = useCallback(async () => {
    const res = await fetch(`/api/orders/${id}`, { cache: "no-store" });
    if (res.ok) setOrder(await res.json());
    else if (res.status === 403) setAccessDenied(true);
    return res;
  }, [id]);

  useVisiblePolling(refetch, POLL_INTERVAL_MS);

  return { order, setOrder, accessDenied, setAccessDenied, refetch };
}
