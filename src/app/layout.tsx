import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/app/providers";

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "المليونير — تحدَّ أصدقاءك واصعد سلّم الجوائز",
    template: "%s | المليونير",
  },
  description:
    "لعبة مسابقات جماعية لحظية: أنشئ غرفة، ادعُ أصدقاءك، أجيبوا على نفس الأسئلة تحت نفس المؤقت، وتسلّقوا سلّم الجوائز.",
  applicationName: "المليونير",
  manifest: "/manifest.webmanifest",
  // Icons + social images come from file conventions:
  // icon.svg, favicon.ico, apple-icon.png, opengraph-image.png, twitter-image.png
  openGraph: {
    type: "website",
    locale: "ar_DZ",
    siteName: "المليونير",
    title: "المليونير — تحدَّ أصدقاءك واصعد سلّم الجوائز",
    description:
      "غرفة واحدة. نفس الأسئلة. نفس المؤقت. أنشئ غرفة، شارك الرمز، وتسلّق سلّم الجوائز قبل الجميع.",
  },
  twitter: {
    card: "summary_large_image",
    title: "المليونير — تحدَّ أصدقاءك واصعد سلّم الجوائز",
    description:
      "غرفة واحدة. نفس الأسئلة. نفس المؤقت. أنشئ غرفة، شارك الرمز، وتسلّق سلّم الجوائز قبل الجميع.",
  },
  appleWebApp: {
    capable: true,
    title: "المليونير",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0c16" },
    { media: "(prefers-color-scheme: light)", color: "#f7f5ef" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={`${plexArabic.variable} min-h-screen flex flex-col antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
