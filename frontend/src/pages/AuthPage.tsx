import { type FormEvent, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { m } from "framer-motion";

import { SlyvrBrandLink } from "@/components/layout/SlyvrBrandLink";
import { getApiErrorMessage } from "@/lib/api-client";
import { pageEnter } from "@/lib/motion";
import { useAuth } from "@/providers/auth-provider";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

type Mode = "login" | "signup";

export default function AuthPage({ mode }: { mode: Mode }) {
  const { signIn, signUp, session, configured, loading } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const nextPath = useMemo(() => {
    const raw = params.get("next");
    if (raw && raw.startsWith("/")) return raw;
    return "/app";
  }, [params]);

  if (!loading && session) {
    return <Navigate to={nextPath} replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    if (!configured) {
      setError("Supabase auth is not configured for this build.");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "login") {
        await signIn(email.trim(), password);
        navigate(nextPath, { replace: true });
      } else {
        await signUp(email.trim(), password, displayName.trim() || undefined);
        setInfo(
          "Account created. If email confirmation is enabled, check your inbox—then sign in.",
        );
        // If session is returned immediately (confirmations off), go to app
        navigate(nextPath, { replace: true });
      }
    } catch (err) {
      setError(getApiErrorMessage(err) || (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const title = mode === "login" ? "Sign in" : "Create account";
  const subtitle =
    mode === "login"
      ? "Enter your private library or shared workspaces."
      : "Your personal library is created on first sign-in.";

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[var(--clip-bg)] text-[var(--clip-fg)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, oklch(0.28 0.02 85 / 0.35), transparent 55%), radial-gradient(ellipse 60% 40% at 80% 100%, oklch(0.22 0.015 250 / 0.4), transparent 50%)",
        }}
      />
      <m.div
        className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-6 py-16"
        {...(reduced ? {} : pageEnter)}
      >
        <div className="mb-10">
          <SlyvrBrandLink className="text-2xl tracking-tight" />
          <h1 className="mt-8 text-title text-[var(--clip-fg)]">{title}</h1>
          <p className="mt-2 text-sm text-[var(--clip-muted)]">{subtitle}</p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {mode === "signup" ? (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-label text-[var(--clip-muted)]">Display name</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                className="min-h-11 rounded-md border border-[var(--clip-border)] bg-[var(--clip-elevated)] px-3 text-[var(--clip-fg)] outline-none focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)]"
              />
            </label>
          ) : null}

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-label text-[var(--clip-muted)]">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="min-h-11 rounded-md border border-[var(--clip-border)] bg-[var(--clip-elevated)] px-3 text-[var(--clip-fg)] outline-none focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)]"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-label text-[var(--clip-muted)]">Password</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="min-h-11 rounded-md border border-[var(--clip-border)] bg-[var(--clip-elevated)] px-3 text-[var(--clip-fg)] outline-none focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)]"
            />
          </label>

          {error ? (
            <p className="text-sm text-red-400/90" role="alert">
              {error}
            </p>
          ) : null}
          {info ? (
            <p className="text-sm text-[var(--clip-muted)]" role="status">
              {info}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 min-h-11 rounded-md bg-[var(--clip-accent)] px-4 text-sm font-medium text-[var(--clip-bg)] transition-opacity disabled:opacity-60"
          >
            {submitting ? "Please wait…" : title}
          </button>
        </form>

        <p className="mt-8 text-sm text-[var(--clip-muted)]">
          {mode === "login" ? (
            <>
              New to Slyvr?{" "}
              <Link className="text-[var(--clip-fg)] underline-offset-4 hover:underline" to="/signup">
                Create an account
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link className="text-[var(--clip-fg)] underline-offset-4 hover:underline" to="/login">
                Sign in
              </Link>
            </>
          )}
        </p>

        <p className="mt-4 text-sm text-[var(--clip-muted)]">
          Prefer a sample library?{" "}
          <Link className="text-[var(--clip-fg)] underline-offset-4 hover:underline" to="/app?demo=1">
            Enter demo
          </Link>
        </p>
      </m.div>
    </div>
  );
}
