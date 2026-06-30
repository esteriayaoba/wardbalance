import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import StructuredData from "@/components/seo/StructuredData";
import CookieConsentBanner from "@/components/cookie-consent/CookieConsentBanner";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wardbalance.com.ng";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "WardBalance — School Fee Management Software for African Schools",
    template: "%s — WardBalance",
  },
  description:
    "Create a WardBalance school workspace to manage invoices, parent balances, payments, receipts, and school fee reports from one dashboard.",
  keywords: [
    "school fee management",
    "Nigerian schools",
    "school payments",
    "parent portal",
    "invoice management",
    "school finance software",
    "school fees Nigeria",
  ],
  icons: {
    icon: [
      { url: "/logo-v5.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/logo-v5.png",
  },
  openGraph: {
    title: "WardBalance — School Fee Management Software for African Schools",
    description:
      "Create a WardBalance school workspace to manage invoices, parent balances, payments, receipts, and school fee reports from one dashboard.",
    url: siteUrl,
    siteName: "WardBalance",
    type: "website",
    locale: "en_NG",
    // TODO: replace with dedicated OG image when ready
    images: [{ url: "/logo-v5.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "WardBalance — School Fee Management Software for African Schools",
    description:
      "Create a WardBalance school workspace to manage invoices, parent balances, payments, receipts, and school fee reports from one dashboard.",
    // TODO: replace with dedicated OG image when ready
    images: ["/logo-v5.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} h-full`} data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col antialiased" suppressHydrationWarning>
        <StructuredData />
        {children}
        <CookieConsentBanner />
      </body>
    </html>
  );
}
