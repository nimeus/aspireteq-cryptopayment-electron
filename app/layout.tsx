import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "Crypto Withdrawal Tool - MEXC & CoinEx",
  description: "Secure client-side bulk withdrawal tool for MEXC and CoinEx exchanges",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
