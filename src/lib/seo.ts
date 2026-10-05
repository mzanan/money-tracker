export const SITE_URL = "https://money.itsmatias.com";
export const SITE_NAME = "Money Tracker";

export const LANDING_TITLE =
  "Money Tracker: your money across currencies, in one place";
export const LANDING_DESCRIPTION =
  "For nomads and expats who earn and spend in more than one currency.";

export const OG_IMAGE = {
  url: "/opengraph-image.png",
  width: 2400,
  height: 1260,
  alt: "Money Tracker: your money across currencies, in one place.",
};

export const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
];

export const PRIVATE_PATHS = ["/api/"];

const AUTHOR = {
  "@type": "Person",
  name: "Matias Zanan",
  url: "https://itsmatias.com",
};

export const landingJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      name: SITE_NAME,
      url: SITE_URL,
      description: `${LANDING_DESCRIPTION} Every expense keeps the exchange rate of its day, with daily spend projections and imports from Wise CSV, Bybit and receipt photos.`,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web, iOS, Android (installable PWA)",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      author: AUTHOR,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      inLanguage: "en",
      publisher: AUTHOR,
      dateModified: new Date().toISOString(),
    },
  ],
};
