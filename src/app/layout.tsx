import type { Metadata, Viewport } from "next";
import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
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
  description: "A calm, audit-friendly LMS for modern classrooms",
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
            <Link href="/" className="flex items-center gap-3 font-semibold text-lg text-foreground">
              <span className="flex h-10 w-10 items-center justify-center bg-primary text-primary-foreground font-bold tracking-wide">
                GM
              </span>
              <div className="leading-tight">
                <div>GradeMeIn</div>
                <div className="text-xs font-normal text-muted-foreground">Keep coursework honest</div>
              </div>
            </Link>
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
