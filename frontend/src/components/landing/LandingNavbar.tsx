import { AnimatePresence, m } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { tweenFast } from "@/lib/motion";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Product", href: "#product" },
  { label: "Privacy", href: "#privacy" },
  { label: "Storage", href: "#storage" },
] as const;

export function LandingNavbar() {
  const reduced = useReducedMotion();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastScrollY = useRef(0);

  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    }
    setMenuOpen(false);
  };

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 16);

      if (menuOpen) {
        setCollapsed(false);
        lastScrollY.current = y;
        return;
      }

      if (y < 56) {
        setCollapsed(false);
      } else if (y > lastScrollY.current + 6) {
        setCollapsed(true);
      } else if (y < lastScrollY.current - 6) {
        setCollapsed(false);
      }

      lastScrollY.current = y;
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const showBar = !collapsed || menuOpen;

  return (
    <m.header
      initial={false}
      animate={{ y: reduced || showBar ? 0 : "-100%" }}
      transition={reduced ? { duration: 0 } : { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 will-change-transform",
        !showBar && "pointer-events-none",
        scrolled || menuOpen
          ? "border-b border-[var(--clip-border)] bg-[var(--clip-bg)]/95"
          : "border-b border-transparent bg-[var(--clip-bg)]/60",
      )}
    >
      <div className="mx-auto grid h-12 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 md:h-14 md:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md md:hidden hover:bg-[var(--clip-surface)]"
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link
            to="/"
            onClick={handleHomeClick}
            aria-label="Slyvr home"
            aria-current={pathname === "/" ? "page" : undefined}
            className="text-[15px] font-medium tracking-[-0.02em] text-[var(--clip-fg)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)]"
          >
            Slyvr
          </Link>
        </div>

        <nav className="hidden items-center justify-center gap-8 md:flex" aria-label="Primary">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-[13px] text-[var(--clip-muted)] transition-colors hover:text-[var(--clip-fg)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center justify-end gap-4 sm:gap-5">
          <Link
            to="/app"
            className="hidden text-[13px] text-[var(--clip-muted)] hover:text-[var(--clip-fg)] sm:inline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)]"
          >
            Sign in
          </Link>
          <Link
            to="/app"
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--clip-accent)] px-3.5 py-1.5 text-[12px] font-medium text-[var(--clip-accent-fg)] sm:px-4 sm:py-2 sm:text-[13px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--clip-focus)]"
          >
            Open library
            <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <m.nav
            id="landing-mobile-nav"
            initial={reduced ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduced ? undefined : { opacity: 0, height: 0 }}
            transition={tweenFast}
            className="overflow-hidden border-t border-[var(--clip-border)] bg-[var(--clip-bg)] md:hidden"
            aria-label="Primary mobile"
          >
            <ul className="flex flex-col px-4 py-3">
              {NAV.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={closeMenu}
                    className="flex min-h-11 items-center text-sm text-[var(--clip-fg)]"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
              <li className="mt-1 border-t border-[var(--clip-border)] pt-2">
                <Link
                  to="/app"
                  onClick={closeMenu}
                  className="flex min-h-11 items-center text-sm text-[var(--clip-muted)]"
                >
                  Sign in
                </Link>
              </li>
            </ul>
          </m.nav>
        )}
      </AnimatePresence>
    </m.header>
  );
}
