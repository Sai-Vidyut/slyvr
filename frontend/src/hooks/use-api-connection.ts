import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";

import { motionToast as toast } from "@/components/ui/motion-toast";
import type { ApiStatusVisualState } from "@/components/ui/api-status-icon";
import { useHealthQuery } from "@/hooks/use-clips-queries";
import { getApiErrorMessage } from "@/lib/api-client";
import {
  getStaticDemoLibrary,
  resolveDemoLibrary,
  type DemoLibrary,
} from "@/lib/demo-library";
import { queryKeys } from "@/lib/query-keys";
import { getHealth } from "@/services/api";
import type { Category, Clip, Person } from "@/types/clip";

const DOUBLE_CLICK_MS = 320;

/**
 * User-controlled API connection gate. Health check remains the source of truth
 * for whether the backend is actually reachable when connection is enabled.
 *
 * Double-click the API control to enter demo mode (static sample library on
 * public hosts; localhost clips when developing locally with the API up).
 */
export function useApiConnection() {
  const queryClient = useQueryClient();
  const [connectionEnabled, setConnectionEnabled] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [pendingAction, setPendingAction] = useState<"demo" | "api" | null>(
    null,
  );
  const [demoMode, setDemoMode] = useState(false);
  const [demoClips, setDemoClips] = useState<Clip[]>([]);
  const [demoCategories, setDemoCategories] = useState<Category[]>([]);
  const [demoPeople, setDemoPeople] = useState<Person[]>([]);
  const singleClickTimerRef = useRef<number | null>(null);

  const health = useHealthQuery(connectionEnabled && !demoMode);

  const isActive =
    !demoMode &&
    connectionEnabled &&
    health.isSuccess &&
    Boolean(health.data?.status);

  const visualState: ApiStatusVisualState = useMemo(() => {
    if (isToggling) return "loading";
    if (demoMode) return "active";
    if (!connectionEnabled) return "inactive";
    if (health.isFetching && !health.isFetched) return "loading";
    if (isActive) return "active";
    return "inactive";
  }, [
    connectionEnabled,
    demoMode,
    health.isFetched,
    health.isFetching,
    isActive,
    isToggling,
  ]);

  const statusLabel = useMemo(() => {
    if (isToggling && pendingAction === "demo") return "Loading demo…";
    if (isToggling) return "Connecting to API…";
    if (demoMode) return "Demo mode — sample library (double-click API to exit)";
    if (!connectionEnabled) return "API disconnected";
    if (health.isError) return "API offline";
    if (isActive) return "API active";
    if (health.isFetching) return "Checking API…";
    return "API inactive";
  }, [
    connectionEnabled,
    demoMode,
    health.isError,
    health.isFetching,
    isActive,
    isToggling,
    pendingAction,
  ]);

  const clearSingleClickTimer = useCallback(() => {
    if (singleClickTimerRef.current != null) {
      window.clearTimeout(singleClickTimerRef.current);
      singleClickTimerRef.current = null;
    }
  }, []);

  const applyDemoLibrary = useCallback((library: DemoLibrary) => {
    setDemoClips(library.clips);
    setDemoCategories(library.categories);
    setDemoPeople(library.people);
    setDemoMode(true);
    setConnectionEnabled(false);
    toast.success(
      library.source === "localhost"
        ? "Demo mode — using clips from localhost"
        : "Demo mode — sample library",
    );
  }, []);

  const exitDemoMode = useCallback(() => {
    setDemoMode(false);
    setDemoClips([]);
    setDemoCategories([]);
    setDemoPeople([]);
    toast.message("Demo mode off");
  }, []);

  const enterDemoMode = useCallback(async () => {
    setPendingAction("demo");
    setIsToggling(true);
    try {
      const library = await resolveDemoLibrary();
      applyDemoLibrary(library);
    } catch {
      // Public/demo entry must never surface localhost/API failures.
      applyDemoLibrary(getStaticDemoLibrary());
    } finally {
      setIsToggling(false);
      setPendingAction(null);
    }
  }, [applyDemoLibrary]);

  const runSingleToggle = useCallback(async () => {
    if (isToggling) return;

    if (demoMode) {
      exitDemoMode();
      return;
    }

    if (connectionEnabled && isActive) {
      setConnectionEnabled(false);
      return;
    }

    setPendingAction("api");
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
      setPendingAction(null);
    }
  }, [
    connectionEnabled,
    demoMode,
    exitDemoMode,
    isActive,
    isToggling,
    queryClient,
  ]);

  const toggle = useCallback(() => {
    if (isToggling) return;

    // Second click within the window → demo mode (or exit if already demo).
    if (singleClickTimerRef.current != null) {
      clearSingleClickTimer();
      if (demoMode) {
        exitDemoMode();
      } else {
        void enterDemoMode();
      }
      return;
    }

    singleClickTimerRef.current = window.setTimeout(() => {
      singleClickTimerRef.current = null;
      void runSingleToggle();
    }, DOUBLE_CLICK_MS);
  }, [
    clearSingleClickTimer,
    demoMode,
    enterDemoMode,
    exitDemoMode,
    isToggling,
    runSingleToggle,
  ]);

  return {
    connectionEnabled: connectionEnabled && !demoMode,
    isActive,
    isToggling,
    visualState,
    statusLabel,
    toggle,
    health,
    demoMode,
    demoClips,
    demoCategories,
    demoPeople,
    enterDemoMode,
    exitDemoMode,
    apiButtonLabel: demoMode ? "Demo" : undefined,
  };
}
