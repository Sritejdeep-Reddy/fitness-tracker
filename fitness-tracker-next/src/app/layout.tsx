import type { Metadata } from "next";
// Import the new fonts from Google Fonts
import { Noto_Sans_JP, Zen_Kurenaido } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle"; // Import ThemeToggle

// Configure Noto Sans JP for body text
const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["300", "400", "700"], // Include weights used in CSS
  variable: "--font-sans", // Assign to CSS variable --font-sans
});

// Configure Zen Kurenaido for headings (optional, can be applied specifically)
const zenKurenaido = Zen_Kurenaido({
  subsets: ["latin"],
  weight: ["400"], // Zen Kurenaido might only have regular weight
  variable: "--font-heading", // Assign to CSS variable --font-heading
});


export const metadata: Metadata = {
  title: "Demon Slayer Fitness Tracker", // Updated title
  description: "Track your fitness journey, slayer style!", // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased", // Use font variable from Noto Sans JP
          notoSansJP.variable,
          zenKurenaido.variable // Make heading font variable available
        )}
      >
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            themes={['light', 'dark', 'system']} // Removed custom themes
          >
          <div className="relative flex min-h-screen flex-col">
            {/* Simple absolute positioning for the toggle */}
            <div className="absolute top-4 right-4 z-50">
              <ThemeToggle />
            </div>
            {/* TODO: Add Header/Navbar here if needed */}
            <main className="flex-1">{children}</main> {/* Wrap children in main */}
            {/* TODO: Add Footer here */}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
