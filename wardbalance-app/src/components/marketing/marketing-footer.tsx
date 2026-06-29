"use client";

import Image from "next/image";
import Link from "next/link";
import CookieSettingsLink from "@/components/cookie-consent/CookieSettingsLink";

export default function MarketingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-12 md:py-16 bg-surface border-t border-outline-variant">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 md:gap-12 mb-12">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5 inline-block">
              <Image src="/logo-v5.png" alt="WardBalance logo" width={40} height={40} />
              <span className="text-title-medium tracking-tight text-primary-dark">
                Ward<span className="text-primary">Balance</span>
              </span>
            </Link>
            <p className="text-body-medium max-w-xs text-on-surface-variant leading-relaxed">
              WardBalance is a school fee management app that helps private schools organize billing, parent balances, payments, receipts, and reports from one workspace.
            </p>
            <p className="text-body-small text-on-surface-variant">
              Questions?{" "}
              <a href="mailto:hello@wardbalance.com.ng" className="text-primary font-medium hover:underline">
                hello@wardbalance.com.ng
              </a>
            </p>
            <div className="flex items-center gap-4 pt-1">
              <a href="https://twitter.com/wardbalance" target="_blank" rel="noopener noreferrer"
                aria-label="WardBalance on X (Twitter)"
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary-200 transition-colors duration-200">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.733-8.835L2.059 2.25h6.3l4.258 5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117Z" />
                </svg>
              </a>
              <a href="https://linkedin.com/company/wardbalance" target="_blank" rel="noopener noreferrer"
                aria-label="WardBalance on LinkedIn"
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary-200 transition-colors duration-200">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Links Col 1 */}
          <div className="space-y-4">
            <h3 className="text-label-large text-on-surface">Explore</h3>
            <ul className="space-y-3">
              <li><Link href="/#features" className="text-body-medium hover:underline text-on-surface-variant">Features</Link></li>
              <li><Link href="/#how-it-works" className="text-body-medium hover:underline text-on-surface-variant">How It Works</Link></li>
              <li><Link href="/pricing" className="text-body-medium hover:underline text-on-surface-variant">Pricing</Link></li>
              <li><Link href="/faq" className="text-body-medium hover:underline text-on-surface-variant">FAQ</Link></li>
              <li><Link href="/#demo" className="text-body-medium hover:underline text-on-surface-variant">Book a Demo</Link></li>
            </ul>
          </div>

          {/* Links Col 2 */}
          <div className="space-y-4">
            <h3 className="text-label-large text-on-surface">Portal &amp; Legal</h3>
            <ul className="space-y-3">
              <li><Link href="/login" className="text-body-medium hover:underline text-on-surface-variant">Sign In</Link></li>
              <li><Link href="/signup?plan=freemium&source=footer" className="text-body-medium hover:underline text-on-surface-variant">Get Started Free</Link></li>
              <li><Link href="/privacy" className="text-body-medium hover:underline text-on-surface-variant">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-body-medium hover:underline text-on-surface-variant">Terms of Use</Link></li>
              <li><CookieSettingsLink /></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-outline-variant">
          <p className="text-body-small text-on-surface-variant">&copy; {currentYear} WardBalance. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="text-body-small text-on-surface-variant">Made for Nigerian Schools 🇳🇬</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
