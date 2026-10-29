import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AUTH_STORAGE_KEY } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "Track My Stack · Gold & silver stack tracker",
  description: "Log your gold, silver, platinum and palladium and see what it's worth at live spot prices.",
  // Ownership check for the Awin affiliate network
  other: { "awin-verification": "Awin" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Before the page draws: if this browser has a saved sign-in, skip straight to a loading screen */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem(${JSON.stringify(AUTH_STORAGE_KEY)}))document.documentElement.dataset.auth="1"}catch(e){}`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
