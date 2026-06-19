const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wardbalance.com.ng";

const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "WardBalance",
  url: siteUrl,
  description:
    "School fee management and financial operations software for African schools.",
};

const softwareApplication = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "WardBalance",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "WardBalance helps schools manage invoices, payments, parent balances, receipts, and fee verification from one dashboard.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "NGN",
    availability: "https://schema.org/InStock",
  },
};

export default function StructuredData() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organization),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplication),
        }}
      />
    </>
  );
}
