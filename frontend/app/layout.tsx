import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "USMAN AI GTM — Find. Engage. Convert. Grow.",
  description: "Enterprise AI-powered B2B sales intelligence, prospecting, research, omnichannel outreach, CRM, and revenue automation.",
  keywords: ["B2B prospecting", "lead intelligence", "AI outreach", "CRM", "revenue operations", "WhatsApp Business", "Cold email"],
  authors: [{ name: "USMAN AI GTM" }],
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#07090e] text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
