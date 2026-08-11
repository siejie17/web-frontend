import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { ChatUnreadProvider } from "@/contexts/ChatUnreadContext";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ProFormaX | Green Building Intelligence",
  description:
    "Estimate project cost, score green building compliance, and build sustainably.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${sora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-mist font-sans">
        <LoadingProvider>
          <AuthProvider>
            <ChatUnreadProvider>{children}</ChatUnreadProvider>
          </AuthProvider>
        </LoadingProvider>
      </body>
    </html>
  );
}
