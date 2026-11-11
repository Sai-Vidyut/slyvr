import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import { AppEntry } from "./pages/AppEntry";

const Dashboard = lazy(() => import("./pages/Dashboard"));

/** Vite BASE_URL includes a trailing slash; React Router basename must not. */
const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, "") || undefined;

function App() {
  return (
    <BrowserRouter basename={routerBasename}>
      <Suspense
        fallback={
          <div className="flex min-h-[100dvh] w-full items-center justify-center bg-[var(--clip-bg)] text-sm text-[var(--clip-muted)]">
            Loading library…
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          <Route
            path="/app"
            element={
              <AppEntry>
                <Dashboard />
              </AppEntry>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
