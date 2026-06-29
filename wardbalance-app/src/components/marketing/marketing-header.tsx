"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { trackEvent } from "@/lib/analytics/posthog";
import { isCategoryAllowed } from "@/lib/cookies/consent";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
];

export default function MarketingHeader() {
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
        const offset = height + 16; // height + 16px buffer
        document.documentElement.style.setProperty("--marketing-header-offset", `${offset}px`);
      }
    };

    updateHeaderOffset();
    window.addEventListener("resize", updateHeaderOffset);

    return () => {
      window.removeEventListener("resize", updateHeaderOffset);
    };
  }, [isScrolled]);

  useEffect(() => {
    const handleScroll = () => {
      const sectionIds = ["how-it-works", "features", "pricing", "faq"];
      let currentSection = "";
      
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          // Threshold of 180px matches scroll-mt header-offset + margin offsets
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
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setIsMobileMenuOpen(false);
    const isHomePage = window.location.pathname === "/";

    if (isHomePage && href.includes("#")) {
      e.preventDefault();
      const targetId = href.split("#")[1];
      const el = document.getElementById(targetId);
      if (el) {
        const offsetStr = getComputedStyle(document.documentElement).getPropertyValue("--marketing-header-offset").trim();
        const offset = offsetStr ? parseFloat(offsetStr) : 96;
        const top = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: "smooth" });
        window.history.pushState(null, "", `#${targetId}`);
      }
    } else if (href === "/") {
      if (isHomePage) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
        window.history.pushState(null, "", "/");
      }
    }
  };

  return (
    <>
      {/* Keyboard Skip-to-Content Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-[110] bg-primary text-white px-4 py-2.5 rounded-lg shadow-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        Skip to content
      </a>

      <header
        ref={headerRef}
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 bg-white/95 backdrop-blur-md ${
          isScrolled
            ? "py-3 shadow-md border-b border-neutral-200/50"
            : "py-4 border-b border-neutral-200/10"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group" aria-label="WardBalance home">
            <Image
              src="/logo-v5.png"
              alt="WardBalance logo"
              width={44}
              height={44}
              className="transition-transform duration-200 group-hover:scale-105"
            />
            <span
              className="text-title-large tracking-tight"
              style={{ color: "var(--color-primary-700)" }}
            >
              Ward
              <span style={{ color: "var(--color-primary-500)" }}>Balance</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
            {navLinks.map((link) => {
              const isHome = link.href === "/";
              const isActive = isHome
                ? activeSection === ""
                : activeSection === link.href.split("#")[1];

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="text-body-medium transition-colors duration-200 hover:opacity-80"
                  style={{
                    color: isActive
                      ? "var(--color-primary-500)"
                      : "var(--color-on-surface-variant)",
                    fontWeight: isActive ? "700" : "400",
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/login"
              className="text-body-medium font-bold transition-colors duration-200 hover:opacity-80"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              Sign In
            </Link>
            <Link
              href="/signup?plan=freemium&source=header"
              onClick={() => {
                if (isCategoryAllowed("analytics")) {
                  trackEvent({ event: "get_started_clicked", properties: { source: "header" } });
                }
              }}
              className="inline-flex items-center px-5 py-2.5 rounded-lg text-label-large font-bold transition-all duration-200 hover:shadow-lg hover:opacity-90 cursor-pointer"
              style={{
                background: "var(--color-primary)",
                color: "var(--color-on-primary)",
              }}
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav"
            style={{ color: "var(--color-on-surface)" }}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          id="mobile-nav"
          className={`md:hidden absolute top-full left-0 right-0 transition-all duration-300 overflow-hidden ${
            isMobileMenuOpen
              ? "max-h-96 opacity-100"
              : "max-h-0 opacity-0"
          }`}
          style={{
            background: "hsla(240,100%,99%,0.97)",
            backdropFilter: "blur(16px)",
            borderBottom: isMobileMenuOpen
              ? "1px solid var(--color-outline-variant)"
              : "none",
          }}
        >
          <nav className="px-4 py-4 flex flex-col gap-1" aria-label="Mobile navigation">
            {navLinks.map((link) => {
              const isHome = link.href === "/";
              const isActive = isHome
                ? activeSection === ""
                : activeSection === link.href.split("#")[1];

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="py-3 px-4 rounded-lg text-body-large text-left transition-colors hover:opacity-80"
                  style={{
                    color: isActive
                      ? "var(--color-primary-500)"
                      : "var(--color-on-surface)",
                    fontWeight: isActive ? "700" : "400",
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/signup?plan=freemium&source=header"
              onClick={() => {
                setIsMobileMenuOpen(false);
                if (isCategoryAllowed("analytics")) {
                  trackEvent({ event: "get_started_clicked", properties: { source: "header" } });
                }
              }}
              className="mt-4 flex items-center justify-center px-5 py-3 rounded-lg text-label-large font-bold transition-all"
              style={{
                background: "var(--color-primary)",
                color: "var(--color-on-primary)",
              }}
            >
              Get Started
            </Link>
            <Link
              href="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="mt-2 flex items-center justify-center px-5 py-3 rounded-lg text-label-large border transition-all"
              style={{
                borderColor: "var(--color-outline-variant)",
                color: "var(--color-on-surface)",
              }}
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}
