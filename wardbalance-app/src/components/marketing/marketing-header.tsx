"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { trackEvent } from "@/lib/analytics/posthog";
import { isCategoryAllowed } from "@/lib/cookies/consent";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export default function MarketingHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 16);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const sectionIds = navLinks
      .filter((l) => l.href.startsWith("#"))
      .map((l) => l.href.slice(1));

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-100px 0px -60% 0px" }
    );

    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  const handleNavClick = (href: string) => {
    setIsMobileMenuOpen(false);
    const isHomePage = window.location.pathname === "/";
    if (isHomePage) {
      const el = document.querySelector(href);
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 84;
        window.scrollTo({ top, behavior: "smooth" });
      }
    } else {
      window.location.assign(`/${href}`);
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "py-3 shadow-md border-b border-neutral-200/50"
          : "py-4 border-b border-transparent"
      }`}
      style={{
        background: isScrolled
          ? "hsla(240,100%,99%,0.92)"
          : "transparent",
        backdropFilter: isScrolled ? "blur(12px)" : "none",
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="WardBalance home">
          <Image
            src="/logo.png"
            alt="WardBalance logo"
            width={36}
            height={36}
            className="rounded-lg transition-transform duration-200 group-hover:scale-105"
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
          {navLinks.map((link) =>
            link.href.startsWith("#") ? (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className="text-body-medium transition-colors duration-200 cursor-pointer hover:opacity-80"
                style={{
                  color:
                    activeSection === link.href.slice(1)
                      ? "var(--color-primary-500)"
                      : "var(--color-on-surface-variant)",
                }}
              >
                {link.label}
              </button>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="text-body-medium transition-colors duration-200 hover:opacity-80"
                style={{ color: "var(--color-on-surface-variant)" }}
              >
                {link.label}
              </Link>
            )
          )}
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
          style={{ color: "var(--color-on-surface)" }}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <div
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
          {navLinks.map((link) =>
            link.href.startsWith("#") ? (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className="py-3 px-4 rounded-lg text-body-large text-left transition-colors hover:opacity-80 cursor-pointer"
                style={{
                  color: "var(--color-on-surface)",
                }}
              >
                {link.label}
              </button>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-3 px-4 rounded-lg text-body-large text-left transition-colors hover:opacity-80"
                style={{
                  color: "var(--color-on-surface)",
                }}
              >
                {link.label}
              </Link>
            )
          )}
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
  );
}
