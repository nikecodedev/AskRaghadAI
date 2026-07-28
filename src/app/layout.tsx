import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  Noto_Sans_Arabic,
  Inter,
  Cormorant_Garamond,
} from "next/font/google";
import { AppProviders } from "@/components/providers/AppProviders";
import { AuthProvider } from "@/components/providers/AuthProvider";
import {
  IMPACT_VERIFICATION_ID,
  IMPACT_VERIFICATION_TEXT,
} from "@/lib/affiliate-verification";
import { LOCALE_COOKIE, dirFromLocale, parseLocale } from "@/lib/i18n/locale";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const notoArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://askraghadai.com").replace(/\/$/, "");

/**
 * Locale-aware metadata, including the Open Graph and Twitter tags that decide
 * how a shared link looks in WhatsApp, X and LinkedIn. Written as
 * generateMetadata rather than a static export so the preview text matches the
 * visitor's language, and so metadataBase resolves the image to an absolute
 * URL — social crawlers reject relative paths.
 */
export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = parseLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const isAr = locale === "ar";

  const title = isAr ? "رغد AI | Askraghadai.com" : "Raghad AI | Askraghadai.com";
  const description = isAr
    ? "مساعدك الذكي للأزياء والجمال والعناية بالبشرة والمنزل ومستلزمات الأطفال والسفر، مع توصيات وروابط تسوق موثوقة."
    : "Your AI-powered companion for fashion, beauty, skincare, home, kids, and travel, with trusted recommendations and shopping links.";

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    applicationName: "Raghad AI",
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: "Raghad AI",
      url: SITE_URL,
      title,
      description,
      locale: isAr ? "ar_SA" : "en_US",
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: "Raghad AI — Askraghadai.com",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-image.png"],
    },
    icons: {
      icon: "/brand/mark.png",
      apple: "/brand/mark.png",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = parseLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const dir = dirFromLocale(locale);

  return (
    <html lang={locale} dir={dir} className="h-full" suppressHydrationWarning>
      <head>
        {/* Impact expects value= in their snippet; include both value and content for crawlers */}
        <meta name="impact-site-verification" content={IMPACT_VERIFICATION_ID} />
        {/* @ts-expect-error Impact crawler expects non-standard value= attribute */}
        <meta name="impact-site-verification" value={IMPACT_VERIFICATION_ID} />
        <meta name="verify-admitad" content="0592009f07" />
      </head>
      <body
        className={`${inter.variable} ${notoArabic.variable} ${cormorant.variable} min-h-full flex flex-col font-sans antialiased`}
      >
        {/* Server-rendered for Impact crawler (screen-reader only) */}
        <p className="sr-only-crawler">{IMPACT_VERIFICATION_TEXT}</p>
        <AppProviders initialLocale={locale}>
          <AuthProvider>{children}</AuthProvider>
        </AppProviders>
      </body>
    </html>
  );
}
