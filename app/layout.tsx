import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { configuredPerson } from "@/src/content/config";
import "./globals.css";

export const metadata: Metadata = {
  title: `${configuredPerson.name} — ${configuredPerson.hero.eyebrow}`,
  description: configuredPerson.seoDescription,
  applicationName: "Ankhi Tribute",
  authors: [{ name: "Ankhi" }],
  creator: "Ankhi",
  icons: {
    icon: "/assets/core/icon.svg"
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    title: `${configuredPerson.name} — ${configuredPerson.hero.eyebrow}`,
    description: configuredPerson.seoDescription,
    siteName: "Ankhi Tribute"
  },
  robots: {
    index: true,
    follow: true
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: configuredPerson.theme.background,
  colorScheme: "light"
};

interface RootLayoutProps {
  children: ReactNode;
}

const bootstrap = `document.documentElement.classList.add("js");if(!window.matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.classList.add("motion-pending")}`;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang={configuredPerson.language} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: bootstrap }} />
        <a className="skip-link" href="#content">
          {configuredPerson.labels.skip}
        </a>
        {children}
      </body>
    </html>
  );
}
