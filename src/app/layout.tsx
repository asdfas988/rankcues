import type { Metadata } from "next";
import { cookies } from "next/headers";
import { IBM_Plex_Mono, Manrope, Newsreader } from "next/font/google";
import "./globals.css";
import { normalizeLocale } from "@/lib/i18n";
import { publicSiteUrl } from "@/lib/site-url";

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const display = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(publicSiteUrl),
  title: {
    default: "SEO Reporting Software for Agencies | RankCues",
    template: "%s | RankCues",
  },
  description:
    "RankCues connects GSC, GA4 and website changes to produce evidence-backed SEO investigations and reviewable weekly client reports.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "RankCues — SEO change intelligence for agencies",
    description:
      "Know what changed, why organic performance moved, and what to do next.",
    type: "website",
    images: [{ url: "/visuals/rankcues-01-website-hero.png", width: 1400, height: 788, alt: "RankCues SEO change intelligence dashboard" }],
  },
  twitter: { card: "summary_large_image", images: ["/visuals/rankcues-01-website-hero.png"] },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const store = await cookies();
  const locale = normalizeLocale(store.get("rankcues_locale")?.value);
  return (
    <html
      lang={locale === "zh" ? "zh-CN" : locale}
      className={`${sans.variable} ${display.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
