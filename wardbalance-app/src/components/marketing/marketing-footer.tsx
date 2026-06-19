import Image from "next/image";
import Link from "next/link";
import CookieSettingsLink from "@/components/cookie-consent/CookieSettingsLink";

export default function MarketingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="py-12 md:py-16 bg-surface border-t border-outline-variant"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 md:gap-12 mb-12">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <a href="/" className="flex items-center gap-2.5 inline-block">
              <Image
                src="/logo.png"
                alt="WardBalance logo"
                width={32}
                height={32}
                className="rounded-md"
              />
              <span className="text-title-medium tracking-tight text-primary-dark">
                Ward
                <span className="text-primary">Balance</span>
              </span>
            </a>
            <p className="text-body-medium max-w-xs text-on-surface-variant">
              The financial operating system built for Nigerian private schools.
              Replacing WhatsApp receipts and Excel with structured clarity.
            </p>
          </div>

          {/* Links Col 1 */}
          <div className="space-y-4">
            <h3 className="text-label-large text-on-surface">
              Product
            </h3>
            <ul className="space-y-3">
              <li><Link href="/#problem" className="text-body-medium hover:underline text-on-surface-variant">The Problem</Link></li>
              <li><Link href="/#how-it-works" className="text-body-medium hover:underline text-on-surface-variant">How it works</Link></li>
              <li><Link href="/#features" className="text-body-medium hover:underline text-on-surface-variant">Features</Link></li>
              <li><Link href="/#pricing" className="text-body-medium hover:underline text-on-surface-variant">Pricing</Link></li>
            </ul>
          </div>

          {/* Links Col 2 */}
          <div className="space-y-4">
            <h3 className="text-label-large text-on-surface">
              Company
            </h3>
            <ul className="space-y-3">
              <li><a href="mailto:hello@wardbalance.com.ng" className="text-body-medium hover:underline text-on-surface-variant">Contact</a></li>
              <li><a href="https://x.com/wardbalance" target="_blank" rel="noopener noreferrer" className="text-body-medium hover:underline text-on-surface-variant">X (Twitter)</a></li>
              <li><a href="https://linkedin.com/company/wardbalance" target="_blank" rel="noopener noreferrer" className="text-body-medium hover:underline text-on-surface-variant">LinkedIn</a></li>
              <li><Link href="/privacy" className="text-body-medium hover:underline text-on-surface-variant">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-body-medium hover:underline text-on-surface-variant">Terms of Service</Link></li>
              <li><CookieSettingsLink /></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-outline-variant">
          <p className="text-body-small text-on-surface-variant">
            &copy; {currentYear} WardBalance. All rights reserved.
          </p>
          <div className="flex gap-4">
            <span className="text-body-small text-on-surface-variant">
              Made for Nigerian Schools
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
