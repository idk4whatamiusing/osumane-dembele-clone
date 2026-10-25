import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { configuredPerson } from "@/src/content/config";
import "./globals.css";

export const metadata: Metadata = {
  title: `${configuredPerson.name} — ${configuredPerson.hero.eyebrow}`,
  description: configuredPerson.seoDescription,
  applicationName: "Osumane Dembele Clone",
  authors: [{ name: "Debopam Das" }],
  creator: "Debopam Das",
  icons: {
    icon: [
      {
        url: "/assets/reference/images/favicon.png",
        type: "image/png",
        sizes: "32x32"
      }
    ],
    shortcut: "/assets/reference/images/favicon.png",
    apple: [
      {
        url: "/assets/reference/images/webclip.png",
        type: "image/png",
        sizes: "256x256"
      }
    ]
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    title: `${configuredPerson.name} — ${configuredPerson.hero.eyebrow}`,
    description: configuredPerson.seoDescription,
    siteName: "Osumane Dembele Clone"
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

const bootstrap = `document.documentElement.classList.add("js","motion-pending")`;

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
