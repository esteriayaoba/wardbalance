"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
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
        document.documentElement.style.setProperty("--marketing-header-offset", `${height + 16}px`);
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
      const offset = offsetStr ? parseFloat(offsetStr) : 96;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
      window.history.pushState(null, "", `#${targetId}`);
    }
  };

  const isNavActive = (href: string) => {
    if (href === "/") return false;
    if (href.startsWith("#")) return false;
    // For /pricing and /faq, check pathname match
    if (href.startsWith("/") && !href.includes("#")) {
      return pathname === href;
    }
    // For anchor links on homepage
    if (href.includes("#")) {
      return isHomePage && activeSection === href.split("#")[1];
    }
    return false;
  };

  return (
    <>
      <a href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-[110] bg-primary text-white px-4 py-2.5 rounded-lg shadow-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
        Skip to content
      </a>

      <header ref={headerRef}
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 bg-white/95 backdrop-blur-md ${
          isScrolled ? "py-3 shadow-md border-b border-neutral-200/50" : "py-4 border-b border-neutral-200/10"
        }`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group" aria-label="WardBalance home">
            <Image src="/logo-v5.png" alt="WardBalance logo" width={44} height={44}
              className="transition-transform duration-200 group-hover:scale-105" />
            <span className="text-title-large tracking-tight" style={{ color: "var(--color-primary-700)" }}>
              Ward<span style={{ color: "var(--color-primary-500)" }}>Balance</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
            {navLinks.map((link) => {
              const active = isNavActive(link.href);
              return (
                <Link key={link.href} href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="text-body-medium transition-colors duration-200 hover:opacity-80"
                  style={{
                    color: active ? "var(--color-primary-500)" : "var(--color-on-surface-variant)",
                    fontWeight: active ? "700" : "400",
                  }}>
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/login"
              className="text-body-medium font-bold transition-colors duration-200 hover:opacity-80"
              style={{ color: "var(--color-on-surface-variant)" }}>
              Sign In
            </Link>
            <Link href="/signup?plan=freemium&source=header"
              onClick={() => {
                if (isCategoryAllowed("analytics")) {
                  trackEvent({ event: "get_started_clicked", properties: { source: "header" } });
                }
              }}
              className="inline-flex items-center px-5 py-2.5 rounded-lg text-label-large font-bold transition-all duration-200 hover:shadow-lg hover:opacity-90 cursor-pointer"
              style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}>
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2 rounded-lg transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen} aria-controls="mobile-nav"
            style={{ color: "var(--color-on-surface)" }}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <div id="mobile-nav"
          className={`md:hidden absolute top-full left-0 right-0 transition-all duration-300 transform origin-top ${
            isMobileMenuOpen 
              ? "translate-y-0 opacity-100 pointer-events-auto" 
              : "-translate-y-4 opacity-0 pointer-events-none"
          }`}
          style={{
            background: "hsla(240,100%,99%,0.97)",
            backdropFilter: "blur(16px)",
            borderBottom: isMobileMenuOpen ? "1px solid var(--color-outline-variant)" : "none",
          }}>
          <nav className="px-4 py-4 flex flex-col gap-1" aria-label="Mobile navigation">
            {navLinks.map((link) => {
              const active = isNavActive(link.href);
              return (
                <Link key={link.href} href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="py-3 px-4 rounded-lg text-body-large text-left transition-colors hover:opacity-80"
                  style={{
                    color: active ? "var(--color-primary-500)" : "var(--color-on-surface)",
                    fontWeight: active ? "700" : "400",
                  }}>
                  {link.label}
                </Link>
              );
            })}
            <Link href="/signup?plan=freemium&source=header"
              onClick={() => {
                setIsMobileMenuOpen(false);
                if (isCategoryAllowed("analytics")) {
                  trackEvent({ event: "get_started_clicked", properties: { source: "header" } });
                }
              }}
              className="mt-4 flex items-center justify-center px-5 py-3 rounded-lg text-label-large font-bold transition-all"
              style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}>
              Get Started
            </Link>
            <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}
              className="mt-2 flex items-center justify-center px-5 py-3 rounded-lg text-label-large border transition-all"
              style={{ borderColor: "var(--color-outline-variant)", color: "var(--color-on-surface)" }}>
              Sign In
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}
