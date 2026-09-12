import { useCallback, useState } from "react";

/** Local asset — see `public/landing/README.md` */
export const HERO_WORKSPACE_PHOTO = "/landing/hero-workspace.jpg";

export function HeroAtmosphere() {
  const [failed, setFailed] = useState(false);
  const onError = useCallback(() => setFailed(true), []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {failed ? (
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(125deg, #141210 0%, #0a0a0c 55%, #121018 100%)",
          }}
        />
      ) : (
        <img
          src={HERO_WORKSPACE_PHOTO}
          alt=""
          decoding="async"
          loading="eager"
          fetchPriority="high"
          onError={onError}
          className="absolute inset-0 h-full w-full scale-x-[-1] object-cover object-[52%_45%]"
        />
      )}

      {/* Overall charcoal unify — photograph remains visible */}
      <div className="absolute inset-0 bg-[#0c0c0e]/28" />

      {/* Left read zone: strong darkening for headline, opens toward the right */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, rgba(8,8,10,0.92) 0%, rgba(8,8,10,0.82) 32%, rgba(8,8,10,0.45) 52%, rgba(8,8,10,0.08) 78%, transparent 100%)",
        }}
      />

      {/* Warm lift on the right (beam / equipment) without neon */}
      <div
        className="absolute inset-0 opacity-60 mix-blend-soft-light"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 78% 42%, rgba(180,160,130,0.12), transparent 65%)",
        }}
      />

      {/* Top: navbar legibility */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#0a0a0c]/85 to-transparent" />

      {/* Bottom: hand off to filmstrip / page bg */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--clip-bg)] via-[var(--clip-bg)]/85 to-transparent" />
    </div>
  );
}
