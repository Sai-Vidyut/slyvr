import { type FormEvent, useId, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, m } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

import { MotionButton } from "@/components/ui/motion-button";
import { getApiErrorMessage } from "@/lib/api-client";
import { pageEnter, tweenFast, tweenMicro } from "@/lib/motion";
import { useAuth } from "@/providers/auth-provider";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup";
type AuthIssueKind =
  | "unconfirmed"
  | "credentials"
  | "email_rate_limit"
  | "rate_limit"
  | "generic"
  | null;

const HERO_SRC = `${import.meta.env.BASE_URL}landing/hero-workspace.jpg`;

function authErrorCode(err: unknown): string {
  if (!err || typeof err !== "object") return "";
  const record = err as Record<string, unknown>;
  for (const key of ["code", "error_code", "errorCode"] as const) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function classifyAuthError(err: unknown): { message: string; kind: AuthIssueKind } {
  const raw = getApiErrorMessage(err) || (err as Error)?.message || "Something went wrong.";
  const code = authErrorCode(err).toLowerCase();
  const lower = `${code} ${raw}`.toLowerCase();

  if (lower.includes("email_not_confirmed") || lower.includes("email not confirmed")) {
    return {
      kind: "unconfirmed",
      message:
        "Confirm your email before signing in. Check your inbox for a confirmation link from Slyvr.",
    };
  }
  if (
    lower.includes("invalid_credentials") ||
    lower.includes("invalid login") ||
    lower.includes("invalid email or password")
  ) {
    return {
      kind: "credentials",
      message: "That email or password doesn’t match. Check both and try again.",
    };
  }
  const isEmailSendRateLimit =
    code === "over_email_send_rate_limit" ||
    lower.includes("over_email_send_rate_limit") ||
    lower.includes("email rate limit") ||
    (lower.includes("rate limit") && lower.includes("email"));
  if (isEmailSendRateLimit) {
    return {
      kind: "email_rate_limit",
      message:
        "Confirmation email sending is temporarily rate-limited. Please try again later — you still need to confirm your email before signing in.",
    };
  }
  if (code.includes("rate_limit") || lower.includes("rate limit") || lower.includes("too many requests")) {
    return {
      kind: "rate_limit",
      message: "Too many attempts right now. Please wait a moment, then try again.",
    };
  }
  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return {
      kind: "generic",
      message: "Couldn’t reach authentication right now. Check your connection and try again.",
    };
  }
  return { kind: "generic", message: raw };
}

/**
 * Simple authentication entrance:
 * one photograph + one auth surface. No gallery, no decorative metadata.
 */
export default function AuthPage({ mode }: { mode: Mode }) {
  const {
    signIn,
    signUp,
    requestPasswordReset,
    resendSignupConfirmation,
    session,
    configured,
    loading,
  } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const isCompact = useMediaQuery("(max-width: 1023px)");
  const formId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<AuthIssueKind>(null);
  const [info, setInfo] = useState<string | null>(null);

  const nextPath = useMemo(() => {
    const raw = params.get("next");
    if (raw && raw.startsWith("/")) return raw;
    return "/app";
  }, [params]);

  const emailId = `${formId}-email`;
  const passwordId = `${formId}-password`;
  const nameId = `${formId}-name`;
  const errorId = `${formId}-error`;
  const infoId = `${formId}-info`;

  const isLogin = mode === "login";
  const title = isLogin ? "Welcome back." : "Create your library.";
  const support = isLogin
    ? "Sign in to your private archive and shared workspaces."
    : "Your personal library is created automatically.";
  const submitLabel = isLogin ? "Sign in" : "Create account";
  const busy = submitting || resetting || resending;
  const fieldInvalid =
    errorKind === "credentials" ||
    errorKind === "unconfirmed" ||
    errorKind === "email_rate_limit" ||
    errorKind === "rate_limit";

  if (!loading && session) {
    return <Navigate to={nextPath} replace />;
  }

  function clearMessages() {
    setError(null);
    setErrorKind(null);
    setInfo(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    clearMessages();
    if (!configured) {
      setError("Supabase auth is not configured for this build.");
      setErrorKind("generic");
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
        navigate(nextPath, { replace: true });
      }
    } catch (err) {
      const classified = classifyAuthError(err);
      setError(classified.message);
      setErrorKind(classified.kind);
    } finally {
      setSubmitting(false);
    }
  }

  async function onForgotPassword() {
    clearMessages();
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email above, then request a reset link.");
      setErrorKind("generic");
      return;
    }
    if (!configured) {
      setError("Supabase auth is not configured for this build.");
      setErrorKind("generic");
      return;
    }
    setResetting(true);
    try {
      await requestPasswordReset(trimmed);
      setInfo("If an account exists for that email, a reset link is on its way.");
    } catch (err) {
      const classified = classifyAuthError(err);
      setError(classified.message);
      setErrorKind(classified.kind);
    } finally {
      setResetting(false);
    }
  }

  async function onResendConfirmation() {
    const trimmed = email.trim();
    if (!trimmed || !configured) return;
    setResending(true);
    setInfo(null);
    try {
      await resendSignupConfirmation(trimmed);
      setInfo("Confirmation email resent. Check your inbox, then sign in.");
      setError(null);
      setErrorKind(null);
    } catch (err) {
      const classified = classifyAuthError(err);
      setError(classified.message);
      setErrorKind(classified.kind);
    } finally {
      setResending(false);
    }
  }

  const inputClass = cn(
    "w-full h-12 rounded-[3px] border bg-[var(--clip-bg-elevated)] px-3.5 text-[15px] text-[var(--clip-fg)]",
    "outline-none transition-[border-color] duration-150",
    "focus-visible:border-[var(--clip-border-strong)] focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)]",
    "disabled:cursor-not-allowed disabled:opacity-60",
  );

  const form = (
    <form
      onSubmit={onSubmit}
      className="flex w-full flex-col gap-3.5"
      aria-describedby={
        [error ? errorId : null, info ? infoId : null].filter(Boolean).join(" ") || undefined
      }
    >
      {mode === "signup" ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={nameId} className="text-[13px] text-[var(--clip-fg)]">
            Display name
          </label>
          <input
            id={nameId}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
            disabled={busy}
            className={cn(inputClass, "border-[var(--clip-border)]")}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={emailId} className="text-[13px] text-[var(--clip-fg)]">
          Email
        </label>
        <input
          id={emailId}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
          disabled={busy}
          aria-invalid={fieldInvalid}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            inputClass,
            fieldInvalid ? "border-[oklch(0.7_0.06_25_/_0.5)]" : "border-[var(--clip-border)]",
          )}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={passwordId} className="text-[13px] text-[var(--clip-fg)]">
            Password
          </label>
          {isLogin ? (
            <button
              type="button"
              onClick={() => void onForgotPassword()}
              disabled={busy}
              className="text-[12px] text-[var(--clip-muted)] underline-offset-4 hover:text-[var(--clip-fg)] hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)] disabled:opacity-50"
            >
              {resetting ? "Sending…" : "Forgot password?"}
            </button>
          ) : null}
        </div>
        <div className="relative">
          <input
            id={passwordId}
            type={showPassword ? "text" : "password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isLogin ? "current-password" : "new-password"}
            disabled={busy}
            aria-invalid={errorKind === "credentials"}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              inputClass,
              "pr-11",
              errorKind === "credentials"
                ? "border-[oklch(0.7_0.06_25_/_0.5)]"
                : "border-[var(--clip-border)]",
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            disabled={busy}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute right-0.5 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center text-[var(--clip-muted)] hover:text-[var(--clip-fg)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)] disabled:opacity-50"
          >
            {showPassword ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {error ? (
          <m.div
            key="auth-error"
            id={errorId}
            role="alert"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={reduced ? { duration: 0 } : tweenMicro}
          >
            <p className="text-[13px] leading-snug text-[oklch(0.78_0.06_25)]">{error}</p>
            {errorKind === "unconfirmed" ? (
              <button
                type="button"
                onClick={() => void onResendConfirmation()}
                disabled={busy || !email.trim()}
                className="mt-2 text-[12px] font-medium text-[var(--clip-fg)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)] disabled:opacity-50"
              >
                {resending ? "Resending…" : "Resend confirmation email"}
              </button>
            ) : null}
          </m.div>
        ) : null}
        {info ? (
          <m.p
            key="auth-info"
            id={infoId}
            role="status"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={reduced ? { duration: 0 } : tweenFast}
            className="text-[13px] leading-snug text-[var(--clip-muted)]"
          >
            {info}
          </m.p>
        ) : null}
      </AnimatePresence>

      <MotionButton
        type="submit"
        variant="primary"
        disabled={busy}
        className="mt-1.5 h-12 w-full rounded-[3px] text-[14px] font-medium"
      >
        {submitting ? "Please wait…" : submitLabel}
      </MotionButton>
    </form>
  );

  const altLinks = (
    <div className="mt-6 space-y-2 text-[13px] leading-snug text-[var(--clip-muted)]">
      <p>
        {isLogin ? "New to Slyvr? " : "Already have an account? "}
        <Link
          to={isLogin ? "/signup" : "/login"}
          className="font-medium text-[var(--clip-fg)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)]"
        >
          {isLogin ? "Create an account" : "Sign in"}
        </Link>
      </p>
      <p>
        Prefer to explore first?{" "}
        <Link
          to="/app?demo=1"
          className="font-medium text-[var(--clip-fg)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)]"
        >
          Enter demo
        </Link>
      </p>
    </div>
  );

  /* Mobile — compact cinematic cue, form first */
  if (isCompact) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-[var(--clip-bg)] text-[var(--clip-fg)]">
        <header className="pt-safe relative shrink-0">
          <div className="relative h-28 overflow-hidden sm:h-32">
            <img
              src={HERO_SRC}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-[center_40%]"
              decoding="async"
            />
            <div aria-hidden className="absolute inset-0 bg-[oklch(0.11_0.006_265_/_0.55)]" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between px-5 pb-3">
              <Link
                to="/"
                className="text-[15px] font-medium tracking-[-0.02em] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)]"
              >
                Slyvr
              </Link>
            </div>
          </div>
        </header>

        <m.main
          className="mx-auto flex w-full max-w-[24rem] flex-1 flex-col justify-center px-5 py-8 pb-safe"
          variants={pageEnter}
          initial={reduced ? false : "hidden"}
          animate="visible"
        >
          <h1 className="text-[1.75rem] font-medium tracking-tight">{title}</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--clip-muted)]">{support}</p>
          <div className="mt-7">
            {form}
            {altLinks}
          </div>
        </m.main>
      </div>
    );
  }

  /* Desktop — one photo, one auth surface (~58/42) */
  return (
    <div className="grid h-[100dvh] grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.95fr)] overflow-hidden bg-[var(--clip-bg)] text-[var(--clip-fg)]">
      <aside className="relative h-full overflow-hidden">
        <img
          src={HERO_SRC}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          decoding="async"
        />
        <div aria-hidden className="absolute inset-0 bg-[oklch(0.08_0.005_265_/_0.4)]" />

        <div className="relative z-10 flex h-full flex-col justify-between p-9 xl:p-11">
          <Link
            to="/"
            className="w-fit text-[15px] font-medium tracking-[-0.02em] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)]"
          >
            Slyvr
          </Link>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--clip-fg)]/70">
              Private video library
            </p>
            <p className="mt-3 text-[2.25rem] font-medium leading-[1.08] tracking-tight xl:text-[2.5rem]">
              Your footage.
              <br />
              One archive.
            </p>
          </div>
        </div>
      </aside>

      <section className="flex h-full flex-col justify-center border-l border-[var(--clip-border)] bg-[var(--clip-bg)] px-10 xl:px-14">
        <m.div
          className="w-full max-w-[22.5rem]"
          variants={pageEnter}
          initial={reduced ? false : "hidden"}
          animate="visible"
        >
          <h1 className="text-[1.85rem] font-medium tracking-tight xl:text-[2rem]">{title}</h1>
          <p className="mt-2.5 text-[14px] leading-relaxed text-[var(--clip-muted)]">{support}</p>
          <div className="mt-8">
            {form}
            {altLinks}
          </div>
        </m.div>
      </section>
    </div>
  );
}
