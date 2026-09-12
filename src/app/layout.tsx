import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/app/providers";

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "المليونير — تحدَّ أصدقاءك واصعد سلّم الجوائز",
    template: "%s | المليونير",
  },
  description:
    "لعبة مسابقات جماعية لحظية: أنشئ غرفة، ادعُ أصدقاءك، أجيبوا على نفس الأسئلة تحت نفس المؤقت، وتسلّقوا سلّم الجوائز.",
  manifest: "/manifest.webmanifest",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0c16" },
    { media: "(prefers-color-scheme: light)", color: "#f7f5ef" },
  ],
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/avatars/avatar-01.png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${plexArabic.variable} min-h-screen flex flex-col antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
