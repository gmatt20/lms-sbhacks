import type { Metadata, Viewport } from "next";
import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { LogoLink } from "@/components/LogoLink";
import "./globals.css";
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "GradeMeIn",
  description: "Help catch issues in student work early",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`w-screen h-screen ${plexSans.className} ${plexMono.variable}`}>
          <header className="flex items-center justify-between h-16 px-6 border-b border-border bg-white">
            <LogoLink />
            <div className="flex items-center gap-2">
              <SignedOut>
                <SignInButton>
                  <button className="h-10 border border-border px-4 text-sm font-semibold text-foreground bg-white transition hover:bg-accent hover:text-accent-foreground">
                    Sign In
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </div>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
