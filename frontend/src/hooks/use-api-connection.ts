import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import { motionToast as toast } from "@/components/ui/motion-toast";
import type { ApiStatusVisualState } from "@/components/ui/api-status-icon";
import { useHealthQuery } from "@/hooks/use-clips-queries";
import { getApiErrorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getHealth } from "@/services/api";

/**
 * User-controlled API connection gate. Health check remains the source of truth
 * for whether the backend is actually reachable when connection is enabled.
 */
export function useApiConnection() {
  const queryClient = useQueryClient();
  const [connectionEnabled, setConnectionEnabled] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  const health = useHealthQuery(connectionEnabled);

  const isActive =
    connectionEnabled && health.isSuccess && Boolean(health.data?.status);

  const visualState: ApiStatusVisualState = useMemo(() => {
    if (isToggling) return "loading";
    if (!connectionEnabled) return "inactive";
    if (health.isFetching && !health.isFetched) return "loading";
    if (isActive) return "active";
    return "inactive";
  }, [
    connectionEnabled,
    health.isFetched,
    health.isFetching,
    isActive,
    isToggling,
  ]);

  const statusLabel = useMemo(() => {
    if (isToggling) return "Connecting to API…";
    if (!connectionEnabled) return "API disconnected";
    if (health.isError) return "API offline";
    if (isActive) return "API active";
    if (health.isFetching) return "Checking API…";
    return "API inactive";
  }, [connectionEnabled, health.isError, health.isFetching, isActive, isToggling]);

  const toggle = useCallback(async () => {
    if (isToggling) return;

    if (connectionEnabled && isActive) {
      setConnectionEnabled(false);
      return;
    }

    setIsToggling(true);
    setConnectionEnabled(true);
    try {
      await queryClient.fetchQuery({
        queryKey: queryKeys.health,
        queryFn: getHealth,
        staleTime: 0,
      });
    } catch (error) {
      setConnectionEnabled(false);
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsToggling(false);
    }
  }, [connectionEnabled, isActive, isToggling, queryClient]);

  return {
    connectionEnabled,
    isActive,
    isToggling,
    visualState,
    statusLabel,
    toggle,
    health,
  };
}
