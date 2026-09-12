import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Toaster } from "sonner";

import { LazyMotionRoot } from "@/components/motion/LazyMotionRoot";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <LazyMotionRoot>
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          closeButton
          visibleToasts={4}
          gap={10}
          toastOptions={{ unstyled: true }}
        />
      </LazyMotionRoot>
    </QueryClientProvider>
  );
}
