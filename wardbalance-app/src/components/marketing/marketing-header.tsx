"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { trackEvent } from "@/lib/analytics/posthog";
import { isCategoryAllowed } from "@/lib/cookies/consent";

const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/faq" },
];

const HOME_SECTION_IDS = ["features", "how-it-works"];

export default function MarketingHeader() {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      setIsScrolled(scrollTop > 16);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const updateHeaderOffset = () => {
      if (headerRef.current) {
        const height = headerRef.current.getBoundingClientRect().height;
        document.documentElement.style.setProperty("--marketing-header-offset", `${height + 24}px`);
      }
    };
    updateHeaderOffset();
    window.addEventListener("resize", updateHeaderOffset);
    return () => window.removeEventListener("resize", updateHeaderOffset);
  }, [isScrolled]);

  useEffect(() => {
    if (!isHomePage) { setActiveSection(""); return; }

    const handleScroll = () => {
      let currentSection = "";
      for (const id of HOME_SECTION_IDS) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 180 && rect.bottom >= 180) {
            currentSection = id;
            break;
          }
        }
      }
      setActiveSection(currentSection);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHomePage]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setIsMobileMenuOpen(false);

    if (!href.includes("#")) return;

    const targetId = href.split("#")[1];
    if (!isHomePage) {
      return;
    }

    e.preventDefault();
    const el = document.getElementById(targetId);
    if (el) {
      const offsetStr = getComputedStyle(document.documentElement).getPropertyValue("--marketing-header-offset").trim();
      const offset = offsetStr ? parseFloat(offsetStr) : 80;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
      window.history.pushState(null, "", `#${targetId}`);
    }
  };

  const isNavActive = (href: string) => {
    if (href === "/") return false;
    if (href.startsWith("#")) return false;
    if (href.startsWith("/") && !href.includes("#")) {
      return pathname === href;
    }
    if (href.includes("#")) {
      return isHomePage && activeSection === href.split("#")[1];
    }
    return false;
  };

  return (
    <>
      <a href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-[110] bg-primary text-white px-4 py-2 rounded-lg shadow-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
        Skip to content
      </a>

      <header ref={headerRef}
        className={`fixed top-3 left-0 right-0 z-[100] px-4 sm:px-6 pointer-events-none transition-all duration-300 flex justify-center ${
          isScrolled ? "-translate-y-0.5" : "translate-y-0"
        }`}>
        
        {/* Single unified pill — compact like Onbeex */}
        <div className="w-full max-w-4xl bg-white/95 backdrop-blur-md rounded-full border border-neutral-200/50 shadow-[0_1px_8px_rgba(0,0,0,0.04)] pl-4 pr-1.5 py-1.5 flex items-center justify-between pointer-events-auto transition-shadow hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          
          {/* Left: Logo — compact */}
          <Link href="/" className="flex items-center gap-2 group shrink-0" aria-label="WardBalance home">
            <Image src="/logo-v5.png" alt="WardBalance logo" width={28} height={28}
              className="transition-transform duration-200 group-hover:scale-105" />
            <span className="text-body-large font-bold tracking-tight" style={{ color: "var(--color-primary-700)" }}>
              Ward<span style={{ color: "var(--color-primary-500)" }}>Balance</span>
            </span>
          </Link>

          {/* Center: Navigation Links in a subtle gray pill */}
          <nav className="hidden md:flex items-center gap-0.5 bg-neutral-100/70 rounded-full px-1 py-1 mx-4" aria-label="Main navigation">
            {navLinks.map((link) => {
              const active = isNavActive(link.href);
              return (
                <Link key={link.href} href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className={`px-4 py-1.5 rounded-full text-body-small transition-colors duration-200 whitespace-nowrap ${
                    active ? "bg-white shadow-sm" : "hover:bg-white/60"
                  }`}
                  style={{
                    color: active ? "var(--color-primary-700)" : "var(--color-on-surface-variant)",
                    fontWeight: active ? "700" : "500",
                  }}>
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Actions — compact */}
          <div className="hidden md:flex items-center gap-1 shrink-0">
            <Link href="/login"
              className="text-body-small font-bold transition-colors duration-200 hover:opacity-70 px-3 py-1.5 whitespace-nowrap"
              style={{ color: "var(--color-on-surface)" }}>
              Sign in
            </Link>
            <Link href="/signup?plan=freemium&source=header"
              onClick={() => {
                if (isCategoryAllowed("analytics")) {
                  trackEvent({ event: "get_started_clicked", properties: { source: "header" } });
                }
              }}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-body-small font-bold transition-all duration-200 hover:shadow-md cursor-pointer whitespace-nowrap"
              style={{ background: "var(--color-primary-800)", color: "var(--color-primary-50)" }}>
              Start free <ArrowUpRight size={14} strokeWidth={2.5} />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button className="p-2 rounded-full transition-colors hover:bg-neutral-100"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen} aria-controls="mobile-nav"
              style={{ color: "var(--color-on-surface)" }}>
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <div id="mobile-nav"
          className={`md:hidden absolute top-full mt-3 left-4 right-4 rounded-2xl overflow-hidden transition-all duration-300 transform origin-top pointer-events-auto border shadow-xl ${
            isMobileMenuOpen 
              ? "scale-y-100 opacity-100" 
              : "scale-y-95 opacity-0 pointer-events-none"
          }`}
          style={{
            background: "hsla(0,0%,100%,0.98)",
            backdropFilter: "blur(16px)",
            borderColor: "var(--color-outline-variant)",
          }}>
          <nav className="px-4 py-5 flex flex-col gap-1" aria-label="Mobile navigation">
            {navLinks.map((link) => {
              const active = isNavActive(link.href);
              return (
                <Link key={link.href} href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className={`py-3 px-4 rounded-xl text-body-large transition-colors ${
                    active ? "bg-neutral-100 font-bold" : "hover:bg-neutral-50"
                  }`}
                  style={{
                    color: active ? "var(--color-primary-700)" : "var(--color-on-surface)",
                  }}>
                  {link.label}
                </Link>
              );
            })}
            <div className="h-px w-full bg-neutral-200/60 my-2" />
            <Link href="/signup?plan=freemium&source=header"
              onClick={() => {
                setIsMobileMenuOpen(false);
                if (isCategoryAllowed("analytics")) {
                  trackEvent({ event: "get_started_clicked", properties: { source: "header" } });
                }
              }}
              className="mt-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-full text-body-large font-bold transition-all"
              style={{ background: "var(--color-primary-800)", color: "var(--color-primary-50)" }}>
              Start free <ArrowUpRight size={16} strokeWidth={2.5} />
            </Link>
            <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}
              className="mt-2 flex items-center justify-center px-5 py-3.5 rounded-full text-body-large font-bold transition-all bg-neutral-100"
              style={{ color: "var(--color-on-surface)" }}>
              Sign In
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}


